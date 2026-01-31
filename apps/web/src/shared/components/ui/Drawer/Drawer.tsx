"use client";

import { useDrawer } from "./useDrawer";

export const Drawer = () => {
  const { isOpen, close } = useDrawer();

  if (!isOpen) return null;

  return (
    <>
      {/* オーバーレイ */}
      <div
        data-testid="drawer-overlay"
        className="fixed inset-0 z-drawer-overlay bg-black/50"
        onClick={close}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
        }}
        role="button"
        tabIndex={0}
        aria-label="ドロワーを閉じる"
      />
      {/* ドロワー本体（006-00-07で実装） */}
      <nav
        data-testid="drawer"
        className="fixed left-0 top-0 z-drawer h-full w-drawer bg-white"
        aria-label="メインナビゲーション"
      >
        {/* メニュー内容は006-00-07で実装 */}
      </nav>
    </>
  );
};
