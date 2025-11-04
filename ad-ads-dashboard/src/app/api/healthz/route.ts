// บังคับให้ route นี้ทำงานบน Node.js runtime (ไม่ใช่ Edge)
export const runtime = 'nodejs'

// บังคับให้ route นี้ทำงานแบบ dynamic เสมอ (ห้าม pre-render หรือ cache)
// สำคัญมากสำหรับ health check
export const dynamic = 'force-dynamic'

/**
 * Health check endpoint สำหรับ Render
 * Render จะเรียก API นี้เพื่อตรวจสอบว่า service ของคุณยังทำงานปกติหรือไม่
 */
export async function GET() {
  try {
    // ในอนาคต คุณสามารถเพิ่มการตรวจสอบอื่นๆ ที่นี่ได้ เช่น:
    // - การเชื่อมต่อฐานข้อมูล (เช่น prisma.$queryRaw`SELECT 1`)
    // - การเชื่อมต่อ Redis
    
    // ถ้าทุกอย่างปกติ ส่ง 'ok' พร้อม status 200
    return new Response('ok', { status: 200 })
  } catch (error) {
    // ถ้ามีปัญหา (เช่น database เชื่อมต่อไม่ได้)
    console.error("Health check failed:", error);
    return new Response(JSON.stringify({ status: 'error', message: (error as Error).message }), { 
      status: 503, // Service Unavailable
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
