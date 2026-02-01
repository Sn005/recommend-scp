/**
 * @file ErrorState コンポーネント
 * @description エラー発生時の表示
 * @see specs/006-frontend/006-02-article-reader/006-02-01.md AC-4, AC-5
 */
"use client";

import { Button } from "@/shared/components/ui/Button";

export interface ErrorStateProps {
  /** エラーオブジェクト */
  error: Error;
  /** 再試行コールバック */
  onRetry: () => void;
  /** 再試行中フラグ */
  isRetrying?: boolean;
}

/**
 * エラー状態コンポーネント
 *
 * AC-4:
 * - エラーメッセージが表示される
 * - 「再試行」ボタンが表示される
 *
 * AC-5:
 * - 「再試行」ボタンタップでAPI再実行
 * - ローディング状態に戻る
 */
export function ErrorState({ error, onRetry, isRetrying = false }: ErrorStateProps) {
  const message = error.message || "エラーが発生しました";

  return (
    <div
      data-testid="error-state"
      className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center"
    >
      {/* アイコン */}
      <div className="text-6xl" aria-hidden="true">
        !
      </div>

      {/* メッセージ */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-gray-800">エラーが発生しました</h2>
        <p className="text-sm text-gray-500">{message}</p>
      </div>

      {/* 再試行ボタン */}
      <Button onClick={onRetry} disabled={isRetrying}>
        {isRetrying ? "読み込み中..." : "再試行"}
      </Button>
    </div>
  );
}
