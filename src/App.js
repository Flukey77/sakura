// src/App.js (โค้ดเต็ม V7.5 - แก้บั๊ก)
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// "เรียก" Layout และ หน้าเว็บทั้งหมด
// (ถ้ายัง Error... ให้เช็คว่าไฟล์พวกนี้อยู่ในโฟลเดอร์ src/pages/ จริงๆ)
import MainLayout from './components/MainLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage'; 
import DashboardPage from './pages/DashboardPage';   
import OverviewPage from './pages/OverviewPage';     
import SalesPage from './pages/SalesPage';

// ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
//  บั๊กอยู่ที่นี่! pagesS -> pages
// ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
import CreateSalePage from './pages/CreateSalePage'; 
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

import ProductsPage from './pages/ProductsPage'; 
import UsersPage from './pages/UsersPage'; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ทางที่ 1: "หน้าสาธารณะ" (Public) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} /> 

        {/* ทางที่ 2: "หน้าส่วนตัว" (Private) - ห่อด้วย MainLayout */}
        <Route path="/" element={<MainLayout />}>
          
          <Route index element={<DashboardPage />} /> 
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="overview" element={<OverviewPage />} /> 
          
          <Route path="sales" element={<SalesPage />} />
          <Route path="sales/create" element={<CreateSalePage />} />
          
          <Route path="products" element={<ProductsPage />} />
          <Route path="users" element={<UsersPage />} />
        </Route>
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;