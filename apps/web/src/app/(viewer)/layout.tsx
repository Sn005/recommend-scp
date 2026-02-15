import { DrawerProvider, Drawer } from "@/shared/components/ui/Drawer";
import { MenuButton } from "@/shared/components/ui/MenuButton";

export default function ViewerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DrawerProvider>
      <MenuButton />
      <Drawer />
      {children}
    </DrawerProvider>
  );
}
