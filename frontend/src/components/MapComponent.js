import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';

// Fix for default Leaflet markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapComponent = ({ optimizationResults, isOptimizing }) => {
  const [demoData, setDemoData] = useState(null);
  const [mapCenter, setMapCenter] = useState([16.5744, 80.6556]); // Amaravati default
  const mapRef = useRef();

  useEffect(() => {
    fetch('/api/demo-data')
      .then((response) => response.json())
      .then((data) => {
        setDemoData(data);
        setMapCenter([data?.depot?.latitude || 16.5744, data?.depot?.longitude || 80.6556]);
      })
      .catch((error) => {
        console.error('Failed to load demo data:', error);
        // fallback demo data
        setDemoData({
          depot: { latitude: 16.5744, longitude: 80.6556, address: 'Amaravati, India' },
          delivery_points: [
            { latitude: 16.5062, longitude: 80.6480, address: 'Vijayawada, India' },
            { latitude: 16.2991, longitude: 80.4575, address: 'Guntur, India' },
            { latitude: 14.4426, longitude: 79.9865, address: 'Nellore, India' },
          ],
          vehicle_count: 3,
        });
      });
  }, []);

  const getRouteColor = (vehicleIndex) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    return colors[vehicleIndex % colors.length];
  };

  const renderMarkers = () => {
    if (!demoData) return null;
    const markers = [];

    // Depot marker
    if (demoData.depot?.latitude && demoData.depot?.longitude) {
      markers.push(
        <Marker
          key="depot"
          position={[demoData.depot.latitude, demoData.depot.longitude]}
        >
          <Popup>
            <div className="text-center">
              <h3 className="font-semibold text-blue-600">Depot</h3>
              <p className="text-sm">{demoData.depot.address}</p>
            </div>
          </Popup>
        </Marker>
      );
    }

    // Delivery points markers
    demoData.delivery_points?.forEach((point, index) => {
      if (point?.latitude && point?.longitude) {
        markers.push(
          <Marker
            key={`delivery-${index}`}
            position={[point.latitude, point.longitude]}
          >
            <Popup>
              <div className="text-center">
                <h3 className="font-semibold text-red-500">Delivery Point {index + 1}</h3>
                <p className="text-sm">{point.address}</p>
              </div>
            </Popup>
          </Marker>
        );
      }
    });

    return markers;
  };

  const renderRoutes = () => {
    if (!optimizationResults?.routes || !demoData) return null;

    const allLocations = [demoData.depot, ...(demoData.delivery_points || [])];

    return optimizationResults.routes.map((route, vehicleIndex) => {
      if (!Array.isArray(route) || route.length < 2) return null;

      const routePoints = route
        .map((pointIndex) => {
          const location = allLocations[pointIndex];
          if (!location?.latitude || !location?.longitude) return null;
          return [location.latitude, location.longitude];
        })
        .filter(Boolean);

      if (routePoints.length < 2) return null;

      return (
        <Polyline
          key={`route-${vehicleIndex}`}
          positions={routePoints}
          color={getRouteColor(vehicleIndex)}
          weight={4}
          opacity={0.8}
        />
      );
    });
  };

  const renderVehicleMarkers = () => {
    if (!optimizationResults?.routes || !demoData) return null;

    const allLocations = [demoData.depot, ...(demoData.delivery_points || [])];

    return optimizationResults.routes.map((route, vehicleIndex) => {
      if (!Array.isArray(route) || route.length < 2) return null;

      // Show vehicle at first delivery point
      const firstDeliveryIndex = route.find((index) => index !== 0);
      if (firstDeliveryIndex === undefined) return null;

      const location = allLocations[firstDeliveryIndex];
      if (!location?.latitude || !location?.longitude) return null;

      return (
        <Marker
          key={`vehicle-${vehicleIndex}`}
          position={[location.latitude, location.longitude]}
        >
          <Popup>
            <div className="text-center">
              <h3 className="font-semibold">Vehicle {vehicleIndex + 1}</h3>
              <p className="text-sm">Route: {route.join(' → ')}</p>
            </div>
          </Popup>
        </Marker>
      );
    });
  };

  return (
    <div className="h-full w-full">
      <MapContainer center={mapCenter} zoom={8} className="h-full w-full" ref={mapRef}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {renderMarkers()}
        {renderRoutes()}
        {renderVehicleMarkers()}
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute top-4 left-4 bg-slate-800 border border-slate-600 rounded-lg p-3 text-xs text-slate-300">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
          <span>Depot</span>
        </div>
        <div className="flex items-center space-x-2 mt-1">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span>Delivery Points</span>
        </div>
        {optimizationResults?.routes?.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-600">
            <div className="mb-1">Routes:</div>
            {optimizationResults.routes.map((_, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getRouteColor(index) }}
                ></div>
                <span>Vehicle {index + 1}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MapComponent;
