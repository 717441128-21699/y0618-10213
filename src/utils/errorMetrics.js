import _ from 'lodash';
import { STATIONS, FORECAST_HOURS, MODELS, SEASONS, WEATHER_TYPES, ELEMENTS } from '../data/stations';

export function calculateErrors(forecasts, observations, element = 'temperature') {
  const obsMap = new Map();
  observations.forEach(obs => {
    const key = `${obs.stationId}_${obs.date}`;
    obsMap.set(key, obs);
  });
  
  const errors = [];
  
  forecasts.forEach(fc => {
    const fcDate = fc.forecastDate.split(' ')[0];
    const key = `${fc.stationId}_${fcDate}`;
    const obs = obsMap.get(key);
    
    if (obs && obs[element] !== undefined && fc[element] !== undefined) {
      const error = fc[element] - obs[element];
      errors.push({
        stationId: fc.stationId,
        model: fc.model,
        forecastHour: fc.forecastHour,
        date: fc.date,
        forecastDate: fcDate,
        observed: obs[element],
        forecast: fc[element],
        error,
        absError: Math.abs(error),
        squaredError: error * error,
        season: fc.season,
        weatherType: fc.weatherType
      });
    }
  });
  
  return errors;
}

export function calculateStatistics(errors) {
  if (errors.length === 0) {
    return { count: 0, me: 0, mae: 0, rmse: 0, minError: 0, maxError: 0 };
  }
  
  const me = _.meanBy(errors, 'error');
  const mae = _.meanBy(errors, 'absError');
  const mse = _.meanBy(errors, 'squaredError');
  const rmse = Math.sqrt(mse);
  const minError = _.minBy(errors, 'error')?.error || 0;
  const maxError = _.maxBy(errors, 'error')?.error || 0;
  
  return {
    count: errors.length,
    me: round(me, 3),
    mae: round(mae, 3),
    rmse: round(rmse, 3),
    minError: round(minError, 3),
    maxError: round(maxError, 3)
  };
}

export function groupByStation(errors) {
  const grouped = _.groupBy(errors, 'stationId');
  const result = [];
  
  Object.entries(grouped).forEach(([stationId, stationErrors]) => {
    const station = STATIONS.find(s => s.id === stationId);
    const stats = calculateStatistics(stationErrors);
    result.push({
      stationId,
      stationName: station?.name || stationId,
      lat: station?.lat || 0,
      lon: station?.lon || 0,
      province: station?.province || '',
      ...stats
    });
  });
  
  return _.sortBy(result, 'stationName');
}

export function groupByForecastHour(errors) {
  const grouped = _.groupBy(errors, 'forecastHour');
  const result = [];
  
  FORECAST_HOURS.forEach(hour => {
    const hourErrors = grouped[hour] || [];
    const stats = calculateStatistics(hourErrors);
    result.push({
      forecastHour: hour,
      ...stats
    });
  });
  
  return result;
}

export function groupByModel(errors) {
  const grouped = _.groupBy(errors, 'model');
  const result = [];
  
  MODELS.forEach(model => {
    const modelErrors = grouped[model.id] || [];
    const stats = calculateStatistics(modelErrors);
    result.push({
      model: model.id,
      modelName: model.name,
      color: model.color,
      ...stats
    });
  });
  
  return result;
}

export function groupBySeason(errors) {
  const grouped = _.groupBy(errors, 'season');
  const result = [];
  
  SEASONS.forEach(season => {
    const seasonErrors = grouped[season.id] || [];
    const stats = calculateStatistics(seasonErrors);
    result.push({
      season: season.id,
      seasonName: season.name,
      ...stats
    });
  });
  
  return result;
}

export function groupByWeatherType(errors) {
  const grouped = _.groupBy(errors, 'weatherType');
  const result = [];
  
  WEATHER_TYPES.forEach(type => {
    const typeErrors = grouped[type.id] || [];
    const stats = calculateStatistics(typeErrors);
    result.push({
      weatherType: type.id,
      weatherTypeName: type.name,
      ...stats
    });
  });
  
  return result;
}

export function groupByModelAndHour(errors) {
  const result = [];
  
  MODELS.forEach(model => {
    const modelErrors = errors.filter(e => e.model === model.id);
    const byHour = groupByForecastHour(modelErrors);
    result.push({
      model: model.id,
      modelName: model.name,
      color: model.color,
      hourlyData: byHour
    });
  });
  
  return result;
}

export function groupByStationAndModel(errors) {
  const result = [];
  
  STATIONS.forEach(station => {
    const stationErrors = errors.filter(e => e.stationId === station.id);
    const byModel = groupByModel(stationErrors);
    result.push({
      stationId: station.id,
      stationName: station.name,
      lat: station.lat,
      lon: station.lon,
      modelData: byModel
    });
  });
  
  return result;
}

export function filterErrors(errors, filters = {}) {
  let result = [...errors];
  
  if (filters.models && filters.models.length > 0) {
    result = result.filter(e => filters.models.includes(e.model));
  }
  
  if (filters.stations && filters.stations.length > 0) {
    result = result.filter(e => filters.stations.includes(e.stationId));
  }
  
  if (filters.forecastHours && filters.forecastHours.length > 0) {
    result = result.filter(e => filters.forecastHours.includes(e.forecastHour));
  }
  
  if (filters.seasons && filters.seasons.length > 0) {
    result = result.filter(e => filters.seasons.includes(e.season));
  }
  
  if (filters.weatherTypes && filters.weatherTypes.length > 0) {
    result = result.filter(e => filters.weatherTypes.includes(e.weatherType));
  }
  
  if (filters.startDate) {
    result = result.filter(e => e.date >= filters.startDate);
  }
  
  if (filters.endDate) {
    result = result.filter(e => e.date <= filters.endDate);
  }
  
  return result;
}

function round(num, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

export function getSystematicBias(errors) {
  const byStation = groupByStation(errors);
  const positiveBias = byStation.filter(s => s.me > 0.5).length;
  const negativeBias = byStation.filter(s => s.me < -0.5).length;
  const neutral = byStation.length - positiveBias - negativeBias;
  
  return {
    positiveBias,
    negativeBias,
    neutral,
    positiveStations: byStation.filter(s => s.me > 0.5).map(s => s.stationName),
    negativeStations: byStation.filter(s => s.me < -0.5).map(s => s.stationName)
  };
}
