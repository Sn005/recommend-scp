/**
 * @file useFeedback フック
 * @description Next/Favoriteフィードバックを記録するフック
 * @see specs/006-frontend/006-05-transition-ux/006-05-06.md
 */
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "@/shared/lib/api-client";
import { useVisitorId } from "@/shared/hooks/useVisitorId";
import type { FeedbackType, NextMetadata, UseFeedbackResult } from "../_types";

/** 保留中のフィードバック */
interface PendingFeedback {
  articleId: string;
  type: FeedbackType;
  metadata?: NextMetadata;
  retryCount: number;
  timestamp: number;
}

const STORAGE_KEY = "scp-feedback-pending";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

/** 優先度: favorite > next */
const PRIORITY: Record<FeedbackType, number> = {
  favorite: 2,
  next: 1,
};

/**
 * interest_levelを算出する
 *
 * scrollDepth < 10 AND dwellTime < 5 → "low"（即通過）
 * scrollDepth > 50 AND dwellTime > 30 → "high"（深く読んだ）
 * それ以外 → "medium"（通常）
 */
export function calculateInterestLevel(
  scrollDepth: number,
  dwellTime: number
): "low" | "medium" | "high" {
  if (scrollDepth < 10 && dwellTime < 5) return "low";
  if (scrollDepth > 50 && dwellTime > 30) return "high";
  return "medium";
}

/**
 * ローカルストレージから保留中のフィードバックを読み込む
 */
function loadPendingQueue(): PendingFeedback[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as PendingFeedback[];
  } catch {
    return [];
  }
}

/**
 * フィードバック記録フック
 *
 * @returns UseFeedbackResult
 */
export function useFeedback(): UseFeedbackResult {
  const { visitorId } = useVisitorId();
  const [recordedFeedbacks, setRecordedFeedbacks] = useState<Map<string, FeedbackType>>(new Map());
  const [pendingQueue, setPendingQueue] = useState<PendingFeedback[]>(loadPendingQueue);
  const processingRef = useRef(false);

  // 保留中のフィードバックをローカルストレージに保存
  useEffect(() => {
    if (pendingQueue.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingQueue));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [pendingQueue]);

  // フィードバック送信（内部）
  // NOTE: feedback APIは next のみサポート。favoriteは別APIで管理するため、ここでは成功とみなす
  const sendFeedback = useCallback(
    async (articleId: string, type: FeedbackType, metadata?: NextMetadata): Promise<boolean> => {
      if (!visitorId) return false;

      // favoriteはfeedback APIではなく別途favorites APIで管理
      if (type === "favorite") {
        return true;
      }

      try {
        const json: Record<string, unknown> = { visitorId, articleId, type };
        if (metadata) {
          json.metadata = metadata;
        }
        const res = await api.feedback.$post({
          json: json as Parameters<typeof api.feedback.$post>[0]["json"],
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    [visitorId]
  );

  // キュー処理
  const processQueue = useCallback(async () => {
    if (processingRef.current || pendingQueue.length === 0 || !visitorId) return;

    processingRef.current = true;

    const [current, ...rest] = pendingQueue;
    const success = await sendFeedback(current.articleId, current.type, current.metadata);

    if (success) {
      // 成功: キューから削除
      setPendingQueue(rest);
    } else if (current.retryCount < MAX_RETRIES) {
      // リトライ: カウントを増やしてキューの末尾へ
      setPendingQueue([...rest, { ...current, retryCount: current.retryCount + 1 }]);
    } else {
      // 最大リトライ超過: キューから削除
      setPendingQueue(rest);
    }

    processingRef.current = false;
  }, [pendingQueue, sendFeedback, visitorId]);

  // 定期的にキューを処理
  useEffect(() => {
    const interval = setInterval(() => {
      void processQueue();
    }, RETRY_DELAY_MS);
    return () => {
      clearInterval(interval);
    };
  }, [processQueue]);

  // オンライン復帰時にキューを処理
  useEffect(() => {
    const handleOnline = () => {
      void processQueue();
    };
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [processQueue]);

  // フィードバック記録（共通）
  const recordFeedback = useCallback(
    async (articleId: string, type: FeedbackType, metadata?: NextMetadata) => {
      // バリデーション
      if (!articleId || !visitorId) return;

      // 既存のフィードバックと優先度を比較
      const existing = recordedFeedbacks.get(articleId);
      if (existing && PRIORITY[existing] >= PRIORITY[type]) {
        // 既存の方が優先度が高い場合はスキップ
        return;
      }

      // 即座に記録済みとしてマーク（楽観的更新）
      setRecordedFeedbacks((prev) => new Map(prev).set(articleId, type));

      // API送信を試行
      const success = await sendFeedback(articleId, type, metadata);

      if (!success) {
        // 失敗時はキューに追加
        setPendingQueue((prev) => [
          ...prev.filter((p) => p.articleId !== articleId),
          { articleId, type, metadata, retryCount: 0, timestamp: Date.now() },
        ]);
      }
    },
    [recordedFeedbacks, sendFeedback, visitorId]
  );

  // 各フィードバック種別のラッパー
  const recordNext = useCallback(
    (articleId: string, metadata: NextMetadata) => recordFeedback(articleId, "next", metadata),
    [recordFeedback]
  );

  const recordFavorite = useCallback(
    (articleId: string) => recordFeedback(articleId, "favorite"),
    [recordFeedback]
  );

  const hasRecorded = useCallback(
    (articleId: string) => recordedFeedbacks.has(articleId),
    [recordedFeedbacks]
  );

  const getFeedbackType = useCallback(
    (articleId: string) => recordedFeedbacks.get(articleId) ?? null,
    [recordedFeedbacks]
  );

  return {
    recordNext,
    recordFavorite,
    hasRecorded,
    getFeedbackType,
    pendingCount: pendingQueue.length,
  };
}
