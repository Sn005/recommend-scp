"use client";

import { useDrawer } from "@/shared/components/ui/Drawer";

export const MenuButton = () => {
  const { toggle, isOpen } = useDrawer();

  return (
    <button
      data-testid="menu-button"
      type="button"
      onClick={toggle}
      className="fixed left-4 top-4 z-nav rounded-lg bg-white/80 p-2 backdrop-blur-md"
      aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  );
};
