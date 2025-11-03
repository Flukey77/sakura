// src/pages/DashboardPage.js (V8.6 – รองรับ ngrok 100%)
import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, message } from 'antd';
import {
    LineChartOutlined,
    ShopOutlined,
    PlusCircleOutlined,
    DatabaseOutlined,
    AppstoreOutlined,
    CarOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authorizedFetch } from '../utils/api';

const formatCurrency = (n) =>
    (n || 0).toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

const NavCard = ({ icon, title, onClick }) => (
    <Card hoverable onClick={onClick} style={{ cursor: 'pointer', minHeight: 140 }}>
        <div style={{ textAlign: 'center' }}>
            {React.createElement(icon, { style: { fontSize: '48px', marginBottom: '1rem' } })}
            <h3 style={{ margin: 0 }}>{title}</h3>
        </div>
    </Card>
);

const DashboardPage = () => {
    const navigate = useNavigate();

    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadDailySales = async () => {
        setLoading(true);
        try {
            const data = await authorizedFetch('/api/summary?range=today');
            setSummary(data);
        } catch (err) {
            message.error('โหลดข้อมูลสรุปไม่สำเร็จ!');
        }
        setLoading(false);
    };

    useEffect(() => {
        loadDailySales();
    }, []);

    return (
        <div>
            {/* ===== ส่วนสรุป ===== */}
            <Row gutter={[16, 16]} style={{ marginBottom: '1.5rem' }}>
                <Col xs={24} md={8}>
                    <Card>
                        <Statistic
                            title="ยอดขายวันนี้ (บาท)"
                            value={formatCurrency(summary?.totalRevenue)}
                            loading={loading}
                        />
                    </Card>
                </Col>

                <Col xs={24} md={8}>
                    <Card>
                        <Statistic
                            title="จำนวนออเดอร์ (วันนี้)"
                            value={summary?.totalOrders || 0}
                            loading={loading}
                        />
                    </Card>
                </Col>

                <Col xs={24} md={8}>
                    <Card>
                        <Statistic
                            title="กำไรสุทธิ (วันนี้)"
                            value={formatCurrency(summary?.netProfit)}
                            loading={loading}
                        />
                    </Card>
                </Col>
            </Row>

            {/* ===== ส่วนทางลัด ===== */}
            <Card title="เมนูลัด (Your Shortcuts)">
                <Row gutter={[16, 16]}>
                    <Col xs={12} md={8}>
                        <NavCard
                            icon={LineChartOutlined}
                            title="รายงาน (Overview)"
                            onClick={() => navigate('/overview')}
                        />
                    </Col>

                    <Col xs={12} md={8}>
                        <NavCard
                            icon={ShopOutlined}
                            title="ดูรายการขาย"
                            onClick={() => navigate('/sales')}
                        />
                    </Col>

                    <Col xs={12} md={8}>
                        <NavCard
                            icon={PlusCircleOutlined}
                            title="สร้างรายการขาย"
                            onClick={() => navigate('/sales/create')}
                        />
                    </Col>

                    <Col xs={12} md={8}>
                        <NavCard
                            icon={AppstoreOutlined}
                            title="ดูสินค้า"
                            onClick={() => navigate('/products')}
                        />
                    </Col>

                    <Col xs={12} md={8}>
                        <NavCard
                            icon={DatabaseOutlined}
                            title="คลังสินค้า"
                            onClick={() => message.info('ยังไม่เปิดใช้งาน')}
                        />
                    </Col>

                    <Col xs={12} md={8}>
                        <NavCard
                            icon={CarOutlined}
                            title="ศูนย์ขนส่ง"
                            onClick={() => message.info('ยังไม่เปิดใช้งาน')}
                        />
                    </Col>
                </Row>
            </Card>
        </div>
    );
};

export default DashboardPage;
