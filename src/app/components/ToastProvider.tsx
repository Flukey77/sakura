"use client";

import React, { createContext, useContext } from "react";

type Variant = "success" | "error" | "info";

type ToastAPI = {
  show: (o: { title?: string; description?: string; variant?: Variant }) => void;
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
};

const ToastCtx = createContext<ToastAPI | null>(null);

export default function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const api: ToastAPI = {
    show({ title, description, variant = "info" }) {
      if (typeof window === "undefined") return;
      alert(
        `${title ?? variant.toUpperCase()}${
          description ? `\n${description}` : ""
        }`
      );
    },
    success(msg) {
      if (typeof window !== "undefined") alert(msg);
    },
    error(msg) {
      if (typeof window !== "undefined") alert(msg);
    },
    info(msg) {
      if (typeof window !== "undefined") alert(msg);
    },
  };

  return <ToastCtx.Provider value={api}>{children}</ToastCtx.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastCtx);

  const noop: ToastAPI = {
    show: () => {},
    success: () => {},
    error: () => {},
    info: () => {},
  };

  const api = ctx ?? noop;
  return Object.assign({ toast: api }, api);
}

