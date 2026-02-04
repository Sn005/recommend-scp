/**
 * @file EmptyState コンポーネント
 * @description お気に入り0件時の空状態表示
 * @see specs/006-frontend/006-03-favorites/006-03-01.md AC-4
 */
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/Button";
import { Icon } from "@/shared/components/ui/Icon";

/**
 * 空状態コンポーネント
 *
 * AC-4:
 * - EmptyStateコンポーネントが表示される
 * - 「まだお気に入りがありません」メッセージが表示される
 * - 「記事を探す」ボタンが表示される
 * - ボタンタップで `/recommend` に遷移する
 */
export function EmptyState() {
  const router = useRouter();

  const handleClick = () => {
    router.push("/recommend");
  };

  return (
    <div
      data-testid="empty-state"
      className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center"
    >
      {/* アイコン */}
      <div className="text-gray-300">
        <Icon name="heart" size={48} />
      </div>

      {/* メッセージ */}
      <div className="space-y-2">
        <p className="text-gray-500">まだお気に入りがありません</p>
        <p className="text-sm text-gray-400">気に入った記事を保存して、いつでも読み返せます</p>
      </div>

      {/* 記事を探すボタン */}
      <Button onClick={handleClick} className="mt-2">
        記事を探す
      </Button>
    </div>
  );
}
