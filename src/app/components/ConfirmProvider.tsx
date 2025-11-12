"use client";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type ConfirmInput = {
  title?: string;
  message?: React.ReactNode;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
};

type Ctx = { confirm(input: ConfirmInput): Promise<boolean> };

const ConfirmCtx = createContext<Ctx | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx.confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmInput>({});
  const [resolver, setResolver] = useState<(v: boolean) => void>(() => () => {});

  const confirm = useCallback((input: ConfirmInput) => {
    setOpts(input);
    setOpen(true);
    return new Promise<boolean>((resolve) => setResolver(() => resolve));
  }, []);

  const close = useCallback(
    (ok: boolean) => {
      setOpen(false);
      resolver(ok);
    },
    [resolver]
  );

  const ctx = useMemo<Ctx>(() => ({ confirm }), [confirm]);

  return (
    <ConfirmCtx.Provider value={ctx}>
      {children}
      {open &&
        createPortal(
          <div aria-modal role="dialog" className="fixed inset-0 z-[1000] grid place-items-center">
            {/* overlay */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => close(false)} />
            {/* dialog */}
            <div className="relative w-[92vw] max-w-md rounded-2xl bg-white shadow-2xl border">
              <div className="px-5 pt-5">
                <h3 className="text-lg font-semibold text-slate-900">
                  {opts.title ?? "ยืนยันการทำรายการ"}
                </h3>
                {opts.message && (
                  <div className="mt-2 text-slate-600 text-sm leading-6">{opts.message}</div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-4">
                <button
                  className="px-4 py-2 rounded-xl border bg-white hover:bg-slate-50"
                  onClick={() => close(false)}
                >
                  {opts.cancelText ?? "ยกเลิก"}
                </button>
                <button
                  className={
                    "px-4 py-2 rounded-xl text-white " +
                    (opts.danger ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700")
                  }
                  onClick={() => close(true)}
                >
                  {opts.okText ?? "ตกลง"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ConfirmCtx.Provider>
  );
}
