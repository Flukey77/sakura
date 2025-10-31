// src/pages/ProductsPage.js (V8.6 – รองรับ ngrok 100%)
import React, { useEffect, useState } from 'react';
import {
    Row,
    Col,
    Table,
    Card,
    Button,
    Modal,
    Form,
    Input,
    InputNumber,
    message,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { authorizedFetch } from '../utils/api';

// ฟังก์ชันแปลงเงิน
const formatCurrency = (num) =>
    (num || 0).toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const ProductsPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    // ✅ โหลดสินค้าทั้งหมด
    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await authorizedFetch('/api/products');
            setProducts(data);
        } catch {
            message.error('โหลดข้อมูลสินค้าไม่สำเร็จ!');
        }
        setLoading(false);
    };

    useEffect(() => {
        loadProducts();
    }, []);

    const showAddModal = () => {
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleCancel = () => setIsModalVisible(false);

    // ✅ สร้างสินค้าใหม่ (ใช้ authorizedFetch)
    const handleFormSubmit = async (values) => {
        try {
            const result = await authorizedFetch('/api/products', {
                method: 'POST',
                body: JSON.stringify(values),
            });

            message.success('เพิ่มสินค้าสำเร็จ!');
            setIsModalVisible(false);
            loadProducts();
        } catch (error) {
            message.error(error.message || 'เกิดข้อผิดพลาด!');
        }
    };

    // Columns ตาราง
    const columns = [
        {
            title: 'รหัส',
            dataIndex: 'sku',
            key: 'sku',
            sorter: (a, b) => a.sku.localeCompare(b.sku),
        },
        { title: 'ชื่อสินค้า', dataIndex: 'name', key: 'name' },
        {
            title: 'ราคาซื้อ',
            dataIndex: 'cost_price',
            align: 'right',
            render: (v) => formatCurrency(v),
        },
        {
            title: 'ราคาขาย',
            dataIndex: 'sale_price',
            align: 'right',
            render: (v) => formatCurrency(v),
        },
        {
            title: 'คงเหลือ',
            dataIndex: 'stock_on_hand',
            align: 'right',
            render: (v) => `${formatCurrency(v)} ชิ้น`,
        },
    ];

    return (
        <Card>
            {/* Header: Search + Add */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '1rem',
                }}
            >
                <Input
                    placeholder="ค้นหาสินค้า..."
                    prefix={<SearchOutlined />}
                    style={{ width: 300 }}
                />

                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={showAddModal}
                >
                    เพิ่มสินค้าใหม่
                </Button>
            </div>

            {/* ตารางสินค้า */}
            <Table
                rowKey="id"
                columns={columns}
                dataSource={products}
                loading={loading}
                pagination={{ pageSize: 10 }}
            />

            {/* Modal สร้างสินค้า */}
            <Modal
                title="เพิ่มสินค้าใหม่"
                open={isModalVisible}
                onCancel={handleCancel}
                onOk={() => form.submit()}
                okText="บันทึก"
                cancelText="ยกเลิก"
            >
                <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
                    <Form.Item
                        name="sku"
                        label="รหัส (SKU)"
                        rules={[{ required: true, message: 'กรุณากรอก SKU!' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="name"
                        label="ชื่อสินค้า"
                        rules={[
                            { required: true, message: 'กรุณากรอก ชื่อสินค้า!' },
                        ]}
                    >
                        <Input />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="cost_price" label="ราคาซื้อ">
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={0}
                                    addonAfter="บาท"
                                />
                            </Form.Item>
                        </Col>

                        <Col span={12}>
                            <Form.Item name="sale_price" label="ราคาขาย">
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={0}
                                    addonAfter="บาท"
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="stock_on_hand" label="จำนวนคงเหลือเริ่มต้น">
                        <InputNumber
                            style={{ width: '100%' }}
                            min={0}
                            addonAfter="ชิ้น"
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default ProductsPage;
