import React, { useState } from 'react';
import { Modal, Tabs, Upload, Button, Table, Alert, Space, message, Statistic, Row, Col, Tag, Divider, Descriptions } from 'antd';
import { InboxOutlined, CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useData } from '../../context/DataContext.jsx';

const { Dragger } = Upload;
const { TabPane } = Tabs;

export default function DataImportModal({ open, onClose }) {
  const { importObservations, importForecasts } = useData();
  const [activeTab, setActiveTab] = useState('observation');
  const [obsData, setObsData] = useState(null);
  const [fcData, setFcData] = useState(null);
  const [obsFileName, setObsFileName] = useState('');
  const [fcFileName, setFcFileName] = useState('');
  const [importResult, setImportResult] = useState(null);

  const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split(/\r?\n/).filter(l => l.trim());
          if (lines.length < 2) {
            reject(new Error('文件内容为空或格式不正确（至少需要表头和一行数据）'));
            return;
          }

          const rawHeaders = lines[0].split(',').map(h => h.trim());
          const headers = rawHeaders.map(h => h);
          const data = [];

          for (let i = 1; i < lines.length; i++) {
            const rawValues = splitCSVLine(lines[i]);
            if (rawValues.length === 0) continue;
            const values = rawValues.map(v => v.trim());
            const row = {};
            headers.forEach((h, idx) => {
              row[h] = values[idx] !== undefined ? values[idx] : '';
            });
            data.push(row);
          }

          resolve({ data, headers: rawHeaders });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  };

  const splitCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  };

  const handleObsFile = async (file) => {
    try {
      const { data, headers } = await parseCSV(file);
      setObsData(data);
      setObsFileName(file.name);
      setImportResult(null);
      message.success(`成功解析观测数据文件「${file.name}」，共 ${data.length} 条记录，识别表头：${headers.join(', ')}`);
    } catch (err) {
      message.error(err.message || '观测数据解析失败');
    }
    return false;
  };

  const handleFcFile = async (file) => {
    try {
      const { data, headers } = await parseCSV(file);
      setFcData(data);
      setFcFileName(file.name);
      setImportResult(null);
      message.success(`成功解析预报数据文件「${file.name}」，共 ${data.length} 条记录，识别表头：${headers.join(', ')}`);
    } catch (err) {
      message.error(err.message || '预报数据解析失败');
    }
    return false;
  };

  const handleImport = async () => {
    const results = { observations: null, forecasts: null };
    let hasSuccess = false;

    if (obsData && obsData.length > 0) {
      const result = importObservations(obsData);
      results.observations = { fileName: obsFileName, ...result };
      if (result.valid && result.valid.length > 0) hasSuccess = true;
    }

    if (fcData && fcData.length > 0) {
      const result = importForecasts(fcData);
      results.forecasts = { fileName: fcFileName, ...result };
      if (result.valid && result.valid.length > 0) hasSuccess = true;
    }

    setImportResult(results);

    if (hasSuccess) {
      const parts = [];
      if (results.observations?.valid?.length > 0) {
        parts.push(`观测数据：写入 ${results.observations.valid.length} 条`);
      }
      if (results.forecasts?.valid?.length > 0) {
        parts.push(`预报数据：写入 ${results.forecasts.valid.length} 条`);
      }
      message.success({
        content: `导入完成！${parts.join('；')}`,
        duration: 5,
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />
      });
    } else {
      message.error({
        content: '导入失败，没有任何有效记录写入系统。请检查必填字段是否齐全。',
        duration: 6,
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
      });
    }
  };

  const handleClose = () => {
    if (!importResult) {
      onClose();
      return;
    }
    const hasSuccess =
      (importResult.observations?.valid?.length > 0) ||
      (importResult.forecasts?.valid?.length > 0);
    if (hasSuccess) {
      setObsData(null);
      setFcData(null);
      setObsFileName('');
      setFcFileName('');
      setImportResult(null);
      onClose();
    } else {
      onClose();
    }
  };

  const handleReset = () => {
    setObsData(null);
    setFcData(null);
    setObsFileName('');
    setFcFileName('');
    setImportResult(null);
  };

  const getObsPreviewColumns = () => {
    if (!obsData || obsData.length === 0) return [];
    const headers = Object.keys(obsData[0]);
    return headers.map(h => ({
      title: h,
      dataIndex: h,
      key: h,
      width: 120,
      ellipsis: true
    }));
  };

  const getFcPreviewColumns = () => {
    if (!fcData || fcData.length === 0) return [];
    const headers = Object.keys(fcData[0]);
    return headers.map(h => ({
      title: h,
      dataIndex: h,
      key: h,
      width: 120,
      ellipsis: true
    }));
  };

  const renderImportResult = () => {
    if (!importResult) return null;

    const renderFileResult = (res, label) => {
      if (!res) return null;
      const success = res.valid?.length > 0;
      const failedCount = res.invalid || 0;
      const validCount = res.valid?.length || 0;
      const totalCount = res.total || 0;

      return (
        <div key={label} style={{ marginBottom: 16 }}>
          <Descriptions
            title={
              <Space>
                {success ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                )}
                <span style={{ fontWeight: 600 }}>{label}</span>
                <Tag color="default">{res.fileName}</Tag>
              </Space>
            }
            column={3}
            size="small"
            bordered
            style={{ marginBottom: 8 }}
          >
            <Descriptions.Item label="解析总数">{totalCount} 条</Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#52c41a' }}>成功写入</span>}>
              <span style={{ color: '#52c41a', fontWeight: 600 }}>{validCount} 条</span>
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#ff4d4f' }}>未写入</span>}>
              <span style={{ color: '#ff4d4f' }}>{failedCount} 条</span>
            </Descriptions.Item>
          </Descriptions>

          {res.errors && res.errors.length > 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 8 }}
              message={`以下必填字段存在缺失：${res.errors.join('、')}`}
              description="请检查CSV文件表头是否包含上述字段，或参考下方字段说明调整文件格式。"
            />
          )}

          {res.invalidRecords && res.invalidRecords.length > 0 && (
            <div style={{ fontSize: 12 }}>
              <div style={{ marginBottom: 4, color: '#666' }}>未写入记录示例（最多显示20条）：</div>
              <Table
                size="small"
                dataSource={res.invalidRecords}
                rowKey={(r, i) => i}
                pagination={false}
                columns={[
                  { title: 'CSV行号', dataIndex: 'row', key: 'row', width: 100 },
                  { title: '原因', dataIndex: 'reason', key: 'reason' }
                ]}
                scroll={{ y: 150 }}
              />
            </div>
          )}
        </div>
      );
    };

    const hasAnySuccess =
      (importResult.observations?.valid?.length > 0) ||
      (importResult.forecasts?.valid?.length > 0);

    return (
      <div style={{ marginBottom: 16 }}>
        <Alert
          type={hasAnySuccess ? 'success' : 'error'}
          showIcon
          style={{ marginBottom: 16 }}
          icon={hasAnySuccess ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          message={
            hasAnySuccess
              ? '导入完成，数据已写入系统，各页面将自动刷新'
              : '导入未成功，没有记录写入系统'
          }
          description={
            hasAnySuccess
              ? '已根据新数据重新计算误差统计、热力图、趋势图和季度报告。'
              : '请根据下方详细结果检查文件格式，修正后重试。'
          }
        />
        {renderFileResult(importResult.observations, '观测数据')}
        {renderFileResult(importResult.forecasts, '预报数据')}
        <Divider style={{ margin: '8px 0 16px' }} />
      </div>
    );
  };

  const canImport = (obsData && obsData.length > 0) || (fcData && fcData.length > 0);

  const getFooterButtons = () => {
    const buttons = [];
    buttons.push(
      <Button key="reset" onClick={handleReset} disabled={!obsData && !fcData && !importResult}>
        清空选择
      </Button>
    );
    const hasSuccess =
      importResult &&
      (importResult.observations?.valid?.length > 0 || importResult.forecasts?.valid?.length > 0);
    buttons.push(
      <Button key="cancel" onClick={handleClose}>
        {importResult ? (hasSuccess ? '完成' : '关闭') : '取消'}
      </Button>
    );
    if (!importResult) {
      buttons.push(
        <Button
          key="import"
          type="primary"
          onClick={handleImport}
          disabled={!canImport}
          icon={<CheckCircleOutlined />}
        >
          确认导入
        </Button>
      );
    }
    return buttons;
  };

  return (
    <Modal
      title="导入气象数据"
      open={open}
      onCancel={handleClose}
      width={900}
      destroyOnClose={false}
      footer={getFooterButtons()}
    >
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message="支持 CSV 格式文件导入，字段名兼容多种写法"
        description={
          <div style={{ fontSize: 12 }}>
            <p style={{ margin: '4px 0' }}>
              <strong>观测数据必填字段：</strong>stationId / station_id / 站号，date / 日期 / 时间
            </p>
            <p style={{ margin: '4px 0' }}>
              <strong>预报数据必填字段：</strong>stationId，date / 起报日期，model / 模式，forecastHour / forecast_hour / 时效
            </p>
            <p style={{ margin: '4px 0' }}>
              <strong>可选字段：</strong>temperature/temp/气温、precipitation/precip/降水、windSpeed/wind/风速、weatherType/天气类型
            </p>
          </div>
        }
        style={{ marginBottom: 16 }}
      />

      {renderImportResult()}

      {!importResult && (
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="观测数据" key="observation">
            <Dragger
              accept=".csv"
              showUploadList={false}
              beforeUpload={handleObsFile}
              style={{ marginBottom: 16 }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽 CSV 文件到此区域上传</p>
              <p className="ant-upload-hint">
                {obsFileName ? `已选择：${obsFileName}（${obsData?.length || 0} 条记录）` : '支持单文件上传，仅 CSV 格式'}
              </p>
            </Dragger>

            {obsData && obsData.length > 0 && (
              <div>
                <Row gutter={16} style={{ marginBottom: 12 }}>
                  <Col span={8}>
                    <Statistic title="解析记录数" value={obsData.length} suffix="条" />
                  </Col>
                  <Col span={8}>
                    <Statistic title="识别表头数" value={Object.keys(obsData[0]).length} suffix="个" />
                  </Col>
                  <Col span={8}>
                    <Tag color="green" style={{ padding: '4px 12px', fontSize: 14, marginTop: 4 }}>
                      <CheckCircleOutlined /> 解析成功，待确认导入
                    </Tag>
                  </Col>
                </Row>
                <div style={{ marginBottom: 8, color: '#666', fontSize: 12 }}>
                  数据预览（前 10 条）：
                </div>
                <Table
                  columns={getObsPreviewColumns()}
                  dataSource={obsData.slice(0, 10)}
                  rowKey={(r, i) => i}
                  size="small"
                  pagination={false}
                  scroll={{ x: 800, y: 200 }}
                />
              </div>
            )}
          </TabPane>

          <TabPane tab="预报数据" key="forecast">
            <Dragger
              accept=".csv"
              showUploadList={false}
              beforeUpload={handleFcFile}
              style={{ marginBottom: 16 }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽 CSV 文件到此区域上传</p>
              <p className="ant-upload-hint">
                {fcFileName ? `已选择：${fcFileName}（${fcData?.length || 0} 条记录）` : '支持单文件上传，仅 CSV 格式'}
              </p>
            </Dragger>

            {fcData && fcData.length > 0 && (
              <div>
                <Row gutter={16} style={{ marginBottom: 12 }}>
                  <Col span={8}>
                    <Statistic title="解析记录数" value={fcData.length} suffix="条" />
                  </Col>
                  <Col span={8}>
                    <Statistic title="识别表头数" value={Object.keys(fcData[0]).length} suffix="个" />
                  </Col>
                  <Col span={8}>
                    <Tag color="green" style={{ padding: '4px 12px', fontSize: 14, marginTop: 4 }}>
                      <CheckCircleOutlined /> 解析成功，待确认导入
                    </Tag>
                  </Col>
                </Row>
                <div style={{ marginBottom: 8, color: '#666', fontSize: 12 }}>
                  数据预览（前 10 条）：
                </div>
                <Table
                  columns={getFcPreviewColumns()}
                  dataSource={fcData.slice(0, 10)}
                  rowKey={(r, i) => i}
                  size="small"
                  pagination={false}
                  scroll={{ x: 800, y: 200 }}
                />
              </div>
            )}
          </TabPane>
        </Tabs>
      )}
    </Modal>
  );
}
