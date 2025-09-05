from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
import json
import logging
from typing import List, Dict, Any
from pydantic import BaseModel

from .quantum_solver import QuantumSolver
from .classical_solver import ClassicalSolver
from .graph_builder import GraphBuilder

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="FleetFlow API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize solvers
quantum_solver = QuantumSolver()
classical_solver = ClassicalSolver()
graph_builder = GraphBuilder()

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

# Pydantic models
class DeliveryPoint(BaseModel):
    address: str
    latitude: float
    longitude: float

class OptimizationRequest(BaseModel):
    delivery_points: List[DeliveryPoint]
    vehicle_count: int
    depot_location: DeliveryPoint

class OptimizationResponse(BaseModel):
    routes: List[List[int]]
    total_distance: float
    total_time: float
    optimization_time: float
    method: str

@app.get("/")
async def root():
    return {"message": "FleetFlow API - Quantum Route Optimization"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "FleetFlow API"}

@app.post("/api/optimize/classical", response_model=OptimizationResponse)
async def optimize_classical(request: OptimizationRequest):
    """Optimize routes using classical OR-Tools solver"""
    try:
        logger.info("Starting classical optimization...")
        
        # Convert to format expected by classical solver
        locations = [request.depot_location] + request.delivery_points
        
        # Get distance matrix
        distance_matrix = graph_builder.get_distance_matrix(locations)
        
        # Solve with classical solver
        start_time = asyncio.get_event_loop().time()
        routes, total_distance = classical_solver.solve_vrp(
            distance_matrix, 
            request.vehicle_count
        )
        end_time = asyncio.get_event_loop().time()
        
        optimization_time = end_time - start_time
        
        logger.info(f"Classical optimization completed in {optimization_time:.2f}s")
        
        return OptimizationResponse(
            routes=routes,
            total_distance=total_distance,
            total_time=total_distance / 50.0,  # Assuming 50 km/h average speed
            optimization_time=optimization_time,
            method="classical"
        )
        
    except Exception as e:
        logger.error(f"Classical optimization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Classical optimization failed: {str(e)}")

@app.post("/api/optimize/quantum", response_model=OptimizationResponse)
async def optimize_quantum(request: OptimizationRequest):
    """Optimize routes using quantum QAOA solver with fallback to classical"""
    try:
        logger.info("Starting quantum optimization...")
        
        # Convert to format expected by quantum solver
        locations = [request.depot_location] + request.delivery_points
        
        # Get distance matrix
        distance_matrix = graph_builder.get_distance_matrix(locations)
        
        # Try quantum optimization with timeout
        try:
            start_time = asyncio.get_event_loop().time()
            
            # Send progress updates via WebSocket
            await manager.broadcast(json.dumps({
                "type": "quantum_progress",
                "message": "Starting QAOA optimization...",
                "progress": 10
            }))
            
            routes, total_distance = await asyncio.wait_for(
                quantum_solver.solve_vrp_async(
                    distance_matrix, 
                    request.vehicle_count
                ),
                timeout=30.0  # 30 second timeout
            )
            
            end_time = asyncio.get_event_loop().time()
            optimization_time = end_time - start_time
            
            logger.info(f"Quantum optimization completed in {optimization_time:.2f}s")
            
            await manager.broadcast(json.dumps({
                "type": "quantum_progress",
                "message": "QAOA optimization completed successfully!",
                "progress": 100
            }))
            
            return OptimizationResponse(
                routes=routes,
                total_distance=total_distance,
                total_time=total_distance / 50.0,
                optimization_time=optimization_time,
                method="quantum"
            )
            
        except asyncio.TimeoutError:
            logger.warning("Quantum optimization timed out, falling back to classical...")
            
            await manager.broadcast(json.dumps({
                "type": "quantum_progress",
                "message": "Quantum optimization timed out, using classical fallback...",
                "progress": 50
            }))
            
            # Fallback to classical
            start_time = asyncio.get_event_loop().time()
            routes, total_distance = classical_solver.solve_vrp(
                distance_matrix, 
                request.vehicle_count
            )
            end_time = asyncio.get_event_loop().time()
            optimization_time = end_time - start_time
            
            logger.info(f"Classical fallback completed in {optimization_time:.2f}s")
            
            await manager.broadcast(json.dumps({
                "type": "quantum_progress",
                "message": "Classical fallback completed",
                "progress": 100
            }))
            
            return OptimizationResponse(
                routes=routes,
                total_distance=total_distance,
                total_time=total_distance / 50.0,
                optimization_time=optimization_time,
                method="quantum_with_classical_fallback"
            )
            
    except Exception as e:
        logger.error(f"Quantum optimization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Quantum optimization failed: {str(e)}")

@app.get("/api/graph/{location}")
async def get_graph(location: str):
    """Fetch street network graph for a given location"""
    try:
        logger.info(f"Fetching graph for location: {location}")
        graph_data = graph_builder.get_location_graph(location)
        return {"location": location, "graph": graph_data}
    except Exception as e:
        logger.error(f"Failed to fetch graph for {location}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch graph: {str(e)}")

@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time telemetry and progress updates"""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            # Echo back for testing
            await websocket.send_text(f"Message received: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/api/demo-data")
async def get_demo_data():
    """Get pre-seeded demo data for the application"""
    demo_data = {
        "depot": {
            "address": "Amaravati, Andhra Pradesh, India",
            "latitude": 16.5744,
            "longitude": 80.6556
        },
        "delivery_points": [
            {
                "address": "Vijayawada, Andhra Pradesh, India",
                "latitude": 16.5062,
                "longitude": 80.6480
            },
            {
                "address": "Guntur, Andhra Pradesh, India",
                "latitude": 16.2991,
                "longitude": 80.4575
            },
            {
                "address": "Nellore, Andhra Pradesh, India",
                "latitude": 14.4426,
                "longitude": 79.9865
            },
            {
                "address": "Kurnool, Andhra Pradesh, India",
                "latitude": 15.8281,
                "longitude": 78.0373
            },
            {
                "address": "Anantapur, Andhra Pradesh, India",
                "latitude": 14.6819,
                "longitude": 77.6006
            },
            {
                "address": "Kadapa, Andhra Pradesh, India",
                "latitude": 14.4753,
                "longitude": 78.8215
            },
            {
                "address": "Tirupati, Andhra Pradesh, India",
                "latitude": 13.6288,
                "longitude": 79.4192
            },
            {
                "address": "Visakhapatnam, Andhra Pradesh, India",
                "latitude": 17.6868,
                "longitude": 83.2185
            },
            {
                "address": "Rajahmundry, Andhra Pradesh, India",
                "latitude": 17.0005,
                "longitude": 81.8040
            },
            {
                "address": "Kakinada, Andhra Pradesh, India",
                "latitude": 16.9604,
                "longitude": 82.2389
            }
        ],
        "vehicle_count": 3
    }
    return demo_data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
