"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/shared/components/ui/Icon";
import { ResetConfirmDialog } from "@/shared/components/ui/ResetConfirmDialog";
import { useVisitorId } from "@/shared/hooks/useVisitorId";

export const DropdownMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { visitorId } = useVisitorId();

  // 外部クリック検知
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Escキー検知
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen]);

  const handleResetClick = () => {
    setIsOpen(false);
    setShowResetDialog(true);
  };

  const handleResetConfirm = () => {
    setShowResetDialog(false);
    router.push("/onboarding?reset=true");
  };

  return (
    <div ref={menuRef} className="relative">
      {/* トリガーボタン */}
      <button
        type="button"
        data-testid="dropdown-trigger"
        onClick={() => {
          setIsOpen((prev) => !prev);
        }}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <Icon name="more-vertical" size={20} aria-label="メニュー" />
      </button>

      {/* ドロップダウン */}
      {isOpen && (
        <div
          data-testid="dropdown-menu"
          role="menu"
          className="absolute right-0 top-full mt-1 min-w-[200px] rounded-xl bg-white border border-gray-200 shadow-[0_4px_24px_rgba(0,0,0,0.12)] z-[60] py-1"
        >
          <Link
            href="/licensing"
            role="menuitem"
            tabIndex={0}
            onClick={() => {
              setIsOpen(false);
            }}
            className="flex items-center gap-2.5 px-3.5 py-2.5 mx-1 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Icon name="file-text" size={18} className="text-gray-500" />
            <span>ライセンス</span>
          </Link>

          {/* divider */}
          <div className="mx-3 my-1 border-t border-gray-200" />

          <button
            type="button"
            role="menuitem"
            tabIndex={0}
            onClick={handleResetClick}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 mx-1 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Icon name="refresh-cw" size={18} className="text-gray-500" />
            <span>推薦をリセット</span>
          </button>
        </div>
      )}

      {/* リセット確認ダイアログ */}
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
