"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ConfirmOptions = {
  title?: ReactNode;
  message?: ReactNode;
  okText?: string;
  cancelText?: string;
  /** ปุ่มยืนยันโทนแดง (เช่น ลบ/กู้คืนแบบ force) */
  danger?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** ใช้ในหน้า/คอมโพเนนต์: const confirm = useConfirm(); await confirm({...}) */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // ช่วยให้ error ชัดเจนถ้าเผลอใช้โดยไม่ครอบด้วย Provider
    throw new Error("useConfirm must be used within <ConfirmProvider>");
  }
  return ctx;
}

export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({});
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  // กัน hydration mismatch: modal จะ render ได้หลัง mount เท่านั้น
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options ?? {});
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    // ปิด modal + resolve promise
    setOpen(false);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  // ปิดด้วยคีย์บอร์ด
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const value = useMemo(() => confirm, [confirm]);

  // ไม่ต้อง render modal ระหว่าง SSR
  return (
    <ConfirmContext.Provider value={value}>
      {children}

      {mounted && open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[1000] grid place-items-center"
        >
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={() => close(false)}
          />
          {/* modal */}
          <div className="relative w-[92vw] max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
            <div className="p-5">
              {opts.title ? (
                <h3 className="text-base font-semibold text-slate-900">
                  {opts.title}
                </h3>
              ) : null}
              {opts.message ? (
                <div className="mt-2 text-sm text-slate-600">{opts.message}</div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
              <button
                className="rounded-xl border px-4 py-2 text-slate-700 hover:bg-slate-50"
                onClick={() => close(false)}
              >
                {opts.cancelText ?? "ยกเลิก"}
              </button>
              <button
                className={`rounded-xl px-4 py-2 text-white ${
                  opts.danger
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-slate-900 hover:bg-slate-800"
                }`}
                onClick={() => close(true)}
                autoFocus
              >
                {opts.okText ?? "ตกลง"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
