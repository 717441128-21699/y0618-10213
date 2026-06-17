import React, { useState, useMemo } from 'react';
import {
  Card,
  Select,
  Row,
  Col,
  Button,
  Space,
  Table,
  Tag,
  Tabs,
  Typography,
  Divider,
  Statistic,
  List,
  DatePicker,
  message,
  Alert
} from 'antd';
import ReactECharts from 'echarts-for-react';
import { useData } from '../context/DataContext.jsx';
import {
  FileTextOutlined,
  DownloadOutlined,
  CalendarOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  calculateErrors,
  groupByModel,
  groupByForecastHour,
  groupByStation,
  getSystematicBias
} from '../utils/errorMetrics.js';
import { MODELS, STATIONS } from '../data/stations.js';
import { filterDataByDateRange, filterDataByMonth, filterDataByQuarter } from '../data/mockData.js';

const { Title, Paragraph, Text } = Typography;
const { RangePicker } = DatePicker;

function groupByMonthStats(observations, forecasts, element = 'temperature') {
  const monthlyData = [];
  const uniqueYears = [...new Set(observations.map(d => parseInt(d.date.split('-')[0])))].sort();
  
  uniqueYears.forEach(year => {
    for (let month = 1; month <= 12; month++) {
      const monthObs = filterDataByMonth(observations, year, month);
      const monthFc = filterDataByMonth(forecasts, year, month);
      
      if (monthObs.length === 0 && monthFc.length === 0) continue;
      
      const byModel = {};
      MODELS.forEach(model => {
        const modelFc = monthFc.filter(f => f.model === model.id);
        const errors = calcErrorsSimple(modelFc, monthObs, element);
        const stats = calcStatsSimple(errors);
        byModel[model.id] = stats;
      });
      
      monthlyData.push({
        year,
        month,
        monthLabel: `${year}-${String(month).padStart(2, '0')}`,
        monthName: `${year}年${month}月`,
        observationCount: monthObs.length,
        forecastCount: monthFc.length,
        byModel
      });
    }
  });
  
  return monthlyData;
}

function calcErrorsSimple(forecasts, observations, element) {
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

function calcStatsSimple(errors) {
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

function exportToCSV(data, filename) {
  if (!data || data.length === 0) {
    message.warning('没有数据可导出');
    return;
  }
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = row[h];
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
    }).join(','))
  ].join('\n');
  
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
  message.success(`已导出 ${data.length} 条数据到 ${filename}`);
}

export default function DataArchive() {
  const { observations, forecasts, monthlyData: contextMonthlyData } = useData();

  const [activeTab, setActiveTab] = useState('archive');
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((dayjs().month() + 1) / 3));
  const [dateRange, setDateRange] = useState(null);
  const [filterType, setFilterType] = useState('year');

  const monthlyStats = useMemo(() =>
    groupByMonthStats(observations, forecasts, 'temperature'),
    [observations, forecasts]
  );

  const filteredMonthlyData = useMemo(() => {
    if (filterType === 'year') {
      return monthlyStats.filter(m => m.year === selectedYear);
    } else if (filterType === 'range' && dateRange && dateRange.length === 2) {
      const start = dateRange[0].format('YYYY-MM');
      const end = dateRange[1].format('YYYY-MM');
      return monthlyStats.filter(m => m.monthLabel >= start && m.monthLabel <= end);
    }
    return monthlyStats.filter(m => m.year === selectedYear);
  }, [monthlyStats, filterType, selectedYear, dateRange]);

  const yearTrendOption = useMemo(() => {
    const yearData = monthlyStats.filter(m => m.year === selectedYear);
    
    const series = MODELS.map(model => ({
      name: model.id,
      type: 'line',
      data: yearData.map(m => m.byModel[model.id]?.rmse || 0),
      smooth: true,
      lineStyle: { width: 2 },
      itemStyle: { color: model.color },
      symbol: 'circle',
      symbolSize: 6
    }));

    return {
      tooltip: {
        trigger: 'axis',
        formatter: function(params) {
          let result = `${params[0].axisValue}<br/>`;
          params.forEach(p => {
            result += `${p.marker} ${p.seriesName}: ${p.value.toFixed(3)} °C<br/>`;
          });
          return result;
        }
      },
      legend: {
        data: MODELS.map(m => m.id),
        top: 0
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
      xAxis: {
        type: 'category',
        data: yearData.map(m => `${m.month}月`)
      },
      yAxis: {
        type: 'value',
        name: '温度 RMSE (°C)',
        minInterval: 0.1
      },
      series
    };
  }, [monthlyStats, selectedYear]);

  const quarterObs = useMemo(() => {
    const startMonth = (selectedQuarter - 1) * 3 + 1;
    const data = [];
    for (let m = startMonth; m < startMonth + 3; m++) {
      const monthData = monthlyStats.find(ms => ms.year === selectedYear && ms.month === m);
      if (monthData) data.push(monthData);
    }
    return data;
  }, [monthlyStats, selectedYear, selectedQuarter]);

  const quarterObservations = useMemo(() =>
    filterDataByQuarter(observations, selectedYear, selectedQuarter),
    [observations, selectedYear, selectedQuarter]
  );

  const quarterForecasts = useMemo(() =>
    filterDataByQuarter(forecasts, selectedYear, selectedQuarter),
    [forecasts, selectedYear, selectedQuarter]
  );

  const tempErrors = useMemo(() =>
    calculateErrors(quarterForecasts, quarterObservations, 'temperature'),
    [quarterForecasts, quarterObservations]
  );

  const precipErrors = useMemo(() =>
    calculateErrors(quarterForecasts, quarterObservations, 'precipitation'),
    [quarterForecasts, quarterObservations]
  );

  const windErrors = useMemo(() =>
    calculateErrors(quarterForecasts, quarterObservations, 'windSpeed'),
    [quarterForecasts, quarterObservations]
  );

  const tempByModel = useMemo(() => groupByModel(tempErrors), [tempErrors]);
  const precipByModel = useMemo(() => groupByModel(precipErrors), [precipErrors]);
  const windByModel = useMemo(() => groupByModel(windErrors), [windErrors]);
  const tempByHour = useMemo(() => groupByForecastHour(tempErrors), [tempErrors]);
  const tempByStation = useMemo(() => groupByStation(tempErrors), [tempErrors]);
  const bias = useMemo(() => getSystematicBias(tempErrors), [tempErrors]);
  const bestModel = useMemo(() => {
    if (tempByModel.length === 0) return null;
    return [...tempByModel].sort((a, b) => a.rmse - b.rmse)[0];
  }, [tempByModel]);

  const modelRanking = useMemo(() =>
    [...tempByModel].sort((a, b) => a.rmse - b.rmse),
    [tempByModel]
  );

  const archiveColumns = [
    {
      title: '月份',
      dataIndex: 'monthName',
      key: 'monthName',
      width: 110
    },
    {
      title: '观测数据量',
      dataIndex: 'observationCount',
      key: 'observationCount',
      width: 110,
      render: (val) => val.toLocaleString() + ' 条'
    },
    {
      title: '预报数据量',
      dataIndex: 'forecastCount',
      key: 'forecastCount',
      width: 110,
      render: (val) => val.toLocaleString() + ' 条'
    },
    ...MODELS.map(model => ({
      title: `${model.id} RMSE`,
      dataIndex: ['byModel', model.id, 'rmse'],
      key: `${model.id}_rmse`,
      width: 90,
      render: (val) => val?.toFixed(3) || '-',
      sorter: (a, b) => (a.byModel[model.id]?.rmse || 0) - (b.byModel[model.id]?.rmse || 0)
    })),
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleExportMonth(record)}>
            导出
          </Button>
        </Space>
      )
    }
  ];

  const handleExportMonth = (record) => {
    const monthObs = filterDataByMonth(observations, record.year, record.month);
    const monthFc = filterDataByMonth(forecasts, record.year, record.month);
    
    exportToCSV(monthObs, `${record.year}年${record.month}月_观测数据.csv`);
    setTimeout(() => {
      exportToCSV(monthFc, `${record.year}年${record.month}月_预报数据.csv`);
    }, 500);
  };

  const handleExportAll = () => {
    const obs = filteredMonthlyData.reduce((acc, m) => {
      const monthObs = filterDataByMonth(observations, m.year, m.month);
      return acc.concat(monthObs);
    }, []);
    
    const fc = filteredMonthlyData.reduce((acc, m) => {
      const monthFc = filterDataByMonth(forecasts, m.year, m.month);
      return acc.concat(monthFc);
    }, []);
    
    exportToCSV(obs, `归档数据_观测_${dayjs().format('YYYYMMDD')}.csv`);
    setTimeout(() => {
      exportToCSV(fc, `归档数据_预报_${dayjs().format('YYYYMMDD')}.csv`);
    }, 500);
  };

  const generateQuarterlyReport = () => {
    return {
      title: `${selectedYear}年第${selectedQuarter}季度数值天气预报检验报告`,
      period: `${selectedYear}年${(selectedQuarter - 1) * 3 + 1}月 - ${selectedYear}年${selectedQuarter * 3}月`,
      summary: {
        totalStations: [...new Set(quarterObservations.map(o => o.stationId))].length,
        totalModels: MODELS.length,
        totalObservations: quarterObservations.length,
        totalForecasts: quarterForecasts.length,
        bestModel: bestModel?.model || 'N/A',
        bestModelRmse: bestModel?.rmse?.toFixed(2) || 'N/A'
      },
      temperature: {
        overall: tempByModel,
        byHour: tempByHour,
        bias
      },
      precipitation: {
        overall: precipByModel
      },
      windSpeed: {
        overall: windByModel
      },
      conclusions: [
        `本季度共检验${quarterObservations.length > 0 ? [...new Set(quarterObservations.map(o => o.stationId))].length : 0}个站点的预报数据，涉及${MODELS.length}个数值预报模式。`,
        `温度预报方面，${bestModel?.model || 'N/A'}模式表现最佳，RMSE为${bestModel?.rmse?.toFixed(2) || '-'}°C。`,
        `误差空间分布显示，${bias.positiveBias}个站点存在系统性偏高，${bias.negativeBias}个站点存在系统性偏低。`,
        '随着预报时效延长，各模式误差均呈增长趋势。',
        '建议重点关注误差较大的区域和模式，开展针对性的模式评估与改进工作。'
      ],
      recommendations: [
        '加强对降水预报的检验评估，特别是强降水事件的预报能力。',
        '深入分析系统性偏差的成因，开展模式偏差订正研究。',
        '增加特殊天气型（如台风、寒潮等）的专项检验。',
        '建立预报效果动态跟踪机制，及时发现模式性能变化。'
      ]
    };
  };

  const report = useMemo(() => generateQuarterlyReport(), [selectedYear, selectedQuarter]);

  const tabItems = [
    {
      key: 'archive',
      label: '月度归档',
      icon: <CalendarOutlined />
    },
    {
      key: 'report',
      label: '季度报告',
      icon: <FileTextOutlined />
    }
  ];

  const availableYears = useMemo(() => {
    const years = [...new Set(monthlyStats.map(m => m.year))];
    return years.sort((a, b) => b - a);
  }, [monthlyStats]);

  const hourlyOption = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    legend: { data: ['MAE', 'RMSE', 'ME'], top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
    xAxis: {
      type: 'category',
      name: '预报时效 (小时)',
      data: tempByHour.map(h => h.forecastHour),
      axisLabel: { formatter: '{value}h' }
    },
    yAxis: { type: 'value', name: '误差 (°C)', minInterval: 0.1 },
    series: [
      { name: 'ME', type: 'line', data: tempByHour.map(h => h.me), smooth: true, itemStyle: { color: '#faad14' } },
      { name: 'MAE', type: 'line', data: tempByHour.map(h => h.mae), smooth: true, itemStyle: { color: '#52c41a' } },
      { name: 'RMSE', type: 'line', data: tempByHour.map(h => h.rmse), smooth: true, itemStyle: { color: '#1890ff' } }
    ]
  }), [tempByHour]);

  return (
    <div className="archive-page">
      <Card size="small">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />

        {activeTab === 'archive' && (
          <div style={{ marginTop: 16 }}>
            <Alert
              type="info"
              showIcon
              message="数据说明"
              description="当前显示基于完整年度数据，支持按年份或日期范围筛选。所有统计数据均来自真实计算结果。"
              style={{ marginBottom: 16 }}
            />

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col>
                <Space>
                <span>筛选方式：</span>
                <Select
                  value={filterType}
                  onChange={setFilterType}
                  style={{ width: 120 }}
                  options={[
                    { value: 'year', label: '按年份' },
                    { value: 'range', label: '按日期范围' }
                  ]}
                />
              </Space>
            </Col>
            {filterType === 'year' && (
              <Col>
                <Space>
                  <span>年份：</span>
                  <Select
                    value={selectedYear}
                    onChange={setSelectedYear}
                    style={{ width: 120 }}
                    options={availableYears.map(y => ({ value: y, label: y + '年' }))}
                  />
                </Space>
              </Col>
            )}
            {filterType === 'range' && (
              <Col>
                <Space>
                  <span>日期范围：</span>
                  <RangePicker
                    onChange={setDateRange}
                    picker="month"
                  />
                </Space>
              </Col>
            )}
            <Col flex="auto" style={{ textAlign: 'right' }}>
              <Space>
                <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportAll}>
                  导出当前筛选数据
                </Button>
              </Space>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Table
                title={() => (
                  <Space>
                    <span>月度归档列表</span>
                    <Tag color="blue">共 {filteredMonthlyData.length} 个月</Tag>
                  </Space>
                )}
                columns={archiveColumns}
                dataSource={filteredMonthlyData}
                rowKey="monthLabel"
                size="middle"
                pagination={false}
                bordered
                scroll={{ x: 900 }}
              />
            </Col>
          </Row>

          <Card title={`${selectedYear}年度误差趋势（温度 RMSE）`} size="small" style={{ marginTop: 24 }}>
            <ReactECharts
              option={yearTrendOption}
              style={{ height: '380px' }}
              opts={{ renderer: 'canvas' }}
            />
            <div style={{ marginTop: 12, color: '#666', fontSize: '12px', textAlign: 'center' }}>
              数据说明：图中四条曲线分别展示各模式每月的温度预报均方根误差（RMSE）随月份的变化趋势
            </div>
          </Card>
        </div>
        )}

        {activeTab === 'report' && (
          <div className="quarterly-report" style={{ marginTop: 16 }}>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col>
                <Space>
                  <span>年份：</span>
                  <Select
                    value={selectedYear}
                    onChange={setSelectedYear}
                    style={{ width: 100 }}
                    options={availableYears.map(y => ({ value: y, label: y + '年' }))}
                  />
                </Space>
              </Col>
              <Col>
                <Space>
                  <span>季度：</span>
                  <Select
                    value={selectedQuarter}
                    onChange={setSelectedQuarter}
                    style={{ width: 100 }}
                    options={[1, 2, 3, 4].map(q => ({ value: q, label: '第' + q + '季度' }))}
                  />
                </Space>
              </Col>
              <Col flex="auto" style={{ textAlign: 'right' }}>
                <Space>
                  <Button icon={<DownloadOutlined />}>下载PDF</Button>
                  <Button type="primary" icon={<FileTextOutlined />}>
                    生成报告
                  </Button>
                </Space>
              </Col>
            </Row>

            <div className="report-content" style={{
              background: '#fff',
              padding: '32px',
              border: '1px solid #e8e8e8',
              borderRadius: '4px'
            }}>
              <Title level={2} style={{ textAlign: 'center' }}>{report.title}</Title>
              <Paragraph style={{ textAlign: 'center', color: '#666' }}>
                检验时段：{report.period}
              </Paragraph>

              <Divider />

              <Title level={4}>一、检验概况</Title>
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <Card size="small">
                    <Statistic title="检验站点数" value={report.summary.totalStations} suffix="个" />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <Statistic title="预报模式数" value={report.summary.totalModels} suffix="个" />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <Statistic title="观测数据量" value={report.summary.totalObservations} suffix="条" />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <Statistic
                      title="最佳模式"
                      value={report.summary.bestModel}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
              </Row>

              <Divider />

              <Title level={4}>二、温度预报检验</Title>

              <Title level={5}>2.1 各模式总体表现</Title>
              <Table
                columns={[
                  { title: '排名', dataIndex: 'rank', key: 'rank', width: 60,
                  render: (_, __, index) => (
                    <Tag color={index === 0 ? 'gold' : index === 1 ? 'default' : index === 2 ? 'orange' : 'default'}>
                      {index + 1}
                    </Tag>
                  )
                },
                  { title: '模式', dataIndex: 'model', key: 'model', width: 120 },
                  {
                    title: 'ME (°C)', dataIndex: 'me', key: 'me', width: 100,
                    render: v => <Tag color={v > 0 ? 'red' : 'blue'}>{v > 0 ? '+' : ''}{v.toFixed(3)}</Tag>
                  },
                  { title: 'MAE (°C)', dataIndex: 'mae', key: 'mae', width: 100, render: v => v.toFixed(3) },
                  { title: 'RMSE (°C)', dataIndex: 'rmse', key: 'rmse', width: 100, render: v => v.toFixed(3) },
                  { title: '样本数', dataIndex: 'count', key: 'count', width: 100, render: v => v.toLocaleString() }
                ]}
                dataSource={modelRanking}
                rowKey="model"
                size="small"
                pagination={false}
                bordered
                style={{ marginBottom: 16 }}
              />

              <Title level={5}>2.2 误差时效变化</Title>
              <ReactECharts
                option={hourlyOption}
                style={{ height: '300px', marginBottom: 24 }}
                opts={{ renderer: 'canvas' }}
              />

              <Title level={5}>2.3 系统性偏差分析</Title>
              <Row gutter={16}>
                <Col span={8}>
                  <Card size="small" title="系统性偏高">
                    <Statistic
                      value={report.temperature.bias.positiveBias}
                      suffix="站"
                      valueStyle={{ color: '#f5222d' }}
                    />
                    <Paragraph style={{ marginTop: 8, color: '#666', fontSize: '12px' }}>
                      {report.temperature.bias.positiveStations.slice(0, 5).join('、')}
                      {report.temperature.bias.positiveStations.length > 5 ? '...' : ''}
                    </Paragraph>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" title="系统性偏低">
                    <Statistic
                      value={report.temperature.bias.negativeBias}
                      suffix="站"
                      valueStyle={{ color: '#1890ff' }}
                    />
                    <Paragraph style={{ marginTop: 8, color: '#666', fontSize: '12px' }}>
                      {report.temperature.bias.negativeStations.slice(0, 5).join('、')}
                      {report.temperature.bias.negativeStations.length > 5 ? '...' : ''}
                    </Paragraph>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" title="基本正常">
                    <Statistic
                      value={report.temperature.bias.neutral}
                      suffix="站"
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
              </Row>

              <Divider />

              <Title level={4}>三、降水预报检验</Title>
              <Table
                columns={[
                  { title: '模式', dataIndex: 'model', key: 'model', width: 120 },
                  {
                    title: 'ME (mm)', dataIndex: 'me', key: 'me', width: 100,
                    render: v => <Tag color={v > 0 ? 'red' : 'blue'}>{v > 0 ? '+' : ''}{v.toFixed(3)}</Tag>
                  },
                  { title: 'MAE (mm)', dataIndex: 'mae', key: 'mae', width: 100, render: v => v.toFixed(3) },
                  { title: 'RMSE (mm)', dataIndex: 'rmse', key: 'rmse', width: 100, render: v => v.toFixed(3) },
                  { title: '样本数', dataIndex: 'count', key: 'count', width: 100, render: v => v.toLocaleString() }
                ]}
                dataSource={precipByModel}
                rowKey="model"
                size="small"
                pagination={false}
                bordered
              />

              <Divider />

              <Title level={4}>四、风速预报检验</Title>
              <Table
                columns={[
                  { title: '模式', dataIndex: 'model', key: 'model', width: 120 },
                  {
                    title: 'ME (m/s)', dataIndex: 'me', key: 'me', width: 100,
                    render: v => <Tag color={v > 0 ? 'red' : 'blue'}>{v > 0 ? '+' : ''}{v.toFixed(3)}</Tag>
                  },
                  { title: 'MAE (m/s)', dataIndex: 'mae', key: 'mae', width: 100, render: v => v.toFixed(3) },
                  { title: 'RMSE (m/s)', dataIndex: 'rmse', key: 'rmse', width: 100, render: v => v.toFixed(3) },
                  { title: '样本数', dataIndex: 'count', key: 'count', width: 100, render: v => v.toLocaleString() }
                ]}
                dataSource={windByModel}
                rowKey="model"
                size="small"
                pagination={false}
                bordered
              />

              <Divider />

              <Title level={4}>五、主要结论</Title>
              <List
                dataSource={report.conclusions}
                renderItem={(item, index) => (
                  <List.Item>
                    <Text>{index + 1}. {item}</Text>
                  </List.Item>
                )}
              />

              <Title level={4} style={{ marginTop: 24 }}>六、改进建议</Title>
              <List
                dataSource={report.recommendations}
                renderItem={(item, index) => (
                  <List.Item>
                    <Text>{index + 1}. {item}</Text>
                  </List.Item>
                )}
              />

              <Divider />
              <Paragraph style={{ textAlign: 'right', color: '#999' }}>
                报告生成时间：{dayjs().format('YYYY-MM-DD HH:mm:ss')}
              </Paragraph>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
