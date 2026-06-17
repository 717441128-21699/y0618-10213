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
    const result = validateObservationData(data);
    if (result.valid.length > 0) {
      setObservations(result.valid);
      setDataSource('imported');
      setImportInfo(prev => ({
        ...prev,
        observations: {
          count: result.valid.length,
          dateRange: getDateRange(result.valid),
          stations: [...new Set(result.valid.map(d => d.stationId))].length
        }
      }));
      return result;
    }
    return result;
  }, []);

  const importForecasts = useCallback((data) => {
    const result = validateForecastData(data);
    if (result.valid.length > 0) {
      setForecasts(result.valid);
      setDataSource('imported');
      setImportInfo(prev => ({
        ...prev,
        forecasts: {
          count: result.valid.length,
          dateRange: getDateRange(result.valid),
          stations: [...new Set(result.valid.map(d => d.stationId))].length,
          models: [...new Set(result.valid.map(d => d.model))].length
        }
      }));
      return result;
    }
    return result;
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

function normalizeFieldName(key) {
  if (!key) return key;
  return key
    .trim()
    .toLowerCase()
    .replace(/[_\s-]/g, '')
    .replace(/\./g, '');
}

function getFieldValue(item, candidates) {
  for (const key of Object.keys(item)) {
    const normalized = normalizeFieldName(key);
    if (candidates.map(c => normalizeFieldName(c)).includes(normalized)) {
      return item[key];
    }
  }
  return undefined;
}

const OBS_FIELDS = {
  stationId: ['stationId', 'station_id', 'stationid', 'station', '站号', '站点编号'],
  stationName: ['stationName', 'station_name', 'stationname', '站点名称', '站名'],
  date: ['date', '日期', '观测日期', '时间', 'time'],
  temperature: ['temperature', 'temp', '气温', '温度', 't2m', 'T'],
  precipitation: ['precipitation', 'precip', 'precipitation_amount', 'prate', '降水', '降水量', 'rain', '降雨量'],
  windSpeed: ['windSpeed', 'wind_speed', 'windspeed', 'wind', '风速', '风力', 'ws', 'u10'],
  weatherType: ['weatherType', 'weather_type', 'weather', '天气类型', '天气状况', '天气现象']
};

const FC_FIELDS = {
  stationId: ['stationId', 'station_id', 'stationid', 'station', '站号', '站点编号'],
  stationName: ['stationName', 'station_name', 'stationname', '站点名称', '站名'],
  date: ['date', 'initDate', 'init_time', '起报日期', '起报时间', '初始时间', 'baseTime'],
  model: ['model', 'mode', '模式', '预报模式', 'modelName', 'model_name'],
  forecastHour: ['forecastHour', 'forecast_hour', 'forecasthour', 'fhour', 'fh', '时效', '预报时效', 'leadTime', 'lead_time'],
  forecastDate: ['forecastDate', 'forecast_date', 'forecastdate', 'validDate', 'valid_date', '预报日期', '预报时间'],
  temperature: ['temperature', 'temp', '气温', '温度', 't2m', 'T'],
  precipitation: ['precipitation', 'precip', 'precipitation_amount', 'prate', '降水', '降水量', 'rain', '降雨量'],
  windSpeed: ['windSpeed', 'wind_speed', 'windspeed', 'wind', '风速', '风力', 'ws', 'u10'],
  weatherType: ['weatherType', 'weather_type', 'weather', '天气类型', '天气状况', '天气现象']
};

function validateObservationData(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return { valid: [], invalid: 0, total: 0, errors: ['数据为空或格式不正确'] };
  }
  
  const valid = [];
  const invalid = [];
  const stationMap = new Map(STATIONS.map(s => [s.id, s]));
  const errors = new Set();
  
  data.forEach((item, idx) => {
    const stationId = getFieldValue(item, OBS_FIELDS.stationId);
    const date = getFieldValue(item, OBS_FIELDS.date);
    
    if (!stationId || !date) {
      invalid.push({ row: idx + 2, reason: `缺少必填字段: ${!stationId ? 'stationId' : ''}${!stationId && !date ? '、' : ''}${!date ? 'date' : ''}` });
      if (!stationId) errors.add('stationId');
      if (!date) errors.add('date');
      return;
    }
    
    const station = stationMap.get(stationId);
    const stationName = getFieldValue(item, OBS_FIELDS.stationName);
    const temperature = parseFloat(getFieldValue(item, OBS_FIELDS.temperature)) || 0;
    const precipitation = parseFloat(getFieldValue(item, OBS_FIELDS.precipitation)) || 0;
    const windSpeed = parseFloat(getFieldValue(item, OBS_FIELDS.windSpeed)) || 0;
    const weatherType = getFieldValue(item, OBS_FIELDS.weatherType) || 'sunny';
    
    valid.push({
      date: dayjs(date).format('YYYY-MM-DD'),
      stationId,
      stationName: station?.name || stationName || stationId,
      temperature,
      precipitation,
      windSpeed,
      weatherType,
      season: getSeasonFromDateStr(date)
    });
  });
  
  return {
    valid,
    invalid: invalid.length,
    total: data.length,
    invalidRecords: invalid.slice(0, 20),
    errors: Array.from(errors)
  };
}

function validateForecastData(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return { valid: [], invalid: 0, total: 0, errors: ['数据为空或格式不正确'] };
  }
  
  const valid = [];
  const invalid = [];
  const stationMap = new Map(STATIONS.map(s => [s.id, s]));
  const errors = new Set();
  
  data.forEach((item, idx) => {
    const stationId = getFieldValue(item, FC_FIELDS.stationId);
    const date = getFieldValue(item, FC_FIELDS.date);
    const model = getFieldValue(item, FC_FIELDS.model);
    const forecastHourRaw = getFieldValue(item, FC_FIELDS.forecastHour);
    const forecastHour = parseInt(forecastHourRaw);
    
    const missing = [];
    if (!stationId) missing.push('stationId');
    if (!date) missing.push('date');
    if (!model) missing.push('model');
    if (forecastHourRaw === undefined || forecastHourRaw === null || forecastHourRaw === '' || isNaN(forecastHour)) missing.push('forecastHour');
    
    if (missing.length > 0) {
      invalid.push({ row: idx + 2, reason: `缺少必填字段: ${missing.join('、')}` });
      missing.forEach(m => errors.add(m));
      return;
    }
    
    const station = stationMap.get(stationId);
    const stationName = getFieldValue(item, FC_FIELDS.stationName);
    const forecastDate = getFieldValue(item, FC_FIELDS.forecastDate) || dayjs(date).add(forecastHour, 'hour').format('YYYY-MM-DD HH:mm');
    const temperature = parseFloat(getFieldValue(item, FC_FIELDS.temperature)) || 0;
    const precipitation = parseFloat(getFieldValue(item, FC_FIELDS.precipitation)) || 0;
    const windSpeed = parseFloat(getFieldValue(item, FC_FIELDS.windSpeed)) || 0;
    const weatherType = getFieldValue(item, FC_FIELDS.weatherType) || 'sunny';
    
    valid.push({
      date: dayjs(date).format('YYYY-MM-DD'),
      stationId,
      stationName: station?.name || stationName || stationId,
      model,
      forecastHour,
      forecastDate,
      temperature,
      precipitation,
      windSpeed,
      season: getSeasonFromDateStr(date),
      weatherType
    });
  });
  
  return {
    valid,
    invalid: invalid.length,
    total: data.length,
    invalidRecords: invalid.slice(0, 20),
    errors: Array.from(errors)
  };
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
