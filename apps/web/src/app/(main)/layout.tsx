import type { Metadata } from "next";
import { DrawerProvider, Drawer } from "@/shared/components/ui/Drawer";
import { MenuButton } from "@/shared/components/ui/MenuButton";
import { GlobalHeader } from "@/shared/components/ui/GlobalHeader";
import { OnboardingGuard } from "./_components/OnboardingGuard";

export const metadata: Metadata = {
  title: "SCP記事を探す",
  description:
    "AIがあなたの好みを学習し、おすすめのSCP記事を推薦。お気に入り登録や閲覧履歴も管理できます。",
  openGraph: {
    title: "SCP記事を探す | SCPicks",
    description:
      "AIがあなたの好みを学習し、おすすめのSCP記事を推薦。お気に入り登録や閲覧履歴も管理できます。",
  },
};

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DrawerProvider>
      <OnboardingGuard>
        <div className="relative min-h-screen">
          <GlobalHeader />
          <MenuButton />
          <Drawer />
          <main className="md:pt-14">{children}</main>
        </div>
      </OnboardingGuard>
    </DrawerProvider>
  );
}
