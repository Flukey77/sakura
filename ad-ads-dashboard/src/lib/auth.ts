import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username?.trim();
        const password = credentials?.password ?? "";
        if (!username || !password) {
          throw new Error("กรอกชื่อผู้ใช้และรหัสผ่าน");
        }

        // หา user ด้วย username
        const user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user?.hashedPassword) {
          throw new Error("ไม่พบผู้ใช้ หรือยังไม่ได้ตั้งรหัสผ่าน");
        }

        const ok = await bcrypt.compare(password, user.hashedPassword);
        if (!ok) throw new Error("รหัสผ่านไม่ถูกต้อง");

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = (user as any).id;
      const userId = (token.id as string) || (user as any)?.id;
      if (userId) {
        const sub = await prisma.subscription.findUnique({ where: { userId } });
        (token as any).subscriptionStatus = sub?.status ?? "INACTIVE";
      }
      return token;
    },
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
