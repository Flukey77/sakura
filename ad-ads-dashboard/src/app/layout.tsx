import type { Metadata } from "next";
import "./globals.css";   // ✅ ถูกต้อง (อย่าใช้ "../globals.css")
import Providers from "@/components/Providers";
import Nav from "@/components/Nav";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Ad Summary Dashboard",
  description: "สรุปยอดรายวันจาก Facebook / TikTok",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="th" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        <Providers>
          {session && <Nav />}
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
