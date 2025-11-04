import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN?.toLowerCase();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  // ✅ ใช้ JWT แทน database sessions
  session: { strategy: "jwt" },

  pages: { signIn: "/login" },

  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("กรอกอีเมลและรหัสผ่าน");
        }
        const email = credentials.email.toLowerCase().trim();
        if (allowedDomain && !email.endsWith(`@${allowedDomain}`)) {
          throw new Error(`อนุญาตเฉพาะโดเมน @${allowedDomain}`);
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.hashedPassword) throw new Error("ไม่พบผู้ใช้หรือยังไม่ได้ตั้งรหัสผ่าน");

        const ok = await bcrypt.compare(credentials.password, user.hashedPassword);
        if (!ok) throw new Error("รหัสผ่านไม่ถูกต้อง");

        return { id: user.id, email: user.email, name: user.name } as any;
      },
    }),
  ],

  callbacks: {
    // แนบข้อมูลลงใน JWT
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
      }
      const userId = (token.id as string) || (user as any)?.id;
      if (userId) {
        const sub = await prisma.subscription.findUnique({ where: { userId } });
        (token as any).subscriptionStatus = sub?.status ?? "INACTIVE";
      }
      return token;
    },

    // แปลงจาก JWT -> session
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).subscriptionStatus =
          (token as any).subscriptionStatus ?? "INACTIVE";
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
