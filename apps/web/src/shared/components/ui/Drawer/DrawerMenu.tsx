"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDrawer } from "./useDrawer";

interface MenuItem {
  href: string;
  icon: string;
  label: string;
}

const menuItems: MenuItem[] = [
  { href: "/recommend", icon: "📖", label: "推薦を見る" },
  { href: "/favorites", icon: "♡", label: "お気に入り一覧" },
  { href: "/history", icon: "🕐", label: "閲覧履歴" },
];

export const DrawerMenu = () => {
  const pathname = usePathname();
  const { close } = useDrawer();

  const handleClick = () => {
    close();
  };

  return (
    <div className="flex h-full flex-col">
      {/* ヘッダー */}
      <div className="border-b border-gray-100 px-6 py-6">
        <h2 className="text-lg font-bold text-gray-900">SCP Recommend</h2>
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
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};
