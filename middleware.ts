import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const path = req.nextUrl.pathname;
      if (!token) return false;
      if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
        return (token as any).role === 'ADMIN';
      }
      return true;
    },
  },
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/sales/:path*',
    '/products/:path*',
    '/reports/:path*',
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
