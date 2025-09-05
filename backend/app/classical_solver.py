import logging
from typing import List, Tuple
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

logger = logging.getLogger(__name__)

class ClassicalSolver:
    """Classical solver using OR-Tools for Vehicle Routing Problem"""
    
    def __init__(self):
        self.time_limit = 30  # seconds
        
    def solve_vrp(self, distance_matrix: List[List[float]], vehicle_count: int) -> Tuple[List[List[int]], float]:
        """
        Solve the VRP using OR-Tools
        
        Args:
            distance_matrix: Matrix of distances between all locations
            vehicle_count: Number of vehicles available
            
        Returns:
            Tuple of (routes, total_distance)
        """
        logger.info(f"Starting classical VRP solution with {vehicle_count} vehicles...")
        
        # Create the routing index manager
        manager = pywrapcp.RoutingIndexManager(
            len(distance_matrix), 
            vehicle_count, 
            0  # depot index
        )
        
        # Create routing model
        routing = pywrapcp.RoutingModel(manager)
        
        # Create and register a transit callback
        def distance_callback(from_index, to_index):
            """Returns the distance between the two nodes."""
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return distance_matrix[from_node][to_node]
        
        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        
        # Define cost of each arc
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
        
        # Add Distance constraint
        dimension_name = 'Distance'
        routing.AddDimension(
            transit_callback_index,
            0,  # no slack
            3000,  # vehicle maximum travel distance
            True,  # start cumul to zero
            dimension_name
        )
        distance_dimension = routing.GetDimensionOrDie(dimension_name)
        distance_dimension.SetGlobalSpanCostCoefficient(100)
        
        # Setting first solution heuristic
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )
        search_parameters.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
        )
        search_parameters.time_limit.seconds = self.time_limit
        
        # Solve the problem
        logger.info("Running OR-Tools optimization...")
        solution = routing.SolveWithParameters(search_parameters)
        
        if solution:
            logger.info("Classical optimization completed successfully")
            routes, total_distance = self._extract_solution(
                routing, manager, solution, distance_matrix
            )
            return routes, total_distance
        else:
            logger.error("Classical optimization failed to find solution")
            raise RuntimeError("OR-Tools failed to find a solution")
    
    def _extract_solution(self, routing, manager, solution, distance_matrix):
        """Extract routes and calculate total distance from OR-Tools solution"""
        routes = []
        total_distance = 0
        
        for vehicle_id in range(routing.vehicles()):
            route = []
            index = routing.Start(vehicle_id)
            
            while not routing.IsEnd(index):
                node_index = manager.IndexToNode(index)
                route.append(node_index)
                previous_index = index
                index = solution.Value(routing.NextVar(index))
                total_distance += distance_matrix[manager.IndexToNode(previous_index)][manager.IndexToNode(index)]
            
            # Add the end node (depot)
            route.append(manager.IndexToNode(index))
            
            if len(route) > 1:  # Only add non-empty routes
                routes.append(route)
        
        logger.info(f"Extracted {len(routes)} routes with total distance: {total_distance:.2f}")
        return routes, total_distance
    
    def get_solver_info(self) -> dict:
        """Get information about the classical solver"""
        return {
            "solver": "OR-Tools",
            "time_limit": self.time_limit,
            "algorithm": "Guided Local Search",
            "first_solution": "Path Cheapest Arc"
        }
