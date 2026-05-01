import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Money Tracker",
  description: "Hyperliquid wallet intelligence powered by Quicknode SQL Explorer."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
