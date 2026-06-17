import dayjs from 'dayjs';
import { STATIONS, MODELS, ELEMENTS, FORECAST_HOURS, SEASONS, WEATHER_TYPES } from './stations';

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function getSeasonFromDate(date) {
  const month = date.month() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

function getWeatherType(seed, season) {
  const r = seededRandom(seed * 7 + season.length);
  const types = ['sunny', 'cloudy', 'rain', 'fog', 'thunderstorm'];
  if (season === 'winter') types.push('snow');
  return types[Math.floor(r * types.length)];
}

function generateObservationData(date, station) {
  const seed = Date.parse(date.format('YYYY-MM-DD')) + station.lat * 1000 + station.lon * 100;
  const season = getSeasonFromDate(date);
  
  const baseTemp = {
    spring: 15,
    summer: 28,
    autumn: 18,
    winter: -2
  };
  
  const latFactor = (45 - station.lat) * 0.5;
  const altFactor = -station.alt * 0.006;
  
  const temperature = baseTemp[season] + latFactor + altFactor + seededRandom(seed) * 10 - 5;
  const precipitation = seededRandom(seed * 2) > 0.7 ? seededRandom(seed * 3) * 30 : 0;
  const windSpeed = 2 + seededRandom(seed * 4) * 8;
  
  return {
    date: date.format('YYYY-MM-DD'),
    stationId: station.id,
    stationName: station.name,
    temperature: Math.round(temperature * 10) / 10,
    precipitation: Math.round(precipitation * 10) / 10,
    windSpeed: Math.round(windSpeed * 10) / 10,
    weatherType: getWeatherType(seed, season),
    season
  };
}

const MODEL_PROFILES = {
  ECMWF: {
    tempBias: 0.2,
    tempGrowth: 0.008,
    tempVar: 0.8,
    precipBias: -1.5,
    precipGrowth: 0.012,
    precipVar: 2.5,
    windBias: 0.4,
    windGrowth: 0.006,
    windVar: 0.6,
    qualityRank: 1
  },
  GFS: {
    tempBias: -0.6,
    tempGrowth: 0.012,
    tempVar: 1.0,
    precipBias: 1.2,
    precipGrowth: 0.018,
    precipVar: 3.5,
    windBias: -0.5,
    windGrowth: 0.009,
    windVar: 0.8,
    qualityRank: 2
  },
  CMA: {
    tempBias: 1.0,
    tempGrowth: 0.018,
    tempVar: 1.5,
    precipBias: -3.0,
    precipGrowth: 0.025,
    precipVar: 5.0,
    windBias: 0.8,
    windGrowth: 0.014,
    windVar: 1.2,
    qualityRank: 3
  },
  WRF: {
    tempBias: -0.3,
    tempGrowth: 0.022,
    tempVar: 1.8,
    precipBias: 2.5,
    precipGrowth: 0.03,
    precipVar: 6.0,
    windBias: 1.2,
    windGrowth: 0.018,
    windVar: 1.5,
    qualityRank: 4
  }
};

function generateForecastData(date, station, model, forecastHour) {
  const seed = Date.parse(date.format('YYYY-MM-DD')) + station.lat * 1000 + station.lon * 100 + 
               model.id.charCodeAt(0) * 17 + forecastHour * 3;
  const season = getSeasonFromDate(date);
  
  const obs = generateObservationData(date, station);
  const profile = MODEL_PROFILES[model.id] || MODEL_PROFILES.ECMWF;
  
  const hourFactor = forecastHour / 24;
  
  const tempError = profile.tempBias + profile.tempGrowth * hourFactor * 24 + 
                    (seededRandom(seed) - 0.5) * 2 * profile.tempVar * (1 + hourFactor * 0.5);
  
  const precipError = profile.precipBias * (0.5 + hourFactor * 0.5) + 
                      (seededRandom(seed * 2) - 0.5) * 2 * profile.precipVar * (1 + hourFactor * 0.3);
  
  const windError = profile.windBias + profile.windGrowth * hourFactor * 24 + 
                    (seededRandom(seed * 3) - 0.5) * 2 * profile.windVar * (1 + hourFactor * 0.4);
  
  const seasonalModifier = season === 'summer' ? 1.2 : season === 'winter' ? 0.8 : 1.0;
  const regionalFactor = station.lon > 115 ? 0.3 : station.lat > 35 ? -0.2 : 0.1;
  
  return {
    date: date.format('YYYY-MM-DD'),
    stationId: station.id,
    stationName: station.name,
    model: model.id,
    forecastHour,
    forecastDate: date.add(forecastHour, 'hour').format('YYYY-MM-DD HH:mm'),
    temperature: Math.round((obs.temperature + tempError * seasonalModifier + regionalFactor) * 10) / 10,
    precipitation: Math.max(0, Math.round((obs.precipitation + precipError * seasonalModifier) * 10) / 10),
    windSpeed: Math.max(0, Math.round((obs.windSpeed + windError * seasonalModifier) * 10) / 10),
    season,
    weatherType: obs.weatherType
  };
}

export function generateObservations(startDate, days) {
  const data = [];
  const start = dayjs(startDate);
  
  for (let d = 0; d < days; d++) {
    const date = start.add(d, 'day');
    STATIONS.forEach(station => {
      data.push(generateObservationData(date, station));
    });
  }
  
  return data;
}

export function generateForecasts(startDate, days) {
  const data = [];
  const start = dayjs(startDate);
  
  for (let d = 0; d < days; d++) {
    const date = start.add(d, 'day');
    STATIONS.forEach(station => {
      MODELS.forEach(model => {
        FORECAST_HOURS.forEach(hour => {
          data.push(generateForecastData(date, station, model, hour));
        });
      });
    });
  }
  
  return data;
}

export function generateYearlyData(year) {
  const startDate = dayjs(`${year}-01-01`);
  const days = dayjs(`${year}-12-31`).diff(startDate, 'day') + 1;
  return {
    observations: generateObservations(startDate, days),
    forecasts: generateForecasts(startDate, days)
  };
}

export function filterDataByDateRange(data, startDate, endDate) {
  if (!startDate && !endDate) return data;
  const start = startDate ? dayjs(startDate).format('YYYY-MM-DD') : null;
  const end = endDate ? dayjs(endDate).format('YYYY-MM-DD') : null;
  
  return data.filter(item => {
    const itemDate = item.date;
    if (start && itemDate < start) return false;
    if (end && itemDate > end) return false;
    return true;
  });
}

export function filterDataByMonth(data, year, month) {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  return data.filter(item => item.date.startsWith(monthStr));
}

export function filterDataByQuarter(data, year, quarter) {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const startStr = `${year}-${String(startMonth).padStart(2, '0')}`;
  const endStr = `${year}-${String(endMonth).padStart(2, '0')}-99`;
  
  return data.filter(item => {
    const dateStr = item.date;
    return dateStr >= startStr && dateStr <= endStr;
  });
}

export function groupByMonth(observations, forecasts, element = 'temperature') {
  const monthlyData = [];
  
  for (let month = 1; month <= 12; month++) {
    const monthObs = filterDataByMonth(observations, dayjs().year(), month);
    const monthFc = filterDataByMonth(forecasts, dayjs().year(), month);
    
    const byModel = {};
    MODELS.forEach(model => {
      const modelFc = monthFc.filter(f => f.model === model.id);
      const errors = calculateErrorsSimple(modelFc, monthObs, element);
      const stats = calculateStatsSimple(errors);
      byModel[model.id] = stats;
    });
    
    monthlyData.push({
      month,
      monthName: `${month}月`,
      observationCount: monthObs.length,
      forecastCount: monthFc.length,
      byModel
    });
  }
  
  return monthlyData;
}

function calculateErrorsSimple(forecasts, observations, element) {
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
        error,
        absError: Math.abs(error),
        squaredError: error * error
      });
    }
  });
  
  return errors;
}

function calculateStatsSimple(errors) {
  if (errors.length === 0) {
    return { count: 0, me: 0, mae: 0, rmse: 0 };
  }
  
  const me = errors.reduce((sum, e) => sum + e.error, 0) / errors.length;
  const mae = errors.reduce((sum, e) => sum + e.absError, 0) / errors.length;
  const mse = errors.reduce((sum, e) => sum + e.squaredError, 0) / errors.length;
  const rmse = Math.sqrt(mse);
  
  return {
    count: errors.length,
    me: round(me, 3),
    mae: round(mae, 3),
    rmse: round(rmse, 3)
  };
}

function round(num, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

const currentYear = dayjs().year();
export const yearlyObservations = generateObservations(dayjs(`${currentYear}-01-01`), 365);
export const yearlyForecasts = generateForecasts(dayjs(`${currentYear}-01-01`), 365);

export const mockObservations = filterDataByDateRange(
  yearlyObservations,
  dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
  dayjs().format('YYYY-MM-DD')
);
export const mockForecasts = filterDataByDateRange(
  yearlyForecasts,
  dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
  dayjs().format('YYYY-MM-DD')
);
