/**
 * @file EmptyState コンポーネント
 * @description お気に入り0件時の空状態表示
 * @see specs/006-frontend/006-03-favorites/006-03-01.md AC-4
 */
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/Button";

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
    <div data-testid="empty-state" className="bg-white rounded-xl shadow-sm p-8 text-center">
      {/* メッセージ */}
      <p className="text-gray-500">まだお気に入りがありません</p>
      <p className="text-sm text-gray-400 mt-2">気に入った記事を保存して、いつでも読み返せます</p>

      {/* 記事を探すボタン */}
      <Button onClick={handleClick} className="mt-4">
        記事を探す
      </Button>
    </div>
  );
}
