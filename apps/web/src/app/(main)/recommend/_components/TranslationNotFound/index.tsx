/**
 * @file TranslationNotFoundコンポーネント
 * @description 翻訳がない記事にアクセスした際のサジェスト画面
 * @see specs/010-ja-article-display/010-03-webview-ja/010-03-02.md
 */

"use client";

import { useState, useCallback } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Icon } from "@/shared/components/ui/Icon";

interface TranslationNotFoundProps {
  /** 別の記事を提案するコールバック */
  onSuggest: () => void;
}

/**
 * 翻訳なし記事のサジェスト画面
 *
 * AC-4: サジェスト画面UI
 * - 「この記事の日本語訳はまだ公開されていません」と表示
 * - 「別の記事をおすすめ」ボタンを表示
 *
 * AC-5: 別記事遷移
 * - ボタンタップで次の推薦記事に遷移
 */
export function TranslationNotFound({ onSuggest }: TranslationNotFoundProps) {
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = useCallback(() => {
    // 連続クリック防止
    if (isClicked) return;
    setIsClicked(true);
    onSuggest();
  }, [isClicked, onSuggest]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  return (
    <div
      className="flex flex-col items-center justify-center h-full bg-background p-8 text-center"
      data-testid="translation-not-found"
    >
      <div className="text-6xl mb-6" data-testid="translation-not-found-icon">
        <Icon name="file-text" size={64} />
      </div>
      <h2 className="text-xl font-semibold mb-2">この記事の日本語訳は</h2>
      <p className="text-muted-foreground mb-8">まだ公開されていません</p>
      <Button
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        size="lg"
        className="min-w-[200px]"
        disabled={isClicked}
      >
        別の記事をおすすめ
      </Button>
    </div>
  );
}
