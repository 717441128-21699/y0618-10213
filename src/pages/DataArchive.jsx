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
  List,
  Typography,
  Divider,
  Statistic,
  Tabs,
  DatePicker
} from 'antd';
import ReactECharts from 'echarts-for-react';
import { useOutletContext } from 'react-router-dom';
import { FileTextOutlined, DownloadOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  calculateErrors,
  groupByModel,
  groupByForecastHour,
  groupByStation,
  getSystematicBias
} from '../utils/errorMetrics.js';
import { MODELS, ELEMENTS, STATIONS } from '../data/stations.js';

const { Title, Paragraph, Text } = Typography;
const { RangePicker } = DatePicker;

export default function DataArchive() {
  const data = useOutletContext();
  const { observations, forecasts } = data;

  const [activeTab, setActiveTab] = useState('archive');
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((dayjs().month() + 1) / 3));
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1);
  const [dateRange, setDateRange] = useState(null);

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

  const tempByModel = useMemo(() => groupByModel(tempErrors), [tempErrors]);
  const precipByModel = useMemo(() => groupByModel(precipErrors), [precipErrors]);
  const windByModel = useMemo(() => groupByModel(windErrors), [windErrors]);

  const tempByHour = useMemo(() => groupByForecastHour(tempErrors), [tempErrors]);
  const tempByStation = useMemo(() => groupByStation(tempErrors), [tempErrors]);
  const bias = useMemo(() => getSystematicBias(tempErrors), [tempErrors]);

  const bestModel = useMemo(() => {
    return [...tempByModel].sort((a, b) => a.rmse - b.rmse)[0];
  }, [tempByModel]);

  const monthTrendOption = useMemo(() => {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const baseValue = {
      ECMWF: [1.2, 1.3, 1.5, 1.8, 2.0, 2.2, 2.1, 2.0, 1.8, 1.5, 1.3, 1.2],
      GFS: [1.5, 1.6, 1.8, 2.1, 2.3, 2.5, 2.4, 2.3, 2.1, 1.8, 1.6, 1.5],
      'CMA-GFS': [1.8, 1.9, 2.1, 2.4, 2.6, 2.8, 2.7, 2.6, 2.4, 2.1, 1.9, 1.8],
      WRF: [2.0, 2.1, 2.3, 2.6, 2.8, 3.0, 2.9, 2.8, 2.6, 2.3, 2.1, 2.0]
    };

    const series = MODELS.map(model => ({
      name: model.id,
      type: 'line',
      data: baseValue[model.id] || baseValue.ECMWF,
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
            result += `${p.marker} ${p.seriesName}: ${p.value.toFixed(2)} °C<br/>`;
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
        data: months
      },
      yAxis: {
        type: 'value',
        name: '温度 RMSE (°C)',
        minInterval: 0.1
      },
      series
    };
  }, []);

  const monthlyArchives = useMemo(() => {
    const months = [];
    for (let i = 1; i <= 12; i++) {
      months.push({
        month: i,
        monthName: `${i}月`,
        observationCount: Math.floor(Math.random() * 500) + 800,
        forecastCount: Math.floor(Math.random() * 5000) + 10000,
        archived: true,
        archiveDate: dayjs(`${selectedYear}-${i}-28`).format('YYYY-MM-DD')
      });
    }
    return months;
  }, [selectedYear]);

  const archiveColumns = [
    {
      title: '月份',
      dataIndex: 'monthName',
      key: 'monthName',
      width: 80
    },
    {
      title: '观测数据量',
      dataIndex: 'observationCount',
      key: 'observationCount',
      width: 120,
      render: (val) => val.toLocaleString() + ' 条'
    },
    {
      title: '预报数据量',
      dataIndex: 'forecastCount',
      key: 'forecastCount',
      width: 120,
      render: (val) => val.toLocaleString() + ' 条'
    },
    {
      title: '归档状态',
      dataIndex: 'archived',
      key: 'archived',
      width: 100,
      render: (val) => val ? <Tag color="green">已归档</Tag> : <Tag color="orange">未归档</Tag>
    },
    {
      title: '归档日期',
      dataIndex: 'archiveDate',
      key: 'archiveDate',
      width: 120
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space>
          <Button size="small" type="link">查看</Button>
          <Button size="small" type="link" icon={<DownloadOutlined />}>下载</Button>
        </Space>
      )
    }
  ];

  const modelRanking = useMemo(() => {
    return [...tempByModel].sort((a, b) => a.rmse - b.rmse);
  }, [tempByModel]);

  const generateQuarterlyReport = () => {
    return {
      title: `${selectedYear}年第${selectedQuarter}季度数值天气预报检验报告`,
      period: `${selectedYear}年${(selectedQuarter - 1) * 3 + 1}月 - ${selectedYear}年${selectedQuarter * 3}月`,
      summary: {
        totalStations: STATIONS.length,
        totalModels: MODELS.length,
        totalObservations: observations.length,
        totalForecasts: forecasts.length,
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
        `本季度共检验${STATIONS.length}个站点的预报数据，涉及${MODELS.length}个数值预报模式。`,
        `温度预报方面，${bestModel?.model}模式表现最佳，RMSE为${bestModel?.rmse?.toFixed(2)}°C。`,
        `误差空间分布显示，${bias.positiveBias}个站点存在系统性偏高，${bias.negativeBias}个站点存在系统性偏低。`,
        '随着预报时效延长，各模式误差均呈增长趋势，240小时误差约为24小时的2-3倍。',
        '夏季误差整体高于冬季，可能与对流天气系统复杂性增加有关。',
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
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col>
                <Space>
                  <span>年份：</span>
                  <Select
                    value={selectedYear}
                    onChange={setSelectedYear}
                    style={{ width: 100 }}
                    options={[2023, 2024, 2025, 2026].map(y => ({ value: y, label: y + '年' }))}
                  />
                </Space>
              </Col>
              <Col flex="auto" style={{ textAlign: 'right' }}>
                <Space>
                  <RangePicker onChange={setDateRange} />
                  <Button type="primary" icon={<DownloadOutlined />}>
                    导出归档数据
                  </Button>
                </Space>
              </Col>
            </Row>

            <Table
              columns={archiveColumns}
              dataSource={monthlyArchives}
              rowKey="month"
              size="middle"
              pagination={false}
              bordered
            />

            <Card title="年度误差趋势" size="small" style={{ marginTop: 24 }}>
              <ReactECharts
                option={monthTrendOption}
                style={{ height: '350px' }}
                opts={{ renderer: 'canvas' }}
              />
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
                    options={[2023, 2024, 2025, 2026].map(y => ({ value: y, label: y + '年' }))}
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
                option={{
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
                }}
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
                dataSource={report.precipitation.overall}
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
                dataSource={report.windSpeed.overall}
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
