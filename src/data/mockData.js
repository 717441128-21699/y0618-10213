import dayjs from 'dayjs';
import { STATIONS, MODELS, ELEMENTS, FORECAST_HOURS, SEASONS, WEATHER_TYPES } from './stations';

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getSeason(date) {
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
  const season = getSeason(date);
  
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
    temperature: Math.round(temperature * 10) / 10,
    precipitation: Math.round(precipitation * 10) / 10,
    windSpeed: Math.round(windSpeed * 10) / 10,
    weatherType: getWeatherType(seed, season),
    season
  };
}

function generateForecastData(date, station, model, forecastHour) {
  const seed = Date.parse(date.format('YYYY-MM-DD')) + station.lat * 1000 + station.lon * 100 + 
               model.id.charCodeAt(0) * 10 + forecastHour;
  const season = getSeason(date);
  
  const obs = generateObservationData(date, station);
  
  const modelBiases = {
    ECMWF: { temp: 0.3, precip: -2, wind: 0.5 },
    GFS: { temp: -0.5, precip: 1.5, wind: -0.3 },
    CMA: { temp: 0.8, precip: -1, wind: 0.2 },
    WRF: { temp: -0.2, precip: 2, wind: 0.8 }
  };
  
  const hourFactor = forecastHour / 240;
  const bias = modelBiases[model.id] || { temp: 0, precip: 0, wind: 0 };
  
  const tempError = bias.temp + hourFactor * 3 + seededRandom(seed) * 2 - 1;
  const precipError = bias.precip * hourFactor + seededRandom(seed * 2) * 5 - 2.5;
  const windError = bias.wind + hourFactor * 2 + seededRandom(seed * 3) * 1.5 - 0.75;
  
  const regionalFactor = station.lon > 115 ? 0.2 : -0.1;
  
  return {
    date: date.format('YYYY-MM-DD'),
    stationId: station.id,
    model: model.id,
    forecastHour,
    forecastDate: date.add(forecastHour, 'hour').format('YYYY-MM-DD HH:mm'),
    temperature: Math.round((obs.temperature + tempError + regionalFactor) * 10) / 10,
    precipitation: Math.max(0, Math.round((obs.precipitation + precipError) * 10) / 10),
    windSpeed: Math.max(0, Math.round((obs.windSpeed + windError) * 10) / 10),
    season,
    weatherType: obs.weatherType
  };
}

export function generateAllObservations(startDate, days) {
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

export function generateAllForecasts(startDate, days) {
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

export function getMonthlyArchiveData(year, month) {
  const startDate = dayjs(`${year}-${month}-01`);
  const days = startDate.daysInMonth();
  return {
    observations: generateAllObservations(startDate, days),
    forecasts: generateAllForecasts(startDate, Math.floor(days / 2))
  };
}

export function getQuarterlyReportData(year, quarter) {
  const startMonth = (quarter - 1) * 3 + 1;
  const months = [startMonth, startMonth + 1, startMonth + 2];
  const data = [];
  
  months.forEach(month => {
    const monthData = getMonthlyArchiveData(year, month);
    data.push({
      month,
      ...monthData
    });
  });
  
  return data;
}

export const mockObservations = generateAllObservations(dayjs().subtract(30, 'day'), 30);
export const mockForecasts = generateAllForecasts(dayjs().subtract(30, 'day'), 30);
