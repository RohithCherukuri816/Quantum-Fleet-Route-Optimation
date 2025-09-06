import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

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

// Route colors for multiple vehicles
const ROUTE_COLORS = [
    '#3b82f6', // Blue
    '#f87171', // Red
    '#fbbf24', // Yellow
    '#34d399', // Green
    '#c084fc', // Purple
    '#67e8f9', // Cyan
];

const MapComponent = ({ optimizationResults, isOptimizing, openWeatherApiKey, selectedRouteIndex }) => {
    const [mapCenter, setMapCenter] = useState([16.5744, 80.6556]); // Default center
    const [depotWeather, setDepotWeather] = useState(null);
    const mapRef = useRef();

    // Fetch weather data for the depot location
    useEffect(() => {
        const fetchDepotWeather = async () => {
            if (optimizationResults?.routes?.length > 0 && openWeatherApiKey) {
                const depot = optimizationResults.routes[0].depot;
                if (!depot) return;
                
                const lat = depot.lat;
                const lon = depot.lon;

                try {
                    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${openWeatherApiKey}&units=metric`);
                    const data = await res.json();
                    setDepotWeather(data);
                } catch (error) {
                    console.error("Failed to fetch weather data:", error);
                }
            }
        };

        fetchDepotWeather();
    }, [optimizationResults, openWeatherApiKey]);

    // Fit map to all points whenever the selected route changes
    useEffect(() => {
        if (selectedRouteIndex !== null && optimizationResults?.routes?.[selectedRouteIndex]) {
            const selectedRoute = optimizationResults.routes[selectedRouteIndex];
            const allPoints = selectedRoute.path || [];
            if (allPoints.length > 0 && mapRef.current) {
                const bounds = L.latLngBounds(allPoints.map(p => [p.lat, p.lon]));
                mapRef.current.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }, [selectedRouteIndex, optimizationResults]);

    const renderSelectedRoute = () => {
        if (selectedRouteIndex === null || !optimizationResults?.routes?.[selectedRouteIndex]) {
            return null;
        }

        const route = optimizationResults.routes[selectedRouteIndex];
        return (
            <Polyline
                key={selectedRouteIndex}
                positions={route.path.map(p => [p.lat, p.lon])}
                color={ROUTE_COLORS[selectedRouteIndex % ROUTE_COLORS.length]}
                weight={5}
            />
        );
    };

    const renderMarkersForSelectedRoute = () => {
        if (selectedRouteIndex === null || !optimizationResults?.routes?.[selectedRouteIndex]) {
            return null;
        }

        const markers = [];
        const route = optimizationResults.routes[selectedRouteIndex];
        const depot = route.depot;

        // Add a single depot marker
        if (depot) {
            const depotIcon = new L.Icon({
                iconUrl:
                    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                shadowUrl:
                    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41],
            });
            markers.push(
                <Marker key="depot" position={[depot.lat, depot.lon]} icon={depotIcon}>
                    <Popup>
                        <div className="text-sm font-semibold">Depot</div>
                        {depotWeather ? (
                            <div className="mt-1">
                                <div className="font-bold text-base">{depotWeather.name}</div>
                                <div>Temp: {depotWeather.main.temp}°C</div>
                                <div>Weather: {depotWeather.weather[0].main}</div>
                            </div>
                        ) : (
                            <div className="text-xs text-slate-400">Loading weather...</div>
                        )}
                    </Popup>
                </Marker>
            );
        }

        // Add a marker for each distinct destination
        if (route.destinations) {
            route.destinations.forEach((dest, index) => {
                const destIcon = new L.Icon({
                    iconUrl:
                        'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                    shadowUrl:
                        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41],
                });

                markers.push(
                    <Marker
                        key={`dest-${selectedRouteIndex}-${index}`}
                        position={[dest.lat, dest.lon]}
                        icon={destIcon}
                    >
                        <Popup>{dest.address || `Destination ${index + 1}`}</Popup>
                    </Marker>
                );
            });
        }
        
        return markers;
    };

    return (
        <div className="w-full h-full relative">
            <MapContainer
                center={mapCenter}
                zoom={10}
                scrollWheelZoom={true}
                className="h-full w-full"
                whenCreated={mapInstance => { mapRef.current = mapInstance; }}
            >
                {/* Base OpenStreetMap Layer */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* OpenWeatherMap Traffic Layer */}
                <TileLayer
                    url={`https://tile.openweathermap.org/map/traffic_light/{z}/{x}/{y}.png?appid=${openWeatherApiKey}`}
                    attribution='Map data &copy; <a href="http://openweathermap.org">OpenWeatherMap</a>'
                />

                {renderMarkersForSelectedRoute()}
                {renderSelectedRoute()}
            </MapContainer>
        </div>
    );
};

export default MapComponent;
