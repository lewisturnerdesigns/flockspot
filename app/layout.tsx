import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlockSpot",
  description: "Privacy-first camera proximity app built around public DeFlock and OpenStreetMap data.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full bg-slate-950 text-slate-100 antialiased">
      <body className="min-h-full bg-slate-950">{children}</body>
    </html>
  );
}
