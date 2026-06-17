import React, { useState, useMemo } from 'react';
import { Card, Select, Row, Col, Radio, Space, Table, Tag, Tabs } from 'antd';
import ReactECharts from 'echarts-for-react';
import { useData } from '../context/DataContext.jsx';
import _ from 'lodash';
import {
  calculateErrors,
  groupBySeason,
  groupByWeatherType,
  groupByModel,
  filterErrors
} from '../utils/errorMetrics.js';
import { ELEMENTS, MODELS, SEASONS, WEATHER_TYPES } from '../data/stations.js';

export default function ModelComparison() {
  const { observations, forecasts } = useData();

  const [element, setElement] = useState('temperature');
  const [metric, setMetric] = useState('rmse');
  const [activeTab, setActiveTab] = useState('season');

  const allErrors = useMemo(() =>
    calculateErrors(forecasts, observations, element),
    [forecasts, observations, element]
  );

  const elementInfo = ELEMENTS.find(e => e.key === element) || ELEMENTS[0];

  const byModel = useMemo(() => groupByModel(allErrors), [allErrors]);

  const seasonData = useMemo(() => {
    return MODELS.map(model => {
      const modelErrors = filterErrors(allErrors, { models: [model.id] });
      const bySeason = groupBySeason(modelErrors);
      return {
        model: model.id,
        modelName: model.name,
        color: model.color,
        seasonData: bySeason
      };
    });
  }, [allErrors]);

  const weatherTypeData = useMemo(() => {
    return MODELS.map(model => {
      const modelErrors = filterErrors(allErrors, { models: [model.id] });
      const byWeather = groupByWeatherType(modelErrors);
      return {
        model: model.id,
        modelName: model.name,
        color: model.color,
        weatherData: byWeather
      };
    });
  }, [allErrors]);

  const seasonCompareOption = useMemo(() => {
    const series = seasonData.map(model => ({
      name: model.model,
      type: 'bar',
      data: model.seasonData.map(s => s[metric]),
      itemStyle: { color: model.color },
      barMaxWidth: 40
    }));

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        data: MODELS.map(m => m.id),
        top: 0
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
      xAxis: {
        type: 'category',
        data: SEASONS.map(s => s.name)
      },
      yAxis: {
        type: 'value',
        name: `${metric.toUpperCase()} (${elementInfo.unit})`,
        minInterval: 0.1
      },
      series
    };
  }, [seasonData, metric, elementInfo.unit]);

  const weatherTypeOption = useMemo(() => {
    const series = weatherTypeData.map(model => ({
      name: model.model,
      type: 'bar',
      data: model.weatherData.map(w => w[metric]),
      itemStyle: { color: model.color },
      barMaxWidth: 30
    }));

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        data: MODELS.map(m => m.id),
        top: 0
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
      xAxis: {
        type: 'category',
        data: WEATHER_TYPES.map(w => w.name),
        axisLabel: { interval: 0 }
      },
      yAxis: {
        type: 'value',
        name: `${metric.toUpperCase()} (${elementInfo.unit})`,
        minInterval: 0.1
      },
      series
    };
  }, [weatherTypeData, metric, elementInfo.unit]);

  const radarOption = useMemo(() => {
    const indicators = [
      { name: '春季', max: 5 },
      { name: '夏季', max: 5 },
      { name: '秋季', max: 5 },
      { name: '冬季', max: 5 }
    ];

    const series = seasonData.map(model => {
      const maxValue = Math.max(...model.seasonData.map(s => s.rmse), 0.1);
      return {
        name: model.model,
        type: 'radar',
        data: [{
          value: model.seasonData.map(s => s.rmse),
          name: model.model
        }],
        lineStyle: { color: model.color, width: 2 },
        areaStyle: { color: model.color, opacity: 0.1 },
        itemStyle: { color: model.color }
      };
    });

    return {
      tooltip: {},
      legend: {
        data: MODELS.map(m => m.id),
        bottom: 0
      },
      radar: {
        indicator: indicators,
        shape: 'polygon',
        splitNumber: 4,
        axisName: {
          color: '#333',
          fontSize: 12
        },
        splitLine: {
          lineStyle: { color: 'rgba(0, 0, 0, 0.1)' }
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: ['rgba(0, 0, 0, 0.02)', 'rgba(0, 0, 0, 0.05)']
          }
        }
      },
      series: [
        {
          type: 'radar',
          data: seasonData.map(model => ({
            value: model.seasonData.map(s => s.rmse),
            name: model.model,
            lineStyle: { color: model.color, width: 2 },
            areaStyle: { color: model.color, opacity: 0.15 },
            itemStyle: { color: model.color }
          }))
        }
      ]
    };
  }, [seasonData]);

  const modelRanking = useMemo(() => {
    return [...byModel].sort((a, b) => a.rmse - b.rmse);
  }, [byModel]);

  const overallTableColumns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      render: (_, __, index) => (
        <Tag color={index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'default'}>
          {index + 1}
        </Tag>
      )
    },
    {
      title: '模式',
      dataIndex: 'model',
      key: 'model',
      width: 80
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

  const seasonTableColumns = [
    {
      title: '模式',
      dataIndex: 'model',
      key: 'model',
      width: 70
    },
    ...SEASONS.map(s => ({
      title: s.name,
      dataIndex: s.id,
      key: s.id,
      width: 80,
      render: (val) => val?.toFixed(3) || '-'
    }))
  ];

  const seasonTableData = useMemo(() => {
    return seasonData.map(model => {
      const row = { model: model.model };
      model.seasonData.forEach(s => {
        row[s.season] = s[metric];
      });
      return row;
    });
  }, [seasonData, metric]);

  const tabItems = [
    {
      key: 'season',
      label: '按季节对比',
    },
    {
      key: 'weather',
      label: '按天气类型对比',
    },
    {
      key: 'radar',
      label: '综合能力雷达图',
    },
    {
      key: 'ranking',
      label: '总体排名',
    }
  ];

  return (
    <div className="comparison-page">
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
        </Row>
      </Card>

      <Card size="small">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />

        {activeTab === 'season' && (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={14}>
              <ReactECharts
                option={seasonCompareOption}
                style={{ height: '400px' }}
                opts={{ renderer: 'canvas' }}
              />
            </Col>
            <Col span={10}>
              <Table
                title={() => `各模式不同季节${metric.toUpperCase()}对比 (${elementInfo.unit})`}
                columns={seasonTableColumns}
                dataSource={seasonTableData}
                rowKey="model"
                size="small"
                pagination={false}
                bordered
              />
            </Col>
          </Row>
        )}

        {activeTab === 'weather' && (
          <Row style={{ marginTop: 16 }}>
            <Col span={24}>
              <ReactECharts
                option={weatherTypeOption}
                style={{ height: '400px' }}
                opts={{ renderer: 'canvas' }}
              />
            </Col>
          </Row>
        )}

        {activeTab === 'radar' && (
          <Row style={{ marginTop: 16 }}>
            <Col span={14} offset={5}>
              <ReactECharts
                option={radarOption}
                style={{ height: '450px' }}
                opts={{ renderer: 'canvas' }}
              />
            </Col>
          </Row>
        )}

        {activeTab === 'ranking' && (
          <Row style={{ marginTop: 16 }}>
            <Col span={16} offset={4}>
              <Table
                title={() => `各模式综合表现排名 (${elementInfo.name} RMSE)`}
                columns={overallTableColumns}
                dataSource={modelRanking}
                rowKey="model"
                size="middle"
                pagination={false}
                bordered
              />
            </Col>
          </Row>
        )}
      </Card>
    </div>
  );
}
