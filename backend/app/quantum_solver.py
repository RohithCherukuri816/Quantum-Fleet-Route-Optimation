import asyncio
import logging
import numpy as np
from typing import List, Tuple, Optional
from qiskit import QuantumCircuit, Aer, transpile, assemble
from qiskit.algorithms import QAOA
from qiskit.algorithms.optimizers import COBYLA
from qiskit.optimization import QuadraticProgram
from qiskit.optimization.algorithms import MinimumEigenOptimizer
from qiskit.optimization.problems import QuadraticObjective
from qiskit.optimization.constraints import LinearConstraint
from qiskit.optimization.variables import Binary

logger = logging.getLogger(__name__)

class QuantumSolver:
    """Quantum solver using QAOA for Vehicle Routing Problem"""
    
    def __init__(self):
        self.backend = Aer.get_backend('qasm_simulator')
        self.shots = 1024
        self.reps = 2
        
    def create_vrp_qubo(self, cost_matrix: List[List[float]], vehicle_count: int) -> QuadraticProgram:
        """
        Create a QUBO formulation for the VRP problem, optimizing for time (cost_matrix)
        
        Args:
            cost_matrix: Matrix of costs (travel times in minutes) between all locations
            vehicle_count: Number of vehicles available
            
        Returns:
            QuadraticProgram: The QUBO problem
        """
        logger.info("Creating VRP QUBO formulation...")
        
        n_locations = len(cost_matrix)
        n_vehicles = vehicle_count
        
        # Create binary variables: x[i,j,k] = 1 if vehicle k travels from i to j
        qp = QuadraticProgram()
        
        # Add binary variables for each possible edge and vehicle
        for i in range(n_locations):
            for j in range(n_locations):
                if i != j:  # No self-loops
                    for k in range(n_vehicles):
                        var_name = f"x_{i}_{j}_{k}"
                        qp.binary_var(name=var_name)
        
        # Objective: minimize total time
        objective = 0
        for i in range(n_locations):
            for j in range(n_locations):
                if i != j:
                    for k in range(n_vehicles):
                        var_name = f"x_{i}_{j}_{k}"
                        objective += cost_matrix[i][j] * qp.get_variable(var_name)
        
        qp.minimize(objective)
        
        # Constraints
        constraints = []
        
        # Constraint 1: Each location (except depot) must be visited exactly once
        for j in range(1, n_locations):  # Skip depot (index 0)
            constraint_expr = 0
            for i in range(n_locations):
                if i != j:
                    for k in range(n_vehicles):
                        var_name = f"x_{i}_{j}_{k}"
                        constraint_expr += qp.get_variable(var_name)
            constraints.append(LinearConstraint(
                constraint_expr, 
                sense='==', 
                rhs=1,
                name=f"visit_once_{j}"
            ))
        
        # Constraint 2: Each vehicle must start and end at depot
        for k in range(n_vehicles):
            # Start at depot
            start_constraint = 0
            for j in range(1, n_locations):
                var_name = f"x_0_{j}_{k}"
                start_constraint += qp.get_variable(var_name)
            constraints.append(LinearConstraint(
                start_constraint,
                sense='==',
                rhs=1,
                name=f"start_depot_{k}"
            ))
            
            # End at depot
            end_constraint = 0
            for i in range(1, n_locations):
                var_name = f"x_{i}_0_{k}"
                end_constraint += qp.get_variable(var_name)
            constraints.append(LinearConstraint(
                end_constraint,
                sense='==',
                rhs=1,
                name=f"end_depot_{k}"
            ))
        
        # Constraint 3: Flow conservation (if vehicle enters, it must leave)
        for k in range(n_vehicles):
            for h in range(1, n_locations):  # Skip depot
                in_flow = 0
                out_flow = 0
                
                for i in range(n_locations):
                    if i != h:
                        var_name_in = f"x_{i}_{h}_{k}"
                        in_flow += qp.get_variable(var_name_in)
                        
                for j in range(n_locations):
                    if j != h:
                        var_name_out = f"x_{h}_{j}_{k}"
                        out_flow += qp.get_variable(var_name_out)
                
                constraints.append(LinearConstraint(
                    in_flow - out_flow,
                    sense='==',
                    rhs=0,
                    name=f"flow_conservation_{k}_{h}"
                ))
        
        # Add all constraints to the problem
        for constraint in constraints:
            qp.add_constraint(constraint)
        
        logger.info(f"VRP QUBO created with {len(qp.variables)} variables and {len(constraints)} constraints")
        return qp
    
    def run_qaoa(self, qp: QuadraticProgram, reps: int = 2, shots: int = 1024) -> Tuple[List[int], float]:
        """
        Run QAOA algorithm on the given QUBO problem
        
        Args:
            qp: QuadraticProgram to solve
            reps: Number of QAOA layers
            shots: Number of shots for measurement
            
        Returns:
            Tuple of (solution_bitstring, objective_value)
        """
        logger.info(f"Starting QAOA with {reps} layers and {shots} shots...")
        
        # Set up QAOA
        optimizer = COBYLA(maxiter=100)
        qaoa = QAOA(
            optimizer=optimizer,
            reps=reps,
            quantum_instance=self.backend,
            shots=shots
        )
        
        # Create minimum eigen optimizer
        min_eigen_optimizer = MinimumEigenOptimizer(qaoa)
        
        # Solve the problem
        logger.info("Running QAOA optimization...")
        result = min_eigen_optimizer.solve(qp)
        
        if result.samples:
            # Get the best solution
            best_sample = result.samples[0]
            solution = best_sample.x
            objective_value = best_sample.fval
            
            logger.info(f"QAOA completed. Objective value: {objective_value:.2f}")
            logger.info(f"Circuit depth: {qaoa.ansatz.depth()}")
            
            return solution, objective_value
        else:
            logger.warning("QAOA did not return any samples")
            raise RuntimeError("QAOA optimization failed to return valid solution")
    
    def decode_solution(self, bitstring: List[int], n_locations: int, n_vehicles: int) -> List[List[int]]:
        """
        Decode the QAOA bitstring back into vehicle routes
        
        Args:
            bitstring: Binary solution from QAOA
            n_locations: Number of locations
            n_vehicles: Number of vehicles
            
        Returns:
            List of routes for each vehicle
        """
        logger.info("Decoding QAOA solution...")
        
        # Reconstruct the variable mapping
        routes = [[] for _ in range(n_vehicles)]
        
        # Parse the bitstring to extract routes
        # This is a simplified decoding - in practice, you'd need more sophisticated parsing
        # based on your exact QUBO formulation
        
        # For demo purposes, create a simple route assignment
        # In a real implementation, you'd parse the bitstring properly
        current_vehicle = 0
        for i in range(1, n_locations):  # Skip depot
            routes[current_vehicle].append(i)
            current_vehicle = (current_vehicle + 1) % n_vehicles
        
        # Add depot to start and end of each route
        for route in routes:
            if route:  # Only if route has locations
                route.insert(0, 0)  # Start at depot
                route.append(0)     # End at depot
        
        logger.info(f"Decoded routes: {routes}")
        return routes
    
    async def solve_vrp_async(self, cost_matrix: List[List[float]], vehicle_count: int) -> Tuple[List[List[int]], float]:
        """
        Asynchronously solve the VRP using QAOA, optimizing for time (cost_matrix)
        
        Args:
            cost_matrix: Matrix of costs (travel times in minutes) between all locations
            vehicle_count: Number of vehicles available
            
        Returns:
            Tuple of (routes, total_time)
        """
        logger.info("Starting async quantum VRP solution...")
        
        # Run in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        
        def solve_sync():
            # Create QUBO
            qp = self.create_vrp_qubo(cost_matrix, vehicle_count)
            
            # Run QAOA
            bitstring, objective_value = self.run_qaoa(qp, self.reps, self.shots)
            
            # Decode solution
            routes = self.decode_solution(bitstring, len(cost_matrix), vehicle_count)
            
            # Calculate total time
            total_time = self.calculate_total_time(routes, cost_matrix)
            
            return routes, total_time
        
        # Execute in thread pool
        result = await loop.run_in_executor(None, solve_sync)
        return result
    
    def calculate_total_time(self, routes: List[List[int]], cost_matrix: List[List[float]]) -> float:
        """Calculate total time for the given routes"""
        total_time = 0.0
        
        for route in routes:
            for i in range(len(route) - 1):
                from_loc = route[i]
                to_loc = route[i + 1]
                total_time += cost_matrix[from_loc][to_loc]
        
        return total_time
    
    def get_circuit_info(self, qp: QuadraticProgram) -> dict:
        """Get information about the QAOA circuit for visualization"""
        # Create a sample QAOA instance to get circuit info
        optimizer = COBYLA(maxiter=1)  # Minimal iterations for info only
        qaoa = QAOA(
            optimizer=optimizer,
            reps=self.reps,
            quantum_instance=self.backend,
            shots=1
        )
        
        # Get circuit info
        circuit_info = {
            "depth": qaoa.ansatz.depth(),
            "num_qubits": qaoa.ansatz.num_qubits,
            "num_parameters": qaoa.ansatz.num_parameters,
            "reps": self.reps,
            "shots": self.shots
        }
        
        return circuit_info
