// src/pages/OverviewPage.js
// (V-Final: รวมโค้ดใหม่ของคุณ + คำขอของคุณ)

import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Select, message, Spin } from 'antd';
// ▼▼▼▼▼ [GEMINI] 1. ลบ Bar ออก เหลือแค่ Line ▼▼▼▼▼
import { Line } from 'react-chartjs-2'; 
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    LineElement,
    PointElement,
 // ▼▼▼▼▼ [GEMINI] 2. ลบ BarElement ออก ▼▼▼▼▼
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { authorizedFetch } from '../utils/api';
import dayjs from 'dayjs';

ChartJS.register(
    CategoryScale,
    LinearScale,
    LineElement,
    PointElement,
// ▲▲▲▲▲ (ลบ BarElement) ▲▲▲▲▲
    Title,
    Tooltip,
    Legend
);

const formatCurrency = (num) =>
    (num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const OverviewPage = () => {
    const [range, setRange] = useState('today');
    const [summary, setSummary] = useState(null);
    const [recentSales, setRecentSales] = useState([]);
// ▼▼▼▼▼ [GEMINI] 3. ลบ chartData (ของ Campaign) ออก ▼▼▼▼▼
    const [profitChartData, setProfitChartData] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadData = async (currentRange) => {
        setLoading(true);
        try {
            // ▼▼▼▼▼ [GEMINI] 4. ลบ campaignData ออก (เหลือ 3 API) ▼▼▼▼▼
            const [
                summaryData,
                salesData,
                profitData
            ] = await Promise.all([
                authorizedFetch(`/api/summary?range=${currentRange}`),
                authorizedFetch(`/api/recent_sales?range=${currentRange}`),
                authorizedFetch(`/api/profit_chart?range=${currentRange}`) // (ต้องใช้ V7.2)
            ]);
            // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

            setSummary(summaryData);
            setRecentSales(salesData);

            // ▼▼▼▼▼ [GEMINI] 5. ลบ setChartData (ของ Campaign) ทิ้ง ▼▼▼▼▼

            // (อันนี้เก็บไว้ - กราฟเส้นใหม่ของคุณ)
            setProfitChartData({
                labels: profitData.labels,
                datasets: [
                    {
                        label: 'รายรับ (Revenue)',
                        data: profitData.revenue,
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.3)',
                        borderWidth: 2,
                        tension: 0.3
                    },
                    {
                        label: 'ต้นทุนสินค้า (COGS)',
                        data: profitData.cogs,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.3)',
                        borderWidth: 2,
                        tension: 0.3
                    },
                    {
                        label: 'กำไรสุทธิ (Profit)',
                        data: profitData.profit,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.3)',
                        borderWidth: 2,
                        tension: 0.3
                    }
                ]
            });

        } catch (err) {
            console.error(err);
            message.error('โหลดข้อมูล Overview ไม่สำเร็จ!');
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData(range);
    }, [range]);

    // (ตาราง Sales - โค้ดเดิมของคุณ)
    const recentSalesColumns = [
        { title: 'เลขที่', dataIndex: 'order_number' },
        { title: 'ลูกค้า / แคมเปญ', render: (_, r) => r.campaign || r.customer_name || '-' },
        { title: 'ช่องทาง', dataIndex: 'channel' },
        { title: 'ผู้สร้าง', dataIndex: 'created_by_username' },
        {
            title: 'ยอดเงิน',
            dataIndex: 'total_amount',
            align: 'right',
            render: (v) => formatCurrency(v)
        }
    ];

    return (
        <div>
            {/* (Select เลือกวัน - โค้ดเดิมของคุณ) */}
            <Select
                defaultValue="today"
                style={{ width: 160, marginBottom: '1rem' }}
                onChange={(val) => setRange(val)}
                options={[
                    { value: 'today', label: 'วันนี้' },
                    { value: 'yesterday', label: 'เมื่อวาน' },
                    { value: 'last_7d', label: '7 วันล่าสุด' },
                    { value: 'this_month', label: 'เดือนนี้' },
                    { value: 'this_year', label: 'ปีนี้' }
                ]}
            />

            {/* (การ์ดสรุปยอด - โค้ดเดิมของคุณ) */}
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                    <Card><Statistic title="กำไรสุทธิ" value={formatCurrency(summary?.netProfit)} suffix="฿" loading={loading} /></Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card><Statistic title="ยอดขายรวม" value={formatCurrency(summary?.totalRevenue)} suffix="฿" loading={loading} /></Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card><Statistic title="ค่าโฆษณา" value={formatCurrency(summary?.totalAdSpend)} suffix="฿" loading={loading} /></Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card><Statistic title="ต้นทุนสินค้า" value={formatCurrency(summary?.totalCOGS)} suffix="฿" loading={loading} /></Card>
                </Col>
                
                {/* ▼▼▼▼▼ [GEMINI] 6. เพิ่มการ์ด FB/TT/Orders กลับมา (เหมือน V8.4) ▼▼▼▼▼ */}
                <Col xs={24} sm={12} md={6}>
                    <Card style={{ background: '#e6f7ff' }}> 
                        <Statistic title="ยอดขาย Facebook" value={formatCurrency(summary?.totalFbSales)} loading={loading} precision={2} suffix="฿"/>
                    </Card>
                </Col>
                 <Col xs={24} sm={12} md={6}>
                    <Card style={{ background: '#f6ffed' }}> 
                        <Statistic title="ยอดขาย TikTok" value={formatCurrency(summary?.totalTtSales)} loading={loading} precision={2} suffix="฿"/>
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}> 
                    <Card> <Statistic title="จำนวนออเดอร์" value={summary?.totalOrders || 0} loading={loading} /> </Card> 
                </Col>
                {/* ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ */}

            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: '1rem' }}>
                {/* ▼▼▼▼▼ [GEMINI] 7. ขยายกราฟเส้นให้เต็ม (lg={24}) ▼▼▼▼▼ */}
                <Col xs={24} lg={24}>
                    <Card title="รายรับ / ต้นทุน / กำไร">
                        {loading ? <Spin /> : profitChartData ? (
                            <Line data={profitChartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
                        ) : <p>ไม่มีข้อมูล</p>}
                    </Card>
                </Col>

                {/* ▼▼▼▼▼ [GEMINI] 8. ลบกราฟแคมเปญ (Bar chart) ออก (ตามที่คุณขอ) ▼▼▼▼▼ */}
                {/*
                <Col xs={24} lg={12}>
                    <Card title="ยอดขายแยกตามแคมเปญ">
                        ... (ลบแล้ว) ...
                    </Card>
                </Col>
                */}
            </Row>

            {/* (ตาราง Sales - โค้ดเดิมของคุณ) */}
            <Card style={{ marginTop: '1.5rem' }} title="รายการขายล่าสุด">
                <Table
                    rowKey="id"
                    dataSource={recentSales}
                    columns={recentSalesColumns}
                    loading={loading}
                    pagination={{ pageSize: 5 }}
                    size="small"
                    scroll={{ y: 300 }}
                />
            </Card>
        </div>
    );
};

export default OverviewPage;