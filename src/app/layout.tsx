import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FinFlow — Personal Finance Dashboard",
  description: "Minimalist, NLU-first personal finance tracking and ledger.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-[#FAF9F5] text-stone-900 antialiased">
        <div className="flex flex-col min-h-screen lg:grid lg:grid-cols-[220px_1fr]">
          <div className="hidden lg:block">
            <Sidebar />
          </div>
          <main className="w-full min-w-0 pb-20 lg:pb-0">
            {children}
          </main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
