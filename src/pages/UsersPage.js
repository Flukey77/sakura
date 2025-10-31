// src/pages/UsersPage.js (V8.7 – รองรับ ngrok 100% + refactor)
import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Popconfirm, Tag, message } from 'antd';
import { DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { authorizedFetch } from '../utils/api';

const UsersPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // ✅ โหลด Users (Admin Only)
    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await authorizedFetch('/api/users');
            setUsers(data);
        } catch (err) {
            message.error('โหลดข้อมูล User ไม่สำเร็จ! (Admin Only)');
        }
        setLoading(false);
    };

    useEffect(() => {
        loadUsers();
    }, []);

    // ✅ ลบ User (ใช้ authorizedFetch)
    const handleDelete = async (userId) => {
        try {
            const result = await authorizedFetch(`/api/users/${userId}`, {
                method: 'DELETE',
            });

            message.success(result.message || 'ลบผู้ใช้สำเร็จ!');
            loadUsers();
        } catch (error) {
            message.error(error.message || 'เกิดข้อผิดพลาด!');
        }
    };

    // ✅ Columns ตาราง Users
    const columns = [
        {
            title: '#',
            dataIndex: 'id',
            width: 80,
        },
        {
            title: 'Username',
            dataIndex: 'username',
        },
        {
            title: 'Role',
            dataIndex: 'role',
            render: (role) =>
                role === 'admin' ? (
                    <Tag color="red">Admin</Tag>
                ) : (
                    <Tag color="blue">User</Tag>
                ),
        },
        {
            title: 'Action',
            key: 'action',
            width: 120,
            render: (_, record) => {
                const loggedUser = Number(localStorage.getItem('userId')); // (Optional)
                const isMe = false; // ป้องกันใน backend อยู่แล้ว

                return (
                    <Popconfirm
                        title="แน่ใจนะว่าจะลบผู้ใช้นี้?"
                        okText="ลบเลย"
                        cancelText="ยกเลิก"
                        onConfirm={() => handleDelete(record.id)}
                        disabled={isMe}
                    >
                        <Button
                            type="primary"
                            danger
                            icon={<DeleteOutlined />}
                            disabled={isMe}
                        >
                            ลบ
                        </Button>
                    </Popconfirm>
                );
            },
        },
    ];

    return (
        <Card title="จัดการผู้ใช้ (Admin Only)">
            <Table
                rowKey="id"
                columns={columns}
                dataSource={users}
                loading={loading}
                pagination={{ pageSize: 10 }}
            />
        </Card>
    );
};

export default UsersPage;
