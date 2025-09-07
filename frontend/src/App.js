import React, { useState, useEffect } from 'react';
import MapComponent from './components/MapComponent';
import Sidebar from './components/Sidebar';
import MetricsPanel from './components/MetricsPanel';
import CircuitVisualizer from './components/CircuitVisualizer';
import WeatherPanel from './components/WeatherPanel';
import TrafficPanel from './components/TrafficPanel';
import { BarChart3, Zap, Cloud, TrafficCone } from 'lucide-react';
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
    const [mapLayer, setMapLayer] = useState("OpenStreetMap");
    const [liveVehiclePosition, setLiveVehiclePosition] = useState(null);

    const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    const OPENWEATHER_API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY;

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
                    setLiveVehiclePosition(null);

                    if (results?.routes?.length > 0) {
                        setSelectedRouteIndex(0);
                    } else {
                        setSelectedRouteIndex(null);
                    }
                }

                if (data.type === 'live_vehicle_position') {
                    setLiveVehiclePosition(data.position);
                    setProgress(data.progress);
                }

            } catch (error) {
                console.log('WebSocket message:', event.data);
            }
        };

        ws.onclose = () => console.log('WebSocket disconnected');

        return () => ws.close();
    }, []);

    const handleMapLayerChange = (layer) => {
        setMapLayer(layer);
    };

    const handleOptimizationStart = (method, message) => {
        setIsOptimizing(true);
        setProgress(0);
        setProgressMessage(message || 'Starting optimization...');
        setOptimizationMethod(method);
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

    const toggleMetrics = () => {
        setShowMetrics(prev => !prev);
        setShowCircuit(false);
        setShowWeather(false);
        setShowTraffic(false);
    }
    const toggleCircuit = () => {
        setShowCircuit(prev => !prev);
        setShowMetrics(false);
        setShowWeather(false);
        setShowTraffic(false);
    }
    
    const [showWeather, setShowWeather] = useState(false);
    const toggleWeather = () => {
        setShowWeather(prev => !prev);
        setShowMetrics(false);
        setShowCircuit(false);
        setShowTraffic(false);
    }

    const [showTraffic, setShowTraffic] = useState(false);
    const toggleTraffic = () => {
        setShowTraffic(prev => !prev);
        setShowMetrics(false);
        setShowCircuit(false);
        setShowWeather(false);
    }

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
                         <button
                            onClick={toggleWeather}
                            className={`p-2 rounded-lg transition-colors ${showWeather ? 'bg-indigo-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                            title="Toggle Weather Report"
                        >
                            <Cloud size={20} />
                        </button>
                        <button
                            onClick={toggleTraffic}
                            className={`p-2 rounded-lg transition-colors ${showTraffic ? 'bg-yellow-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                            title="Toggle Traffic Insights"
                        >
                            <TrafficCone size={20} />
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
                        liveVehiclePosition={liveVehiclePosition}
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
            
            {showWeather && (
                <div className="w-96 bg-slate-800 border-l border-slate-700 overflow-y-auto">
                    <WeatherPanel weatherData={optimizationResults?.weather} />
                </div>
            )}

            {showTraffic && (
                <div className="w-96 bg-slate-800 border-l border-slate-700 overflow-y-auto">
                    <TrafficPanel trafficData={optimizationResults?.routes[selectedRouteIndex]?.traffic_impact} />
                </div>
            )}
        </div>
    );
}

export default App;