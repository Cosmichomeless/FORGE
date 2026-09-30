import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FORGE",
  description: "Project management workspace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <nav aria-label="Main navigation" className="flex flex-wrap gap-6 border-b p-4">
            <Link href="/">FORGE</Link>
            <Link href="/login">Log in</Link>
            <Link href="/register">Register</Link>
            <Link href="/dashboard">Dashboard</Link>
          </nav>
          {children}
        </Providers>
      </body>
    </html>
  );
}
