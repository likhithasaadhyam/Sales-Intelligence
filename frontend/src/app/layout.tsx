import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppLayout } from "@/components/layout/app-layout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MENTNEO Sales Intelligence Dashboard",
  description: "Enterprise sales operations, lead CRM, call logs, revenue intelligence, and performance platform for MENTNEO",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
