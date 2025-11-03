import React from "react";

const IcReport = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 3h18v18H3z"/><path d="M7 14l3-3 2 2 4-4 1 1"/>
  </svg>
);
const IcAdd = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>
  </svg>
);
const IcProducts = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
);
const IcShipping = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7h13v10H3z"/><path d="M16 10h4l1 3v4h-5z"/><circle cx="7.5" cy="18" r="1.5"/><circle cx="17.5" cy="18" r="1.5"/>
  </svg>
);

export default function App() {
  const year = new Date().getFullYear();
  return (
    <>
      <a href="#content" className="skip-link">ข้ามไปยังเนื้อหา</a>

      <header className="site-header">
        <div className="container row">
          <strong className="brand">ระบบจัดการ</strong>
        </div>
      </header>

      <main id="content" className="container">
        <h1 className="page-title">เมนูหลัก</h1>

        <nav className="menu-grid" aria-label="เมนูหลัก">
          <a className="menu-card" href="#report">
            <span className="menu-icon" aria-hidden="true"><IcReport /></span>
            <span className="menu-text">
              <span className="menu-title">รายงาน (Overview)</span>
              <span className="menu-desc">ดูภาพรวมการขาย</span>
            </span>
          </a>

          <a className="menu-card" href="#create">
            <span className="menu-icon" aria-hidden="true"><IcAdd /></span>
            <span className="menu-text">
              <span className="menu-title">สร้างรายการขาย</span>
              <span className="menu-desc">บันทึกการขายใหม่</span>
            </span>
          </a>

          <a className="menu-card" href="#products">
            <span className="menu-icon" aria-hidden="true"><IcProducts /></span>
            <span className="menu-text">
              <span className="menu-title">ดูสินค้า</span>
              <span className="menu-desc">คลังสินค้า/ปรับสต็อก</span>
            </span>
          </a>

          <a className="menu-card" href="#shipping">
            <span className="menu-icon" aria-hidden="true"><IcShipping /></span>
            <span className="menu-text">
              <span className="menu-title">ศูนย์ขนส่ง</span>
              <span className="menu-desc">ติดตาม/สร้างพัสดุ</span>
            </span>
          </a>
        </nav>
      </main>

      <footer className="site-footer container">
        <small>© {year} Your Company</small>
      </footer>
    </>
  );
}
