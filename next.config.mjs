/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // ให้ build เร็วขึ้น แต่ยังคงตรวจ TS ใน IDE
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },

  // แนะนำสำหรับ Render เพื่อได้ไฟล์รันแบบ standalone
  output: "standalone",
  experimental: { forceSwcTransforms: true },

  poweredByHeader: false,
  compress: true,

  // เฮดเดอร์ความปลอดภัยพื้นฐาน (ยังไม่ใส่ CSP เพื่อเลี่ยงปัญหา assets)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" }
        ]
      }
    ];
  }
};

export default nextConfig;
