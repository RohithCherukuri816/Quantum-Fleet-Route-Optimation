from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
import json
import logging
from typing import List, Dict, Any
from pydantic import BaseModel
import requests
import os
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
if not OPENWEATHER_API_KEY:
    logger.error("OPENWEATHER_API_KEY not found in environment variables.")
    # In a real application, you might want to raise an exception or handle this more gracefully.
    # For now, we'll proceed but log the error.

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
if not GOOGLE_MAPS_API_KEY:
    logger.error("GOOGLE_MAPS_API_KEY not found in environment variables.")

def get_weather_data(latitude: float, longitude: float):
    if not OPENWEATHER_API_KEY:
        return {"error": "OpenWeather API key not configured"}
    
    base_url = "http://api.openweathermap.org/data/2.5/weather"
    params = {
        "lat": latitude,
        "lon": longitude,
        "appid": OPENWEATHER_API_KEY,
        "units": "metric"
    }
    
    try:
        response = requests.get(base_url, params=params)
        response.raise_for_status() # Raise an exception for HTTP errors
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching weather data: {e}")
        return {"error": str(e)}

@app.get("/api/weather/{latitude}/{longitude}")
async def get_weather(latitude: float, longitude: float):
    """Get real-time weather data for a given latitude and longitude"""
    logger.info(f"Fetching weather for lat: {latitude}, lon: {longitude}")
    weather_data = get_weather_data(latitude, longitude)
    if "error" in weather_data:
        raise HTTPException(status_code=500, detail=weather_data["error"])
    return weather_data

class WeatherData(BaseModel):
    temperature: float
    description: str
    icon: str
    wind_speed: float
    humidity: int

class TrafficData(BaseModel):
    duration_in_traffic: float  # in seconds
    distance: float             # in meters
    polyline: str               # encoded polyline of the route segment

class EnvironmentalFactors(BaseModel):
    weather: WeatherData | None = None
    traffic: TrafficData | None = None
    road_blockages: List[Dict[str, Any]] = [] # Flexible model for now

class SegmentEnvironmentalData(BaseModel):
    from_latitude: float
    from_longitude: float
    to_latitude: float
    to_longitude: float
    traffic_duration_minutes: float | None = None
    traffic_distance_km: float | None = None
    traffic_polyline: str | None = None
    weather: WeatherData | None = None
    road_blockage: bool = False # Derived from traffic for now

class VehicleRouteEnvironmentalData(BaseModel):
    vehicle_index: int
    segments: List[SegmentEnvironmentalData]

class AllVehicleEnvironmentalData(BaseModel):
    overall_weather: WeatherData | None = None
    vehicle_routes_env_data: List[VehicleRouteEnvironmentalData] = []

def get_directions_with_traffic(origin_lat: float, origin_lon: float, 
                                destination_lat: float, destination_lon: float,
                                waypoints: List[Dict[str, float]] = None):
    if not GOOGLE_MAPS_API_KEY:
        return {"error": "Google Maps API key not configured"}
    
    base_url = "https://maps.googleapis.com/maps/api/directions/json"
    
    origin_str = f"{origin_lat},{origin_lon}"
    destination_str = f"{destination_lat},{destination_lon}"
    
    params = {
        "origin": origin_str,
        "destination": destination_str,
        "key": GOOGLE_MAPS_API_KEY,
        "departure_time": "now", # Request real-time traffic
        "traffic_model": "best_guess" # Use best_guess for typical time in traffic
    }
    
    if waypoints:
        waypoint_str = "|".join([f"{w["latitude"]},{w["longitude"]}" for w in waypoints])
        params["waypoints"] = waypoint_str
    
    try:
        response = requests.get(base_url, params=params)
        response.raise_for_status() # Raise an exception for HTTP errors
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching Google Directions data: {e}")
        return {"error": str(e)}

class TrafficRouteRequest(BaseModel):
    origin_latitude: float
    origin_longitude: float
    destination_latitude: float
    destination_longitude: float
    waypoints: List[DeliveryPoint] = []

last_successful_optimization_data: OptimizationResponse | None = None # Global to store last optimization results
last_optimization_request_locations: List[Dict[str, Any]] | None = None # Store locations from the last request

@app.post("/api/directions-with-traffic")
async def get_traffic_directions(request: TrafficRouteRequest):
    """Get real-time traffic-aware directions using Google Maps Directions API"""
    logger.info(f"Fetching traffic directions from {request.origin_latitude},{request.origin_longitude} to {request.destination_latitude},{request.destination_longitude}")
    
    waypoints_data = [{
        "latitude": wp.latitude,
        "longitude": wp.longitude
    } for wp in request.waypoints]
    
    directions_data = get_directions_with_traffic(
        request.origin_latitude, request.origin_longitude,
        request.destination_latitude, request.destination_longitude,
        waypoints_data
    )
    
    if "error" in directions_data:
        raise HTTPException(status_code=500, detail=directions_data["error"])
    return directions_data

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
    # New field to store detailed traffic-aware route segment information
    detailed_route_segments: Dict[str, Any] = {}

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
        
        # Get traffic-aware cost matrix (time)
        cost_matrix, detailed_route_info = await graph_builder.get_traffic_aware_cost_matrix(
            locations, 
            get_directions_with_traffic
        )
        
        # Solve with classical solver
        start_time = asyncio.get_event_loop().time()
        routes, total_time = classical_solver.solve_vrp(
            cost_matrix, 
            request.vehicle_count
        )
        end_time = asyncio.get_event_loop().time()
        
        optimization_time = end_time - start_time
        
        # For simplicity, if we optimized for time, we can approximate distance
        # based on an average speed. A more accurate approach would be to get
        # distance from Google Directions API along with duration_in_traffic.
        total_distance = total_time * 0.833 # Assuming 50 km/h average speed (0.833 km/min)
        
        logger.info(f"Classical optimization completed in {optimization_time:.2f}s")
        
        response_data = OptimizationResponse(
            routes=routes,
            total_distance=total_distance,
            total_time=total_time,
            optimization_time=optimization_time,
            method="classical",
            detailed_route_segments=detailed_route_info # Include detailed route info
        )
        
        global last_successful_optimization_data
        global last_optimization_request_locations
        last_successful_optimization_data = response_data
        last_optimization_request_locations = locations
        
        return response_data
        
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
        
        # Get traffic-aware cost matrix (time)
        cost_matrix, detailed_route_info = await graph_builder.get_traffic_aware_cost_matrix(
            locations,
            get_directions_with_traffic
        )
        
        # Try quantum optimization with timeout
        try:
            start_time = asyncio.get_event_loop().time()
            
            # Send progress updates via WebSocket
            await manager.broadcast(json.dumps({
                "type": "quantum_progress",
                "message": "Starting QAOA optimization...",
                "progress": 10
            }))
            
            routes, total_time = await asyncio.wait_for(
                quantum_solver.solve_vrp_async(
                    cost_matrix,
                    request.vehicle_count
                ),
                timeout=30.0  # 30 second timeout
            )
            
            end_time = asyncio.get_event_loop().time()
            optimization_time = end_time - start_time
            
            # Approximate distance for now
            total_distance = total_time * 0.833 # Assuming 50 km/h average speed (0.833 km/min)
            
            logger.info(f"Quantum optimization completed in {optimization_time:.2f}s")
            
            await manager.broadcast(json.dumps({
                "type": "quantum_progress",
                "message": "QAOA optimization completed successfully!",
                "progress": 100
            }))
            
            response_data = OptimizationResponse(
                routes=routes,
                total_distance=total_distance,
                total_time=total_time,
                optimization_time=optimization_time,
                method="quantum",
                detailed_route_segments=detailed_route_info # Include detailed route info
            )
            
            global last_successful_optimization_data
            global last_optimization_request_locations
            last_successful_optimization_data = response_data
            last_optimization_request_locations = locations
            
            return response_data
            
        except asyncio.TimeoutError:
            logger.warning("Quantum optimization timed out, falling back to classical...")
            
            await manager.broadcast(json.dumps({
                "type": "quantum_progress",
                "message": "Quantum optimization timed out, using classical fallback...",
                "progress": 50
            }))
            
            # Fallback to classical
            start_time = asyncio.get_event_loop().time()
            routes, total_time = classical_solver.solve_vrp(
                cost_matrix,
                request.vehicle_count
            )
            end_time = asyncio.get_event_loop().time()
            optimization_time = end_time - start_time
            
            total_distance = total_time * 0.833 # Approximate distance for consistency
            
            logger.info(f"Classical fallback completed in {optimization_time:.2f}s")
            
            await manager.broadcast(json.dumps({
                "type": "quantum_progress",
                "message": "Classical fallback completed",
                "progress": 100
            }))
            
            response_data = OptimizationResponse(
                routes=routes,
                total_distance=total_distance,
                total_time=total_time,
                optimization_time=optimization_time,
                method="quantum_with_classical_fallback",
                detailed_route_segments=detailed_route_info # Include detailed route info
            )
            
            last_successful_optimization_data = response_data
            last_optimization_request_locations = locations
            
            return response_data
            
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
        # Get depot location for initial weather data
        # For now, using hardcoded demo depot coordinates
        depot_lat = 16.5744
        depot_lon = 80.6556
        
        while True:
            overall_weather_data = None
            # Fetch and broadcast overall weather data periodically
            weather_raw = get_weather_data(depot_lat, depot_lon)
            
            if "error" not in weather_raw:
                overall_weather_data = WeatherData(
                    temperature=weather_raw["main"]["temp"],
                    description=weather_raw["weather"][0]["description"],
                    icon=weather_raw["weather"][0]["icon"],
                    wind_speed=weather_raw["wind"]["speed"],
                    humidity=weather_raw["main"]["humidity"]
                )
            else:
                logger.error(f"Failed to fetch overall weather for WebSocket: {weather_raw['error']}")
            
            all_vehicle_env_data = AllVehicleEnvironmentalData(overall_weather=overall_weather_data)
            
            if last_successful_optimization_data and last_optimization_request_locations:
                vehicle_routes_env_data: List[VehicleRouteEnvironmentalData] = []
                
                for vehicle_index, route in enumerate(last_successful_optimization_data.routes):
                    segments_env_data: List[SegmentEnvironmentalData] = []
                    for i in range(len(route) - 1):
                        from_loc_idx = route[i]
                        to_loc_idx = route[i+1]
                        
                        from_loc = last_optimization_request_locations[from_loc_idx]
                        to_loc = last_optimization_request_locations[to_loc_idx]
                        
                        segment_key = f"{from_loc_idx}_{to_loc_idx}"
                        segment_info = last_successful_optimization_data.detailed_route_segments.get(segment_key, {})
                        
                        segment_weather_data = None
                        # Fetch weather for segment mid-point (simplified for now)
                        mid_lat = (from_loc['latitude'] + to_loc['latitude']) / 2
                        mid_lon = (from_loc['longitude'] + to_loc['longitude']) / 2
                        segment_weather_raw = get_weather_data(mid_lat, mid_lon)
                        if "error" not in segment_weather_raw:
                            segment_weather_data = WeatherData(
                                temperature=segment_weather_raw["main"]["temp"],
                                description=segment_weather_raw["weather"][0]["description"],
                                icon=segment_weather_raw["weather"][0]["icon"],
                                wind_speed=segment_weather_raw["wind"]["speed"],
                                humidity=segment_weather_raw["main"]["humidity"]
                            )
                        
                        segments_env_data.append(SegmentEnvironmentalData(
                            from_latitude=from_loc['latitude'],
                            from_longitude=from_loc['longitude'],
                            to_latitude=to_loc['latitude'],
                            to_longitude=to_loc['longitude'],
                            traffic_duration_minutes=segment_info.get("duration"),
                            traffic_distance_km=segment_info.get("distance"),
                            traffic_polyline=segment_info.get("polyline"),
                            weather=segment_weather_data,
                            road_blockage=False # Placeholder: derive from traffic_duration_minutes later
                        ))
                    vehicle_routes_env_data.append(VehicleRouteEnvironmentalData(
                        vehicle_index=vehicle_index,
                        segments=segments_env_data
                    ))
                all_vehicle_env_data.vehicle_routes_env_data = vehicle_routes_env_data
            
            await manager.broadcast(json.dumps({
                "type": "all_environmental_factors",
                "data": all_vehicle_env_data.model_dump()
            }))
            
            # Keep connection alive and handle incoming messages, sleep for a bit
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=10) 
                await websocket.send_text(f"Message received: {data}")
            except asyncio.TimeoutError:
                pass
            except Exception as e:
                logger.error(f"WebSocket receive error: {e}")
                break
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    
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
