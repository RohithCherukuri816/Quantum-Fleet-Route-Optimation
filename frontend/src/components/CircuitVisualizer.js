import React, { useState, useEffect } from 'react';
import { Cpu, Zap, Layers, Clock, Target, BarChart3, Play, Pause, RotateCcw } from 'lucide-react';

const CircuitVisualizer = ({ method, results }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentLayer, setCurrentLayer] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (isAnimating && method === 'quantum') {
      const interval = setInterval(() => {
        setCurrentLayer(prev => {
          if (prev >= 2) {
            setIsAnimating(false);
            return 2;
          }
          return prev + 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isAnimating, method]);

  const startAnimation = () => {
    setCurrentLayer(0);
    setIsAnimating(true);
  };

  const stopAnimation = () => {
    setIsAnimating(false);
  };

  const resetAnimation = () => {
    setCurrentLayer(0);
    setIsAnimating(false);
  };

  const getCircuitInfo = () => {
    if (method === 'quantum' || method === 'quantum_with_classical_fallback') {
      return {
        depth: 8,
        qubits: 24,
        parameters: 16,
        layers: 2,
        shots: 1024,
        optimizer: 'COBYLA',
        maxIterations: 100
      };
    }
    return null;
  };

  const renderQuantumCircuit = () => {
    const circuitInfo = getCircuitInfo();
    if (!circuitInfo) return null;

    return (
      <div className="space-y-4">
        {/* Circuit Visualization */}
        <div className="bg-slate-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-200 mb-3">QAOA Circuit</h4>
          <div className="space-y-2">
            {Array.from({ length: circuitInfo.layers }, (_, layerIndex) => (
              <div key={layerIndex} className="flex items-center space-x-2">
                <div className={`w-4 h-4 rounded-full ${
                  layerIndex <= currentLayer 
                    ? 'bg-blue-500 animate-pulse' 
                    : 'bg-slate-600'
                }`}></div>
                <span className="text-xs text-slate-300">
                  Layer {layerIndex + 1}: {layerIndex === 0 ? 'Cost' : 'Mixer'} Hamiltonian
                </span>
              </div>
            ))}
          </div>
          
          {/* Circuit Diagram */}
          <div className="mt-4 p-3 bg-slate-800 rounded border border-slate-600">
            <div className="text-xs text-slate-400 font-mono text-center">
              {Array.from({ length: circuitInfo.qubits }, (_, i) => (
                <div key={i} className="flex items-center space-x-1 mb-1">
                  <span className="w-8 text-right">{i}</span>
                  <div className="flex-1 h-0.5 bg-slate-600 relative">
                    {Array.from({ length: circuitInfo.layers }, (_, layer) => (
                      <div
                        key={layer}
                        className={`absolute w-2 h-2 rounded-full ${
                          layer <= currentLayer ? 'bg-blue-500' : 'bg-slate-500'
                        }`}
                        style={{ left: `${(layer + 1) * 20}%` }}
                      ></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Circuit Parameters */}
        <div className="bg-slate-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-200 mb-3">Circuit Parameters</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Depth:</span>
              <span className="text-slate-200 font-mono">{circuitInfo.depth}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Qubits:</span>
              <span className="text-slate-200 font-mono">{circuitInfo.qubits}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Parameters:</span>
              <span className="text-slate-200 font-mono">{circuitInfo.parameters}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Shots:</span>
              <span className="text-slate-200 font-mono">{circuitInfo.shots}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Optimizer:</span>
              <span className="text-slate-200 font-mono">{circuitInfo.optimizer}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Max Iter:</span>
              <span className="text-slate-200 font-mono">{circuitInfo.maxIterations}</span>
            </div>
          </div>
        </div>

        {/* Animation Controls */}
        <div className="bg-slate-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-200 mb-3">Circuit Animation</h4>
          <div className="flex space-x-2">
            <button
              onClick={startAnimation}
              disabled={isAnimating}
              className="flex items-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-md text-sm transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>Start</span>
            </button>
            <button
              onClick={stopAnimation}
              disabled={!isAnimating}
              className="flex items-center space-x-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-600 text-white rounded-md text-sm transition-colors"
            >
              <Pause className="w-4 h-4" />
              <span>Pause</span>
            </button>
            <button
              onClick={resetAnimation}
              className="flex items-center space-x-1 px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-md text-sm transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderClassicalFallback = () => {
    if (method !== 'quantum_with_classical_fallback') return null;

    return (
      <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <Cpu className="w-5 h-5 text-yellow-400" />
          <h4 className="text-sm font-semibold text-yellow-200">Classical Fallback Activated</h4>
        </div>
        <p className="text-xs text-yellow-300">
          Quantum optimization timed out after 30 seconds. OR-Tools classical solver was used as fallback.
        </p>
      </div>
    );
  };

  const renderOptimizationProcess = () => {
    if (!results) return null;

    const optimizationTime = typeof results.optimization_time === 'number'
      ? `${results.optimization_time.toFixed(2)}s`
      : 'N/A';

    const totalDistance = typeof results.total_distance === 'number'
      ? `${results.total_distance.toFixed(1)} km`
      : 'N/A';

    return (
      <div className="bg-slate-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-slate-200 mb-3">Optimization Process</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Method:</span>
            <span className="text-slate-200">{method || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Total Time:</span>
            <span className="text-slate-200">{optimizationTime}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Routes Found:</span>
            <span className="text-slate-200">{results.routes ? results.routes.length : 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Total Distance:</span>
            <span className="text-slate-200">{totalDistance}</span>
          </div>
        </div>
      </div>
    );
  };

  if (!method || !results) {
    return (
      <div className="p-6">
        <div className="text-center text-slate-400">
          <Cpu className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Run quantum optimization to see circuit details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-2">
          <Cpu className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-bold text-slate-100">Quantum Circuit</h2>
        </div>
        <p className="text-sm text-slate-400">
          QAOA algorithm visualization and parameters
        </p>
      </div>

      {/* Classical Fallback Warning */}
      {renderClassicalFallback()}

      {/* Quantum Circuit */}
      {renderQuantumCircuit()}

      {/* Optimization Process */}
      {renderOptimizationProcess()}

      {/* Additional Info */}
      <div className="mt-6 p-4 bg-slate-700 rounded-lg">
        <h4 className="text-sm font-semibold text-slate-200 mb-3">About QAOA</h4>
        <div className="text-xs text-slate-400 space-y-2">
          <p>
            <strong>Quantum Approximate Optimization Algorithm (QAOA)</strong> is a hybrid 
            quantum-classical algorithm that uses quantum circuits to find approximate 
            solutions to combinatorial optimization problems.
          </p>
          <p>
            The algorithm alternates between applying a cost Hamiltonian (problem-specific) 
            and a mixer Hamiltonian (mixing operator) to explore the solution space.
          </p>
          <p>
            <strong>Circuit Depth:</strong> {getCircuitInfo()?.depth || 'N/A'} gates<br/>
            <strong>Qubits:</strong> {getCircuitInfo()?.qubits || 'N/A'} quantum bits<br/>
            <strong>Parameters:</strong> {getCircuitInfo()?.parameters || 'N/A'} classical parameters
          </p>
        </div>
      </div>
    </div>
  );
};

export default CircuitVisualizer;
