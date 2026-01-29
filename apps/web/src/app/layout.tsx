import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "recommend-scp",
  description: "SCP記事推薦システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
