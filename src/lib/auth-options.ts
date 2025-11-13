// src/lib/auth-options.ts
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
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
          where: { username: creds.username.trim() },
        });
        if (!user) return null;

        const ok = await compare(creds.password, user.password);
        if (!ok) return null;

        // ใส่เฉพาะฟิลด์ที่จำเป็นลง session/jwt
        return {
          id: user.id,
          name: user.name ?? user.username,
          username: user.username,
          role: user.role,
        } as any;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id as string;
        (token as any).username = (user as any).username;
        (token as any).role = (user as any).role;
        token.name = user.name ?? (user as any).username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = (token as any).username;
        (session.user as any).role = (token as any).role;
      }
      return session;
    },
  },
};
