/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ถ้าคุณใช้ Server Actions และต้องจำกัด origin ไว้ ก็ใส่ได้ที่นี่
  experimental: {
    serverActions: {
      // ใส่โดเมนที่อนุญาต เรียงตามที่ใช้จริง
      allowedOrigins: ["localhost:3000", ".onrender.com"],
    },
  },
};

module.exports = nextConfig;
