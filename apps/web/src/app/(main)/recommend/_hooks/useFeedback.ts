/**
 * @file useFeedback フック（スタブ実装）
 * @description Like/Dislikeフィードバックを記録するフック
 * @see specs/006-frontend/006-02-article-reader/006-02-05.md
 *
 * TODO: 006-02-05 で本実装に置き換え
 */
"use client";

import { useCallback } from "react";
import type { UseFeedbackResult } from "../_types";

/**
 * フィードバック記録フック
 *
 * @returns UseFeedbackResult
 */
export function useFeedback(): UseFeedbackResult {
  const recordLike = useCallback((articleId: string) => {
    // TODO: 006-02-05 で async 実装に変更
    // await api.feedback.$post({ json: { visitorId, articleId, feedback: 'like' } });
    void articleId;
    return Promise.resolve();
  }, []);

  const recordDislike = useCallback((articleId: string) => {
    // TODO: 006-02-05 で async 実装に変更
    // await api.feedback.$post({ json: { visitorId, articleId, feedback: 'dislike' } });
    void articleId;
    return Promise.resolve();
  }, []);

  return {
    recordLike,
    recordDislike,
  };
}
