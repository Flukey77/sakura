// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

// ใช้ Node runtime เพื่อให้ bcryptjs ทำงานถูกกับ App Router
export const runtime = "nodejs";

// ห้าม export อะไรอื่นนอกจาก handler ของ HTTP methods
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
