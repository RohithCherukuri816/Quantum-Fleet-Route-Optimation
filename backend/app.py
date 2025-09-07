# app.py
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

# --- Global State for Live Updates ---
live_route_data = None
active_sockets = set()
optimization_running = False
vehicle_simulation_thread = None

# --- Helper Functions ---
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

# --- VRP Solvers (Corrected) ---
def find_optimized_route_classical(depot, destinations, vehicle_count):
    routes = [[] for _ in range(vehicle_count)]
    dest_assignments = [[] for _ in range(vehicle_count)]
    unassigned_destinations = list(destinations)

    current_vehicle_index = 0
    while unassigned_destinations:
        dest_to_assign = unassigned_destinations.pop(0)
        dest_assignments[current_vehicle_index].append(dest_to_assign)
        current_vehicle_index = (current_vehicle_index + 1) % vehicle_count

    for i in range(vehicle_count):
        assigned_dests = dest_assignments[i]
        if not assigned_dests:
            continue
        routes[i] = assigned_dests
        
    return routes

def solve_qubo_classically(qubo, vehicle_count):
    """
    Solves the QUBO problem using a classical NumPyMinimumEigensolver.
    This provides a reliable 'quantum-inspired' result without simulator errors.
    """
    try:
        # Instantiate a classical minimum eigensolver
        meo_classical = MinimumEigenOptimizer(NumPyMinimumEigensolver())
        result = meo_classical.solve(qubo)
        
        # CORRECTED: Get the solution by mapping variable names to their values
        solution_dict = dict(zip(result.variable_names, result.x))
        
        # Decode the solution into actual routes
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

def get_quantum_route(depot, destinations, vehicle_count):
    """
    Formulates the problem and solves it with a local QAOA-inspired classical solver.
    """
    num_destinations = len(destinations)
    
    # Simple QUBO formulation for assignment problem
    qp = QuadraticProgram()
    for i in range(vehicle_count):
        for j in range(num_destinations):
            qp.binary_var(name=f'x_{i}_{j}')
    
    linear = {}
    for i in range(vehicle_count):
        for j in range(num_destinations):
            cost = get_realtime_data(depot, destinations[j])
            linear[f'x_{i}_{j}'] = cost
    qp.minimize(linear=linear)
    
    # Constraint: each destination is assigned to exactly one vehicle
    for j in range(num_destinations):
        constraint_linear = {}
        for i in range(vehicle_count):
            constraint_linear[f'x_{i}_{j}'] = 1
        qp.linear_constraint(linear=constraint_linear, sense='==', rhs=1, name=f'dest_assign_{j}')
    
    # Convert the constrained QP to a QUBO with a large penalty
    converter = QuadraticProgramToQubo(penalty=100000)
    qubo = converter.convert(qp)

    # Solve the QUBO using the stable classical method
    solution_indices = solve_qubo_classically(qubo, vehicle_count)

    if not solution_indices:
        print("Quantum solution failed. Falling back to classical.")
        return find_optimized_route_classical(depot, destinations, vehicle_count)
        
    # Decode the solution into actual routes
    routes = [[] for _ in range(vehicle_count)]
    for i, dest_indices in enumerate(solution_indices):
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
        solved_routes_destinations = find_optimized_route_classical(depot_coords, destinations_coords, vehicle_count)
    elif method == 'quantum':
        solved_routes_destinations = get_quantum_route(depot_coords, destinations_coords, vehicle_count)
    
    final_routes = []
    total_distance_km = 0
    total_duration_hours = 0

    for route_points in solved_routes_destinations:
        if not route_points:
            continue
        
        full_route_for_osrm = [depot_coords] + route_points + [depot_coords]
        osrm_data = get_osrm_route(full_route_for_osrm)
        if not osrm_data:
            continue

        route_path = [{"lat": coord[1], "lon": coord[0]} for coord in osrm_data['geometry']]
        
        final_routes.append({
            "path": route_path,
            "depot": depot_coords,
            "destinations": route_points, 
            "distance_km": osrm_data['distance'] / 1000,
            "duration_hours": osrm_data['duration'] / 3600
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
        "optimization_time": time.time() - start_time
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