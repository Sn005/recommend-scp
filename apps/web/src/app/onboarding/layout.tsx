import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "はじめに",
  description: "SCPicksのセットアップ。好みのジャンルを選んで、あなただけのSCP推薦を始めましょう。",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OnboardingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div data-testid="onboarding-layout" className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
