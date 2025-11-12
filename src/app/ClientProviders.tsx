// src/app/components/ConfirmProvider.tsx
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

// ---- types ----
type ConfirmAPI = {
  confirm: (opts: {
    title?: string;
    message?: React.ReactNode;
    okText?: string;
    cancelText?: string;
    danger?: boolean;
  }) => Promise<boolean>;
};

// context (อย่าตั้งชื่อชนกับ type)
const ConfirmContext = createContext<ConfirmAPI | null>(null);

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

  const confirm = useCallback<ConfirmAPI["confirm"]>((opts) => {
    // ถ้ารันฝั่ง server ให้อนุญาตไปก่อนกันพัง
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
  }, []);

  const api = useMemo<ConfirmAPI>(() => ({ confirm }), [confirm]);

  const close = (id: number, ok: boolean) => {
    setQueue((q) => {
      const cur = q.find((x) => x.id === id);
      cur?.resolve(ok);
      return q.filter((x) => x.id !== id);
    });
  };

  return (
    <ConfirmContext.Provider value={api}>
      {children}

      {/* modal stack */}
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
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  // fallback กันพังหากลืมห่อ Provider (จะใช้ window.confirm)
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
        const msg =
          (o.title ? o.title + "\n" : "") +
          (typeof o.message === "string" ? o.message : "");
        return window.confirm(msg || "ยืนยันการทำรายการ?");
      },
    } as ConfirmAPI;
  }
  return ctx;
}
