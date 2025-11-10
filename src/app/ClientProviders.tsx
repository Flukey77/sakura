'use client';

import { SessionProvider } from 'next-auth/react';
import ToastProvider from '@/app/components/ToastProvider';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}

