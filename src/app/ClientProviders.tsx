"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type Ctx = {
  confirm: (opts: {
    title?: string;
    message?: React.ReactNode;
    okText?: string;
    cancelText?: string;
    danger?: boolean;
  }) => Promise<boolean>;
};

const Ctx = createContext<Ctx | null>(null);

export default function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<
    Array<
      {
        id: number;
        title?: string;
        message?: React.ReactNode;
        okText?: string;
        cancelText?: string;
        danger?: boolean;
      } & { resolve: (v: boolean) => void }
    >
  >([]);
  const idRef = useRef(1);

  const confirm = useCallback(
    (opts: {
      title?: string;
      message?: React.ReactNode;
      okText?: string;
      cancelText?: string;
      danger?: boolean;
    }) => {
      // ถ้าไม่มี window (SSR) ให้ fallback อนุญาตไปก่อน จะได้ไม่พัง
      if (typeof window === "undefined") return Promise.resolve(true);

      return new Promise<boolean>((resolve) => {
        setQueue((q) => [
          ...q,
          {
            id: idRef.current++,
            resolve,
            ...opts,
          },
        ]);
      });
    },
    []
  );

  const api = useMemo<Ctx>(() => ({ confirm }), [confirm]);

  const close = (id: number, ok: boolean) => {
    setQueue((q) => {
      const cur = q.find((x) => x.id === id);
      cur?.resolve(ok);
      return q.filter((x) => x.id !== id);
    });
  };

  return (
    <Ctx.Provider value={api}>
      {children}

      {/* Modal stack */}
      {queue.map((d) => (
        <div
          key={d.id}
          className="fixed inset-0 z-[200] grid place-items-center bg-black/30 p-4"
          onClick={() => close(d.id, false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              {d.title && <div className="text-lg font-semibold">{d.title}</div>}
              {d.message && <div className="mt-2 text-slate-600">{d.message}</div>}
            </div>
            <div className="flex justify-end gap-2 border-t p-3">
              <button className="btn" onClick={() => close(d.id, false)}>
                {d.cancelText ?? "ยกเลิก"}
              </button>
              <button
                className={`btn ${d.danger ? "btn-dark" : "btn-primary"}`}
                onClick={() => close(d.id, true)}
              >
                {d.okText ?? "ตกลง"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </Ctx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(Ctx);
  // FALLBACK: ถ้าเผลอเรียกนอก Provider ให้ใช้ window.confirm แทน (จะไม่พังหน้า)
  if (!ctx) {
    return {
      confirm: async (o: {
        title?: string;
        message?: React.ReactNode;
        okText?: string;
        cancelText?: string;
        danger?: boolean;
      }) => {
        if (typeof window === "undefined") return true;
        // แปลง message เป็น string คร่าว ๆ
        const msg =
          (o.title ? o.title + "\n" : "") +
          (typeof o.message === "string" ? o.message : "");
        return window.confirm(msg || "ยืนยันการทำรายการ?");
      },
    };
  }
  return ctx;
}
