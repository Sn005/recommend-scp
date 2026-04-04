import { DrawerProvider, Drawer } from "@/shared/components/ui/Drawer";
import { MenuButton } from "@/shared/components/ui/MenuButton";
import { GlobalHeader } from "@/shared/components/ui/GlobalHeader";

export default function ViewerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DrawerProvider>
      <GlobalHeader />
      <MenuButton />
      <Drawer />
      <div className="md:pt-14">{children}</div>
    </DrawerProvider>
  );
}
