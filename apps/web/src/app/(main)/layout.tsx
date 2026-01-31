import { DrawerProvider, Drawer } from "@/shared/components/ui/Drawer";
import { MenuButton } from "@/shared/components/ui/MenuButton";
import { OnboardingGuard } from "./_components/OnboardingGuard";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DrawerProvider>
      <OnboardingGuard>
        <div className="relative min-h-screen">
          <MenuButton />
          <Drawer />
          <main>{children}</main>
        </div>
      </OnboardingGuard>
    </DrawerProvider>
  );
}
