"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDrawer } from "./useDrawer";
import { Icon, type IconName } from "@/shared/components/ui/Icon";
import { ResetConfirmDialog } from "@/shared/components/ui/ResetConfirmDialog";
import { useVisitorId } from "@/shared/hooks/useVisitorId";

interface MenuItem {
  href: string;
  icon: IconName;
  label: string;
}

const menuItems: MenuItem[] = [
  { href: "/recommend", icon: "bookmark", label: "推薦を見る" },
  { href: "/favorites", icon: "heart", label: "お気に入り一覧" },
  { href: "/history", icon: "clock", label: "閲覧履歴" },
];

export const DrawerMenu = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { close } = useDrawer();
  const { visitorId } = useVisitorId();
  const [showResetDialog, setShowResetDialog] = useState(false);

  const isLicensingActive = pathname === "/licensing";

  const handleClick = () => {
    close();
  };

  const handleResetConfirm = () => {
    setShowResetDialog(false);
    close();
    router.push("/onboarding?reset=true");
  };

  return (
    <div className="flex h-full flex-col">
      {/* ヘッダー */}
      <div className="border-b border-gray-100 px-6 py-6">
        <h2 className="text-lg font-bold text-gray-900">SCPicks</h2>
        <p className="mt-1 text-sm text-gray-500">あなた専用のSCP推薦</p>
      </div>

      {/* メニュー項目 */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={handleClick}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon
                    name={item.icon}
                    size={22}
                    className={isActive ? "text-primary" : "text-gray-500"}
                  />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* 区切り線 + ライセンス + リセットボタン */}
        <div className="mx-3 my-2 border-t border-gray-200" />
        <Link
          href="/licensing"
          onClick={handleClick}
          aria-current={isLicensingActive ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
            isLicensingActive
              ? "bg-primary/10 text-primary"
              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <Icon
            name="file-text"
            size={22}
            className={isLicensingActive ? "text-primary" : "text-gray-500"}
          />
          <span>ライセンス</span>
        </Link>
        <div className="mx-3 my-2 border-t border-gray-200" />
        <button
          data-testid="reset-preference-button"
          type="button"
          onClick={() => {
            setShowResetDialog(true);
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <Icon name="refresh-cw" size={22} className="text-gray-500" />
          <span>推薦をリセット</span>
        </button>
      </nav>

      {/* 確認ダイアログ */}
      {showResetDialog && visitorId && (
        <ResetConfirmDialog
          visitorId={visitorId}
          onConfirm={handleResetConfirm}
          onCancel={() => {
            setShowResetDialog(false);
          }}
        />
      )}
    </div>
  );
};
