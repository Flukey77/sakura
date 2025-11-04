"use client";

import { useEffect, useState } from "react";

type Props = {
  type: "success" | "error" | "info";
  message: string | null;
  /** อัตโนมัติซ่อนใน ms (ใส่ 0 = ไม่ซ่อนเอง) */
  autoHideMs?: number;
};

export default function Banner({ type, message, autoHideMs = 2500 }: Props) {
  const [show, setShow] = useState(!!message);

  useEffect(() => {
    setShow(!!message);
    if (message && autoHideMs > 0) {
      const t = setTimeout(() => setShow(false), autoHideMs);
      return () => clearTimeout(t);
    }
  }, [message, autoHideMs]);

  if (!show || !message) return null;

  const color =
    type === "success"
      ? "bg-green-600"
      : type === "error"
      ? "bg-red-600"
      : "bg-gray-800";

  return (
    <div className="fixed left-1/2 top-4 z-[1000] -translate-x-1/2">
      <div
        className={`${color} text-white rounded-md shadow-lg px-4 py-2 text-sm`}
        role="alert"
      >
        {message}
      </div>
    </div>
  );
}
