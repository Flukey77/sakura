// src/pages/LoginPage.js
import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';

const LoginPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // ✅ จุดสำคัญที่สุด!
    const BACKEND_URL = window.location.origin; 
    // เมื่อรันผ่าน ngrok = https://xxx.ngrok-free.app

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/login`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            });

            const result = await response.json();

            if (response.ok) {
                message.success('ล็อกอินสำเร็จ!');
                localStorage.setItem('jwtToken', result.token);
                localStorage.setItem('username', result.username);
                localStorage.setItem('role', result.role);
                navigate('/dashboard');
            } else {
                message.error(result.message);
            }

        } catch (error) {
            message.error('การเชื่อมต่อล้มเหลว! (API อาจปิดอยู่)');
        }
        setLoading(false);
    };

    return (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#f0f2f5' }}>
            <Card title="Sakura Biotech Co., Ltd. - Login" style={{ width: 400 }}>
                <Form name="login_form" onFinish={onFinish}>
                    <Form.Item name="username" rules={[{ required: true, message: 'กรุณากรอก Username!' }]}>
                        <Input prefix={<UserOutlined />} placeholder="Username" />
                    </Form.Item>

                    <Form.Item name="password" rules={[{ required: true, message: 'กรุณากรอก Password!' }]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="Password" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} style={{ width:'100%' }}>
                            Login
                        </Button>
                    </Form.Item>

                    <div style={{ textAlign:'center' }}>
                        ไม่มีบัญชี? <Link to="/register">Register ที่นี่</Link>
                    </div>
                </Form>
            </Card>
        </div>
    );
};

export default LoginPage;
