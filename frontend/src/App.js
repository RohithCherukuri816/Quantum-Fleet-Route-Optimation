import React, { useState, useEffect } from 'react';
import MapComponent from './components/MapComponent';
import Sidebar from './components/Sidebar';
import MetricsPanel from './components/MetricsPanel';
import CircuitVisualizer from './components/CircuitVisualizer';
import { Truck, Zap, BarChart3, Cpu } from 'lucide-react';
import Loader from './Loader';

function App() {
    const [optimizationResults, setOptimizationResults] = useState(null);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizationMethod, setOptimizationMethod] = useState(null);
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');
    const [showMetrics, setShowMetrics] = useState(false); // Default to false
    const [showCircuit, setShowCircuit] = useState(false); // Default to false
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

        ws.onclose = () => {
            console.log('WebSocket disconnected');
        };
        
        setWebsocket(ws);

        return () => {
            if (ws) ws.close();
        };
    }, []);

    const handleOptimizationStart = (method, message) => {
        setIsOptimizing(true);
        setProgress(0);
        setProgressMessage(message);
        setOptimizationMethod(method);
        setOptimizationResults(null);
    };
    
    const handleOptimizationComplete = (results, method) => {
        setIsOptimizing(false);
        setProgress(100);
        setProgressMessage("Optimization complete!");
        setOptimizationResults(results);
        setOptimizationMethod(method);
    };

    const toggleMetrics = () => setShowMetrics(!showMetrics);
    const toggleCircuit = () => setShowCircuit(!showCircuit);

    return (
        <div className="flex h-screen bg-slate-900 text-slate-300">
            {/* Sidebar */}
            <Sidebar 
                onOptimizationStart={handleOptimizationStart}
                onOptimizationComplete={handleOptimizationComplete}
                isOptimizing={isOptimizing}
                progress={progress}
                progressMessage={progressMessage}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                {/* Header/Controls */}
                <div className="flex-none p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl font-bold text-slate-100">Live Route Optimization</h1>
                        {isOptimizing && (
                            <div className="flex items-center space-x-2 text-sm">
                                <Loader className="w-4 h-4 animate-spin" />
                                <span>Optimizing with {optimizationMethod === 'quantum' ? 'Quantum' : 'Classical'}...</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={toggleMetrics}
                            className={`p-2 rounded-lg transition-colors ${showMetrics ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                            title="Toggle Metrics Panel"
                        >
                            <BarChart3 size={20} />
                        </button>
                        <button
                            onClick={toggleCircuit}
                            className={`p-2 rounded-lg transition-colors ${showCircuit ? 'bg-purple-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                            title="Toggle Quantum Circuit Visualizer"
                        >
                            <Zap size={20} />
                        </button>
                    </div>
                </div>
                
                {/* Map */}
                <div className="flex-1 relative">
                    <MapComponent
                        optimizationResults={optimizationResults}
                        isOptimizing={isOptimizing}
                    />
                </div>
            </div>
            
            {/* Right Panels */}
            {showMetrics && (
                <div className="w-96 bg-slate-800 border-l border-slate-700 overflow-y-auto">
                    <MetricsPanel
                        results={optimizationResults}
                        method={optimizationMethod}
                    />
                </div>
            )}
            
            {showCircuit && (
                <div className="w-96 bg-slate-800 border-l border-slate-700 overflow-y-auto">
                    <CircuitVisualizer
                        method={optimizationMethod}
                        results={optimizationResults}
                    />
                </div>
            )}
        </div>
    );
}

export default App;
