// src/app/error.tsx
'use client';
export default function GlobalError({ error }: { error: Error }) {
  return (
    <html>
      <body className="p-8">
        <h1 className="text-xl font-semibold">เกิดข้อผิดพลาด</h1>
        <p className="text-slate-500 mt-2">{error.message}</p>
        <button onClick={() => window.location.reload()} className="btn btn-primary mt-4">ลองใหม่</button>
      </body>
    </html>
  );
}

