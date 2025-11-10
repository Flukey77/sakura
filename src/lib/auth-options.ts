import type { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import prisma from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: { username: {}, password: {} },
      async authorize(creds) {
        if (!creds?.username || !creds?.password) return null;
        const user = await prisma.user.findUnique({ where: { username: creds.username } });
        if (!user) return null;
        const ok = await compare(creds.password, user.password);
        if (!ok) return null;
        return { id: user.id, name: user.name, username: user.username, role: user.role } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // ใส่ role/username ลง token ด้วย (เอาไว้ให้ middleware/read-only UI ใช้)
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.username = (user as any).username;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = (token as any).role;
        (session.user as any).username = (token as any).username;
      }
      return session;
    },
  },
};

