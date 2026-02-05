/**
 * @file EmptyState コンポーネント
 * @description 推薦切れ時の空状態表示
 * @see specs/006-frontend/006-02-article-reader/006-02-01.md AC-3
 */
"use client";

import Link from "next/link";
import { Button } from "@/shared/components/ui/Button";

/**
 * 推薦切れ状態コンポーネント
 *
 * AC-3:
 * - EmptyStateコンポーネントが表示される
 * - 「すべての推薦を読みました」メッセージが表示される
 * - 「好みを再設定」ボタンが表示される
 */
export function EmptyState() {
  return (
    <div
      data-testid="empty-state"
      className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center"
    >
      {/* アイコン */}
      <div className="text-6xl" aria-hidden="true">
        ✓
      </div>

      {/* メッセージ */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-gray-800">すべての推薦を読みました</h2>
        <p className="text-sm text-gray-500">
          お疲れさまでした！好みを再設定すると、新しい推薦を受け取れます。
        </p>
      </div>

      {/* 再設定ボタン */}
      <Button asChild>
        <Link href="/onboarding?reset=true">好みを再設定</Link>
      </Button>
    </div>
  );
}
