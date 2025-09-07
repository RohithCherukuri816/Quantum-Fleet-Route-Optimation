import React from 'react';
import { Cloud, Droplet, Wind, Eye, Clock, AlertTriangle, Info, Thermometer } from 'lucide-react';

const WeatherPanel = ({ weatherData }) => {
    if (!weatherData || !weatherData.report) {
        return (
            <div className="p-6">
                <div className="text-center text-slate-400">
                    <Cloud className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Weather data not available for this route.</p>
                </div>
            </div>
        );
    }

    const { report, impacts } = weatherData;
    const current = report.current;
    const forecastList = report.forecast?.list || [];
    const extendedForecast = forecastList.slice(0, 8); // Get a 24-hour forecast in 3-hour chunks

    const getWeatherIcon = (weatherId) => {
        const id = String(weatherId).charAt(0);
        if (id === '2' || id === '3' || id === '5') return <Droplet className="w-6 h-6 text-blue-400" />; // Rain, Drizzle, Thunderstorm
        if (id === '6') return <Cloud className="w-6 h-6 text-slate-400" />; // Snow
        if (id === '7') return <Eye className="w-6 h-6 text-slate-400" />; // Atmosphere (fog, etc)
        if (id === '8') {
            if (weatherId === 800) return <span className="text-yellow-400">☀️</span>; // Clear
            return <Cloud className="w-6 h-6 text-slate-400" />; // Clouds
        }
        return <Cloud className="w-6 h-6 text-slate-400" />;
    };

    return (
        <div className="p-6 text-slate-200">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-100">Weather & Route Impact</h2>
                {getWeatherIcon(current.weather[0].id)}
            </div>

            {/* Current Weather */}
            <div className="text-center mb-6">
                <p className="text-6xl font-bold text-blue-400 flex items-center justify-center">
                    {Math.round(current.main.temp)}<span className="text-4xl">°C</span>
                </p>
                <p className="text-lg text-slate-300 mt-2 capitalize">{current.weather[0].description}</p>
            </div>

            {/* Weather Details */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-700 p-3 rounded-lg text-center">
                    <Droplet className="w-6 h-6 mx-auto text-blue-400 mb-1" />
                    <span className="block text-sm text-slate-400">Humidity</span>
                    <span className="block text-lg font-semibold">{current.main.humidity}%</span>
                </div>
                <div className="bg-slate-700 p-3 rounded-lg text-center">
                    <Wind className="w-6 h-6 mx-auto text-green-400 mb-1" />
                    <span className="block text-sm text-slate-400">Wind</span>
                    <span className="block text-lg font-semibold">{Math.round(current.wind.speed * 3.6)} km/h</span>
                </div>
                <div className="bg-slate-700 p-3 rounded-lg text-center">
                    <Eye className="w-6 h-6 mx-auto text-purple-400 mb-1" />
                    <span className="block text-sm text-slate-400">Visibility</span>
                    <span className="block text-lg font-semibold">{current.visibility / 1000} km</span>
                </div>
            </div>

            {/* Route Impact Analysis */}
            <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    <h4 className="text-sm font-semibold text-yellow-200">Route Impact Analysis</h4>
                </div>
                <ul className="text-xs text-blue-200 space-y-1">
                    {impacts && impacts.impacts.length > 0 ? (
                        impacts.impacts.map((impact, index) => (
                            <li key={index} className="flex items-center space-x-2">
                                <Info className="w-4 h-4" />
                                <span>{impact}</span>
                            </li>
                        ))
                    ) : (
                        <li className="flex items-center space-x-2">
                            <Info className="w-4 h-4" />
                            <span>No significant weather impacts.</span>
                        </li>
                    )}
                    <li className="flex items-center space-x-2 mt-2 font-bold text-red-400">
                        <Clock className="w-4 h-4" />
                        <span>Expected delay: {impacts?.expected_delay_min || 0} min</span>
                    </li>
                </ul>
            </div>

            {/* Extended Forecast */}
            <div className="mt-6">
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Extended Forecast</h3>
                <div className="grid grid-cols-4 gap-4">
                    {extendedForecast.map((forecast, index) => (
                        <div key={index} className="bg-slate-700 p-3 rounded-lg text-center">
                            <span className="block text-xs text-slate-400">{new Date(forecast.dt * 1000).getHours()}:00</span>
                            <span className="block text-lg font-semibold text-blue-400">{Math.round(forecast.main.temp)}°</span>
                            <span className="block text-xs text-slate-400">{forecast.weather[0].main}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WeatherPanel;
