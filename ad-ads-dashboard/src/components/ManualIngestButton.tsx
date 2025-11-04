'use client';

import { useState } from "react";

export default function ManualIngestButton({
  endpoints,
  label = "ดึงข้อมูลวันนี้ (manual)",
}: {
  endpoints: string[];
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      for (const ep of endpoints) {
        await fetch(ep, { method: "POST" });
      }
      // รีโหลดหน้าเหมือนเดิม
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded bg-black text-white px-4 py-2 disabled:opacity-60"
      disabled={loading}
    >
      {loading ? "กำลังดึงข้อมูล…" : label}
    </button>
  );
}
