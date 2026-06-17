import React, { useState, useMemo } from 'react';
import { Card, Select, Row, Col, Radio, Space, Table, Tag, Slider, Button } from 'antd';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { EyeOutlined } from '@ant-design/icons';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useData } from '../context/DataContext.jsx';
import StationDetailModal from '../components/StationDetail/StationDetailModal.jsx';
import {
  calculateErrors,
  groupByStation,
  filterErrors
} from '../utils/errorMetrics.js';
import { ELEMENTS, MODELS, FORECAST_HOURS } from '../data/stations.js';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function getErrorColor(value, maxAbs) {
  const ratio = Math.abs(value) / maxAbs;
  if (value > 0) {
    const r = Math.round(255 * ratio + 200 * (1 - ratio));
    const g = Math.round(100 * (1 - ratio));
    const b = Math.round(100 * (1 - ratio));
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const r = Math.round(100 * (1 - ratio));
    const g = Math.round(100 * (1 - ratio));
    const b = Math.round(255 * ratio + 200 * (1 - ratio));
    return `rgb(${r}, ${g}, ${b})`;
  }
}

function getRadius(absValue, maxAbs) {
  const ratio = absValue / maxAbs;
  return 8 + ratio * 20;
}

export default function SpatialDistribution() {
  const { observations, forecasts } = useData();

  const [element, setElement] = useState('temperature');
  const [metric, setMetric] = useState('me');
  const [selectedModel, setSelectedModel] = useState('ECMWF');
  const [forecastHour, setForecastHour] = useState(24);
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const allErrors = useMemo(() =>
    calculateErrors(forecasts, observations, element),
    [forecasts, observations, element]
  );

  const filteredErrors = useMemo(() =>
    filterErrors(allErrors, {
      models: [selectedModel],
      forecastHours: [forecastHour]
    }),
    [allErrors, selectedModel, forecastHour]
  );

  const stationData = useMemo(() =>
    groupByStation(filteredErrors),
    [filteredErrors]
  );

  const maxAbsValue = useMemo(() => {
    if (stationData.length === 0) return 1;
    const values = stationData.map(s => Math.abs(s[metric]));
    return Math.max(...values, 0.1);
  }, [stationData, metric]);

  const center = [35, 105];

  const handleStationClick = (stationId) => {
    setSelectedStationId(stationId);
    setDetailModalOpen(true);
  };

  const columns = [
    {
      title: '站点',
      dataIndex: 'stationName',
      key: 'stationName',
      width: 70,
      fixed: 'left'
    },
    {
      title: '省份',
      dataIndex: 'province',
      key: 'province',
      width: 60
    },
    {
      title: 'ME',
      dataIndex: 'me',
      key: 'me',
      width: 60,
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
      width: 60,
      render: (val) => val.toFixed(2)
    },
    {
      title: 'RMSE',
      dataIndex: 'rmse',
      key: 'rmse',
      width: 60,
      render: (val) => val.toFixed(2)
    },
    {
      title: '操作',
      key: 'action',
      width: 60,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleStationClick(record.stationId)}
        >
          详情
        </Button>
      )
    }
  ];

  const elementInfo = ELEMENTS.find(e => e.key === element) || ELEMENTS[0];

  const legendItems = useMemo(() => {
    const items = [];
    for (let i = -maxAbsValue; i <= maxAbsValue; i += maxAbsValue / 4) {
      items.push({
        value: i,
        color: getErrorColor(i, maxAbsValue)
      });
    }
    return items;
  }, [maxAbsValue]);

  return (
    <div className="spatial-page">
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
              <span>误差指标：</span>
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
                value={selectedModel}
                onChange={setSelectedModel}
                style={{ width: 150 }}
                options={MODELS.map(m => ({ value: m.id, label: m.id }))}
              />
            </Space>
          </Col>
          <Col flex="auto">
            <Space direction="vertical" style={{ width: '100%' }}>
              <span>预报时效：{forecastHour}小时</span>
              <Slider
                min={24}
                max={240}
                step={24}
                value={forecastHour}
                onChange={setForecastHour}
                marks={{
                  24: '24h',
                  72: '72h',
                  120: '120h',
                  168: '168h',
                  240: '240h'
                }}
              />
            </Space>
          </Col>
        </Row>
        <div style={{ marginTop: 8, color: '#666', fontSize: '12px' }}>
          💡 提示：点击地图上的站点圆圈或表格中的"详情"按钮，可查看站点详细检验数据
        </div>
      </Card>

      <Row gutter={16}>
        <Col span={16}>
          <Card
            title={`误差空间分布图 - ${elementInfo.name} (${metric.toUpperCase()})`}
            size="small"
          >
            <div style={{ position: 'relative' }}>
              <MapContainer
                center={center}
                zoom={5}
                style={{ height: '500px', width: '100%', borderRadius: '4px' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                {stationData.map(station => {
                  const value = station[metric];
                  const color = getErrorColor(value, maxAbsValue);
                  const radius = getRadius(Math.abs(value), maxAbsValue);
                  return (
                    <CircleMarker
                      key={station.stationId}
                      center={[station.lat, station.lon]}
                      radius={radius}
                      pathOptions={{
                        fillColor: color,
                        color: '#fff',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8,
                        cursor: 'pointer'
                      }}
                      eventHandlers={{
                        click: () => handleStationClick(station.stationId)
                      }}
                    >
                      <Popup>
                        <div style={{ cursor: 'pointer' }}>
                          <strong style={{ fontSize: '14px' }}>{station.stationName}</strong> ({station.province})
                          <br />
                          <span style={{ color: '#666', fontSize: '12px' }}>站点编号: {station.stationId}</span>
                          <hr style={{ margin: '6px 0' }} />
                          {metric.toUpperCase()}: <strong>{value.toFixed(2)}</strong> {elementInfo.unit}
                          <br />
                          ME: {station.me.toFixed(2)} {elementInfo.unit}
                          <br />
                          MAE: {station.mae.toFixed(2)} {elementInfo.unit}
                          <br />
                          RMSE: {station.rmse.toFixed(2)} {elementInfo.unit}
                          <br />
                          样本数: {station.count}
                          <hr style={{ margin: '6px 0' }} />
                          <span style={{ color: '#1890ff', fontSize: '12px' }}>点击查看详细分析 →</span>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
              <div className="map-legend">
                <div className="legend-title">误差图例 ({elementInfo.unit})</div>
                <div className="legend-bar">
                  {legendItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="legend-item"
                      style={{ backgroundColor: item.color }}
                      title={item.value.toFixed(2)}
                    />
                  ))}
                </div>
                <div className="legend-labels">
                  <span>-{maxAbsValue.toFixed(1)}</span>
                  <span>0</span>
                  <span>+{maxAbsValue.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card
            title="站点误差详情"
            size="small"
            extra={<span style={{ fontSize: '12px', color: '#666' }}>共{stationData.length}站</span>}
          >
            <Table
              columns={columns}
              dataSource={stationData}
              rowKey="stationId"
              size="small"
              scroll={{ y: 440, x: 400 }}
              pagination={false}
              onRow={(record) => ({
                style: { cursor: 'pointer' },
                onClick: () => handleStationClick(record.stationId)
              })}
            />
          </Card>
        </Col>
      </Row>

      <StationDetailModal
        stationId={selectedStationId}
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
      />
    </div>
  );
}
