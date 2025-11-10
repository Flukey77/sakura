// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// ใช้ Node runtime (หลีกเลี่ยงปัญหา edge + bcrypt)
export const runtime = "nodejs";

// ป้องกัน Hot Reload เปิด Prisma หลายครั้งในโหมด dev
const globalForPrisma = global as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.username || !creds?.password) return null;

        const user = await prisma.user.findUnique({
          where: { username: creds.username },
        });
        if (!user) return null;

        const ok = await bcrypt.compare(creds.password, user.password);
        if (!ok) return null;

        // ควร return เฉพาะข้อมูลที่จำเป็น (อย่าใส่ password)
        return {
          id: user.id,
          name: user.name ?? user.username,
          username: user.username,
          role: user.role,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      // เวลา login ครั้งแรก user จะมีค่า → ยัดลง token
      if (user) {
        (token as any).id = (user as any).id;
        (token as any).role = (user as any).role;
        (token as any).username = (user as any).username;
      }
      return token;
    },
    async session({ session, token }) {
      // ดันค่าจาก token ลง session.user
      if (session.user) {
        (session.user as any).id = (token as any).id;
        (session.user as any).role = (token as any).role;
        (session.user as any).username = (token as any).username;
      }
      return session;
    },
  },
};

// ตัว Handler สำหรับ App Router (ส่งออกเป็น GET/POST)
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
