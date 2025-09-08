# -*- coding: utf-8 -*-
import os
import math
import random
import time
import requests
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sock import Sock
from threading import Thread
import mysql.connector
from geopy.geocoders import Nominatim
import numpy as np

# Qiskit and VRP imports
from qiskit_optimization import QuadraticProgram
from qiskit_algorithms import NumPyMinimumEigensolver
from qiskit_optimization.algorithms import MinimumEigenOptimizer
from qiskit_optimization.converters import QuadraticProgramToQubo

# --- Load environment variables ---
from dotenv import load_dotenv
load_dotenv()

# --- Flask App ---
app = Flask(__name__)
CORS(app)
sock = Sock(app)

# --- MySQL Setup ---
db = mysql.connector.connect(
    host="localhost",
    user="root",
    password=os.getenv("MYSQL_PASSWORD", "root"),
    database="quantum_logistics"
)
cursor = db.cursor(dictionary=True)

# --- Geocoder ---
geolocator = Nominatim(user_agent="quantum_logistics_app")
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

# --- Global State for Live Updates ---
live_route_data = None
active_sockets = set()
optimization_running = False
vehicle_simulation_thread = None

# --- Helper Functions ---
def get_weather_data(lat, lon):
    """Fetches current weather and forecast data from OpenWeatherMap."""
    if not OPENWEATHER_API_KEY:
        print("OpenWeather API key not found.")
        return None
    
    try:
        current_res = requests.get(
            f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric",
            timeout=5
        )
        current_res.raise_for_status()
        current_data = current_res.json()
        
        forecast_res = requests.get(
            f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric",
            timeout=5
        )
        forecast_res.raise_for_status()
        forecast_data = forecast_res.json()
        
        return {
            "current": current_data,
            "forecast": forecast_data
        }
    except requests.exceptions.RequestException as e:
        print(f"OpenWeather API error: {e}")
        return None

def analyze_route_impact(weather_data_list):
    """Analyzes weather data to provide a simulated route impact report."""
    if not weather_data_list:
        return None
    
    impacts = set()
    expected_delay = 0
    
    for weather_data in weather_data_list:
        if not weather_data or not weather_data.get('current'):
            continue
        
        current = weather_data['current']
        main = current.get('main', {})
        wind = current.get('wind', {})
        
        # Analyze visibility
        if current.get('visibility', 10000) < 5000:
            impacts.add("Low visibility expected")
            expected_delay += 5
        
        # Analyze wind
        if wind.get('speed', 0) > 20: # 20 km/h
            impacts.add("Strong winds may affect travel")
            expected_delay += 5
            
        # Analyze rain/snow
        if any(desc in ['rain', 'snow', 'thunderstorm'] for desc in [w['main'].lower() for w in current.get('weather', [])]):
            impacts.add("Adverse weather conditions")
            expected_delay += 10
            
    return {
        "impacts": list(impacts),
        "expected_delay_min": expected_delay
    }

def get_route_weather(depot_coords, destinations_coords):
    """Fetches weather for the depot and all destinations along the route."""
    weather_data_list = []
    
    # Get weather for depot
    depot_weather = get_weather_data(depot_coords['lat'], depot_coords['lon'])
    if depot_weather:
        weather_data_list.append(depot_weather)
    
    # Get weather for destinations
    for dest in destinations_coords:
        dest_weather = get_weather_data(dest['lat'], dest['lon'])
        if dest_weather:
            weather_data_list.append(dest_weather)
    
    return weather_data_list

def geocode_address(address_name):
    """Geocodes a street address to latitude and longitude coordinates."""
    try:
        location = geolocator.geocode(address_name, timeout=5)
        if location:
            return {"lat": location.latitude, "lon": location.longitude, "address": location.address}
    except Exception as e:
        print(f"Geocoding error for {address_name}: {e}")
    return None

def calculate_distance(p1, p2):
    """Calculates Euclidean distance between two points."""
    return math.sqrt((p1['lat'] - p2['lat'])**2 + (p1['lon'] - p2['lon'])**2)

def get_realtime_data(p1, p2):
    """Simulates fetching real-time data to influence route cost."""
    traffic_multiplier = 1 + (random.random() * 0.5)
    return calculate_distance(p1, p2) * traffic_multiplier

def get_free_flow_route(points):
    """
    Calls the OSRM API to get a route's duration with no traffic.
    This is a simplified simulation using a fixed speed.
    """
    if not points or len(points) < 2:
        return None
    
    total_distance_km = 0
    for i in range(len(points) - 1):
        total_distance_km += calculate_distance(points[i], points[i+1]) * 111.32 # Approx km per degree
    
    # Assume an average free-flow speed of 60 km/h
    duration_seconds = (total_distance_km / 60) * 3600
    
    return {
        "duration": duration_seconds,
    }


def get_osrm_route(points):
    """
    Calls the OSRM API to get route geometry, distance, and duration.
    Points should be in format [{"lat": ..., "lon": ...}, ...]
    OSRM expects coordinates as 'longitude,latitude'.
    """
    osrm_server = "http://router.project-osrm.org"
    coords = ";".join([f"{p['lon']},{p['lat']}" for p in points])
    
    url = f"{osrm_server}/route/v1/driving/{coords}?geometries=geojson&overview=full&alternatives=false"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        osrm_data = response.json()
        
        if osrm_data.get('routes'):
            route = osrm_data['routes'][0]
            return {
                "geometry": route['geometry']['coordinates'],
                "distance": route['distance'], # meters
                "duration": route['duration'] # seconds
            }
    except requests.exceptions.RequestException as e:
        print(f"OSRM API error: {e}")
    return None

def analyze_traffic_impact(realtime_duration, free_flow_duration):
    """Analyzes and generates a traffic impact report."""
    if not realtime_duration or not free_flow_duration or free_flow_duration == 0:
        return None
    
    delay_min = round((realtime_duration - free_flow_duration) / 60)
    delay_percent = round((delay_min / (free_flow_duration / 60)) * 100) if free_flow_duration > 0 else 0
    
    if delay_min <= 0:
        status = "No traffic delay"
    elif delay_min > 0 and delay_min <= 10:
        status = "Light traffic congestion"
    else:
        status = "Heavy traffic congestion"
        
    return {
        "status": status,
        "delay_min": delay_min,
        "delay_percent": delay_percent
    }

def get_cost_with_preferences(p1, p2, preferences, vehicle_profile):
    """
    Calculates a weighted cost between two points based on user preferences.
    """
    # Simulate base duration and distance using Euclidean distance
    base_distance = calculate_distance(p1, p2)
    base_duration = base_distance * 3600 / 50 # Assume a base speed of 50 km/h

    # Apply preference multipliers
    cost = base_distance
    
    # 1. Optimize for Time vs. Distance
    if preferences.get('optimizeFor') == 'time':
        # Prioritize time over distance. For simplicity, use duration as the primary cost.
        cost = base_duration
        
    # 2. Optimize for Fuel
    if preferences.get('optimizeForFuel'):
        # This is a simplified model. Fuel consumption increases with distance and elevation changes.
        elevation_change_cost = abs(p1.get('elevation', 0) - p2.get('elevation', 0)) * 0.1 # Placeholder
        cost += base_distance * 0.2 + elevation_change_cost

    # 3. Include Elevation
    if preferences.get('includeElevation'):
        # Adds a penalty for elevation changes. Placeholder logic.
        elevation_cost = abs(p1.get('elevation', 0) - p2.get('elevation', 0)) * 0.5
        cost += elevation_cost

    # 4. Handle Avoidances (Simulated)
    if preferences.get('avoidTolls'):
        cost += 50 # Add a high fixed penalty for tolls
    if preferences.get('avoidFerries'):
        cost += 100 # Add a very high fixed penalty for ferries

    # Apply a small random factor for real-time traffic simulation
    traffic_multiplier = 1 + (random.random() * 0.2)
    cost *= traffic_multiplier

    return cost

# --- VRP Solvers (Corrected) ---
def find_optimized_route_classical(depot, destinations, vehicle_count, preferences):
    routes = [[] for _ in range(vehicle_count)]
    if not destinations:
        return routes

    unassigned_destinations = list(destinations)
    
    # Greedily assign destinations to vehicles based on cost
    while unassigned_destinations and any(len(routes[i]) < 1 for i in range(vehicle_count)):
        min_cost = float('inf')
        best_vehicle_index = -1
        dest_to_assign = None
        
        for dest in unassigned_destinations:
            for i in range(vehicle_count):
                if len(routes[i]) == 0:  # Only assign to a vehicle that hasn't received a destination yet
                    last_point = depot
                    cost = get_cost_with_preferences(last_point, dest, preferences, preferences.get('vehicleProfile'))
                    
                    if cost < min_cost:
                        min_cost = cost
                        best_vehicle_index = i
                        dest_to_assign = dest
                        
        if dest_to_assign:
            routes[best_vehicle_index].append(dest_to_assign)
            unassigned_destinations.remove(dest_to_assign)
        else:
            break
            
    return routes


def solve_qubo_classically(qubo, vehicle_count):
    """
    Solves the QUBO problem using a classical NumPyMinimumEigensolver.
    This provides a reliable 'quantum-inspired' result without simulator errors.
    """
    try:
        meo_classical = MinimumEigenOptimizer(NumPyMinimumEigensolver())
        result = meo_classical.solve(qubo)
        solution_dict = dict(zip(result.variable_names, result.x))
        routes = [[] for _ in range(vehicle_count)]
        for var_name, value in solution_dict.items():
            if value == 1.0:
                parts = var_name.split('_')
                vehicle_index = int(parts[1])
                destination_index = int(parts[2])
                routes[vehicle_index].append(destination_index)
        return routes
    except Exception as e:
        print(f"Classical QUBO solver failed: {e}")
        return None

def get_quantum_route(depot, destinations, vehicle_count, preferences):
    """
    Formulates the problem and solves it with a local QAOA-inspired classical solver.
    This version now also ensures a 1-to-1 assignment.
    """
    # NOTE: A proper quantum solution to VRP is highly complex.
    # This is a simplified placeholder that mimics a quantum
    # assignment of destinations. For this problem, a simple
    # 1-to-1 assignment is a practical approach.
    
    num_destinations = len(destinations)
    
    # Ensure there are enough destinations for the number of vehicles
    effective_vehicle_count = min(vehicle_count, num_destinations)
    
    qp = QuadraticProgram()
    # x_ij = 1 if destination j is assigned to vehicle i
    for i in range(effective_vehicle_count):
        for j in range(num_destinations):
            qp.binary_var(name=f'x_{i}_{j}')
    
    # Cost function: minimize total travel distance (simplified)
    linear = {}
    for i in range(effective_vehicle_count):
        for j in range(num_destinations):
            cost = get_cost_with_preferences(depot, destinations[j], preferences, preferences.get('vehicleProfile'))
            linear[f'x_{i}_{j}'] = cost
    qp.minimize(linear=linear)
    
    # Constraint 1: Each destination is assigned to exactly one vehicle
    for j in range(num_destinations):
        constraint_linear = {}
        for i in range(effective_vehicle_count):
            constraint_linear[f'x_{i}_{j}'] = 1
        qp.linear_constraint(linear=constraint_linear, sense='==', rhs=1, name=f'dest_assign_{j}')
    
    # Constraint 2: Each vehicle is assigned at most one destination
    for i in range(effective_vehicle_count):
        constraint_linear = {}
        for j in range(num_destinations):
            constraint_linear[f'x_{i}_{j}'] = 1
        qp.linear_constraint(linear=constraint_linear, sense='<=', rhs=1, name=f'vehicle_cap_{i}')
    
    converter = QuadraticProgramToQubo(penalty=100000)
    qubo = converter.convert(qp)
    solution_indices = solve_qubo_classically(qubo, effective_vehicle_count)
    
    routes = [[] for _ in range(vehicle_count)]
    if solution_indices:
        for i, dest_indices in enumerate(solution_indices):
            if i < vehicle_count:
                for dest_idx in dest_indices:
                    routes[i].append(destinations[dest_idx])
            
    return routes

# --- Live Update Function ---
def simulate_vehicle_movement():
    global live_route_data
    global optimization_running
    
    if not live_route_data or not live_route_data['routes']:
        print("No route to simulate.")
        return

    route_path = live_route_data['routes'][0]['path']
    current_step = 0
    total_steps = len(route_path)
    
    while optimization_running:
        if current_step >= total_steps:
            current_step = 0
        
        current_pos = route_path[current_step]
        
        for ws in active_sockets:
            try:
                ws.send(json.dumps({
                    "type": "live_vehicle_position",
                    "position": current_pos,
                    "progress": int((current_step / total_steps) * 100)
                }))
            except:
                active_sockets.remove(ws)
        
        current_step += 1
        time.sleep(0.5)

# --- Flask Routes ---
@app.route("/optimize-route", methods=["POST"])
def optimize_route():
    global live_route_data
    global optimization_running
    
    data = request.json
    depot_name = data.get('depot')
    destination_names = data.get('destinations', [])
    vehicle_count = int(data.get('vehicleCount', 1))
    method = data.get('method', 'classical')
    preferences = data.get('preferences', {})

    start_time = time.time()
    
    depot_coords = geocode_address(depot_name)
    if not depot_coords:
        return jsonify({"ok": False, "error": f"Could not geocode depot: {depot_name}"}), 400
    
    destinations_coords = []
    for name in destination_names:
        coords = geocode_address(name)
        if not coords:
            return jsonify({"ok": False, "error": f"Could not geocode destination: {name}"}), 400
        destinations_coords.append(coords)
    
    solved_routes_destinations = []
    if method == 'classical':
        solved_routes_destinations = find_optimized_route_classical(depot_coords, destinations_coords, vehicle_count, preferences)
    elif method == 'quantum':
        solved_routes_destinations = get_quantum_route(depot_coords, destinations_coords, vehicle_count, preferences)
    
    final_routes = []
    total_distance_km = 0
    total_duration_hours = 0
    
    route_weather_data = get_route_weather(depot_coords, destinations_coords)
    route_impact = analyze_route_impact(route_weather_data)

    # Correct logic to ensure all vehicles are in the response
    for i in range(vehicle_count):
        route_points = solved_routes_destinations[i] if i < len(solved_routes_destinations) else []
        
        if not route_points:
            # If no points are assigned, create an empty route for this vehicle
            final_routes.append({
                "path": [{"lat": depot_coords['lat'], "lon": depot_coords['lon']}],
                "depot": depot_coords,
                "destinations": [], 
                "distance_km": 0,
                "duration_hours": 0,
                "traffic_impact": {"status": "No traffic data", "delay_min": 0, "delay_percent": 0}
            })
            continue

        # If points are assigned, calculate the route from depot to the point and back
        full_route_for_osrm = [depot_coords, route_points[0], depot_coords]
        osrm_data = get_osrm_route(full_route_for_osrm)
        
        if not osrm_data:
            # Fallback for OSRM failure
            osrm_data = {
                "distance": (calculate_distance(depot_coords, route_points[0]) + calculate_distance(route_points[0], depot_coords)) * 111.32,
                "duration": ((calculate_distance(depot_coords, route_points[0]) + calculate_distance(route_points[0], depot_coords)) * 111.32 / 50) * 3600
            }
        
        free_flow_data = get_free_flow_route(full_route_for_osrm)
        traffic_impact = analyze_traffic_impact(osrm_data['duration'], free_flow_data['duration'])
        
        route_path = [{"lat": coord[1], "lon": coord[0]} for coord in osrm_data.get('geometry', [])]
        
        final_routes.append({
            "path": route_path,
            "depot": depot_coords,
            "destinations": route_points, 
            "distance_km": osrm_data['distance'] / 1000,
            "duration_hours": osrm_data['duration'] / 3600,
            "traffic_impact": traffic_impact
        })

        total_distance_km += osrm_data['distance'] / 1000
        total_duration_hours += osrm_data['duration'] / 3600
        

    final_results = {
        "routes": final_routes,
        "metrics": {
            "total_distance_km": total_distance_km,
            "total_duration_hours": total_duration_hours,
            "co2_savings_kg": total_distance_km * 0.15
        },
        "optimization_time": time.time() - start_time,
        "weather": {
            "report": route_weather_data[0] if route_weather_data else None,
            "impacts": route_impact
        }
    }
    
    live_route_data = final_results
    for ws in active_sockets:
        try:
            ws.send(json.dumps({"type": "live_route_update", "results": final_results}))
        except:
            pass

    return jsonify({"ok": True, "results": final_results})

@app.route("/live-start", methods=["POST"])
def live_start():
    global optimization_running
    global vehicle_simulation_thread
    if not optimization_running and live_route_data:
        optimization_running = True
        vehicle_simulation_thread = Thread(target=simulate_vehicle_movement)
        vehicle_simulation_thread.daemon = True
        vehicle_simulation_thread.start()
        return jsonify({"ok": True, "message": "Simulation started."})
    return jsonify({"ok": False, "message": "Simulation already running or no route available."})

@app.route("/api/demo-data")
def get_demo_data():
    data = {
        "depot": "Amaravati, India",
        "delivery_points": [
            "Vijayawada, India",
            "Guntur, India",
            "Rajahmundry, India",
            "Visakhapatnam, India",
            "Ongole, India"
        ]
    }
    return jsonify(data)

@app.route("/stop-optimization", methods=["POST"])
def stop_optimization():
    global optimization_running
    optimization_running = False
    return jsonify({"ok": True, "message": "Optimization stopped."})


@sock.route('/ws/telemetry')
def telemetry(ws):
    active_sockets.add(ws)
    print("New WebSocket client connected.")
    try:
        while True:
            data = ws.receive()
            if data:
                print(f"Received message from client: {data}")
    except Exception as e:
        print(f"WebSocket client disconnected: {e}")
    finally:
        if ws in active_sockets:
            active_sockets.remove(ws)


if __name__ == "__main__":
    app.run(debug=True, port=8000)