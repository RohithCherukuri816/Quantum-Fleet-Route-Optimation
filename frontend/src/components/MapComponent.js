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

const MapComponent = ({ optimizationResults, isOptimizing }) => {
    const [mapCenter, setMapCenter] = useState([16.5744, 80.6556]); // Default center
    const mapRef = useRef();

    // Fit map to all points whenever routes update
    useEffect(() => {
        if (optimizationResults?.routes?.length > 0) {
            const allPoints = optimizationResults.routes.flatMap(
                route => route.path || []
            );
            if (allPoints.length > 0 && mapRef.current) {
                const bounds = L.latLngBounds(allPoints.map(p => [p.lat, p.lon]));
                mapRef.current.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }, [optimizationResults]);

    const renderRoutes = () => {
        if (!optimizationResults?.routes) return null;

        return optimizationResults.routes.map((route, index) => {
            if (!route.path || route.path.length === 0) return null;

            return (
                <Polyline
                    key={index}
                    positions={route.path.map(p => [p.lat, p.lon])}
                    color={ROUTE_COLORS[index % ROUTE_COLORS.length]}
                    weight={5}
                />
            );
        });
    };

    const renderRouteMarkers = () => {
        if (!optimizationResults?.routes || optimizationResults.routes.length === 0)
            return null;

        const markers = [];
        const destinationMarkers = new Set();

        // Add depot marker for each route (assuming same depot)
        const depot = optimizationResults.routes[0]?.path?.[0];
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
                    <Popup>Depot</Popup>
                </Marker>
            );
        }

        // Add destination markers
        optimizationResults.routes.forEach((route, routeIndex) => {
            if (!route.path) return;

            route.path.slice(1, -1).forEach(dest => {
                if (!dest) return;

                const key = `${dest.lat}-${dest.lon}`;
                if (!destinationMarkers.has(key)) {
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
                            key={key}
                            position={[dest.lat, dest.lon]}
                            icon={destIcon}
                        >
                            <Popup>Destination: Vehicle {routeIndex + 1}</Popup>
                        </Marker>
                    );
                    destinationMarkers.add(key);
                }
            });
        });

        return markers;
    };

    return (
        <div className="w-full h-screen relative">
            <MapContainer
                center={mapCenter}
                zoom={10}
                scrollWheelZoom={true}
                className="h-full w-full"
                whenCreated={mapInstance => { mapRef.current = mapInstance; }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {renderRouteMarkers()}
                {renderRoutes()}
            </MapContainer>
        </div>
    );
};

export default MapComponent;