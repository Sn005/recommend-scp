/**
 * @file ErrorState コンポーネント
 * @description API取得失敗時のエラー表示
 * @see specs/006-frontend/006-03-favorites/006-03-01.md AC-5
 */
"use client";

import { Button } from "@/shared/components/ui/Button";
import { Icon } from "@/shared/components/ui/Icon";

/**
 * ErrorState Props
 */
export interface ErrorStateProps {
  /** 再試行コールバック */
  onRetry: () => void;
}

/**
 * エラー状態コンポーネント
 *
 * AC-5:
 * - ErrorStateコンポーネントが表示される
 * - 「読み込みに失敗しました」メッセージが表示される
 * - 「再試行」ボタンが表示される
 * - ボタンタップで再取得を試みる
 */
export function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div
      data-testid="error-state"
      className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center"
    >
      {/* アイコン */}
      <div className="text-gray-400">
        <Icon name="alert-circle" size={48} />
      </div>

      {/* メッセージ */}
      <div className="space-y-2">
        <p className="text-gray-600">読み込みに失敗しました</p>
        <p className="text-sm text-gray-400">ネットワーク接続を確認して、再試行してください</p>
      </div>

      {/* 再試行ボタン */}
      <Button variant="outline" onClick={onRetry} className="mt-2">
        再試行
      </Button>
    </div>
  );
}
