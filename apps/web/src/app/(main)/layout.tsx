import { DrawerProvider, Drawer } from "@/shared/components/ui/Drawer";
import { MenuButton } from "@/shared/components/ui/MenuButton";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DrawerProvider>
      <div className="relative min-h-screen">
        <MenuButton />
        <Drawer />
        <main>{children}</main>
      </div>
    </DrawerProvider>
  );
}
