// App.js
import React, { useState, useEffect } from 'react';
import MapComponent from './components/MapComponent';
import Sidebar from './components/Sidebar';
import MetricsPanel from './components/MetricsPanel';
import CircuitVisualizer from './components/CircuitVisualizer';
import { BarChart3, Zap } from 'lucide-react';
import Loader from './Loader';

function App() {
    const [optimizationResults, setOptimizationResults] = useState(null);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizationMethod, setOptimizationMethod] = useState(null);
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');
    const [showMetrics, setShowMetrics] = useState(false);
    const [showCircuit, setShowCircuit] = useState(false);
    const [selectedRouteIndex, setSelectedRouteIndex] = useState(null);
    // New state for map layer
    const [mapLayer, setMapLayer] = useState("OpenStreetMap");

    const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    const OPENWEATHER_API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY;
    console.log("Google Maps API Key:", GOOGLE_MAPS_API_KEY);

    // WebSocket for live telemetry & route updates
    useEffect(() => {
        const ws = new WebSocket('ws://localhost:8000/ws/telemetry');

        ws.onopen = () => {
            console.log('WebSocket connected');
            ws.send(JSON.stringify({ type: 'client_init', message: 'Hello from client!' }));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'quantum_progress') {
                    setProgress(data.progress);
                    setProgressMessage(data.message);
                }

                if (data.type === 'live_route_update') {
                    const results = data.results || null;
                    setOptimizationResults(results);
                    setProgressMessage("Live route updated based on real-time conditions.");
                    setIsOptimizing(false);

                    if (results?.routes?.length > 0) {
                        setSelectedRouteIndex(0);
                    } else {
                        setSelectedRouteIndex(null);
                    }
                }
            } catch (error) {
                console.log('WebSocket message:', event.data);
            }
        };

        ws.onclose = () => console.log('WebSocket disconnected');

        return () => ws.close();
    }, []);
    
    // New handler to update the map layer
    const handleMapLayerChange = (layer) => {
        setMapLayer(layer);
    };

    const handleOptimizationStart = (payload, message) => {
        setIsOptimizing(true);
        setProgress(0);
        setProgressMessage(message || 'Starting optimization...');
        setOptimizationMethod(payload.method);
        setOptimizationResults(null);
        setSelectedRouteIndex(null);
    };

    const handleOptimizationComplete = (results, method) => {
        setIsOptimizing(false);
        setProgress(100);
        setProgressMessage("Optimization complete!");
        setOptimizationResults(results);
        setOptimizationMethod(method);

        if (results?.routes?.length > 0) {
            setSelectedRouteIndex(0);
        } else {
            setSelectedRouteIndex(null);
        }
    };

    const toggleMetrics = () => setShowMetrics(prev => !prev);
    const toggleCircuit = () => setShowCircuit(prev => !prev);

    return (
        <div className="flex h-screen bg-slate-900 text-slate-300">
            {/* Sidebar for optimization controls */}
            <Sidebar
                onOptimizationStart={handleOptimizationStart}
                onOptimizationComplete={handleOptimizationComplete}
                isOptimizing={isOptimizing}
                progress={progress}
                progressMessage={progressMessage}
                onMapLayerChange={handleMapLayerChange}
            />

            {/* Main content: Map and top bar */}
            <div className="flex-1 flex flex-col">
                <div className="flex-none p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl font-bold text-slate-100">Live Route Optimization</h1>
                        {isOptimizing && (
                            <div className="flex items-center space-x-2 text-sm">
                                <Loader className="w-4 h-4 animate-spin" />
                                <span>
                                    Optimizing with {optimizationMethod === 'quantum' ? 'Quantum' : 'Classical'}...
                                </span>
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

                <div className="flex-1 relative">
                    <MapComponent
                        optimizationResults={optimizationResults}
                        selectedRouteIndex={selectedRouteIndex ?? 0}
                        googleMapsApiKey={GOOGLE_MAPS_API_KEY}
                        openWeatherApiKey={OPENWEATHER_API_KEY}
                        mapLayer={mapLayer}
                    />
                </div>
            </div>

            {/* Right side panels */}
            {showMetrics && (
                <div className="w-96 bg-slate-800 border-l border-slate-700 overflow-y-auto">
                    <MetricsPanel
                        results={optimizationResults}
                        method={optimizationMethod}
                        onRouteSelect={setSelectedRouteIndex}
                        selectedRouteIndex={selectedRouteIndex}
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