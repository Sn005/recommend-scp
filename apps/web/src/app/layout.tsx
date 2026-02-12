import type { Metadata, Viewport } from "next";
import { VisitorProvider } from "@/shared/contexts/VisitorProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "SCP Recommend",
  description: "あなた専用のSCP推薦システム",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <VisitorProvider>{children}</VisitorProvider>
      </body>
    </html>
  );
}
