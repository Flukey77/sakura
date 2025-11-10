"use client";
import { useState } from "react";

export default function DebugPage() {
  const [status, setStatus] = useState<string>("idle");

  async function send() {
    setStatus("sending");
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docNo: "SO-TEST-001",
          date: new Date().toISOString().slice(0, 10),
          note: "debug",
          items: [{ productId: "dummy", qty: 1, price: 100 }],
        }),
      });
      const data = await res.json();
      setStatus(`${res.status}: ${JSON.stringify(data)}`);
      alert("POST done, ดู console / network");
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }

  return (
    <div className="p-6 space-y-3">
      <h1>DEBUG POST /api/sales</h1>
      <button className="btn btn-primary" onClick={send}>SEND</button>
      <div>status: {status}</div>
    </div>
  );
}

