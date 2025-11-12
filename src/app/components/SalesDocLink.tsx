import Link from "next/link";

export default function SalesDocLink({ docNo }: { docNo: string }) {
  return (
    <Link
      href={`/sales/${encodeURIComponent(docNo)}`}
      className="text-blue-700 hover:underline"
      title={`เปิดเอกสาร ${docNo}`}
    >
      {docNo}
    </Link>
  );
}
