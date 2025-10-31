// src/pages/RegisterPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message } from 'antd';

const { Title } = Typography;

const RegisterPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const BACKEND_URL = window.location.origin;

    const handleRegister = async () => {
        setLoading(true);

        try {
            const response = await fetch(`${BACKEND_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                message.success('สร้างบัญชีสำเร็จ! กรุณาล็อกอิน');
                navigate('/login');
            } else {
                message.error(data.message || 'การลงทะเบียนล้มเหลว');
            }

        } catch (error) {
            message.error('เชื่อมต่อ Server (API) ไม่ได้');
        }

        setLoading(false);
    };

    return (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', background:'#f0f2f5' }}>
            <Card style={{ width:400 }}>
                <Title level={3} style={{ textAlign:'center' }}>สร้างบัญชีผู้ใช้ใหม่</Title>

                <Form layout="vertical" onFinish={handleRegister}>
                    <Form.Item label="Username" name="username" rules={[{ required:true }]}>
                        <Input value={username} onChange={(e)=>setUsername(e.target.value)} />
                    </Form.Item>

                    <Form.Item label="Password" name="password" rules={[{ required:true }]}>
                        <Input.Password value={password} onChange={(e)=>setPassword(e.target.value)} />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} style={{ width:'100%' }}>
                            Register
                        </Button>
                    </Form.Item>

                    <div style={{ textAlign:'center' }}>
                        มีบัญชีแล้ว? <Link to="/login">เข้าสู่ระบบที่นี่</Link>
                    </div>
                </Form>
            </Card>
        </div>
    );
};

export default RegisterPage;
