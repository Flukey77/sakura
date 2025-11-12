"use client";

import Link from "next/link";

export default function SalesDocLink({
  id,
  docNo,
  className = "",
  title,
}: {
  id: string;
  docNo: string;
  className?: string;
  title?: string;
}) {
  return (
    <Link
      href={`/sales/${encodeURIComponent(id)}`}
      title={title ?? `เปิดรายละเอียดเอกสาร ${docNo}`}
      prefetch
      className={`text-blue-600 hover:text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded ${className}`}
    >
      {docNo}
    </Link>
  );
}
