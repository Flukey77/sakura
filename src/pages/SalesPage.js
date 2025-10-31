// src/pages/SalesPage.js (V8.7 – รองรับ ngrok 100% + แก้ debounce)
import React, { useEffect, useState, useCallback } from 'react';
import {
    Table,
    Card,
    Input,
    Button,
    Row,
    Col,
    DatePicker,
    Select,
    message,
} from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    FilterOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authorizedFetch } from '../utils/api';
import dayjs from 'dayjs';
import debounce from 'lodash/debounce';

const { RangePicker } = DatePicker;
const { Option } = Select;

const formatCurrency = (num) =>
    (num || 0).toLocaleString('th-TH');

const formatDate = (date) =>
    date ? dayjs(date).format('DD/MM/YYYY') : '-';

const SalesPage = () => {
    const navigate = useNavigate();

    const [salesData, setSalesData] = useState([]);
    const [loading, setLoading] = useState(true);

    const [filterRange, setFilterRange] = useState('this_month');
    const [filterDates, setFilterDates] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // ✅ โหลดข้อมูลแบบ debounce
    const loadSales = useCallback(
        debounce(async (filters) => {
            setLoading(true);

            try {
                const params = new URLSearchParams();
                params.append('range', filters.range);

                // ✅ custom date
                if (filters.range === 'custom' && filters.dates?.length === 2) {
                    params.append(
                        'startDate',
                        filters.dates[0].format('YYYY-MM-DD')
                    );
                    params.append(
                        'endDate',
                        filters.dates[1].format('YYYY-MM-DD')
                    );
                }

                // ✅ search
                if (filters.search) {
                    params.append('search', filters.search);
                }

                const data = await authorizedFetch(`/api/recent_sales?${params.toString()}`);
                setSalesData(data);
            } catch (err) {
                message.error('โหลดข้อมูล Sales ไม่สำเร็จ!');
            }

            setLoading(false);
        }, 500),
        []
    );

    // ✅ Trigger Load เมื่อ filter เปลี่ยน
    useEffect(() => {
        loadSales({
            range: filterRange,
            dates: filterDates,
            search: searchTerm,
        });
    }, [filterRange, filterDates, searchTerm, loadSales]);

    // ✅ ควบคุม Filter
    const handleRangeChange = (value) => {
        setFilterRange(value);

        if (value !== 'custom') {
            setFilterDates(null);
        }
    };

    const handleDateChange = (dates) => {
        setFilterDates(dates);
        setFilterRange('custom');
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // ✅ Columns
    const columns = [
        {
            title: '#',
            dataIndex: 'order_number',
            key: 'order_number',
            width: 120,
        },
        {
            title: 'วันที่',
            dataIndex: 'order_date',
            key: 'date',
            render: (v) => formatDate(v),
            width: 130,
            sorter: (a, b) =>
                dayjs(a.order_date).unix() - dayjs(b.order_date).unix(),
        },
        {
            title: 'รายการ / ลูกค้า',
            key: 'details',
            render: (record) => (
                <>
                    <div>{record.campaign || record.customer_name || '-'}</div>
                    <span style={{ color: 'gray' }}>
                        {record.customer_name && record.campaign
                            ? record.customer_name
                            : ''}
                    </span>
                </>
            ),
            width: 220,
        },
        {
            title: 'ผู้สร้าง',
            dataIndex: 'created_by_username',
            key: 'user',
            width: 140,
        },
        {
            title: 'ช่องทาง',
            dataIndex: 'channel',
            key: 'channel',
            width: 130,
        },
        {
            title: 'มูลค่า',
            dataIndex: 'total_amount',
            align: 'right',
            render: (val) => formatCurrency(val),
            sorter: (a, b) => a.total_amount - b.total_amount,
            width: 120,
        },
        {
            title: 'สถานะ',
            dataIndex: 'status',
            key: 'status',
            width: 120,
        },
        {
            title: 'Action',
            key: 'action',
            width: 90,
            render: () => <Button size="small">...</Button>,
        },
    ];

    return (
        <Card>
            {/* ✅ Filter UI */}
            <Row gutter={[16, 16]} style={{ marginBottom: '1rem' }}>
                <Col xs={24} sm={12} md={6}>
                    <Input
                        placeholder="ค้นหา เลข/ชื่อ/แคมเปญ..."
                        prefix={<SearchOutlined />}
                        allowClear
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                </Col>

                <Col xs={24} sm={12} md={6}>
                    <Select
                        value={filterRange}
                        onChange={handleRangeChange}
                        style={{ width: '100%' }}
                    >
                        <Option value="today">วันนี้</Option>
                        <Option value="yesterday">เมื่อวาน</Option>
                        <Option value="last_7d">7 วันล่าสุด</Option>
                        <Option value="this_month">เดือนนี้</Option>
                        <Option value="this_year">ปีนี้</Option>
                        <Option value="custom">เลือกช่วงเวลา</Option>
                    </Select>
                </Col>

                <Col xs={24} sm={12} md={6}>
                    <RangePicker
                        value={filterDates}
                        onChange={handleDateChange}
                        disabled={filterRange !== 'custom'}
                        allowClear
                        style={{ width: '100%' }}
                        format="DD/MM/YYYY"
                    />
                </Col>

                <Col xs={24} sm={12} md={6} style={{ textAlign: 'right' }}>
                    <Button icon={<FilterOutlined />}>ตัวกรองอื่นๆ</Button>

                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => navigate('/sales/create')}
                        style={{ marginLeft: 8 }}
                    >
                        สร้าง
                    </Button>
                </Col>
            </Row>

            {/* ✅ ตาราง */}
            <Table
                rowKey="id"
                columns={columns}
                dataSource={salesData}
                loading={loading}
                pagination={{ pageSize: 15 }}
                scroll={{ x: 1100 }}
            />
        </Card>
    );
};

export default SalesPage;
