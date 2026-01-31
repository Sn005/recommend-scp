"use client";

import { useEffect } from "react";
import { useDrawer } from "./useDrawer";
import { DrawerMenu } from "./DrawerMenu";

export const Drawer = () => {
  const { isOpen, close } = useDrawer();

  // Escapeキーでドロワーを閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <>
      {/* オーバーレイ */}
      <div
        data-testid="drawer-overlay"
        className="fixed inset-0 z-drawer-overlay bg-black/30"
        onClick={close}
        role="button"
        tabIndex={0}
        aria-label="ドロワーを閉じる"
      />
      {/* ドロワー本体 */}
      <nav
        data-testid="drawer"
        className="fixed left-0 top-0 z-drawer h-full w-drawer bg-white shadow-drawer"
        aria-label="メインナビゲーション"
      >
        <DrawerMenu />
      </nav>
    </>
  );
};
