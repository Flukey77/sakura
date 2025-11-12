// src/app/ClientProviders.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import ToastProvider from '@/app/components/ToastProvider';
import ConfirmProvider from '@/app/components/ConfirmProvider';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
