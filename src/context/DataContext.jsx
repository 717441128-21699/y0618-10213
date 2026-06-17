import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { yearlyObservations, yearlyForecasts, filterDataByDateRange, groupByMonth } from '../data/mockData.js';
import { STATIONS, MODELS } from '../data/stations.js';
import dayjs from 'dayjs';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [observations, setObservations] = useState(yearlyObservations);
  const [forecasts, setForecasts] = useState(yearlyForecasts);
  const [dataSource, setDataSource] = useState('mock');
  const [importInfo, setImportInfo] = useState(null);

  const filteredObservations = useMemo(() => {
    return observations;
  }, [observations]);

  const filteredForecasts = useMemo(() => {
    return forecasts;
  }, [forecasts]);

  const recentObservations = useMemo(() => {
    return filterDataByDateRange(
      observations,
      dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
      dayjs().format('YYYY-MM-DD')
    );
  }, [observations]);

  const recentForecasts = useMemo(() => {
    return filterDataByDateRange(
      forecasts,
      dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
      dayjs().format('YYYY-MM-DD')
    );
  }, [forecasts]);

  const monthlyData = useMemo(() => {
    return groupByMonth(observations, forecasts, 'temperature');
  }, [observations, forecasts]);

  const importObservations = useCallback((data) => {
    const validated = validateObservationData(data);
    if (validated.length > 0) {
      setObservations(validated);
      setDataSource('imported');
      setImportInfo(prev => ({
        ...prev,
        observations: {
          count: validated.length,
          dateRange: getDateRange(validated),
          stations: [...new Set(validated.map(d => d.stationId))].length
        }
      }));
      return validated.length;
    }
    return 0;
  }, []);

  const importForecasts = useCallback((data) => {
    const validated = validateForecastData(data);
    if (validated.length > 0) {
      setForecasts(validated);
      setDataSource('imported');
      setImportInfo(prev => ({
        ...prev,
        forecasts: {
          count: validated.length,
          dateRange: getDateRange(validated),
          stations: [...new Set(validated.map(d => d.stationId))].length,
          models: [...new Set(validated.map(d => d.model))].length
        }
      }));
      return validated.length;
    }
    return 0;
  }, []);

  const resetToMockData = useCallback(() => {
    setObservations(yearlyObservations);
    setForecasts(yearlyForecasts);
    setDataSource('mock');
    setImportInfo(null);
  }, []);

  const value = {
    observations,
    forecasts,
    filteredObservations,
    filteredForecasts,
    recentObservations,
    recentForecasts,
    monthlyData,
    dataSource,
    importInfo,
    importObservations,
    importForecasts,
    resetToMockData
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

function validateObservationData(data) {
  if (!Array.isArray(data) || data.length === 0) return [];
  
  const valid = [];
  const stationMap = new Map(STATIONS.map(s => [s.id, s]));
  
  data.forEach(item => {
    if (!item.stationId || !item.date) return;
    
    const station = stationMap.get(item.stationId);
    
    valid.push({
      date: dayjs(item.date).format('YYYY-MM-DD'),
      stationId: item.stationId,
      stationName: station?.name || item.stationName || item.stationId,
      temperature: parseFloat(item.temperature) || 0,
      precipitation: parseFloat(item.precipitation) || 0,
      windSpeed: parseFloat(item.windSpeed) || 0,
      weatherType: item.weatherType || 'sunny',
      season: getSeasonFromDateStr(item.date)
    });
  });
  
  return valid;
}

function validateForecastData(data) {
  if (!Array.isArray(data) || data.length === 0) return [];
  
  const valid = [];
  const stationMap = new Map(STATIONS.map(s => [s.id, s]));
  
  data.forEach(item => {
    if (!item.stationId || !item.date || !item.model || !item.forecastHour) return;
    
    const station = stationMap.get(item.stationId);
    
    valid.push({
      date: dayjs(item.date).format('YYYY-MM-DD'),
      stationId: item.stationId,
      stationName: station?.name || item.stationName || item.stationId,
      model: item.model,
      forecastHour: parseInt(item.forecastHour),
      forecastDate: item.forecastDate || dayjs(item.date).add(parseInt(item.forecastHour), 'hour').format('YYYY-MM-DD HH:mm'),
      temperature: parseFloat(item.temperature) || 0,
      precipitation: parseFloat(item.precipitation) || 0,
      windSpeed: parseFloat(item.windSpeed) || 0,
      season: getSeasonFromDateStr(item.date),
      weatherType: item.weatherType || 'sunny'
    });
  });
  
  return valid;
}

function getSeasonFromDateStr(dateStr) {
  const month = dayjs(dateStr).month() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

function getDateRange(data) {
  if (data.length === 0) return { start: null, end: null };
  const dates = data.map(d => d.date).sort();
  return { start: dates[0], end: dates[dates.length - 1] };
}
