import React, { useState, useEffect, useRef } from 'react';
import { Truck, Zap, Cpu, Loader } from 'lucide-react';
import axios from 'axios';
import RouteForm from './RouteForm';

const Sidebar = ({
  onOptimizationStart,
  onOptimizationComplete,
  isOptimizing,
  progress,
  progressMessage
}) => {
  const [demoData, setDemoData] = useState(null);
  const [optimizationMethod, setOptimizationMethod] = useState('quantum');
  const [pollingInterval, setPollingInterval] = useState(null);
  const latestResultsRef = useRef(null);

  useEffect(() => {
    // Load demo data on mount
    fetch('/api/demo-data')
      .then(res => res.json())
      .then(data => setDemoData(data))
      .catch(err => console.error('Failed to load demo data:', err));

    return () => clearInterval(pollingInterval);
  }, []);

  // Poll backend for live route updates
  const startPollingLiveUpdates = (payload) => {
    clearInterval(pollingInterval);

    const interval = setInterval(async () => {
      try {
        const res = await axios.post('http://localhost:8000/live-route-update', payload);
        if (res.data.ok) {
          latestResultsRef.current = res.data.results;
          onOptimizationComplete(res.data.results, payload.method);
        }
      } catch (err) {
        console.error('Live update error:', err);
      }
    }, 5000); // every 5 seconds

    setPollingInterval(interval);
  };

  const stopPollingLiveUpdates = () => {
    if (pollingInterval) clearInterval(pollingInterval);
  };

  const handleOptimize = async (payload) => {
    onOptimizationStart(payload.method, 'Initiating optimization...');
    setOptimizationMethod(payload.method);

    try {
      const response = await axios.post('http://localhost:8000/optimize-route', payload);

      if (response.data.ok) {
        onOptimizationComplete(response.data.results, payload.method);

        // Start polling live updates if needed
        startPollingLiveUpdates(payload);
      } else {
        alert('Optimization failed: ' + response.data.error);
        onOptimizationComplete(null, payload.method);
      }
    } catch (error) {
      console.error('API Error:', error);
      alert('An error occurred during optimization. Please check the backend server.');
      onOptimizationComplete(null, payload.method);
    }
  };

  const handleLoadDemo = () => {
    if (demoData) {
      const payload = {
        depot: demoData.depot,
        destinations: demoData.delivery_points,
        vehicleCount: 3, // default
        method: optimizationMethod
      };
      handleOptimize(payload);
    }
  };

  const getOptimizationIcon = (method) => {
    if (isOptimizing) return <Loader className="w-5 h-5 animate-spin" />;
    if (method === 'quantum') return <Zap className="w-5 h-5" />;
    return <Cpu className="w-5 h-5" />;
  };

  return (
    <div className="bg-slate-900 text-slate-300 h-screen w-96 p-6 overflow-y-auto shadow-lg">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <Truck size={32} className="text-blue-500" />
        <h1 className="text-2xl font-bold text-slate-100">Quantum Logistics</h1>
      </div>

      {/* Route Form */}
      <RouteForm onOptimize={handleOptimize} />

      {/* Load Demo Button */}
      <div className="mt-4">
        <button
          onClick={handleLoadDemo}
          className="w-full bg-slate-700 hover:bg-slate-600 text-sm font-medium py-2 px-4 rounded transition-colors"
          disabled={isOptimizing}
        >
          Load Demo Data
        </button>
      </div>

      {/* Optimization Progress */}
      {isOptimizing && (
        <div className="mt-6 p-4 bg-slate-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">Progress</span>
            <span className="text-sm text-slate-400">{progress}%</span>
          </div>
          <div className="w-full bg-slate-600 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-400 mt-2">{progressMessage}</p>
        </div>
      )}

      {/* How it works */}
      <div className="mt-6 p-4 bg-slate-700 rounded-lg">
        <h3 className="font-semibold text-slate-200 mb-2">How it works</h3>
        <div className="text-xs text-slate-400 space-y-1">
          <p>• <strong>Quantum:</strong> Uses QAOA with 30s timeout fallback</p>
          <p>• <strong>Classical:</strong> A classical greedy heuristic finds near-optimal routes</p>
          <p>• <strong>Live Data:</strong> Calculates "traffic-aware" routes in real-time</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
