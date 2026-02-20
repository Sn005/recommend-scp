"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/shared/components/ui/Icon";
import { useResetPreference } from "./useResetPreference";

interface ResetConfirmDialogProps {
  visitorId: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 嗜好リセット確認ダイアログ
 *
 * 破壊的操作の誤操作防止のための確認UI。
 * リセット内容と保持データを明示し、明確な同意を求める。
 */
export const ResetConfirmDialog = ({ visitorId, onConfirm, onCancel }: ResetConfirmDialogProps) => {
  const { reset, isLoading, error } = useResetPreference();
  const dialogRef = useRef<HTMLDivElement>(null);

  // ダイアログ外クリックで閉じる
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  // Escapeキーで閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel]);

  const handleReset = () => {
    void reset(visitorId).then((success) => {
      if (success) {
        onConfirm();
      }
    });
  };

  return createPortal(
    <div
      data-testid="reset-dialog-overlay"
      className="fixed inset-0 z-modal flex items-center justify-center bg-black/50"
      onClick={handleOverlayClick}
    >
      <div
        ref={dialogRef}
        data-testid="reset-dialog"
        role="dialog"
        aria-labelledby="reset-dialog-title"
        className="mx-4 w-full max-w-md rounded-xl bg-white px-6 py-5 shadow-lg"
      >
        {/* エラー表示 */}
        {error && (
          <div
            data-testid="reset-error"
            className="mb-4 flex items-center gap-2 text-sm text-red-600"
          >
            <Icon name="alert-circle" size={16} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* タイトル */}
        <h3 id="reset-dialog-title" className="text-lg font-bold text-gray-900">
          推薦をリセット
        </h3>

        {/* 説明 */}
        <p className="mt-2 text-sm text-gray-600">
          これまでの趣味嗜好データが初期化され、オンボーディングからやり直します。
        </p>

        {/* 保持データの説明 */}
        <p className="mt-2 text-sm text-gray-500">※ お気に入りと閲覧履歴は保持されます。</p>

        {/* ボタン */}
        <div className="mt-5 flex gap-3">
          <button
            data-testid="reset-cancel"
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            data-testid="reset-confirm"
            type="button"
            onClick={handleReset}
            disabled={isLoading}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? "リセット中..." : "リセットする"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
