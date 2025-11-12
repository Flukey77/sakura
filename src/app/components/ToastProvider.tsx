// src/app/components/ToastProvider.tsx
'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Variant = 'success' | 'error' | 'info' | 'warning';

type ToastItem = {
  id: string;
  title?: string;
  description?: string;
  variant: Variant;
  duration: number;
};

type ToastAPI = {
  show: (o: { title?: string; description?: string; variant?: Variant; duration?: number }) => void;
  success: (msg: string, duration?: number) => void;
  error: (msg: string, duration?: number) => void;
  info: (msg: string, duration?: number) => void;
  warning: (msg: string, duration?: number) => void;
};

const ToastCtx = createContext<ToastAPI | null>(null);

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (payload: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const item: ToastItem = { id, ...payload };
      setItems((prev) => [...prev, item]);
      // auto dismiss
      const t = setTimeout(() => remove(id), item.duration);
      return () => clearTimeout(t);
    },
    [remove]
  );

  const show: ToastAPI['show'] = ({ title, description, variant = 'info', duration = 2200 }) => {
    push({ title, description, variant, duration });
  };

  const success: ToastAPI['success'] = (msg, duration = 2000) => show({ title: msg, variant: 'success', duration });
  const error: ToastAPI['error'] = (msg, duration = 2600) => show({ title: msg, variant: 'error', duration });
  const info: ToastAPI['info'] = (msg, duration = 2200) => show({ title: msg, variant: 'info', duration });
  const warning: ToastAPI['warning'] = (msg, duration = 2400) => show({ title: msg, variant: 'warning', duration });

  const api: ToastAPI = { show, success, error, info, warning };

  // ปิดด้วยคีย์ ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setItems([]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <ToastCtx.Provider value={api}>
      {children}

      {/* กลางจอเสมอ */}
      <div className="pointer-events-none fixed inset-0 z-[1000] grid place-items-center p-4">
        <div className="flex w-full max-w-md flex-col items-stretch gap-3">
          {items.map((it) => {
            const tone =
              it.variant === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : it.variant === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : it.variant === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-slate-200 bg-white text-slate-800';

            return (
              <div
                key={it.id}
                role="status"
                className={[
                  'pointer-events-auto w-full rounded-2xl border px-4 py-3 shadow-lg',
                  'toast-enter',
                  tone,
                ].join(' ')}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    {it.title && <div className="font-medium text-center">{it.title}</div>}
                    {it.description && (
                      <div className="mt-0.5 text-sm text-slate-600 text-center">{it.description}</div>
                    )}
                  </div>
                  <button
                    onClick={() => remove(it.id)}
                    className="ml-2 rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-black/5"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  const noop: ToastAPI = {
    show: () => {},
    success: () => {},
    error: () => {},
    info: () => {},
    warning: () => {},
  };
  const api = ctx ?? noop;
  // ให้ใช้ได้ทั้งรูปแบบ: const { toast } = useToast(); toast.success(...)
  // หรือใช้ตรง ๆ: const t = useToast(); t.success(...)
  return Object.assign({ toast: api }, api);
}
