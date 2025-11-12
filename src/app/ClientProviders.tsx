// src/app/ClientProviders.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import ConfirmProvider from "@/app/components/ConfirmProvider";
import ToastProvider from "@/app/components/ToastProvider";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <ConfirmProvider>
        <ToastProvider>{children}</ToastProvider>
      </ConfirmProvider>
    </SessionProvider>
  );
}
