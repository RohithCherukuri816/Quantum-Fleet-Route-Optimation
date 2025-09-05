import React, { useState, useEffect } from 'react';
import { Truck, Zap, Cpu, MapPin, Settings, Loader } from 'lucide-react';
import axios from 'axios';

const Sidebar = ({ onOptimizationStart, onOptimizationComplete, isOptimizing, progress, progressMessage }) => {
  const [demoData, setDemoData] = useState(null);
  const [vehicleCount, setVehicleCount] = useState(3);
  const [customDeliveryPoints, setCustomDeliveryPoints] = useState('');
  const [useCustomData, setUseCustomData] = useState(false);
  const [optimizationMethod, setOptimizationMethod] = useState(null);

  useEffect(() => {
    // Load demo data on component mount
    fetch('/api/demo-data')
      .then(response => response.json())
      .then(data => setDemoData(data))
      .catch(error => {
        console.error('Failed to load demo data:', error);
        // Fallback demo data
        setDemoData({
          depot: { latitude: 16.5744, longitude: 80.6556, address: "Amaravati, India" },
          delivery_points: [
            { latitude: 16.5062, longitude: 80.6480, address: "Vijayawada, India" },
            { latitude: 16.2991, longitude: 80.4575, address: "Guntur, India" },
            { latitude: 14.4426, longitude: 79.9865, address: "Nellore, India" }
          ],
          vehicle_count: 3
        });
      });
  }, []);

  const handleOptimize = async (method) => {
    if (isOptimizing) return;

    try {
      onOptimizationStart(method);
      setOptimizationMethod(method);

      let requestData;

      if (useCustomData && customDeliveryPoints.trim()) {
        // Parse custom delivery points correctly
        const points = customDeliveryPoints.trim().split('\n').map(line => {
          const [city, country, lat, lon] = line.split(',').map(s => s.trim());
          return {
            address: `${city}, ${country}`,
            lat: parseFloat(lat),
            lon: parseFloat(lon)
          };
        });

        requestData = {
          depot_location: demoData.depot,
          delivery_points: points,
          vehicle_count: vehicleCount
        };
      } else {
        requestData = {
          depot_location: demoData.depot,
          delivery_points: demoData.delivery_points.map(p => ({
            address: p.address,
            lat: p.latitude,
            lon: p.longitude
          })),
          vehicle_count: vehicleCount
        };
      }

      // Add points field for backend compatibility
      requestData.points = requestData.delivery_points.map(p => ({
        address: p.address,
        lat: p.lat,
        lon: p.lon
      }));

      const endpoint = '/optimize-route';
      const response = await axios.post(endpoint, requestData);

      onOptimizationComplete(response.data, method);
      setOptimizationMethod(null);
    } catch (error) {
      console.error('Optimization failed:', error);
      onOptimizationComplete(null, method);
      setOptimizationMethod(null);

      alert(`Optimization failed: ${error.response?.data?.detail || error.message}`);
    }
  };

  const loadDemoData = () => {
    setUseCustomData(false);
    setCustomDeliveryPoints('');
    setVehicleCount(demoData?.vehicle_count || 3);
  };

  const generateRandomPoints = () => {
    const randomPoints = [];
    const cities = [
      { name: "Hyderabad", lat: 17.3850, lng: 78.4867 },
      { name: "Bangalore", lat: 12.9716, lng: 77.5946 },
      { name: "Chennai", lat: 13.0827, lng: 80.2707 },
      { name: "Mumbai", lat: 19.0760, lng: 72.8777 },
      { name: "Delhi", lat: 28.7041, lng: 77.1025 },
      { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
      { name: "Pune", lat: 18.5204, lng: 73.8567 },
      { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 }
    ];

    const numPoints = Math.floor(Math.random() * 4) + 5;
    const shuffled = cities.sort(() => 0.5 - Math.random());

    for (let i = 0; i < numPoints; i++) {
      const city = shuffled[i];
      randomPoints.push(`${city.name}, India, ${city.lat}, ${city.lng}`);
    }

    setCustomDeliveryPoints(randomPoints.join('\n'));
    setUseCustomData(true);
    setVehicleCount(Math.floor(Math.random() * 3) + 2);
  };

  if (!demoData) {
    return (
      <div className="w-80 bg-slate-800 border-r border-slate-700 p-6 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-80 bg-slate-800 border-r border-slate-700 overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-100 mb-2">Route Optimization</h2>
          <p className="text-sm text-slate-400">
            Optimize delivery routes using quantum or classical algorithms
          </p>
        </div>

        {/* Demo Data Section */}
        <div className="mb-6 p-4 bg-slate-700 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-200">Demo Scenario</h3>
            <button
              onClick={loadDemoData}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Reset
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300">Depot: {demoData.depot.address}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Truck className="w-4 h-4 text-green-400" />
              <span className="text-slate-300">{demoData.delivery_points.length} delivery points</span>
            </div>
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4 text-purple-400" />
              <span className="text-slate-300">{demoData.vehicle_count} vehicles</span>
            </div>
          </div>

          <button
            onClick={generateRandomPoints}
            className="mt-3 w-full px-3 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-md text-sm transition-colors"
          >
            Generate Random Points
          </button>
        </div>

        {/* Configuration */}
        <div className="mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Number of Vehicles
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={vehicleCount}
              onChange={(e) => setVehicleCount(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Custom Delivery Points (Optional)
            </label>
            <textarea
              value={customDeliveryPoints}
              onChange={(e) => setCustomDeliveryPoints(e.target.value)}
              placeholder="Format: City, Country, Latitude, Longitude&#10;Example:&#10;Mumbai, India, 19.0760, 72.8777&#10;Delhi, India, 28.7041, 77.1025"
              rows={4}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              Leave empty to use demo data
            </p>
          </div>
        </div>

        {/* Optimization Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleOptimize('quantum')}
            disabled={isOptimizing}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
          >
            {isOptimizing && optimizationMethod === 'quantum' ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Zap className="w-5 h-5" />
            )}
            <span>Optimize with Quantum</span>
          </button>

          <button
            onClick={() => handleOptimize('classical')}
            disabled={isOptimizing}
            className="w-full px-4 py-3 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isOptimizing && optimizationMethod === 'classical' ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Cpu className="w-5 h-5" />
            )}
            <span>Optimize Classically</span>
          </button>
        </div>

        {/* Progress Indicator */}
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

        {/* Info Section */}
        <div className="mt-6 p-4 bg-slate-700 rounded-lg">
          <h3 className="font-semibold text-slate-200 mb-2">How it works</h3>
          <div className="text-xs text-slate-400 space-y-1">
            <p>• <strong>Quantum:</strong> Uses QAOA algorithm with 30s timeout fallback</p>
            <p>• <strong>Classical:</strong> Uses OR-Tools optimization engine</p>
            <p>• <strong>Demo:</strong> Pre-configured with 10 cities in India</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
