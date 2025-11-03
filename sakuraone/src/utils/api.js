// src/utils/api.js
import { message } from 'antd';

const API_BASE_URL = ''; // สำคัญมาก! ใช้ relative path

export const authorizedFetch = async (endpoint, options = {}) => {

    const token = localStorage.getItem('jwtToken');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers: headers,
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        if (response.status === 401 || response.status === 403) {
            message.error('เซสชั่นหมดอายุ กรุณาล็อกอินใหม่');
            localStorage.clear();
            window.location.href = '/login';
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'API Error');
        }

        if (response.status === 204) {
            return null;
        }

        return await response.json();

    } catch (error) {
        console.error('[authorizedFetch Error]:', error.message);
        throw error;
    }
};
