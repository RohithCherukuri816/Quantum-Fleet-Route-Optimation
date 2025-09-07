// MetricsPanel.js
import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import {
    TrendingUp,
    Clock,
    MapPin,
    Zap,
    Cpu,
    Truck,
    BarChart3,
} from 'lucide-react';

const MetricsPanel = ({ results, method, onRouteSelect, selectedRouteIndex }) => {
    if (!results || !results.routes || results.routes.length === 0) {
        return (
            <div className="p-6">
                <div className="text-center text-slate-400">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Run optimization to see metrics</p>
                </div>
            </div>
        );
    }

    const formatMethod = (m) => {
        switch (m) {
            case 'quantum':
                return (
                    <div className="flex items-center space-x-2">
                        <Zap className="text-purple-400" size={16} />
                        <span>Quantum Optimization</span>
                    </div>
                );
            case 'classical':
                return (
                    <div className="flex items-center space-x-2">
                        <Cpu className="text-blue-400" size={16} />
                        <span>Classical Optimization</span>
                    </div>
                );
            default:
                return null;
        }
    };

    const getOverallMetrics = () => {
        const metrics = results.metrics || {};
        return {
            total_distance_km: metrics.total_distance_km ?? 0,
            total_duration_hours: metrics.total_duration_hours ?? 0,
            co2_savings_kg: metrics.co2_savings_kg ?? 0,
        };
    };

    const getDisplayMetrics = () => {
        if (selectedRouteIndex !== null && results.routes[selectedRouteIndex]) {
            const route = results.routes[selectedRouteIndex];
            return {
                total_distance_km: route.distance_km ?? 0,
                total_duration_hours: route.duration_hours ?? 0,
                co2_savings_kg: (route.distance_km ?? 0) * 0.15,
            };
        }
        return getOverallMetrics();
    };

    const displayMetrics = getDisplayMetrics();

    const getRouteDetails = () => {
        return results.routes.map((route, index) => ({
            vehicle: `Vehicle ${index + 1}`,
            destination_count: route.destinations ? route.destinations.length : 0,
            distance_km: route.distance_km ?? 0,
            duration_hours: route.duration_hours ?? 0,
        }));
    };

    const routeDetails = getRouteDetails();

    const barChartData = routeDetails.map((route) => ({
        name: route.vehicle,
        stops: route.destination_count,
        distance: route.distance_km,
    }));

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-100">Optimization Metrics</h2>
                <div className="text-sm">{formatMethod(method)}</div>
            </div>

            {/* Overall Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-700 p-4 rounded-lg flex flex-col items-start">
                    <MapPin className="text-blue-400 mb-2" size={24} />
                    <span className="text-slate-400 text-sm">Total Distance</span>
                    <span className="text-slate-200 text-lg font-semibold mt-1">
                        {displayMetrics.total_distance_km.toFixed(2)} km
                    </span>
                </div>
                <div className="bg-slate-700 p-4 rounded-lg flex flex-col items-start">
                    <Clock className="text-green-400 mb-2" size={24} />
                    <span className="text-slate-400 text-sm">Total Duration</span>
                    <span className="text-slate-200 text-lg font-semibold mt-1">
                        {displayMetrics.total_duration_hours.toFixed(2)} hours
                    </span>
                </div>
                <div className="bg-slate-700 p-4 rounded-lg flex flex-col items-start">
                    <TrendingUp className="text-purple-400 mb-2" size={24} />
                    <span className="text-slate-400 text-sm">CO2 Saved</span>
                    <span className="text-slate-200 text-lg font-semibold mt-1">
                        {displayMetrics.co2_savings_kg.toFixed(2)} kg
                    </span>
                </div>
                <div className="bg-slate-700 p-4 rounded-lg flex flex-col items-start">
                    <Truck className="text-yellow-400 mb-2" size={24} />
                    <span className="text-slate-400 text-sm">Vehicles Used</span>
                    <span className="text-slate-200 text-lg font-semibold mt-1">
                        {results.routes.length}
                    </span>
                </div>
            </div>

            {/* Individual Vehicle Routes */}
            <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Vehicle Routes</h3>
                <div className="space-y-3">
                    {routeDetails.map((route, index) => (
                        <div
                            key={index}
                            onClick={() => onRouteSelect(index)}
                            className={`bg-slate-700 rounded-lg p-3 cursor-pointer transition-colors ${
                                selectedRouteIndex === index ? 'ring-2 ring-blue-500' : 'hover:bg-slate-600'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                    <Truck className="w-4 h-4 text-blue-400" />
                                    <span className="font-medium text-slate-200">{route.vehicle}</span>
                                </div>
                                <span className="text-sm text-slate-400">
                                    {route.destination_count} stops
                                </span>
                            </div>
                            <div className="text-xs text-slate-400 space-y-1">
                                <p>
                                    <strong>Distance:</strong> {route.distance_km.toFixed(2)} km
                                </p>
                                <p>
                                    <strong>Duration:</strong> {route.duration_hours.toFixed(2)} hours
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Bar Chart */}
            <div className="mt-8">
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Stops per Vehicle</h3>
                <div className="w-full h-40">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                            <XAxis dataKey="name" stroke="#cbd5e1" />
                            <YAxis stroke="#cbd5e1" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: '1px solid #475569',
                                    borderRadius: '8px',
                                    color: '#f8fafc',
                                }}
                            />
                            <Bar dataKey="stops" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default MetricsPanel;