import React, { useState, useMemo } from 'react';
import { Card, Select, Row, Col, Radio, Space, Table, Tag } from 'antd';
import ReactECharts from 'echarts-for-react';
import { useData } from '../context/DataContext.jsx';
import {
  calculateErrors,
  groupByForecastHour,
  groupByModelAndHour,
  filterErrors
} from '../utils/errorMetrics.js';
import { ELEMENTS, MODELS, STATIONS, SEASONS } from '../data/stations.js';

export default function TemporalAnalysis() {
  const { observations, forecasts } = useData();

  const [element, setElement] = useState('temperature');
  const [metric, setMetric] = useState('rmse');
  const [selectedModels, setSelectedModels] = useState(['ECMWF', 'GFS', 'CMA', 'WRF']);
  const [selectedStations, setSelectedStations] = useState([]);
  const [selectedSeasons, setSelectedSeasons] = useState([]);

  const allErrors = useMemo(() =>
    calculateErrors(forecasts, observations, element),
    [forecasts, observations, element]
  );

  const filteredErrors = useMemo(() =>
    filterErrors(allErrors, {
      models: selectedModels,
      stations: selectedStations.length > 0 ? selectedStations : undefined,
      seasons: selectedSeasons.length > 0 ? selectedSeasons : undefined
    }),
    [allErrors, selectedModels, selectedStations, selectedSeasons]
  );

  const byHour = useMemo(() => groupByForecastHour(filteredErrors), [filteredErrors]);
  const byModelHour = useMemo(() => groupByModelAndHour(filteredErrors), [filteredErrors]);

  const elementInfo = ELEMENTS.find(e => e.key === element) || ELEMENTS[0];

  const multiModelOption = useMemo(() => {
    const series = byModelHour
      .filter(m => selectedModels.includes(m.model))
      .map(model => ({
        name: model.model,
        type: 'line',
        data: model.hourlyData.map(h => h[metric]),
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
          let result = `预报时效: ${params[0].axisValue}小时<br/>`;
          params.forEach(p => {
            result += `${p.marker} ${p.seriesName}: ${p.value.toFixed(3)} ${elementInfo.unit}<br/>`;
          });
          return result;
        }
      },
      legend: {
        data: byModelHour.filter(m => selectedModels.includes(m.model)).map(m => m.model),
        top: 0
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
      xAxis: {
        type: 'category',
        name: '预报时效 (小时)',
        nameLocation: 'middle',
        nameGap: 25,
        data: byHour.map(h => h.forecastHour),
        axisLabel: { formatter: '{value}h' }
      },
      yAxis: {
        type: 'value',
        name: `${metric.toUpperCase()} (${elementInfo.unit})`,
        minInterval: 0.1
      },
      series
    };
  }, [byModelHour, byHour, metric, selectedModels, elementInfo.unit]);

  const allMetricsOption = useMemo(() => {
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['ME', 'MAE', 'RMSE'], top: 0 },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
      xAxis: {
        type: 'category',
        name: '预报时效 (小时)',
        nameLocation: 'middle',
        nameGap: 25,
        data: byHour.map(h => h.forecastHour),
        axisLabel: { formatter: '{value}h' }
      },
      yAxis: {
        type: 'value',
        name: `误差 (${elementInfo.unit})`,
        minInterval: 0.1
      },
      series: [
        {
          name: 'ME',
          type: 'line',
          data: byHour.map(h => h.me),
          smooth: true,
          lineStyle: { width: 2 },
          itemStyle: { color: '#faad14' }
        },
        {
          name: 'MAE',
          type: 'line',
          data: byHour.map(h => h.mae),
          smooth: true,
          lineStyle: { width: 2 },
          itemStyle: { color: '#52c41a' }
        },
        {
          name: 'RMSE',
          type: 'line',
          data: byHour.map(h => h.rmse),
          smooth: true,
          lineStyle: { width: 2 },
          itemStyle: { color: '#1890ff' }
        }
      ]
    };
  }, [byHour, elementInfo.unit]);

  const growthRate = useMemo(() => {
    if (byHour.length < 2) return 0;
    const first = byHour[0][metric];
    const last = byHour[byHour.length - 1][metric];
    if (first === 0) return 0;
    return ((last - first) / first * 100).toFixed(1);
  }, [byHour, metric]);

  const tableColumns = [
    {
      title: '预报时效',
      dataIndex: 'forecastHour',
      key: 'forecastHour',
      width: 100,
      render: (val) => `${val}h`
    },
    {
      title: 'ME',
      dataIndex: 'me',
      key: 'me',
      width: 80,
      render: (val) => (
        <Tag color={val > 0 ? 'red' : val < 0 ? 'blue' : 'default'}>
          {val > 0 ? '+' : ''}{val.toFixed(3)}
        </Tag>
      )
    },
    {
      title: 'MAE',
      dataIndex: 'mae',
      key: 'mae',
      width: 80,
      render: (val) => val.toFixed(3)
    },
    {
      title: 'RMSE',
      dataIndex: 'rmse',
      key: 'rmse',
      width: 80,
      render: (val) => val.toFixed(3)
    },
    {
      title: '样本数',
      dataIndex: 'count',
      key: 'count',
      width: 80
    }
  ];

  return (
    <div className="temporal-page">
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <Space>
              <span>气象要素：</span>
              <Select
                value={element}
                onChange={setElement}
                style={{ width: 100 }}
                options={ELEMENTS.map(e => ({ value: e.key, label: e.name }))}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <span>对比指标：</span>
              <Radio.Group value={metric} onChange={e => setMetric(e.target.value)}>
                <Radio.Button value="me">ME</Radio.Button>
                <Radio.Button value="mae">MAE</Radio.Button>
                <Radio.Button value="rmse">RMSE</Radio.Button>
              </Radio.Group>
            </Space>
          </Col>
          <Col>
            <Space>
              <span>预报模式：</span>
              <Select
                mode="multiple"
                value={selectedModels}
                onChange={setSelectedModels}
                style={{ minWidth: 200 }}
                options={MODELS.map(m => ({ value: m.id, label: m.id }))}
                maxTagCount={4}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <span>站点筛选：</span>
              <Select
                mode="multiple"
                value={selectedStations}
                onChange={setSelectedStations}
                style={{ minWidth: 200 }}
                options={STATIONS.map(s => ({ value: s.id, label: s.name }))}
                placeholder="全部站点"
                maxTagCount={3}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <span>季节：</span>
              <Select
                mode="multiple"
                value={selectedSeasons}
                onChange={setSelectedSeasons}
                style={{ minWidth: 150 }}
                options={SEASONS.map(s => ({ value: s.id, label: s.name }))}
                placeholder="全部季节"
                maxTagCount={2}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div className="stat-item">
                <span className="stat-label">24小时 {metric.toUpperCase()}</span>
                <span className="stat-value">
                  {byHour[0]?.[metric]?.toFixed(3) || '-'} {elementInfo.unit}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">240小时 {metric.toUpperCase()}</span>
                <span className="stat-value">
                  {byHour[byHour.length - 1]?.[metric]?.toFixed(3) || '-'} {elementInfo.unit}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">误差增长率</span>
                <span className={`stat-value ${parseFloat(growthRate) > 0 ? 'text-red' : 'text-green'}`}>
                  {growthRate > 0 ? '+' : ''}{growthRate}%
                </span>
              </div>
            </Space>
          </Card>
        </Col>
        <Col span={16}>
          <Card title="多模式误差时效对比" size="small">
            <ReactECharts
              option={multiModelOption}
              style={{ height: '250px' }}
              opts={{ renderer: 'canvas' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={14}>
          <Card title="综合指标时效变化" size="small">
            <ReactECharts
              option={allMetricsOption}
              style={{ height: '350px' }}
              opts={{ renderer: 'canvas' }}
            />
          </Card>
        </Col>
        <Col span={10}>
          <Card title="时效误差详表" size="small">
            <Table
              columns={tableColumns}
              dataSource={byHour}
              rowKey="forecastHour"
              size="small"
              pagination={false}
              scroll={{ y: 300 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
