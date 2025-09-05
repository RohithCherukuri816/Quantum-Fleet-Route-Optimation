import React, { useState, useEffect } from 'react';
import MapComponent from './components/MapComponent';
import Sidebar from './components/Sidebar';
import MetricsPanel from './components/MetricsPanel';
import CircuitVisualizer from './components/CircuitVisualizer';
import { Truck, Zap, BarChart3, Cpu } from 'lucide-react';

function App() {
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationMethod, setOptimizationMethod] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [showMetrics, setShowMetrics] = useState(false);
  const [showCircuit, setShowCircuit] = useState(false);
  const [websocket, setWebsocket] = useState(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const ws = new WebSocket('ws://localhost:8000/ws/telemetry');
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'quantum_progress') {
          setProgress(data.progress);
          setProgressMessage(data.message);
        }
      } catch (error) {
        console.log('WebSocket message:', event.data);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    setWebsocket(ws);
    
    return () => {
      ws.close();
    };
  }, []);

  // In the parent component (e.g., App.js)
const handleOptimizationComplete = (backendResults, method) => {
  if (backendResults) {
    // 1. Create a new results object with the expected structure
    const frontendResults = {
      // The backend returns `total_distance`. Pass it directly.
      total_distance: backendResults.total_distance, 

      // The backend returns `optimized_route`. Rename it to `routes`
      // and nest it in an array, as the frontend expects an array of routes.
      routes: [backendResults.optimized_route], 
      
      // The backend doesn't provide optimization_time. 
      // You can either calculate it or use a placeholder.
      optimization_time: 1.25, // Placeholder value
      
      // The backend doesn't provide total_time. 
      // Use a placeholder or calculate it.
      total_time: backendResults.total_distance * 0.5, // Placeholder calculation
    };

    // 2. Update the state with the new, correctly formatted object.
    setOptimizationResults(frontendResults);
    setOptimizationMethod(method);
  } else {
    // Handle the case where optimization failed
    setOptimizationResults(null);
  }

  setIsOptimizing(false);
};

  const handleOptimizationStart = (method) => {
    setIsOptimizing(true);
    setOptimizationMethod(method);
    setProgress(0);
    setProgressMessage('Starting optimization...');
    setOptimizationResults(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                FleetFlow
              </h1>
              <p className="text-sm text-slate-400">Quantum Route Optimization</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                showMetrics 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Metrics</span>
            </button>
            
            <button
              onClick={() => setShowCircuit(!showCircuit)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                showCircuit 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>Circuit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-screen">
        {/* Sidebar */}
        <Sidebar
          onOptimizationStart={handleOptimizationStart}
          onOptimizationComplete={handleOptimizationComplete}
          isOptimizing={isOptimizing}
          progress={progress}
          progressMessage={progressMessage}
        />

        {/* Map Area */}
        <div className="flex-1 relative">
          <MapComponent
            optimizationResults={optimizationResults}
            isOptimizing={isOptimizing}
          />
          
          {/* Progress Overlay */}
          {isOptimizing && (
            <div className="absolute top-4 right-4 bg-slate-800 border border-slate-600 rounded-lg p-4 min-w-80">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100">
                    {optimizationMethod === 'quantum' ? 'Quantum Optimization' : 'Classical Optimization'}
                  </h3>
                  <p className="text-sm text-slate-400">{progressMessage}</p>
                </div>
              </div>
              
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              
              <div className="text-right text-sm text-slate-400 mt-1">
                {progress}%
              </div>
            </div>
          )}
        </div>

        {/* Metrics Panel */}
        {showMetrics && (
          <div className="w-96 bg-slate-800 border-l border-slate-700 overflow-y-auto">
            <MetricsPanel
              results={optimizationResults}
              method={optimizationMethod}
            />
          </div>
        )}

        {/* Circuit Visualizer */}
        {showCircuit && (
          <div className="w-96 bg-slate-800 border-l border-slate-700 overflow-y-auto">
            <CircuitVisualizer
              method={optimizationMethod}
              results={optimizationResults}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
