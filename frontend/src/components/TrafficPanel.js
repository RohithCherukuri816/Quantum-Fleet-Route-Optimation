import React from 'react';
import { TrafficCone, Clock, TrendingUp, Info } from 'lucide-react';

const TrafficPanel = ({ trafficData }) => {
    if (!trafficData) {
        return (
            <div className="p-6">
                <div className="text-center text-slate-400">
                    <TrafficCone className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Traffic data not available for this route.</p>
                </div>
            </div>
        );
    }
    
    const { status, delay_min, delay_percent } = trafficData;
    
    const getStatusColor = () => {
        if (delay_min <= 0) return "text-green-400";
        if (delay_min > 0 && delay_min <= 10) return "text-yellow-400";
        return "text-red-400";
    };

    return (
        <div className="p-6 text-slate-200">
            <div className="flex items-center space-x-3 mb-6">
                <TrafficCone className="w-8 h-8 text-yellow-400" />
                <h2 className="text-xl font-bold text-slate-100">Traffic Insights</h2>
            </div>
            
            {/* Main Status */}
            <div className="bg-slate-700 p-4 rounded-lg flex flex-col items-center justify-center mb-6">
                <span className={`text-2xl font-bold ${getStatusColor()}`}>{status}</span>
                <span className="text-sm text-slate-400 mt-2">Current traffic conditions</span>
            </div>

            {/* Delay Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-700 p-4 rounded-lg text-center">
                    <Clock className="w-6 h-6 mx-auto text-blue-400 mb-1" />
                    <span className="block text-sm text-slate-400">Expected Delay</span>
                    <span className="block text-xl font-semibold">{delay_min} min</span>
                </div>
                <div className="bg-slate-700 p-4 rounded-lg text-center">
                    <TrendingUp className="w-6 h-6 mx-auto text-red-400 mb-1" />
                    <span className="block text-sm text-slate-400">Delay Percentage</span>
                    <span className="block text-xl font-semibold">{delay_percent}%</span>
                </div>
            </div>

            {/* Recommendations */}
            <div className="bg-slate-700 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-slate-200 mb-2">Analysis & Recommendations</h3>
                <ul className="text-xs text-slate-400 space-y-2">
                    <li className="flex items-start space-x-2">
                        <Info className="w-4 h-4 mt-1 text-blue-400 flex-shrink-0" />
                        <span>The expected delay is calculated by comparing the real-time route duration with the ideal free-flow duration.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                        <Info className="w-4 h-4 mt-1 text-blue-400 flex-shrink-0" />
                        <span>Consider re-running the optimization with an alternative vehicle profile to find a faster route.</span>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default TrafficPanel;
