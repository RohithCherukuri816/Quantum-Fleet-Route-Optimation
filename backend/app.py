import os
import math
import random
import time
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from geopy.geocoders import Nominatim

# Qiskit and VRP imports
from qiskit_optimization.translators import from_docplex_mp
from docplex.mp.model import Model

# --- Load environment variables ---
from dotenv import load_dotenv
load_dotenv()

# --- Flask App ---
app = Flask(__name__)
CORS(app)

# --- MySQL Setup ---
# Note: This is a placeholder for demonstration.
# In a real app, you would configure database access securely.
db = mysql.connector.connect(
    host="localhost",
    user="root",
    password=os.getenv("MYSQL_PASSWORD", "root"),
    database="quantum_logistics"
)
cursor = db.cursor(dictionary=True)

# --- Geocoder ---
geolocator = Nominatim(user_agent="quantum_logistics_app")

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
    """Simulates fetching real-time traffic, weather, etc., to influence route cost."""
    # In a real application, you would call an external API here.
    # For this demo, we use a random multiplier to simulate.
    traffic_multiplier = 1 + (random.random() * 0.5)  # 1.0 to 1.5x slower
    return calculate_distance(p1, p2) * traffic_multiplier

def get_osrm_route(points):
    """
    Calls the OSRM API to get route geometry, distance, and duration.
    Points should be in format [{"lat": ..., "lon": ...}, ...]
    OSRM expects coordinates as 'longitude,latitude'.
    """
    # Use a public OSRM server. For production, host your own.
    osrm_server = "http://router.project-osrm.org"
    coords = ";".join([f"{p['lon']},{p['lat']}" for p in points])
    
    # Request route geometry (polyline) and trip summary
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

# --- VRP Solvers (Simplified) ---
def find_optimized_route_classical(depot, destinations, vehicle_count):
    # This is a basic, greedy solver. In a real-world app, you would use
    # a more robust library like OR-Tools.
    routes = [[] for _ in range(vehicle_count)]
    current_locations = [depot] * vehicle_count
    unassigned_destinations = list(destinations)
    
    while unassigned_destinations:
        min_cost = float('inf')
        best_vehicle_index, best_dest_index = -1, -1
        
        for i, vehicle_loc in enumerate(current_locations):
            for j, dest in enumerate(unassigned_destinations):
                # Use real-time data to calculate cost, not just raw distance
                cost = get_realtime_data(vehicle_loc, dest)
                if cost < min_cost:
                    min_cost = cost
                    best_vehicle_index, best_dest_index = i, j
        
        if best_dest_index == -1:
            break
            
        assigned_dest = unassigned_destinations.pop(best_dest_index)
        routes[best_vehicle_index].append(assigned_dest)
        current_locations[best_vehicle_index] = assigned_dest
        
    return routes

def formulate_qubo_for_vrp(depot, destinations, vehicle_count):
    # This is a placeholder for a real QUBO formulation.
    # It demonstrates the theoretical flow.
    mdl = Model('VRP')
    num_nodes = 1 + len(destinations)
    all_points = [depot] + destinations
    x = mdl.binary_var_matrix(num_nodes, num_nodes, name='x')
    obj_expr = 0
    
    for i in range(num_nodes):
        for j in range(num_nodes):
            if i != j:
                # Use real-time data to influence the objective function
                cost = get_realtime_data(all_points[i], all_points[j])
                obj_expr += cost * x[i, j]
                
    mdl.minimize(obj_expr)
    qp = from_docplex_mp(mdl)
    return qp

def get_quantum_route(depot, destinations, vehicle_count):
    # Placeholder for a quantum solution.
    # In a real app, this would call a quantum backend.
    try:
        qp = formulate_qubo_for_vrp(depot, destinations, vehicle_count)
    except Exception as e:
        print(f"Failed to formulate QUBO: {e}")
        # Fallback to classical on failure
        return find_optimized_route_classical(depot, destinations, vehicle_count)
        
    all_points = [depot] + destinations
    route_indices = [0] + list(range(1, len(all_points)))
    random.shuffle(route_indices)
    
    simulated_route = [all_points[i] for i in route_indices]
    
    chunk_size = len(simulated_route) // vehicle_count
    routes = []
    for i in range(vehicle_count):
        start = i * chunk_size
        end = start + chunk_size
        chunk = simulated_route[start:end] if i < vehicle_count - 1 else simulated_route[start:]
        routes.append([depot] + chunk + [depot])
        
    return routes

# --- MySQL Live GPS Updates ---
def update_vehicle_location(vehicle_id, lat, lon):
    cursor.execute("""
        INSERT INTO vehicle_locations (vehicle_id, latitude, longitude)
        VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE latitude=%s, longitude=%s, last_updated=NOW()
    """, (vehicle_id, lat, lon, lat, lon))
    db.commit()

# --- Flask Routes ---
@app.route("/optimize-route", methods=["POST"])
def optimize_route():
    data = request.json
    depot_name = data.get('depot')
    destination_names = data.get('destinations', [])
    vehicle_count = int(data.get('vehicleCount', 1))
    method = data.get('method', 'classical')
    
    start_time = time.time()
    
    # 1. Geocode all addresses
    depot = geocode_address(depot_name)
    if not depot:
        return jsonify({"ok": False, "error": f"Could not geocode depot: {depot_name}"}), 400
    
    destinations = []
    for name in destination_names:
        coords = geocode_address(name)
        if not coords:
            return jsonify({"ok": False, "error": f"Could not geocode destination: {name}"}), 400
        destinations.append(coords)
    
    # 2. Solve VRP to get a list of points for each vehicle
    if method == 'classical':
        solved_routes = find_optimized_route_classical(depot, destinations, vehicle_count)
    elif method == 'quantum':
        solved_routes = get_quantum_route(depot, destinations, vehicle_count)
    else:
        return jsonify({"ok": False, "error": "Invalid optimization method"}), 400

    # 3. Get the route path from OSRM for each solved route
    final_routes = []
    total_distance_km = 0
    total_duration_hours = 0
    
    for route_points in solved_routes:
        if len(route_points) < 2:
            continue
            
        osrm_data = get_osrm_route(route_points)
        if not osrm_data:
            continue
            
        route_path = [{"lat": coord[1], "lon": coord[0]} for coord in osrm_data['geometry']]
        
        final_routes.append({
            "path": route_path,
            "depot": depot,
            "destinations": destinations,
            "distance_km": osrm_data['distance'] / 1000,
            "duration_hours": osrm_data['duration'] / 3600
        })
        
        total_distance_km += osrm_data['distance'] / 1000
        total_duration_hours += osrm_data['duration'] / 3600
    
    # 4. Create the final results payload
    final_results = {
        "routes": final_routes,
        "metrics": {
            "total_distance_km": total_distance_km,
            "total_duration_hours": total_duration_hours,
            "co2_savings_kg": total_distance_km * 0.15 # Placeholder
        },
        "optimization_time": time.time() - start_time
    }
    
    return jsonify({"ok": True, "results": final_results})

@app.route("/vehicle-location/<int:vehicle_id>")
def get_vehicle_location(vehicle_id):
    cursor.execute("SELECT * FROM vehicle_locations WHERE vehicle_id=%s", (vehicle_id,))
    row = cursor.fetchone()
    if row:
        return jsonify(row)
    return jsonify({"error": "Vehicle not found"}), 404

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

if __name__ == "__main__":
    app.run(debug=True, port=8000)
