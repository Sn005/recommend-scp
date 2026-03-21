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
      {/* PC版ロゴヘッダー（オンボーディング専用: ロゴのみ中央表示） */}
      <header
        data-testid="onboarding-pc-header"
        className="hidden md:flex md:justify-center md:items-center md:h-14 md:border-b md:border-gray-200"
      >
        <span className="text-base font-bold">
          <span className="text-primary">SCP</span>
          <span className="text-gray-800">icks</span>
        </span>
      </header>
      <div data-testid="onboarding-content-wrapper" className="md:max-w-[768px] md:mx-auto">
        {children}
      </div>
    </div>
  );
}
