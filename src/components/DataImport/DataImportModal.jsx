import React, { useState } from 'react';
import { Modal, Tabs, Upload, Button, Table, Alert, Space, message } from 'antd';
import { InboxOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useData } from '../../context/DataContext.jsx';

const { Dragger } = Upload;
const { TabPane } = Tabs;

export default function DataImportModal({ open, onClose }) {
  const { importObservations, importForecasts } = useData();
  const [activeTab, setActiveTab] = useState('observation');
  const [obsPreview, setObsPreview] = useState([]);
  const [fcPreview, setFcPreview] = useState([]);
  const [obsFile, setObsFile] = useState(null);
  const [fcFile, setFcFile] = useState(null);
  const [obsParsed, setObsParsed] = useState(false);
  const [fcParsed, setFcParsed] = useState(false);

  const parseCSV = (file, type) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n').filter(l => l.trim());
          if (lines.length < 2) {
            reject(new Error('文件内容为空或格式不正确'));
            return;
          }
          
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          const data = [];
          
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length < headers.length) continue;
            
            const row = {};
            headers.forEach((h, idx) => {
              row[h] = values[idx];
            });
            data.push(row);
          }
          
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  };

  const handleObsFile = async (file) => {
    try {
      const data = await parseCSV(file, 'observation');
      setObsPreview(data.slice(0, 10));
      setObsFile(file);
      setObsParsed(true);
      message.success(`成功解析观测数据，共 ${data.length} 条记录`);
    } catch (err) {
      message.error(err.message || '观测数据解析失败');
    }
    return false;
  };

  const handleFcFile = async (file) => {
    try {
      const data = await parseCSV(file, 'forecast');
      setFcPreview(data.slice(0, 10));
      setFcFile(file);
      setFcParsed(true);
      message.success(`成功解析预报数据，共 ${data.length} 条记录`);
    } catch (err) {
      message.error(err.message || '预报数据解析失败');
    }
    return false;
  };

  const handleImport = async () => {
    let success = false;
    
    if (obsParsed && obsFile) {
      const data = await parseCSVFull(obsFile);
      const count = importObservations(data);
      if (count > 0) {
        message.success(`成功导入 ${count} 条观测数据`);
        success = true;
      }
    }
    
    if (fcParsed && fcFile) {
      const data = await parseCSVFull(fcFile);
      const count = importForecasts(data);
      if (count > 0) {
        message.success(`成功导入 ${count} 条预报数据`);
        success = true;
      }
    }
    
    if (success) {
      onClose();
      setObsPreview([]);
      setFcPreview([]);
      setObsFile(null);
      setFcFile(null);
      setObsParsed(false);
      setFcParsed(false);
    }
  };

  const parseCSVFull = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const row = {};
          headers.forEach((h, idx) => {
            row[h] = values[idx];
          });
          data.push(row);
        }
        resolve(data);
      };
      reader.readAsText(file);
    });
  };

  const obsColumns = [
    { title: '站点ID', dataIndex: 'stationid', key: 'stationid', width: 100 },
    { title: '日期', dataIndex: 'date', key: 'date', width: 120 },
    { title: '温度(°C)', dataIndex: 'temperature', key: 'temperature', width: 100 },
    { title: '降水(mm)', dataIndex: 'precipitation', key: 'precipitation', width: 100 },
    { title: '风速(m/s)', dataIndex: 'windspeed', key: 'windspeed', width: 100 }
  ];

  const fcColumns = [
    { title: '站点ID', dataIndex: 'stationid', key: 'stationid', width: 80 },
    { title: '起报日期', dataIndex: 'date', key: 'date', width: 100 },
    { title: '模式', dataIndex: 'model', key: 'model', width: 80 },
    { title: '时效(h)', dataIndex: 'forecasthour', key: 'forecasthour', width: 70 },
    { title: '温度(°C)', dataIndex: 'temperature', key: 'temperature', width: 90 }
  ];

  return (
    <Modal
      title="导入气象数据"
      open={open}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button
          key="import"
          type="primary"
          onClick={handleImport}
          disabled={!obsParsed && !fcParsed}
          icon={<CheckCircleOutlined />}
        >
          确认导入
        </Button>
      ]}
    >
      <Alert
        type="info"
        showIcon
        message="支持CSV格式文件导入"
        description={
          <div>
            <p><strong>观测数据字段：</strong>stationId, date, temperature, precipitation, windSpeed, weatherType(可选)</p>
            <p><strong>预报数据字段：</strong>stationId, date, model, forecastHour, forecastDate(可选), temperature, precipitation, windSpeed</p>
          </div>
        }
        style={{ marginBottom: 16 }}
      />

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
            <p className="ant-upload-text">点击或拖拽CSV文件到此区域上传</p>
            <p className="ant-upload-hint">支持单文件上传，仅CSV格式</p>
          </Dragger>
          
          {obsPreview.length > 0 && (
            <div>
              <p style={{ color: '#52c41a', marginBottom: 8 }}>
                <CheckCircleOutlined /> 解析成功，预览前10条数据：
              </p>
              <Table
                columns={obsColumns}
                dataSource={obsPreview}
                rowKey={(r, i) => i}
                size="small"
                pagination={false}
                scroll={{ x: 500, y: 200 }}
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
            <p className="ant-upload-text">点击或拖拽CSV文件到此区域上传</p>
            <p className="ant-upload-hint">支持单文件上传，仅CSV格式</p>
          </Dragger>
          
          {fcPreview.length > 0 && (
            <div>
              <p style={{ color: '#52c41a', marginBottom: 8 }}>
                <CheckCircleOutlined /> 解析成功，预览前10条数据：
              </p>
              <Table
                columns={fcColumns}
                dataSource={fcPreview}
                rowKey={(r, i) => i}
                size="small"
                pagination={false}
                scroll={{ x: 500, y: 200 }}
              />
            </div>
          )}
        </TabPane>
      </Tabs>
    </Modal>
  );
}
