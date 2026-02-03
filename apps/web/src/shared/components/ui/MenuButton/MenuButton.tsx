"use client";

import { useDrawer } from "@/shared/components/ui/Drawer";
import { Icon } from "@/shared/components/ui/Icon";

export const MenuButton = () => {
  const { toggle } = useDrawer();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="メニューを開く"
      className="fixed top-4 left-4 z-nav w-10 h-10 rounded-full
                 bg-white/80 backdrop-blur-md shadow-sm
                 flex items-center justify-center
                 transition-transform active:scale-95"
    >
      <Icon name="menu" size={20} className="text-gray-600" />
    </button>
  );
};
