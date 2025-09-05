import logging
import math
from typing import List, Dict, Any
from geopy.distance import geodesic
import numpy as np

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
