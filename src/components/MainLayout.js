// src/components/MainLayout.js (โค้ดเต็ม V8.3 - เปลี่ยนชื่อ Header)
import React, { useState, useEffect } from 'react';
import { HomeOutlined, BarChartOutlined, AppstoreOutlined, TeamOutlined, LineChartOutlined } from '@ant-design/icons';
import { Layout, Menu, Button, theme } from 'antd';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
    const [collapsed, setCollapsed] = useState(false); // สถานะเมนู (พับ/กาง)
    const navigate = useNavigate();
    const location = useLocation();
    const [isAdmin, setIsAdmin] = useState(false);
    const username = localStorage.getItem('username');
    const token = localStorage.getItem('jwtToken');

    useEffect(() => { // (โค้ดเช็ค Role เหมือน V8.0)
        const role = localStorage.getItem('role');
        if (role === 'admin') { setIsAdmin(true); }
        if (!token) { window.location.href = '/login'; }
    }, [token]);

    if (!token) return null; // ไม่ต้องวาดถ้าไม่มี Token

    const handleLogout = () => { // (โค้ด Logout เหมือน V8.0)
        localStorage.removeItem('jwtToken'); localStorage.removeItem('username'); localStorage.removeItem('role');
        navigate('/login');
    };

    const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();
    const handleMenuClick = (e) => { navigate(e.key); };

    // สร้างรายการเมนู (เหมือน V8.0)
    const menuItems = [
        { key: '/dashboard', icon: <HomeOutlined />, label: 'หน้าหลัก (Hub)' },
        { key: '/overview', icon: <LineChartOutlined />, label: 'รายงาน (Overview)' },
        { key: '/sales', icon: <BarChartOutlined />, label: 'รายการขาย (Sales)' },
        { key: '/products', icon: <AppstoreOutlined />, label: 'สินค้า (Products)' },
    ];
    if (isAdmin) { menuItems.push({ key: '/users', icon: <TeamOutlined />, label: 'จัดการผู้ใช้', }); }

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider trigger={null} collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
                {/* ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ V8.3 Change ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ */}
                <div style={{
                     height: '32px', margin: '16px', background: 'rgba(255, 255, 255, 0.2)',
                     borderRadius: '6px', // ทำให้ขอบมน
                     textAlign: 'center', color: 'white', lineHeight: '32px', fontWeight: 'bold',
                     overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' // จัดการข้อความยาว
                    }}
                     title="Sakura Biotech Co., Ltd." // เพิ่ม Tooltip
                >
                    {collapsed ? 'SB' : 'Sakura Biotech Co., Ltd.'}
                </div>
                {/* ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ End Change ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ */}
                <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} onClick={handleMenuClick} items={menuItems} />
            </Sider>
            <Layout>
                <Header style={{ padding: '0 16px', background: colorBgContainer, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     {/* เพิ่มปุ่มพับเมนู */}
                     {/* <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} style={{ fontSize: '16px', width: 64, height: 64, }} /> */}
                    <div>{/* Placeholder for potential breadcrumbs or title */}</div>
                    <div> {/* ย้าย Welcome & Logout มาไว้ใน div นี้ */}
                        <span style={{ marginRight: '1rem' }}>ยินดีต้อนรับ, {username}! ({isAdmin ? 'Admin' : 'User'})</span>
                        <Button type="primary" danger onClick={handleLogout}> Logout </Button>
                    </div>
                </Header>
                <Content style={{ margin: '24px 16px', padding: 24, minHeight: 280, background: colorBgContainer, borderRadius: borderRadiusLG }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};
export default MainLayout;