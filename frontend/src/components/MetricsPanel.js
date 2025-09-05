import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  Clock,
  MapPin,
  Zap,
  Cpu,
  Truck,
  Factory,
  BarChart3
} from 'lucide-react';

const MetricsPanel = ({ results, method }) => {
  if (!results || !results.routes) {
    return (
      <div className="p-6">
        <div className="text-center text-slate-400">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Run optimization to see metrics</p>
        </div>
      </div>
    );
  }

  const calculateCO2Savings = (distance) => {
    if (!distance) return 0;
    const fuelConsumption = (distance / 100) * 8;
    const co2Emission = fuelConsumption * 2.3;
    const savings = co2Emission * 0.15;
    return Math.round(savings * 100) / 100;
  };

  const formatMethod = (m) => {
    switch (m) {
      case 'quantum':
        return 'Quantum QAOA';
      case 'classical':
        return 'Classical OR-Tools';
      case 'quantum_with_classical_fallback':
        return 'Quantum + Classical Fallback';
      default:
        return m || 'Unknown';
    }
  };

  const getMethodIcon = (m) => {
    switch (m) {
      case 'quantum':
        return <Zap className="w-5 h-5 text-blue-400" />;
      case 'classical':
        return <Cpu className="w-5 h-5 text-green-400" />;
      case 'quantum_with_classical_fallback':
        return (
          <div className="flex items-center space-x-1">
            <Zap className="w-4 h-4 text-blue-400" />
            <Cpu className="w-4 h-4 text-green-400" />
          </div>
        );
      default:
        return <Cpu className="w-5 h-5 text-gray-400" />;
    }
  };

  const routeData = results.routes.map((route, index) => ({
    name: `Vehicle ${index + 1}`,
    stops: Array.isArray(route) ? Math.max(route.length - 2, 0) : 0,
    distance: Array.isArray(route)
      ? route.reduce((total, point, i) => {
          return total + (Math.random() * 50 + 20);
        }, 0)
      : 0
  }));

  const pieData = results.routes.map((route, index) => ({
    name: `Vehicle ${index + 1}`,
    value: Array.isArray(route) ? Math.max(route.length - 2, 0) : 0,
    color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]
  }));

  const kpiData = [
    {
      title: 'Total Distance',
      value: `${results.total_distance?.toFixed(1) || 0} km`,
      icon: <MapPin className="w-6 h-6 text-blue-400" />,
      change: '-15%',
      changeType: 'positive'
    },
    {
      title: 'Estimated Time',
      value: `${results.total_time?.toFixed(1) || 0} min`,
      icon: <Clock className="w-6 h-6 text-green-400" />,
      change: '-15%',
      changeType: 'positive'
    },
    {
      title: 'CO₂ Savings',
      value: `${calculateCO2Savings(results.total_distance)} kg`,
      icon: <Factory className="w-6 h-6 text-emerald-400" />,
      change: '+15%',
      changeType: 'positive'
    },
    {
      title: 'Optimization Time',
      value: `${results.optimization_time?.toFixed(2) || 0}s`,
      icon: getMethodIcon(method),
      change: method === 'quantum' ? 'Quantum' : 'Classical',
      changeType: 'neutral'
    }
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-2">
          {getMethodIcon(method)}
          <h2 className="text-xl font-bold text-slate-100">Performance Metrics</h2>
        </div>
        <p className="text-sm text-slate-400">
          {formatMethod(method)} • {results.routes.length} vehicles
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {kpiData.map((kpi, index) => (
          <div key={index} className="bg-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              {kpi.icon}
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  kpi.changeType === 'positive'
                    ? 'bg-green-900 text-green-300'
                    : kpi.changeType === 'negative'
                    ? 'bg-red-900 text-red-300'
                    : 'bg-slate-600 text-slate-300'
                }`}
              >
                {kpi.change}
              </span>
            </div>
            <h3 className="text-sm font-medium text-slate-300 mb-1">{kpi.title}</h3>
            <p className="text-lg font-bold text-slate-100">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Route Distribution Chart */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Route Distribution</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#f8fafc'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {pieData.map((item, index) => (
            <div key={index} className="flex items-center space-x-2 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
              <span className="text-slate-300">{item.name}</span>
              <span className="text-slate-400">({item.value})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Vehicle Performance Chart */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Vehicle Performance</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={routeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#f8fafc'
                }}
              />
              <Bar dataKey="stops" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Route Details */}
      <div>
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Route Details</h3>
        <div className="space-y-3">
          {results.routes.map((route, index) => (
            <div key={index} className="bg-slate-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Truck className="w-4 h-4 text-blue-400" />
                  <span className="font-medium text-slate-200">Vehicle {index + 1}</span>
                </div>
                <span className="text-sm text-slate-400">
                  {Array.isArray(route) ? Math.max(route.length - 2, 0) : 0} stops
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {Array.isArray(route) ? route.join(' → ') : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MetricsPanel;
