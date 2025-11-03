// src/pages/CreateSalePage.js (เวอร์ชันแก้สมบูรณ์ V8.6 - รองรับ ngrok 100%)
import React, { useEffect, useState } from 'react';
import {
    Card, Form, Input, Button, DatePicker, Select, InputNumber, Row, Col, message, Spin, Divider, Checkbox
} from 'antd';
import { MinusCircleOutlined, PlusOutlined, CopyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authorizedFetch } from '../utils/api';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

const formatCurrency = (num) =>
    (num || 0).toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

const CreateSalePage = () => {
    const navigate = useNavigate();
    const [form] = Form.useForm();

    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [loadingOrderNumber, setLoadingOrderNumber] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [calculatedTotals, setCalculatedTotals] = useState({ subTotal: 0, totalAmount: 0 });
    const [lineTotals, setLineTotals] = useState({});

    // ✅ ฟังก์ชันคำนวณยอดรวม
    const calculateTotals = (allValues) => {
        const items = allValues.items || [];
        let subTotal = 0;
        const newLineTotals = {};

        items.forEach((item, index) => {
            const qty = item?.quantity || 0;
            const price = item?.unit_price || 0;
            const discount = item?.discount_per_item || 0;
            const lineTotal = (price - discount) * qty;
            subTotal += lineTotal;
            newLineTotals[index] = lineTotal;
        });

        const discountTotal = allValues.discount || 0;
        const totalAmount = subTotal - discountTotal;

        setCalculatedTotals({ subTotal, totalAmount });
        setLineTotals(newLineTotals);
    };

    // ✅ โหลดข้อมูลเริ่มต้น
    useEffect(() => {
        const loadInitialData = async () => {
            setLoadingProducts(true);
            setLoadingOrderNumber(true);

            try {
                const [productData, orderNumData] = await Promise.all([
                    authorizedFetch('/api/products'),
                    authorizedFetch('/api/generate_order_number'),
                ]);

                setProducts(productData || []);

                const initialValues = {
                    order_number: orderNumData?.orderNumber || '',
                    order_date: dayjs(),
                    channel: 'Facebook',
                    items: [{}],
                };

                form.setFieldsValue(initialValues);
                calculateTotals(initialValues);

            } catch (error) {
                message.error("โหลดข้อมูลเริ่มต้นไม่สำเร็จ!");
            }

            setLoadingProducts(false);
            setLoadingOrderNumber(false);
        };

        loadInitialData();
    }, [form]);

    // ✅ ฟังก์ชันบันทึกข้อมูล
    const onFinish = async (values) => {
        setSubmitting(true);

        if (!values.items || values.items.length === 0) {
            message.error("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ");
            setSubmitting(false);
            return;
        }

        const formatted = {
            ...values,
            order_date: values.order_date?.format('YYYY-MM-DD'),
            shipping_date: values.shipping_date?.format('YYYY-MM-DD'),
        };

        try {
            const result = await authorizedFetch('/api/add_sale', {
                method: 'POST',
                body: JSON.stringify(formatted),
            });

            message.success('สร้างรายการขายสำเร็จ!');
            navigate('/sales');

        } catch (error) {
            message.error(error.message || "เกิดข้อผิดพลาด!");
        }

        setSubmitting(false);
    };

    // ✅ Auto-fill ราคาเมื่อเลือกสินค้า
    const handleProductChange = (productId, fieldName, index) => {
        const product = products.find((p) => p.id === productId);
        if (product) {
            const salePrice = product.sale_price || 0;

            const items = form.getFieldValue('items');
            items[index] = { ...items[index], unit_price: salePrice };

            form.setFieldsValue({ items });
            calculateTotals(form.getFieldsValue());
        }
    };

    // ✅ คัดลอกที่อยู่ลูกค้า → ไปที่อยู่ส่ง
    const copyCustomerAddress = (e) => {
        if (e.target.checked) {
            const address = form.getFieldValue('shipping_address');
            form.setFieldsValue({ shipping_address_override: address });
        }
    };

    // ✅ UI
    return (
        <Spin spinning={loadingProducts || loadingOrderNumber || submitting}>

            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                onValuesChange={(changed, all) => calculateTotals(all)}
            >

                {/* ปุ่มบันทึก */}
                <div style={{ marginBottom: '1rem', textAlign: 'right' }}>
                    <Button type="primary" htmlType="submit" loading={submitting}>
                        บันทึก
                    </Button>
                    <Button style={{ marginLeft: 8 }} onClick={() => navigate('/sales')}>
                        ยกเลิก
                    </Button>
                </div>

                <Row gutter={24}>
                    {/* ---------- ซ้าย ---------- */}
                    <Col xs={24} lg={8}>
                        <Card title="ข้อมูล" size="small" style={{ marginBottom: '1rem' }}>
                            <Form.Item name="order_number" label="รายการ" rules={[{ required: true }]}>
                                <Input readOnly />
                            </Form.Item>
                            <Form.Item name="order_date" label="วันที่" rules={[{ required: true }]}>
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                            </Form.Item>
                            <Form.Item name="channel" label="ช่องทาง">
                                <Select>
                                    <Option value="Facebook">Facebook</Option>
                                    <Option value="TikTok">TikTok</Option>
                                    <Option value="Line">Line</Option>
                                    <Option value="Other">อื่นๆ</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item name="campaign" label="แคมเปญ/อ้างอิง">
                                <Input />
                            </Form.Item>
                        </Card>

                        <Card title="ลูกค้า" size="small">
                            <Form.Item name="customer_name" label="ชื่อ">
                                <Input />
                            </Form.Item>
                            <Form.Item name="customer_phone" label="เบอร์โทร">
                                <Input />
                            </Form.Item>
                            <Form.Item name="customer_email" label="อีเมล">
                                <Input type="email" />
                            </Form.Item>
                            <Form.Item name="shipping_address" label="ที่อยู่ลูกค้า">
                                <TextArea rows={3} />
                            </Form.Item>
                        </Card>
                    </Col>

                    {/* ---------- ขวา ---------- */}
                    <Col xs={24} lg={16}>
                        <Card title="สินค้า" size="small" style={{ marginBottom: '1rem' }}>
                            <Form.List name="items">
                                {(fields, { add, remove }) => (
                                    <>
                                        <Row gutter={8} style={{ marginBottom: 8, color: 'gray' }}>
                                            <Col flex="auto">สินค้า</Col>
                                            <Col style={{ width: 80 }}>จำนวน</Col>
                                            <Col style={{ width: 120 }}>ราคา</Col>
                                            <Col style={{ width: 120 }}>ส่วนลด</Col>
                                            <Col style={{ width: 100, textAlign: 'right' }}>รวม</Col>
                                            <Col style={{ width: 32 }}></Col>
                                        </Row>

                                        {fields.map(({ key, name, ...rest }, index) => (
                                            <Row key={key} gutter={8} style={{ marginBottom: 8 }}>
                                                <Col flex="auto">
                                                    <Form.Item
                                                        {...rest}
                                                        name={[name, 'product_id']}
                                                        rules={[{ required: true }]}
                                                        style={{ marginBottom: 0 }}
                                                    >
                                                        <Select
                                                            showSearch
                                                            placeholder="เลือกสินค้า..."
                                                            optionFilterProp="label"
                                                            loading={loadingProducts}
                                                            onChange={(v) => handleProductChange(v, name, index)}
                                                        >
                                                            {products.map((p) => (
                                                                <Option
                                                                    key={p.id}
                                                                    value={p.id}
                                                                    label={`${p.sku} - ${p.name}`}
                                                                >
                                                                    {`${p.sku} - ${p.name} (${formatCurrency(p.sale_price)})`}
                                                                </Option>
                                                            ))}
                                                        </Select>
                                                    </Form.Item>
                                                </Col>

                                                <Col style={{ width: 80 }}>
                                                    <Form.Item
                                                        {...rest}
                                                        name={[name, 'quantity']}
                                                        rules={[{ required: true }]}
                                                        initialValue={1}
                                                        style={{ marginBottom: 0 }}
                                                    >
                                                        <InputNumber min={1} style={{ width: '100%' }} />
                                                    </Form.Item>
                                                </Col>

                                                <Col style={{ width: 120 }}>
                                                    <Form.Item
                                                        {...rest}
                                                        name={[name, 'unit_price']}
                                                        rules={[{ required: true }]}
                                                        style={{ marginBottom: 0 }}
                                                    >
                                                        <InputNumber min={0} style={{ width: '100%' }} addonAfter="฿" />
                                                    </Form.Item>
                                                </Col>

                                                <Col style={{ width: 120 }}>
                                                    <Form.Item
                                                        {...rest}
                                                        name={[name, 'discount_per_item']}
                                                        initialValue={0}
                                                        style={{ marginBottom: 0 }}
                                                    >
                                                        <InputNumber min={0} style={{ width: '100%' }} addonAfter="฿" />
                                                    </Form.Item>
                                                </Col>

                                                <Col style={{ width: 100, textAlign: 'right', paddingTop: 5 }}>
                                                    {formatCurrency(lineTotals[index])}
                                                </Col>

                                                <Col style={{ width: 32, paddingTop: 5 }}>
                                                    <MinusCircleOutlined
                                                        onClick={() => remove(name)}
                                                        style={{ color: 'red' }}
                                                    />
                                                </Col>
                                            </Row>
                                        ))}

                                        <Form.Item>
                                            <Button
                                                type="dashed"
                                                onClick={() => add()}
                                                block
                                                icon={<PlusOutlined />}
                                            >
                                                เพิ่มสินค้า
                                            </Button>
                                        </Form.Item>
                                    </>
                                )}
                            </Form.List>
                        </Card>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Card
                                    title="ข้อมูลที่อยู่ผู้รับ"
                                    size="small"
                                    style={{ marginBottom: '1rem' }}
                                    extra={<Checkbox onChange={copyCustomerAddress}><CopyOutlined /> คัดลอกจากลูกค้า</Checkbox>}
                                >
                                    <Form.Item name="shipping_address_override" label="ที่อยู่จัดส่ง">
                                        <TextArea rows={3} placeholder="ใช้ที่อยู่เดียวกับลูกค้า" />
                                    </Form.Item>
                                </Card>

                                <Card title="ข้อมูลจัดส่ง" size="small">
                                    <Form.Item name="shipping_date" label="วันที่ส่ง">
                                        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                                    </Form.Item>
                                    <Form.Item name="tracking_number" label="Tracking No.">
                                        <Input />
                                    </Form.Item>
                                </Card>
                            </Col>

                            <Col span={12}>
                                <Card title="สรุปยอด" size="small">
                                    <Row justify="space-between">
                                        <Col>ยอดรวม:</Col>
                                        <Col>{formatCurrency(calculatedTotals.subTotal)}</Col>
                                    </Row>

                                    <Form.Item name="discount" label="ส่วนลดท้ายบิล" initialValue={0}>
                                        <InputNumber style={{ width: '100%' }} min={0} addonAfter="฿" />
                                    </Form.Item>

                                    <Divider />

                                    <Row justify="space-between" style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                                        <Col>ยอดสุทธิ:</Col>
                                        <Col>{formatCurrency(calculatedTotals.totalAmount)}</Col>
                                    </Row>

                                    <Form.Item name="tax" hidden initialValue={0}>
                                        <InputNumber />
                                    </Form.Item>
                                </Card>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </Form>
        </Spin>
    );
};

export default CreateSalePage;
