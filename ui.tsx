import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, ScatterPlot, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, Cloud, Thermometer, Droplets, Wind, Eye, AlertTriangle, TrendingUp, Download, Filter } from 'lucide-react';

// Weather Data Generator Class
class WeatherDataGenerator {
  constructor(config = {}) {
    this.config = {
      nDays: config.nDays || 365,
      startDate: config.startDate || '2024-01-01',
      missingValueRate: config.missingValueRate || 0.05,
      extremeEvents: config.extremeEvents || 10,
      baseTempRange: config.baseTempRange || [5, 25],
      humidityRange: config.humidityRange || [30, 90],
      windSpeedRange: config.windSpeedRange || [0, 25],
      pressureRange: config.pressureRange || [990, 1030],
      ...config
    };
  }

  generateSeasonalPattern(dayOfYear, amplitude = 1, phase = 0) {
    return amplitude * Math.sin(2 * Math.PI * (dayOfYear + phase) / 365);
  }

  generateNoise(scale = 1) {
    return (Math.random() - 0.5) * 2 * scale;
  }

  generateExtremeEvent(temperature, dayOfYear) {
    // Simulate heat waves in summer, cold snaps in winter
    const isSummer = dayOfYear > 150 && dayOfYear < 250;
    const isWinter = dayOfYear < 50 || dayOfYear > 300;
    
    if (Math.random() < 0.02) { // 2% chance of extreme event
      if (isSummer && Math.random() < 0.7) {
        return temperature + 8 + Math.random() * 5; // Heat wave
      } else if (isWinter && Math.random() < 0.7) {
        return temperature - 8 - Math.random() * 5; // Cold snap
      }
    }
    return temperature;
  }

  generateWeatherData() {
    const data = [];
    const startDate = new Date(this.config.startDate);
    
    for (let i = 0; i < this.config.nDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dayOfYear = Math.floor((currentDate - new Date(currentDate.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
      
      // Generate base temperature with seasonal pattern
      const baseTemp = (this.config.baseTempRange[0] + this.config.baseTempRange[1]) / 2;
      const tempAmplitude = (this.config.baseTempRange[1] - this.config.baseTempRange[0]) / 2;
      let temperature = baseTemp + this.generateSeasonalPattern(dayOfYear, tempAmplitude, -80) + this.generateNoise(3);
      
      // Apply extreme events
      temperature = this.generateExtremeEvent(temperature, dayOfYear);
      
      // Generate correlated weather parameters
      const humidity = Math.max(20, Math.min(100, 
        70 + this.generateSeasonalPattern(dayOfYear, 15, 0) + this.generateNoise(10) - (temperature - baseTemp) * 0.5
      ));
      
      const windSpeed = Math.max(0, 
        12 + this.generateSeasonalPattern(dayOfYear, 5, 120) + this.generateNoise(8)
      );
      
      const pressure = 1013 + this.generateSeasonalPattern(dayOfYear, 8, 200) + this.generateNoise(5);
      
      const precipitation = Math.max(0, 
        (humidity > 75 ? Math.random() * 15 : 0) + this.generateNoise(2)
      );
      
      const cloudCover = Math.max(0, Math.min(100,
        humidity * 0.8 + this.generateNoise(20)
      ));
      
      // Simulate missing values
      const record = {
        date: currentDate.toISOString().split('T')[0],
        temperature: Math.random() < this.config.missingValueRate ? null : Math.round(temperature * 10) / 10,
        humidity: Math.random() < this.config.missingValueRate ? null : Math.round(humidity * 10) / 10,
        windSpeed: Math.random() < this.config.missingValueRate ? null : Math.round(windSpeed * 10) / 10,
        pressure: Math.random() < this.config.missingValueRate ? null : Math.round(pressure * 10) / 10,
        precipitation: Math.random() < this.config.missingValueRate ? null : Math.round(precipitation * 10) / 10,
        cloudCover: Math.random() < this.config.missingValueRate ? null : Math.round(cloudCover * 10) / 10
      };
      
      data.push(record);
    }
    
    return data;
  }
}

// Data Analysis Functions
const analyzeWeatherData = (data) => {
  const validData = data.filter(d => d.temperature !== null);
  
  const statistics = {
    temperature: {
      mean: validData.reduce((sum, d) => sum + d.temperature, 0) / validData.length,
      min: Math.min(...validData.map(d => d.temperature)),
      max: Math.max(...validData.map(d => d.temperature)),
      std: 0
    },
    humidity: {
      mean: validData.reduce((sum, d) => sum + (d.humidity || 0), 0) / validData.length,
      min: Math.min(...validData.filter(d => d.humidity).map(d => d.humidity)),
      max: Math.max(...validData.filter(d => d.humidity).map(d => d.humidity))
    },
    precipitation: {
      total: validData.reduce((sum, d) => sum + (d.precipitation || 0), 0),
      rainyDays: validData.filter(d => d.precipitation > 0).length
    }
  };
  
  // Calculate standard deviation
  const tempVariance = validData.reduce((sum, d) => sum + Math.pow(d.temperature - statistics.temperature.mean, 2), 0) / validData.length;
  statistics.temperature.std = Math.sqrt(tempVariance);
  
  return statistics;
};

const detectAnomalies = (data) => {
  const validData = data.filter(d => d.temperature !== null);
  const mean = validData.reduce((sum, d) => sum + d.temperature, 0) / validData.length;
  const std = Math.sqrt(validData.reduce((sum, d) => sum + Math.pow(d.temperature - mean, 2), 0) / validData.length);
  
  return data.map(d => ({
    ...d,
    isAnomaly: d.temperature && Math.abs(d.temperature - mean) > 2 * std
  }));
};

// Main Weather Analytics Component
const WeatherAnalyticsApp = () => {
  const [weatherData, setWeatherData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedDateRange, setSelectedDateRange] = useState('all');
  const [selectedMetric, setSelectedMetric] = useState('temperature');
  const [showAnomalies, setShowAnomalies] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);

  // Generate weather data on component mount
  useEffect(() => {
    setLoading(true);
    const generator = new WeatherDataGenerator({
      nDays: 365,
      startDate: '2024-01-01',
      missingValueRate: 0.03,
      extremeEvents: 15
    });
    
    setTimeout(() => {
      const data = generator.generateWeatherData();
      const dataWithAnomalies = detectAnomalies(data);
      setWeatherData(dataWithAnomalies);
      setFilteredData(dataWithAnomalies);
      setStatistics(analyzeWeatherData(dataWithAnomalies));
      setLoading(false);
    }, 1000);
  }, []);

  // Filter data based on selected date range
  useEffect(() => {
    if (weatherData.length === 0) return;
    
    let filtered = weatherData;
    
    if (selectedDateRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (selectedDateRange) {
        case '30':
          cutoffDate.setDate(now.getDate() - 30);
          break;
        case '90':
          cutoffDate.setDate(now.getDate() - 90);
          break;
        case '180':
          cutoffDate.setDate(now.getDate() - 180);
          break;
      }
      
      filtered = weatherData.filter(d => new Date(d.date) >= cutoffDate);
    }
    
    setFilteredData(filtered);
  }, [weatherData, selectedDateRange]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return filteredData.map(d => ({
      ...d,
      month: new Date(d.date).toLocaleDateString('en', { month: 'short' }),
      formattedDate: new Date(d.date).toLocaleDateString()
    }));
  }, [filteredData]);

  // Monthly aggregation for trends
  const monthlyData = useMemo(() => {
    const months = {};
    filteredData.forEach(d => {
      const month = new Date(d.date).toLocaleDateString('en', { month: 'short', year: 'numeric' });
      if (!months[month]) {
        months[month] = { 
          month, 
          temperature: [], 
          humidity: [], 
          precipitation: [], 
          windSpeed: [] 
        };
      }
      if (d.temperature) months[month].temperature.push(d.temperature);
      if (d.humidity) months[month].humidity.push(d.humidity);
      if (d.precipitation) months[month].precipitation.push(d.precipitation);
      if (d.windSpeed) months[month].windSpeed.push(d.windSpeed);
    });
    
    return Object.values(months).map(m => ({
      month: m.month,
      avgTemp: m.temperature.length ? (m.temperature.reduce((a, b) => a + b, 0) / m.temperature.length).toFixed(1) : 0,
      avgHumidity: m.humidity.length ? (m.humidity.reduce((a, b) => a + b, 0) / m.humidity.length).toFixed(1) : 0,
      totalPrecip: m.precipitation.reduce((a, b) => a + b, 0).toFixed(1),
      avgWind: m.windSpeed.length ? (m.windSpeed.reduce((a, b) => a + b, 0) / m.windSpeed.length).toFixed(1) : 0
    }));
  }, [filteredData]);

  const anomalies = chartData.filter(d => d.isAnomaly);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating weather data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Cloud className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Weather Data Analytics</h1>
                <p className="text-gray-600">Comprehensive weather pattern analysis and insights</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Download className="h-4 w-4" />
                <span>Export Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <label className="text-sm font-medium text-gray-700">Time Range:</label>
              <select 
                value={selectedDateRange} 
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Data</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="180">Last 6 Months</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Primary Metric:</label>
              <select 
                value={selectedMetric} 
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="temperature">Temperature</option>
                <option value="humidity">Humidity</option>
                <option value="precipitation">Precipitation</option>
                <option value="windSpeed">Wind Speed</option>
              </select>
            </div>
            
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={showAnomalies} 
                onChange={(e) => setShowAnomalies(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Highlight Anomalies</span>
            </label>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Temperature</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.temperature.mean.toFixed(1)}°C</p>
                  <p className="text-xs text-gray-500">Range: {statistics.temperature.min.toFixed(1)}° to {statistics.temperature.max.toFixed(1)}°</p>
                </div>
                <Thermometer className="h-8 w-8 text-red-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Humidity</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.humidity.mean.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">Range: {statistics.humidity.min.toFixed(1)}% to {statistics.humidity.max.toFixed(1)}%</p>
                </div>
                <Droplets className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Precipitation</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.precipitation.total.toFixed(1)}mm</p>
                  <p className="text-xs text-gray-500">{statistics.precipitation.rainyDays} rainy days</p>
                </div>
                <Cloud className="h-8 w-8 text-gray-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Anomalies Detected</p>
                  <p className="text-2xl font-bold text-gray-900">{anomalies.length}</p>
                  <p className="text-xs text-gray-500">{((anomalies.length / chartData.length) * 100).toFixed(1)}% of data</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
          </div>
        )}

        {/* Main Time Series Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Temperature Trends</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <TrendingUp className="h-4 w-4" />
              <span>Daily readings over time</span>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="formattedDate" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(label) => `Date: ${label}`}
                  formatter={(value, name) => [
                    `${value}${name === 'temperature' ? '°C' : name === 'humidity' ? '%' : ''}`, 
                    name
                  ]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="temperature" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={false}
                  name="Temperature"
                />
                {showAnomalies && (
                  <Line 
                    type="monotone" 
                    dataKey="isAnomaly" 
                    stroke="#f59e0b" 
                    strokeWidth={0}
                    dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                    name="Anomalies"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Trends */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Averages</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgTemp" fill="#ef4444" name="Avg Temp (°C)" />
                  <Bar dataKey="totalPrecip" fill="#3b82f6" name="Precipitation (mm)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Humidity vs Temperature Correlation */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Temperature vs Humidity</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.slice(0, 50)}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="temperature" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="humidity" 
                    stroke="#06b6d4" 
                    fill="#06b6d4" 
                    fillOpacity={0.3}
                    name="Humidity (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Data Quality & Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Quality</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Records:</span>
                <span className="font-medium">{chartData.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Missing Values:</span>
                <span className="font-medium">{chartData.filter(d => !d.temperature).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completeness:</span>
                <span className="font-medium">{((chartData.filter(d => d.temperature).length / chartData.length) * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pattern Detection</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Seasonal Variation:</span>
                <span className="font-medium text-green-600">Detected</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Extreme Events:</span>
                <span className="font-medium">{anomalies.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Data Trend:</span>
                <span className="font-medium text-blue-600">Stable</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
            <div className="space-y-2 text-sm">
              <p className="text-gray-600">• Clear seasonal temperature patterns observed</p>
              <p className="text-gray-600">• Humidity inversely correlated with temperature</p>
              <p className="text-gray-600">• {anomalies.length} extreme weather events detected</p>
              <p className="text-gray-600">• Data quality: {((chartData.filter(d => d.temperature).length / chartData.length) * 100).toFixed(0)}% complete</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherAnalyticsApp;
