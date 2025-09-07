// RouteForm.js
import React, { useState, useEffect } from "react";
import { PlusCircle, Trash2 } from 'lucide-react';

const RouteForm = ({ onOptimize, onMapLayerChange }) => {
  const [depot, setDepot] = useState("Amaravati, India");
  const [destinations, setDestinations] = useState([""]);
  const [vehicleCount, setVehicleCount] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState("quantum");
  const [vehicleProfile, setVehicleProfile] = useState("driving");
  const [optimizeFor, setOptimizeFor] = useState("time");
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [avoidFerries, setAvoidFerries] = useState(false);

  // New states for the additional preferences and map layer
  const [optimizeForFuel, setOptimizeForFuel] = useState(false);
  const [includeElevation, setIncludeElevation] = useState(false);
  const [includePois, setIncludePois] = useState(false);
  const [selectedMapLayer, setSelectedMapLayer] = useState("OpenStreetMap");

  useEffect(() => {
    // This will immediately update the map when the dropdown changes
    onMapLayerChange(selectedMapLayer);
  }, [selectedMapLayer, onMapLayerChange]);

  const handleAddDestination = () => {
    setDestinations([...destinations, ""]);
  };

  const handleRemoveDestination = (index) => {
    const newDestinations = destinations.filter((_, i) => i !== index);
    setDestinations(newDestinations);
  };

  const handleDestinationChange = (index, value) => {
    const newDestinations = destinations.map((dest, i) =>
      i === index ? value : dest
    );
    setDestinations(newDestinations);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!depot.trim()) {
      alert("Please fill in the depot location.");
      return;
    }

    const validDestinations = destinations.filter(d => d.trim() !== "");
    if (validDestinations.length === 0) {
      alert("Please add at least one destination.");
      return;
    }

    const payload = {
      depot: depot.trim(),
      destinations: validDestinations.map(d => d.trim()),
      vehicleCount: parseInt(vehicleCount, 10),
      method: selectedMethod,
      vehicleProfile: vehicleProfile,
      optimizeFor: optimizeFor,
      avoidTolls: avoidTolls,
      avoidFerries: avoidFerries,
      // Add new preferences to payload
      preferences: {
        optimizeForFuel,
        includeElevation,
        includePois
      },
      mapLayer: selectedMapLayer,
    };

    console.log("Submitting payload:", payload);
    onOptimize(payload);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-800 p-6 rounded-lg shadow-md text-slate-200"
    >
      <h3 className="text-xl font-bold mb-4">Route Settings</h3>

      {/* Depot Input */}
      <div className="mb-3">
        <label className="block text-sm font-semibold text-slate-400">Depot (Source)</label>
        <input
          type="text"
          placeholder="Enter depot name or address"
          value={depot}
          onChange={(e) => setDepot(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Destinations Input */}
      <div className="mb-3">
        <label className="block text-sm font-semibold text-slate-400">Destinations</label>
        {destinations.map((dest, index) => (
          <div key={index} className="flex items-center mb-2">
            <input
              type="text"
              placeholder={`Destination ${index + 1}`}
              value={dest}
              onChange={(e) => handleDestinationChange(index, e.target.value)}
              className="flex-1 px-3 py-2 rounded-md bg-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => handleRemoveDestination(index)}
              className="ml-2 p-2 text-red-400 hover:text-red-300"
              title="Remove destination"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={handleAddDestination}
          className="mt-1 text-blue-400 hover:text-blue-300 flex items-center text-sm"
        >
          <PlusCircle size={16} className="mr-1" /> Add Destination
        </button>
      </div>
      
      {/* Map Layer - New Section */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-slate-400 mb-2">Map Layer</label>
        <select
          value={selectedMapLayer}
          onChange={(e) => setSelectedMapLayer(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="OpenStreetMap">OpenStreetMap</option>
          <option value="CartoDBLight">CartoDB Light</option>
          <option value="Terrain">Terrain</option>
        </select>
      </div>

      {/* Vehicle Profile */}
      <div className="mb-3">
        <label className="block text-sm font-semibold text-slate-400">Vehicle Profile</label>
        <select
          value={vehicleProfile}
          onChange={(e) => setVehicleProfile(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="driving">Car</option>
          <option value="cycling">Bike</option>
          <option value="foot">Foot</option>
        </select>
      </div>

      {/* Optimization Preferences - Restored to original design */}
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-slate-400 mb-1">Optimization Preferences</h4>
        <label className="inline-flex items-center mr-4">
          <input
            type="radio"
            name="optimizeFor"
            value="time"
            checked={optimizeFor === "time"}
            onChange={(e) => setOptimizeFor(e.target.value)}
            className="form-radio text-blue-500"
          />
          <span className="ml-2 text-sm">Optimize for Time</span>
        </label>
        <label className="inline-flex items-center">
          <input
            type="radio"
            name="optimizeFor"
            value="distance"
            checked={optimizeFor === "distance"}
            onChange={(e) => setOptimizeFor(e.target.value)}
            className="form-radio text-blue-500"
          />
          <span className="ml-2 text-sm">Optimize for Distance</span>
        </label>
      </div>

      {/* New Optimization Preferences as toggles */}
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-slate-400 mb-1">Additional Preferences</h4>
        <div className="flex flex-col space-y-2">
            <label className="inline-flex items-center justify-between">
                <span className="text-sm">Optimize for Fuel</span>
                <input
                    type="checkbox"
                    checked={optimizeForFuel}
                    onChange={(e) => setOptimizeForFuel(e.target.checked)}
                    className="form-checkbox h-4 w-4 rounded text-green-500"
                />
            </label>
            <label className="inline-flex items-center justify-between">
                <span className="text-sm">Include Elevation</span>
                <input
                    type="checkbox"
                    checked={includeElevation}
                    onChange={(e) => setIncludeElevation(e.target.checked)}
                    className="form-checkbox h-4 w-4 rounded text-yellow-500"
                />
            </label>
            <label className="inline-flex items-center justify-between">
                <span className="text-sm">Include POIs</span>
                <input
                    type="checkbox"
                    checked={includePois}
                    onChange={(e) => setIncludePois(e.target.checked)}
                    className="form-checkbox h-4 w-4 rounded text-purple-500"
                />
            </label>
        </div>
      </div>

      {/* Avoidances */}
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-slate-400 mb-1">Avoidances</h4>
        <label className="inline-flex items-center mr-4">
          <input
            type="checkbox"
            checked={avoidTolls}
            onChange={(e) => setAvoidTolls(e.target.checked)}
            className="form-checkbox text-blue-500 rounded"
          />
          <span className="ml-2 text-sm">Avoid Tolls</span>
        </label>
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={avoidFerries}
            onChange={(e) => setAvoidFerries(e.target.checked)}
            className="form-checkbox text-blue-500 rounded"
          />
          <span className="ml-2 text-sm">Avoid Ferries</span>
        </label>
      </div>

      {/* Number of Vehicles */}
      <div className="mb-3">
        <label className="block text-sm font-semibold text-slate-400">Number of Vehicles</label>
        <input
          type="number"
          min="1"
          value={vehicleCount}
          onChange={(e) => setVehicleCount(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Optimization Method */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-slate-400 mb-1">Optimization Method</h4>
        <label className="inline-flex items-center mr-4">
          <input
            type="radio"
            name="method"
            value="quantum"
            checked={selectedMethod === "quantum"}
            onChange={() => setSelectedMethod("quantum")}
            className="form-radio text-purple-500"
          />
          <span className="ml-2 text-sm">Quantum</span>
        </label>
        <label className="inline-flex items-center">
          <input
            type="radio"
            name="method"
            value="classical"
            checked={selectedMethod === "classical"}
            onChange={() => setSelectedMethod("classical")}
            className="form-radio text-blue-500"
          />
          <span className="ml-2 text-sm">Classical</span>
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition-colors"
      >
        Optimize Route
      </button>
    </form>
  );
};

export default RouteForm;