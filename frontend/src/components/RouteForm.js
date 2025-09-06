import React, { useState } from "react";
import { PlusCircle, Trash2 } from 'lucide-react';

const RouteForm = ({ onOptimize }) => {
  const [depot, setDepot] = useState("Amaravati, India");
  const [destinations, setDestinations] = useState([""]);
  const [vehicleCount, setVehicleCount] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState("quantum");

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

    // ✅ Send only plain strings (addresses) to backend
    const payload = {
      depot: depot.trim(),
      destinations: validDestinations.map(d => d.trim()),
      vehicleCount: parseInt(vehicleCount, 10),
      method: selectedMethod,
    };

    console.log("Submitting payload:", payload); // Debug log
    onOptimize(payload);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-800 p-4 rounded-lg shadow-md text-slate-200"
    >
      <h3 className="text-lg font-semibold mb-3">Route Settings</h3>

      {/* Depot Input */}
      <div className="mb-4">
        <label className="block text-sm mb-1 font-semibold">Depot (Source)</label>
        <input
          type="text"
          placeholder="Enter depot name or address"
          value={depot}
          onChange={(e) => setDepot(e.target.value)}
          className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 placeholder-slate-400"
        />
      </div>

      {/* Destinations Input */}
      <div className="mb-4">
        <label className="block text-sm mb-1 font-semibold">Destinations</label>
        <div className="space-y-2">
          {destinations.map((dest, index) => (
            <div key={index} className="flex space-x-2 items-center">
              <input
                type="text"
                placeholder={`Destination ${index + 1}`}
                value={dest}
                onChange={(e) => handleDestinationChange(index, e.target.value)}
                className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 placeholder-slate-400"
              />
              <button
                type="button"
                onClick={() => handleRemoveDestination(index)}
                className="p-1 text-red-400 hover:text-red-300 transition-colors"
                title="Remove destination"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handleAddDestination}
          className="mt-2 text-blue-400 hover:text-blue-300 transition-colors flex items-center text-sm font-medium"
        >
          <PlusCircle size={16} className="mr-1" /> Add Destination
        </button>
      </div>

      {/* Vehicle Count */}
      <div className="mb-4">
        <label className="block text-sm mb-1 font-semibold">Number of Vehicles</label>
        <input
          type="number"
          min="1"
          value={vehicleCount}
          onChange={(e) => setVehicleCount(e.target.value)}
          className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100"
        />
      </div>

      {/* Optimization Method Selection */}
      <div className="mb-4">
        <label className="block text-sm mb-1 font-semibold">Optimization Method</label>
        <div className="flex space-x-2">
          <label className="inline-flex items-center">
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
      </div>
      
      {/* Submit Button */}
      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
      >
        Optimize Route
      </button>
    </form>
  );
};

export default RouteForm;
