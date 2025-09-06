import logging
import math
from typing import List, Dict, Any, Tuple
from geopy.distance import geodesic
import numpy as np
import asyncio

logger = logging.getLogger(__name__)

class GraphBuilder:
    """Graph builder for location-based routing with distance calculations"""
    
    def __init__(self):
        self.cache = {}  # Simple cache for distance matrices
        
    def get_distance_matrix(self, locations: List[Dict[str, Any]]) -> List[List[float]]:
        """
        Calculate distance matrix between all locations
        
        Args:
            locations: List of location dictionaries with 'latitude' and 'longitude'
            
        Returns:
            Distance matrix as 2D list
        """
        logger.info(f"Calculating distance matrix for {len(locations)} locations...")
        
        n = len(locations)
        distance_matrix = [[0.0 for _ in range(n)] for _ in range(n)]
        
        for i in range(n):
            for j in range(n):
                if i != j:
                    # Calculate geodesic distance between two points
                    point1 = (locations[i]['latitude'], locations[i]['longitude'])
                    point2 = (locations[j]['latitude'], locations[j]['longitude'])
                    
                    # Use geodesic distance for accurate real-world distances
                    distance = geodesic(point1, point2).kilometers
                    distance_matrix[i][j] = distance
                else:
                    distance_matrix[i][j] = 0.0
        
        logger.info("Distance matrix calculated successfully")
        return distance_matrix
    
    async def get_traffic_aware_cost_matrix(self, 
                                          locations: List[Dict[str, Any]], 
                                          async_directions_func: Any) -> Tuple[List[List[float]], Dict[str, Any]]:
        """
        Calculate a cost matrix (time in traffic) between all locations
        using a provided asynchronous directions function.
        
        Args:
            locations: List of location dictionaries with 'latitude' and 'longitude'
            async_directions_func: An asynchronous function that takes 
                                   (origin_lat, origin_lon, dest_lat, dest_lon) 
                                   and returns traffic-aware directions data.
            
        Returns:
            Tuple of (Cost matrix (travel time in minutes) as 2D list, 
                      Dictionary of detailed route info for each segment)
        """
        logger.info(f"Calculating traffic-aware cost matrix for {len(locations)} locations...")
        
        n = len(locations)
        cost_matrix = [[0.0 for _ in range(n)] for _ in range(n)]
        detailed_route_info = {}
        
        tasks = []
        task_keys = [] # To map results back to (i, j)
        
        for i in range(n):
            for j in range(n):
                if i != j:
                    origin_lat, origin_lon = locations[i]['latitude'], locations[i]['longitude']
                    dest_lat, dest_lon = locations[j]['latitude'], locations[j]['longitude']
                    tasks.append(async_directions_func(origin_lat, origin_lon, dest_lat, dest_lon))
                    task_keys.append(f"{i}_{j}")
                else:
                    tasks.append(asyncio.sleep(0)) # Placeholder for same-point, effectively 0 cost
                    task_keys.append(f"{i}_{j}") # Still add key for consistent indexing
        
        results = await asyncio.gather(*tasks)
        
        task_idx = 0
        for i in range(n):
            for j in range(n):
                if i == j:
                    cost_matrix[i][j] = 0.0
                    detailed_route_info[f"{i}_{j}"] = {"duration": 0, "distance": 0, "polyline": ""}
                else:
                    directions_data = results[task_idx]
                    
                    # Extract duration in traffic. Fallback to a default if not available.
                    # Google Directions API returns duration_in_traffic in seconds
                    duration_seconds = 0
                    distance_meters = 0
                    polyline = ""
                    try:
                        leg = directions_data['routes'][0]['legs'][0]
                        duration_seconds = leg['duration_in_traffic']['value']
                        distance_meters = leg['distance']['value']
                        polyline = directions_data['routes'][0]['overview_polyline']['points']
                        
                        cost_matrix[i][j] = duration_seconds / 60.0 # Convert to minutes
                        detailed_route_info[task_keys[task_idx]] = {
                            "duration": duration_seconds / 60.0,
                            "distance": distance_meters / 1000.0, # Convert to km
                            "polyline": polyline
                        }
                    except (KeyError, IndexError, TypeError):
                        logger.warning(f"Could not get traffic duration for route from {i} to {j}. Falling back to geodesic distance based estimation.")
                        # Fallback to geodesic distance if traffic data is not available
                        point1 = (locations[i]['latitude'], locations[i]['longitude'])
                        point2 = (locations[j]['latitude'], locations[j]['longitude'])
                        distance_km = geodesic(point1, point2).kilometers
                        
                        cost_matrix[i][j] = distance_km / 0.833 # Assuming average speed of 50 km/h (50/60 = 0.833 km/min)
                        detailed_route_info[task_keys[task_idx]] = {
                            "duration": cost_matrix[i][j],
                            "distance": distance_km,
                            "polyline": "" # No polyline for geodesic fallback
                        }
                    task_idx += 1
        
        logger.info("Traffic-aware cost matrix calculated successfully")
        return cost_matrix, detailed_route_info
    
    def get_location_graph(self, location: str) -> Dict[str, Any]:
        """
        Get street network graph for a given location
        This is a simplified version - in production you'd use OSMnx
        
        Args:
            location: Location string (e.g., "Amaravati, India")
            
        Returns:
            Graph data structure
        """
        logger.info(f"Fetching graph for location: {location}")
        
        # For demo purposes, return a simplified graph structure
        # In production, this would fetch real OSM data
        graph_data = {
            "location": location,
            "nodes": [],
            "edges": [],
            "metadata": {
                "source": "simplified_demo",
                "node_count": 0,
                "edge_count": 0
            }
        }
        
        logger.info(f"Graph data prepared for {location}")
        return graph_data
    
    def calculate_route_distance(self, route: List[int], distance_matrix: List[List[float]]) -> float:
        """Calculate total distance for a specific route"""
        total_distance = 0.0
        
        for i in range(len(route) - 1):
            from_loc = route[i]
            to_loc = route[i + 1]
            total_distance += distance_matrix[from_loc][to_loc]
        
        return total_distance
    
    def get_nearest_neighbor_route(self, distance_matrix: List[List[float]], start_node: int = 0) -> List[int]:
        """
        Generate a simple nearest neighbor route for comparison
        
        Args:
            distance_matrix: Distance matrix
            start_node: Starting node index
            
        Returns:
            Route as list of node indices
        """
        n = len(distance_matrix)
        unvisited = set(range(n))
        unvisited.remove(start_node)
        
        route = [start_node]
        current = start_node
        
        while unvisited:
            # Find nearest unvisited neighbor
            nearest = min(unvisited, key=lambda x: distance_matrix[current][x])
            route.append(nearest)
            unvisited.remove(nearest)
            current = nearest
        
        # Return to start
        route.append(start_node)
        
        return route
    
    def validate_locations(self, locations: List[Dict[str, Any]]) -> bool:
        """Validate that all locations have required coordinates"""
        for i, location in enumerate(locations):
            if 'latitude' not in location or 'longitude' not in location:
                logger.error(f"Location {i} missing coordinates: {location}")
                return False
            
            lat = location['latitude']
            lon = location['longitude']
            
            if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
                logger.error(f"Location {i} has invalid coordinates: lat={lat}, lon={lon}")
                return False
        
        return True
