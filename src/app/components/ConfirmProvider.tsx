// src/app/components/ConfirmProvider.tsx
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

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** ใช้ในหน้า/คอมโพเนนต์: const confirm = useConfirm(); await confirm({...}) */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within <ConfirmProvider>");
  }
  return ctx;
}

export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({});
  const resolverRef = useRef<((v: boolean) => void) | null>(null);
  const okButtonRef = useRef<HTMLButtonElement | null>(null);

  // กัน hydration mismatch: modal จะ render ได้หลัง mount เท่านั้น
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // หยุด scroll พื้นหลังตอนเปิดโมดัล
  useEffect(() => {
    if (!mounted) return;
    const original = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open, mounted]);

  // โฟกัสปุ่ม OK เมื่อเปิด
  useEffect(() => {
    if (open) {
      queueMicrotask(() => okButtonRef.current?.focus());
    }
  }, [open]);

  const safeResolve = useCallback((value: boolean) => {
    if (resolverRef.current) {
      resolverRef.current(value);
      resolverRef.current = null;
    }
  }, []);

  const confirm = useCallback<ConfirmFn>((options) => {
    // กัน re-entry: ถ้ามี dialog ค้างอยู่ resolve เป็น false ก่อน
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
    setOpts(options ?? {});
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    setOpen(false);
    safeResolve(result);
  }, [safeResolve]);

  // ปิดด้วยคีย์บอร์ด (Escape)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // cleanup กรณี Provider ถูก unmount ขณะมี promise ค้าง
  useEffect(() => {
    return () => safeResolve(false);
  }, [safeResolve]);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}

      {mounted && open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          className="fixed inset-0 z-[1000] grid place-items-center"
        >
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={() => close(false)}
          />
          {/* modal */}
          <div
            className="relative w-[92vw] max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-black/5"
            role="document"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                close(true);
              }}
            >
              <div className="p-5">
                {opts.title ? (
                  <h3 id="confirm-title" className="text-base font-semibold text-slate-900">
                    {opts.title}
                  </h3>
                ) : null}
                {opts.message ? (
                  <div className="mt-2 text-sm text-slate-600">{opts.message}</div>
                ) : null}
              </div>

              <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
                <button
                  type="button"
                  className="rounded-xl border px-4 py-2 text-slate-700 hover:bg-slate-50"
                  onClick={() => close(false)}
                >
                  {opts.cancelText ?? "ยกเลิก"}
                </button>
                <button
                  type="submit"
                  ref={okButtonRef}
                  className={`rounded-xl px-4 py-2 text-white ${
                    opts.danger
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-slate-900 hover:bg-slate-800"
                  }`}
                >
                  {opts.okText ?? "ตกลง"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
