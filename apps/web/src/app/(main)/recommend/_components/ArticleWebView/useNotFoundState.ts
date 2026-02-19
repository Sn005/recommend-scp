"use client";

import { useState, useCallback, useEffect } from "react";
import { use404Detection } from "./use404Detection";

interface UseNotFoundStateOptions {
  /** チェック対象のURL */
  url: string;
  /** 記事ID（404検知時のDB更新に使用） */
  articleId?: string;
  /** 次の記事に遷移するコールバック */
  onSkip?: () => void;
}

interface UseNotFoundStateReturn {
  /** 翻訳なし（404）表示中かどうか */
  showNotFound: boolean;
  /** サジェスト画面から次の記事に遷移 */
  handleSuggest: () => void;
}

/**
 * 404検知とNotFound UI状態を管理するフック
 *
 * - use404Detection を内部で使用してURLの存在を確認
 * - 404検知時にDB更新（翻訳なしフラグ設定）を実行
 * - showNotFound 状態とサジェスト操作を提供
 */
export function useNotFoundState(options: UseNotFoundStateOptions): UseNotFoundStateReturn {
  const { url, articleId, onSkip } = options;
  const [showNotFound, setShowNotFound] = useState(false);

  // URL変更時にリセット
  useEffect(() => {
    setShowNotFound(false);
  }, [url]);

  // 404検知時の処理
  const handleNotFound = useCallback(async () => {
    if (articleId) {
      try {
        await fetch(`/api/articles/${articleId}/translation`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lang: "ja", hasTranslation: false }),
        });
      } catch {
        // API呼び出し失敗してもサジェスト画面は表示
      }
    }
    setShowNotFound(true);
  }, [articleId]);

  // 404検知（バックグラウンドで実行）
  use404Detection({
    url,
    onNotFound: handleNotFound,
  });

  // 次の記事に遷移
  const handleSuggest = useCallback(() => {
    setShowNotFound(false);
    onSkip?.();
  }, [onSkip]);

  return { showNotFound, handleSuggest };
}
