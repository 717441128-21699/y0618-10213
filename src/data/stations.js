export const STATIONS = [
  { id: '54398', name: '北京', lat: 39.93, lon: 116.28, alt: 32.5, province: '北京' },
  { id: '58362', name: '上海', lat: 31.40, lon: 121.46, alt: 4.5, province: '上海' },
  { id: '59287', name: '广州', lat: 23.17, lon: 113.33, alt: 69.4, province: '广东' },
  { id: '56778', name: '成都', lat: 30.67, lon: 104.02, alt: 505.9, province: '四川' },
  { id: '57036', name: '兰州', lat: 36.05, lon: 103.88, alt: 1517.2, province: '甘肃' },
  { id: '54511', name: '沈阳', lat: 41.77, lon: 123.63, alt: 43.2, province: '辽宁' },
  { id: '52889', name: '乌鲁木齐', lat: 43.78, lon: 87.65, alt: 917.9, province: '新疆' },
  { id: '56294', name: '拉萨', lat: 29.67, lon: 91.13, alt: 3648.7, province: '西藏' },
  { id: '54823', name: '哈尔滨', lat: 45.75, lon: 126.77, alt: 142.3, province: '黑龙江' },
  { id: '57494', name: '武汉', lat: 30.62, lon: 114.13, alt: 23.3, province: '湖北' },
  { id: '58238', name: '南京', lat: 32.00, lon: 118.80, alt: 26.1, province: '江苏' },
  { id: '54857', name: '长春', lat: 43.90, lon: 125.22, alt: 236.8, province: '吉林' },
  { id: '53463', name: '呼和浩特', lat: 40.82, lon: 111.68, alt: 1063.0, province: '内蒙古' },
  { id: '53915', name: '银川', lat: 38.48, lon: 106.22, alt: 1111.4, province: '宁夏' },
  { id: '56146', name: '西宁', lat: 36.72, lon: 101.75, alt: 2261.2, province: '青海' },
  { id: '59431', name: '南宁', lat: 22.82, lon: 108.35, alt: 121.6, province: '广西' },
  { id: '57816', name: '贵阳', lat: 26.58, lon: 106.72, alt: 1071.2, province: '贵州' },
  { id: '56959', name: '重庆', lat: 29.52, lon: 106.48, alt: 259.1, province: '重庆' },
  { id: '54237', name: '天津', lat: 39.10, lon: 117.17, alt: 3.3, province: '天津' },
  { id: '54662', name: '济南', lat: 36.68, lon: 116.98, alt: 78.0, province: '山东' },
  { id: '53845', name: '太原', lat: 37.78, lon: 112.55, alt: 778.3, province: '山西' },
  { id: '57993', name: '昆明', lat: 25.02, lon: 102.68, alt: 1892.4, province: '云南' },
  { id: '58847', name: '杭州', lat: 30.23, lon: 120.17, alt: 41.7, province: '浙江' },
  { id: '58966', name: '福州', lat: 26.08, lon: 119.28, alt: 76.0, province: '福建' },
  { id: '59758', name: '海口', lat: 20.03, lon: 110.35, alt: 14.1, province: '海南' },
  { id: '53614', name: '西安', lat: 34.30, lon: 108.93, alt: 397.5, province: '陕西' },
  { id: '58759', name: '南昌', lat: 28.60, lon: 115.92, alt: 46.9, province: '江西' },
  { id: '55299', name: '石家庄', lat: 38.03, lon: 114.42, alt: 80.5, province: '河北' },
  { id: '57245', name: '长沙', lat: 28.22, lon: 112.92, alt: 68.0, province: '湖南' },
  { id: '54401', name: '大连', lat: 38.90, lon: 121.63, alt: 92.8, province: '辽宁' }
];

export const MODELS = [
  { id: 'ECMWF', name: 'ECMWF(欧洲中期天气预报中心)', color: '#1890ff' },
  { id: 'GFS', name: 'GFS(美国全球预报系统)', color: '#52c41a' },
  { id: 'CMA', name: 'CMA-GFS(中国气象局全球模式)', color: '#faad14' },
  { id: 'WRF', name: 'WRF(中尺度数值模式)', color: '#722ed1' }
];

export const ELEMENTS = [
  { id: 'temp', name: '温度', unit: '°C', key: 'temperature' },
  { id: 'precip', name: '降水', unit: 'mm', key: 'precipitation' },
  { id: 'wind', name: '风速', unit: 'm/s', key: 'windSpeed' }
];

export const FORECAST_HOURS = [24, 48, 72, 96, 120, 144, 168, 192, 216, 240];

export const SEASONS = [
  { id: 'spring', name: '春季', months: [3, 4, 5] },
  { id: 'summer', name: '夏季', months: [6, 7, 8] },
  { id: 'autumn', name: '秋季', months: [9, 10, 11] },
  { id: 'winter', name: '冬季', months: [12, 1, 2] }
];

export const WEATHER_TYPES = [
  { id: 'sunny', name: '晴天' },
  { id: 'cloudy', name: '多云' },
  { id: 'rain', name: '降水' },
  { id: 'snow', name: '降雪' },
  { id: 'fog', name: '大雾' },
  { id: 'thunderstorm', name: '雷暴' }
];
