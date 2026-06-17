import React, { useState } from 'react';
import { Layout, Menu, theme } from 'antd';
import {
  DashboardOutlined,
  EnvironmentOutlined,
  LineChartOutlined,
  BarChartOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import './MainLayout.css';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '总览' },
  { key: '/spatial', icon: <EnvironmentOutlined />, label: '空间分布' },
  { key: '/temporal', icon: <LineChartOutlined />, label: '时效分析' },
  { key: '/comparison', icon: <BarChartOutlined />, label: '模式对比' },
  { key: '/archive', icon: <DatabaseOutlined />, label: '数据归档' }
];

export default function MainLayout({ data }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const getSelectedKey = () => {
    if (location.pathname === '/') return '/';
    return '/' + location.pathname.split('/')[1];
  };

  return (
    <Layout className="main-layout">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="main-sider"
      >
        <div className="logo">
          {collapsed ? '气象' : '气象预报评估系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0'
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px' }}>
            实时气象数据分析与预报误差评估工具
          </h2>
          <div className="header-info">
            <span>数据时段：最近30天</span>
            <span className="divider">|</span>
            <span>站点数量：30个</span>
            <span className="divider">|</span>
            <span>预报模式：4个</span>
          </div>
        </Header>
        <Content
          style={{
            margin: '16px',
            padding: '24px',
            minHeight: 'calc(100vh - 112px)',
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: 'auto'
          }}
        >
          <Outlet context={data} />
        </Content>
      </Layout>
    </Layout>
  );
}
