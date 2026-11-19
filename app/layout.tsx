import type { Metadata, Viewport } from "next";
import "./globals.css";

const description = "A working prototype of what a clinic's AI does for a patient between blood tests, and the contract that keeps it safe to ship.";

export const metadata: Metadata = {
  metadataBase: new URL("https://between-draws.vercel.app"),
  title: "Between Draws",
  description,
  openGraph: { title: "Between Draws", description, url: "/", siteName: "Between Draws", type: "website" },
  twitter: { card: "summary_large_image", title: "Between Draws", description },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
