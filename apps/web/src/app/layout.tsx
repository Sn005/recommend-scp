import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistrar } from "@/shared/components/ServiceWorkerRegistrar";
import { VisitorProvider } from "@/shared/contexts/VisitorProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "SCPicks - あなた好みのSCPを発見",
  description: "あなたの好みに合ったSCP記事を推薦するWebアプリ",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SCPicks",
  },
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
        <ServiceWorkerRegistrar />
        <VisitorProvider>{children}</VisitorProvider>
      </body>
    </html>
  );
}
