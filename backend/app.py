import os
import math
from itertools import permutations

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from qiskit import QuantumCircuit, transpile
from qiskit.exceptions import QiskitError
from qiskit_aer import AerSimulator
from qiskit_ibm_runtime import QiskitRuntimeService

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# Load IBM API Key from environment variables
IBM_API_KEY = os.getenv("IBM_API_KEY")

# --- IBM Quantum Experience Backend Setup ---
try:
    if IBM_API_KEY:
        service = QiskitRuntimeService(channel="ibm_quantum_platform", token=IBM_API_KEY)
        IBM_ACTIVE = True
        print("Successfully connected to IBM Q provider.")
    else:
        print("Warning: IBM_API_KEY not set. Using simulator only.")
        IBM_ACTIVE = False
except QiskitError as e:
    print(f"Warning: Failed to connect to IBM Q provider. Using simulator only. Error: {e}")
    IBM_ACTIVE = False

# --- Helper Functions ---
def calculate_distance(p1, p2):
    return math.sqrt((p1['lat'] - p2['lat'])**2 + (p1['lon'] - p2['lon'])**2)

def find_shortest_route_classical(points):
    if len(points) <= 1:
        return points, 0

    shortest_distance = float('inf')
    shortest_path = None
    for path in permutations(points):
        current_distance = sum(
            calculate_distance(path[i], path[i+1]) for i in range(len(path)-1)
        )
        if current_distance < shortest_distance:
            shortest_distance = current_distance
            shortest_path = path

    return list(shortest_path), shortest_distance

# --- Flask Endpoints ---
@app.route("/")
def home():
    return "<h1>FleetFlow Backend is running.</h1><p>API Endpoints: /status, /run-bell-state, /optimize-route</p>"

@app.route("/status")
def status():
    return jsonify({"ok": True, "ibmq_active": IBM_ACTIVE})

@app.route("/run-bell-state", methods=["POST"])
def run_bell_state():
    qc = QuantumCircuit(2, 2)
    qc.h(0)
    qc.cx(0, 1)
    qc.measure([0, 1], [0, 1])

    simulator = AerSimulator()
    transpiled = transpile(qc, simulator)
    job = simulator.run(transpiled, shots=1024)
    result = job.result()
    counts = result.get_counts(qc)

    return jsonify({"ok": True, "counts": counts})

@app.route("/optimize-route", methods=["POST"])
def optimize_route():
    data = request.json
    points = data.get('points', [])
    
    if not points:
        return jsonify({"ok": False, "error": "No points provided."}), 400

    # Validate lat/lon
    for p in points:
        if p.get('lat') is None or p.get('lon') is None:
            return jsonify({"ok": False, "error": f"Invalid point: {p}"}), 400

    if len(points) < 2:
        return jsonify({"ok": False, "error": "Need at least 2 points for optimization."}), 400

    # Quantum placeholder
    num_qubits = len(points)
    qc = QuantumCircuit(num_qubits, num_qubits)
    qc.h(range(num_qubits))
    for i in range(num_qubits - 1):
        qc.cx(i, i + 1)
    qc.measure(range(num_qubits), range(num_qubits))

    simulator = AerSimulator()
    transpiled = transpile(qc, simulator)
    job = simulator.run(transpiled, shots=1024)
    result = job.result()
    quantum_counts = result.get_counts(qc)
    
    # Classical optimization
    optimized_route, total_distance = find_shortest_route_classical(points)

    return jsonify({
        "ok": True,
        "quantum_counts": quantum_counts,
        "optimized_route": optimized_route,
        "total_distance": total_distance,
        "message": "Optimization completed. Classical TSP solution, quantum circuit run as demo."
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
