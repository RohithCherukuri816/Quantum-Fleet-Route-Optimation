import React, { useEffect, useState, useCallback } from 'react';
import {
    GoogleMap,
    Marker,
    DirectionsRenderer,
    useJsApiLoader,
} from '@react-google-maps/api';

const containerStyle = {
    width: '100%',
    height: '100vh',
};

const MapComponent = ({
    optimizationResults,
    selectedRouteIndex = 0,
    googleMapsApiKey,
    openWeatherApiKey,
}) => {
    const [mapCenter, setMapCenter] = useState({ lat: 16.5744, lng: 80.6556 });
    const [directions, setDirections] = useState(null);
    const [markers, setMarkers] = useState([]);
    const [depotWeather, setDepotWeather] = useState(null);

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey,
        libraries: ['places'],
    });

    const fetchRouteAndWeather = useCallback(async () => {
        // Safety checks
        if (
            !optimizationResults ||
            !Array.isArray(optimizationResults.routes) ||
            optimizationResults.routes.length === 0 ||
            selectedRouteIndex === null ||
            selectedRouteIndex >= optimizationResults.routes.length ||
            !googleMapsApiKey ||
            !openWeatherApiKey
        ) {
            setDirections(null);
            setMarkers([]);
            setDepotWeather(null);
            return;
        }

        const route = optimizationResults.routes[selectedRouteIndex];
        if (!route) return;

        const { depot, destinations } = route;

        // Set map center on depot
        setMapCenter({ lat: depot.lat, lng: depot.lon });

        // Build waypoints
        const waypoints = (destinations || []).map((dest) => ({
            location: { lat: dest.lat, lng: dest.lon },
            stopover: true,
        }));

        // Directions API
        const directionsService = new window.google.maps.DirectionsService();
        directionsService.route(
            {
                origin: { lat: depot.lat, lng: depot.lon },
                destination: { lat: depot.lat, lng: depot.lon }, // round-trip
                waypoints,
                optimizeWaypoints: true,
                travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status === window.google.maps.DirectionsStatus.OK) {
                    setDirections(result);
                } else {
                    console.error('Google Directions API error:', status, result);
                    setDirections(null);
                }
            }
        );

        // Set markers
        const tempMarkers = [
            { lat: depot.lat, lng: depot.lon, label: 'Depot' },
            ...(destinations || []).map((d, idx) => ({
                lat: d.lat,
                lng: d.lon,
                label: `Dest ${idx + 1}`,
            })),
        ];
        setMarkers(tempMarkers);

        // Fetch depot weather
        try {
            const weatherRes = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${depot.lat}&lon=${depot.lon}&appid=${openWeatherApiKey}&units=metric`
            );
            const weatherData = await weatherRes.json();
            setDepotWeather(weatherData);
        } catch (err) {
            console.error('OpenWeather API error:', err);
            setDepotWeather(null);
        }
    }, [optimizationResults, selectedRouteIndex, googleMapsApiKey, openWeatherApiKey]);

    useEffect(() => {
        if (isLoaded) fetchRouteAndWeather();
    }, [fetchRouteAndWeather, isLoaded]);

    if (loadError) return <div>Error loading Google Maps</div>;
    if (!isLoaded) return <div>Loading Map...</div>;

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={mapCenter}
            zoom={10}
            options={{
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
            }}
        >
            {/* Render route */}
            {directions && <DirectionsRenderer directions={directions} />}

            {/* Render markers */}
            {markers.map((marker, idx) => (
                <Marker
                    key={idx}
                    position={{ lat: marker.lat, lng: marker.lng }}
                    label={{
                        text: marker.label === 'Depot' ? 'D' : marker.label,
                        fontWeight: 'bold',
                        color: 'white',
                    }}
                    icon={
                        marker.label === 'Depot'
                            ? { url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' }
                            : undefined
                    }
                />
            ))}

            {/* Display depot weather */}
            {depotWeather && depotWeather.main && (
                <Marker
                    position={mapCenter}
                    label={{
                        text: `🌡️ ${Math.round(depotWeather.main.temp)}°C`,
                        fontSize: '14px',
                        color: 'black',
                        fontWeight: 'bold',
                    }}
                />
            )}
        </GoogleMap>
    );
};

export default MapComponent;
