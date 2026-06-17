import React, { useMemo } from 'react';
import { Modal, Tabs, Table, Tag, Statistic, Row, Col, Card, Divider } from 'antd';
import ReactECharts from 'echarts-for-react';
import {
  calculateErrors,
  groupByForecastHour,
  groupByModel,
  calculateStatistics
} from '../../utils/errorMetrics.js';
import { useData } from '../../context/DataContext.jsx';
import { STATIONS, MODELS, ELEMENTS, FORECAST_HOURS } from '../../data/stations.js';

const { TabPane } = Tabs;

export default function StationDetailModal({ stationId, open, onClose }) {
  const { observations, forecasts } = useData();

  const station = useMemo(() =>
    STATIONS.find(s => s.id === stationId),
    [stationId]
  );

  const stationObservations = useMemo(() =>
    observations.filter(o => o.stationId === stationId),
    [observations, stationId]
  );

  const stationForecasts = useMemo(() =>
    forecasts.filter(f => f.stationId === stationId),
    [forecasts, stationId]
  );

  const tempErrors = useMemo(() =>
    calculateErrors(stationForecasts, stationObservations, 'temperature'),
    [stationForecasts, stationObservations]
  );

  const precipErrors = useMemo(() =>
    calculateErrors(stationForecasts, stationObservations, 'precipitation'),
    [stationForecasts, stationObservations]
  );

  const windErrors = useMemo(() =>
    calculateErrors(stationForecasts, stationObservations, 'windSpeed'),
    [stationForecasts, stationObservations]
  );

  const tempStats = useMemo(() =>
    calculateStatistics(tempErrors),
    [tempErrors]
  );

  const tempByHour = useMemo(() =>
    groupByForecastHour(tempErrors),
    [tempErrors]
  );

  const tempByModel = useMemo(() =>
    groupByModel(tempErrors),
    [tempErrors]
  );

  const precipByModel = useMemo(() =>
    groupByModel(precipErrors),
    [precipErrors]
  );

  const windByModel = useMemo(() =>
    groupByModel(windErrors),
    [windErrors]
  );

  const bestModel = useMemo(() => {
    if (tempByModel.length === 0) return null;
    return [...tempByModel].sort((a, b) => a.rmse - b.rmse)[0];
  }, [tempByModel]);

  const hourlyOption = useMemo(() => {
    const byModel = {};
    MODELS.forEach(model => {
      const modelErrors = tempErrors.filter(e => e.model === model.id);
      const byHour = groupByForecastHour(modelErrors);
      byModel[model.id] = {
        ...model,
        data: byHour
      };
    });

    const series = Object.values(byModel).map(model => ({
      name: model.model,
      type: 'line',
      data: model.data.map(h => h.rmse),
      smooth: true,
      lineStyle: { width: 2 },
      itemStyle: { color: model.color },
      symbol: 'circle',
      symbolSize: 5
    }));

    return {
      tooltip: {
        trigger: 'axis',
        formatter: params => {
          let result = `预报时效: ${params[0].axisValue}小时<br/>`;
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
        name: '预报时效 (小时)',
        nameLocation: 'middle',
        nameGap: 25,
        data: tempByHour.map(h => h.forecastHour),
        axisLabel: { formatter: '{value}h' }
      },
      yAxis: {
        type: 'value',
        name: '温度 RMSE (°C)',
        minInterval: 0.1
      },
      series
    };
  }, [tempErrors, tempByHour]);

  const modelCompareOption = useMemo(() => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['MAE', 'RMSE', 'ME'], top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
    xAxis: {
      type: 'category',
      data: tempByModel.map(m => m.model)
    },
    yAxis: {
      type: 'value',
      name: '温度误差 (°C)',
      minInterval: 0.1
    },
    series: [
      {
        name: 'ME',
        type: 'bar',
        data: tempByModel.map(m => m.me),
        itemStyle: { color: '#faad14' }
      },
      {
        name: 'MAE',
        type: 'bar',
        data: tempByModel.map(m => m.mae),
        itemStyle: { color: '#52c41a' }
      },
      {
        name: 'RMSE',
        type: 'bar',
        data: tempByModel.map(m => m.rmse),
        itemStyle: { color: '#1890ff' }
      }
    ]
  }), [tempByModel]);

  const modelTableColumns = [
    {
      title: '模式',
      dataIndex: 'model',
      key: 'model',
      width: 100
    },
    {
      title: 'ME (°C)',
      dataIndex: 'me',
      key: 'me',
      width: 90,
      render: v => <Tag color={v > 0 ? 'red' : 'blue'}>{v > 0 ? '+' : ''}{v.toFixed(3)}</Tag>
    },
    {
      title: 'MAE (°C)',
      dataIndex: 'mae',
      key: 'mae',
      width: 90,
      render: v => v.toFixed(3)
    },
    {
      title: 'RMSE (°C)',
      dataIndex: 'rmse',
      key: 'rmse',
      width: 90,
      render: v => v.toFixed(3)
    },
    {
      title: '样本数',
      dataIndex: 'count',
      key: 'count',
      width: 80
    }
  ];

  const recentData = useMemo(() => {
    const sorted = [...stationObservations].sort((a, b) => b.date.localeCompare(a.date));
    return sorted.slice(0, 7);
  }, [stationObservations]);

  const recentColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120
    },
    {
      title: '天气',
      dataIndex: 'weatherType',
      key: 'weatherType',
      width: 80,
      render: v => {
        const typeMap = {
          sunny: '晴',
          cloudy: '多云',
          rain: '雨',
          snow: '雪',
          fog: '雾',
          thunderstorm: '雷暴'
        };
        return typeMap[v] || v;
      }
    },
    {
      title: '温度(°C)',
      dataIndex: 'temperature',
      key: 'temperature',
      width: 90
    },
    {
      title: '降水(mm)',
      dataIndex: 'precipitation',
      key: 'precipitation',
      width: 90
    },
    {
      title: '风速(m/s)',
      dataIndex: 'windSpeed',
      key: 'windSpeed',
      width: 90
    }
  ];

  return (
    <Modal
      title={`站点详情 - ${station?.name || stationId} (${stationId})`}
      open={open}
      onCancel={onClose}
      width={900}
      footer={null}
      destroyOnClose
    >
      <div className="station-detail-modal">
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="温度 RMSE"
                value={tempStats.rmse}
                precision={2}
                suffix="°C"
                valueStyle={{ color: '#1890ff', fontSize: 18 }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="温度 MAE"
                value={tempStats.mae}
                precision={2}
                suffix="°C"
                valueStyle={{ color: '#52c41a', fontSize: 18 }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="温度 ME"
                value={tempStats.me}
                precision={2}
                suffix="°C"
                prefix={tempStats.me > 0 ? '+' : ''}
                valueStyle={{ color: tempStats.me > 0 ? '#f5222d' : '#1890ff', fontSize: 18 }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="最佳模式"
                value={bestModel?.model || '-'}
                valueStyle={{ color: '#722ed1', fontSize: 18 }}
              />
            </Card>
          </Col>
        </Row>

        <div style={{ color: '#666', marginBottom: 12 }}>
          <span>站点编号：{stationId}</span>
          <span style={{ margin: '0 12px' }}>|</span>
          <span>所属省份：{station?.province || '-'}</span>
          <span style={{ margin: '0 12px' }}>|</span>
          <span>海拔：{station?.alt || '-'} m</span>
          <span style={{ margin: '0 12px' }}>|</span>
          <span>样本数：{tempStats.count}</span>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        <Tabs defaultActiveKey="hourly">
          <TabPane tab="时效误差曲线" key="hourly">
            <ReactECharts
              option={hourlyOption}
              style={{ height: '320px' }}
              opts={{ renderer: 'canvas' }}
            />
          </TabPane>

          <TabPane tab="各模式对比" key="model">
            <Row gutter={16}>
              <Col span={14}>
                <ReactECharts
                  option={modelCompareOption}
                  style={{ height: '320px' }}
                  opts={{ renderer: 'canvas' }}
                />
              </Col>
              <Col span={10}>
                <Table
                  title={() => '温度误差详表'}
                  columns={modelTableColumns}
                  dataSource={tempByModel}
                  rowKey="model"
                  size="small"
                  pagination={false}
                  bordered
                />
              </Col>
            </Row>
          </TabPane>

          <TabPane tab="多要素对比" key="elements">
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Card title="温度" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div className="stat-row">
                      <span>ME</span>
                      <Tag color={tempStats.me > 0 ? 'red' : 'blue'}>
                        {tempStats.me > 0 ? '+' : ''}{tempStats.me.toFixed(3)} °C
                      </Tag>
                    </div>
                    <div className="stat-row">
                      <span>MAE</span>
                      <span>{tempStats.mae.toFixed(3)} °C</span>
                    </div>
                    <div className="stat-row">
                      <span>RMSE</span>
                      <strong>{tempStats.rmse.toFixed(3)} °C</strong>
                    </div>
                  </Space>
                </Card>
              </Col>
              <Col span={8}>
                <Card title="降水" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {precipByModel.length > 0 && (
                      <>
                        <div className="stat-row">
                          <span>ME</span>
                          <Tag color={precipByModel[0]?.me > 0 ? 'red' : 'blue'}>
                            {precipByModel[0]?.me > 0 ? '+' : ''}{precipByModel[0]?.me?.toFixed(3) || '-'} mm
                          </Tag>
                        </div>
                        <div className="stat-row">
                          <span>MAE</span>
                          <span>{precipByModel[0]?.mae?.toFixed(3) || '-'} mm</span>
                        </div>
                        <div className="stat-row">
                          <span>RMSE</span>
                          <strong>{precipByModel[0]?.rmse?.toFixed(3) || '-'} mm</strong>
                        </div>
                      </>
                    )}
                  </Space>
                </Card>
              </Col>
              <Col span={8}>
                <Card title="风速" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {windByModel.length > 0 && (
                      <>
                        <div className="stat-row">
                          <span>ME</span>
                          <Tag color={windByModel[0]?.me > 0 ? 'red' : 'blue'}>
                            {windByModel[0]?.me > 0 ? '+' : ''}{windByModel[0]?.me?.toFixed(3) || '-'} m/s
                          </Tag>
                        </div>
                        <div className="stat-row">
                          <span>MAE</span>
                          <span>{windByModel[0]?.mae?.toFixed(3) || '-'} m/s</span>
                        </div>
                        <div className="stat-row">
                          <span>RMSE</span>
                          <strong>{windByModel[0]?.rmse?.toFixed(3) || '-'} m/s</strong>
                        </div>
                      </>
                    )}
                  </Space>
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab="最近观测" key="recent">
            <Table
              columns={recentColumns}
              dataSource={recentData}
              rowKey="date"
              size="small"
              pagination={false}
            />
          </TabPane>
        </Tabs>
      </div>
    </Modal>
  );
}
