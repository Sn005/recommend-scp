"use client";

import { createContext, useEffect, useState, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { api } from "../lib/api-client";

/** localStorageキー: visitorId */
export const VISITOR_ID_KEY = "recommend_scp_visitor_id";
/** localStorageキー: オンボーディング完了フラグ */
export const ONBOARDING_COMPLETED_KEY = "recommend_scp_onboarding_completed";

/** VisitorContextの値の型 */
export interface VisitorContextValue {
  /** 現在のvisitorId（未初期化時はnull） */
  visitorId: string | null;
  /** 初期化中またはAPI呼び出し中 */
  isLoading: boolean;
  /** オンボーディング完了済みかどうか */
  isOnboarded: boolean;
  /** エラー情報 */
  error: Error | null;
  /** visitorIdをリフレッシュ（デバッグ用） */
  refresh: () => Promise<void>;
  /** オンボーディング完了をコンテキストに反映 */
  markOnboarded: () => void;
}

/** API レスポンスの型 */
interface VisitorResponse {
  visitorId: string;
  isNew: boolean;
  createdAt: string;
  onboardingCompletedAt?: string | null;
}

export const VisitorContext = createContext<VisitorContextValue | null>(null);

interface VisitorProviderProps {
  children: ReactNode;
}

/**
 * visitorIdを一元管理するProvider
 *
 * - localStorageにvisitorIdが存在しない場合、新規UUIDを生成
 * - APIを1回だけ呼び出してDBと同期
 * - 子コンポーネントはuseVisitorId()で値を取得
 */
export function VisitorProvider({ children }: VisitorProviderProps) {
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const isMountedRef = useRef(true);

  const initialize = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. localStorageから取得、または新規UUID生成
      const storedVisitorId = localStorage.getItem(VISITOR_ID_KEY);
      const visitorIdToUse = storedVisitorId ?? crypto.randomUUID();

      // 2. APIに登録/同期（既存visitorIdでもAPIを呼んでDBと同期）
      const res = await api.visitors.$post({
        json: { visitorId: visitorIdToUse },
      });

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- res.ok は実行時に false になる可能性がある
      if (!res.ok) {
        throw new Error("Failed to register visitor");
      }

      const data: VisitorResponse = await res.json();

      // 3. 状態を更新（アンマウント済みの場合はスキップ）
      if (isMountedRef.current) {
        localStorage.setItem(VISITOR_ID_KEY, visitorIdToUse);

        if (data.onboardingCompletedAt) {
          localStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
          setIsOnboarded(true);
        } else {
          const storedOnboardingCompleted = localStorage.getItem(ONBOARDING_COMPLETED_KEY);
          setIsOnboarded(storedOnboardingCompleted === "true");
        }

        setVisitorId(visitorIdToUse);
      }
    } catch (e) {
      if (isMountedRef.current) {
        setError(e instanceof Error ? e : new Error("Unknown error"));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void initialize();

    return () => {
      isMountedRef.current = false;
    };
  }, [initialize]);

  const markOnboarded = useCallback(() => {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
    setIsOnboarded(true);
  }, []);

  const value: VisitorContextValue = {
    visitorId,
    isLoading,
    isOnboarded,
    error,
    refresh: initialize,
    markOnboarded,
  };

  return <VisitorContext.Provider value={value}>{children}</VisitorContext.Provider>;
}
