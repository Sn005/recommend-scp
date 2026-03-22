"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Icon, type IconName } from "@/shared/components/ui/Icon";
import { DropdownMenu } from "@/shared/components/ui/DropdownMenu";

const NAV_ITEMS: { href: string; icon: IconName; label: string }[] = [
  { href: "/recommend", icon: "bookmark", label: "推薦" },
  { href: "/favorites", icon: "heart", label: "お気に入り" },
  { href: "/history", icon: "clock", label: "履歴" },
];

export const GlobalHeader = () => {
  const pathname = usePathname();

  return (
    <header
      data-testid="global-header"
      className="hidden md:flex fixed top-0 left-0 w-full h-14 z-nav bg-white border-b border-gray-200 px-6 items-center"
    >
      {/* ロゴ */}
      <Link href="/recommend" className="flex items-center shrink-0">
        <span className="text-base font-bold">
          <span className="text-primary">SCP</span>
          <span className="text-gray-800">icks</span>
        </span>
      </Link>

      {/* ナビリンク（中央配置） */}
      <nav
        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1"
        aria-label="メインナビゲーション"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-1.5 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-primary"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              <Icon
                name={item.icon}
                size={18}
                className={isActive ? "text-primary" : "text-current"}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 3点メニュー（右端） */}
      <div className="ml-auto">
        <DropdownMenu />
      </div>
    </header>
  );
};
