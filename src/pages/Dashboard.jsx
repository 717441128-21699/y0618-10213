import React, { useMemo } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Space } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useData } from '../context/DataContext.jsx';
import {
  calculateErrors,
  calculateStatistics,
  groupByStation,
  groupByModel,
  getSystematicBias
} from '../utils/errorMetrics.js';
import { ELEMENTS } from '../data/stations.js';

export default function Dashboard() {
  const { recentObservations, recentForecasts } = useData();
  const observations = recentObservations;
  const forecasts = recentForecasts;

  const tempErrors = useMemo(() =>
    calculateErrors(forecasts, observations, 'temperature'),
    [forecasts, observations]
  );

  const precipErrors = useMemo(() =>
    calculateErrors(forecasts, observations, 'precipitation'),
    [forecasts, observations]
  );

  const windErrors = useMemo(() =>
    calculateErrors(forecasts, observations, 'windSpeed'),
    [forecasts, observations]
  );

  const tempStats = useMemo(() => calculateStatistics(tempErrors), [tempErrors]);
  const precipStats = useMemo(() => calculateStatistics(precipErrors), [precipErrors]);
  const windStats = useMemo(() => calculateStatistics(windErrors), [windErrors]);

  const byStation = useMemo(() => groupByStation(tempErrors), [tempErrors]);
  const byModel = useMemo(() => groupByModel(tempErrors), [tempErrors]);
  const bias = useMemo(() => getSystematicBias(tempErrors), [tempErrors]);

  const top5Positive = useMemo(() =>
    [...byStation].sort((a, b) => b.me - a.me).slice(0, 5),
    [byStation]
  );

  const top5Negative = useMemo(() =>
    [...byStation].sort((a, b) => a.me - b.me).slice(0, 5),
    [byStation]
  );

  const modelCompareOption = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    legend: { data: ['MAE', 'RMSE', 'ME'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: byModel.map(m => m.model)
    },
    yAxis: {
      type: 'value',
      name: '温度误差 (°C)'
    },
    series: [
      {
        name: 'MAE',
        type: 'bar',
        data: byModel.map(m => m.mae),
        itemStyle: { color: '#52c41a' }
      },
      {
        name: 'RMSE',
        type: 'bar',
        data: byModel.map(m => m.rmse),
        itemStyle: { color: '#1890ff' }
      },
      {
        name: 'ME',
        type: 'line',
        data: byModel.map(m => m.me),
        itemStyle: { color: '#faad14' },
        lineStyle: { width: 2 }
      }
    ]
  }), [byModel]);

  const stationColumns = [
    {
      title: '站点',
      dataIndex: 'stationName',
      key: 'stationName',
      width: 80
    },
    {
      title: '省份',
      dataIndex: 'province',
      key: 'province',
      width: 80
    },
    {
      title: 'ME',
      dataIndex: 'me',
      key: 'me',
      width: 70,
      render: (val) => (
        <Tag color={val > 0 ? 'red' : val < 0 ? 'blue' : 'default'}>
          {val > 0 ? '+' : ''}{val.toFixed(2)}
        </Tag>
      )
    },
    {
      title: 'MAE',
      dataIndex: 'mae',
      key: 'mae',
      width: 70,
      render: (val) => val.toFixed(2)
    },
    {
      title: 'RMSE',
      dataIndex: 'rmse',
      key: 'rmse',
      width: 70,
      render: (val) => val.toFixed(2)
    },
    {
      title: '样本数',
      dataIndex: 'count',
      key: 'count',
      width: 70
    }
  ];

  return (
    <div className="dashboard-page">
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic
              title="温度 MAE"
              value={tempStats.mae}
              precision={2}
              suffix="°C"
              prefix={<DashboardOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="降水 MAE"
              value={precipStats.mae}
              precision={2}
              suffix="mm"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="风速 MAE"
              value={windStats.mae}
              precision={2}
              suffix="m/s"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="温度 RMSE"
              value={tempStats.rmse}
              precision={2}
              suffix="°C"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={8}>
          <Card title="系统性偏差分布" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div className="bias-item">
                <span className="bias-label">系统性偏高</span>
                <Tag color="red">{bias.positiveBias} 站</Tag>
                <span className="bias-desc">
                  {bias.positiveStations.slice(0, 3).join('、')}
                  {bias.positiveStations.length > 3 ? '...' : ''}
                </span>
              </div>
              <div className="bias-item">
                <span className="bias-label">系统性偏低</span>
                <Tag color="blue">{bias.negativeBias} 站</Tag>
                <span className="bias-desc">
                  {bias.negativeStations.slice(0, 3).join('、')}
                  {bias.negativeStations.length > 3 ? '...' : ''}
                </span>
              </div>
              <div className="bias-item">
                <span className="bias-label">基本正常</span>
                <Tag color="green">{bias.neutral} 站</Tag>
              </div>
            </Space>
          </Card>
        </Col>

        <Col span={16}>
          <Card title="各模式温度误差对比" size="small">
            <ReactECharts
              option={modelCompareOption}
              style={{ height: '280px' }}
              opts={{ renderer: 'canvas' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card
            title={
              <Space>
                <ArrowUpOutlined style={{ color: '#f5222d' }} />
                <span>预报偏高 TOP5</span>
              </Space>
            }
            size="small"
          >
            <Table
              columns={stationColumns}
              dataSource={top5Positive}
              rowKey="stationId"
              size="small"
              pagination={false}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card
            title={
              <Space>
                <ArrowDownOutlined style={{ color: '#1890ff' }} />
                <span>预报偏低 TOP5</span>
              </Space>
            }
            size="small"
          >
            <Table
              columns={stationColumns}
              dataSource={top5Negative}
              rowKey="stationId"
              size="small"
              pagination={false}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
