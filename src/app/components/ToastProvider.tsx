"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type Variant = "success" | "error" | "info";

type ToastInput = { title?: string; description?: string; variant?: Variant; durationMs?: number };
type Toast = Required<ToastInput> & { id: number };

type ToastAPI = {
  show: (o: ToastInput) => void;
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
};

const ToastCtx = createContext<ToastAPI | null>(null);

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(1);

  const remove = useCallback((id: number) => {
    setToasts((arr) => arr.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((input: ToastInput) => {
    const id = idRef.current++;
    const t: Toast = {
      id,
      title: input.title ?? "",
      description: input.description ?? "",
      variant: input.variant ?? "info",
      durationMs: input.durationMs ?? 3500,
    };
    setToasts((arr) => [...arr, t]);
    // auto dismiss
    if (t.durationMs > 0) {
      window.setTimeout(() => remove(id), t.durationMs);
    }
  }, [remove]);

  const api: ToastAPI = useMemo(
    () => ({
      show: push,
      success: (msg: string) => push({ variant: "success", title: msg }),
      error:   (msg: string) => push({ variant: "error",   title: msg }),
      info:    (msg: string) => push({ variant: "info",    title: msg }),
    }),
    [push]
  );

  const color = (v: Variant) =>
    v === "success"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : v === "error"
      ? "bg-rose-50 text-rose-800 border-rose-200"
      : "bg-slate-50 text-slate-800 border-slate-200";

  return (
    <ToastCtx.Provider value={api}>
      {children}

      {/* Container */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-3 z-[100] mx-auto flex max-w-lg flex-col gap-2 px-3"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-enter pointer-events-auto rounded-2xl border px-4 py-3 shadow-sm ${color(t.variant)}`}
            role="status"
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0">
                {t.title && <div className="font-medium">{t.title}</div>}
                {t.description && (
                  <div className="mt-0.5 text-sm text-slate-600">{t.description}</div>
                )}
              </div>
              <button
                aria-label="Close"
                onClick={() => remove(t.id)}
                className="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-black/5"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  // fallback เงียบ ๆ ถ้า provider ยังไม่ถูก mount
  const noop: ToastAPI = { show: () => {}, success: () => {}, error: () => {}, info: () => {} };
  const api = ctx ?? noop;
  return Object.assign({ toast: api }, api);
}
