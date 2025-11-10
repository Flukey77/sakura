import Link from "next/link";

export default function Home() {
  return (
    <main className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">Sakura Dashboard</h1>
        <Link href="/login" className="text-sakura-500 underline">ไปที่หน้าล็อกอิน</Link>
      </div>
    </main>
  );
}

