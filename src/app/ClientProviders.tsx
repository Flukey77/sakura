"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import ToastProvider from "@/app/components/ToastProvider";
import ConfirmProvider from "@/app/components/ConfirmProvider";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
