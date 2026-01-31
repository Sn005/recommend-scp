import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../lib/api-client";

/** localStorageキー: visitorId */
export const VISITOR_ID_KEY = "recommend_scp_visitor_id";
/** localStorageキー: オンボーディング完了フラグ */
export const ONBOARDING_COMPLETED_KEY = "recommend_scp_onboarding_completed";

/** useVisitorIdの戻り値の型 */
export interface UseVisitorIdResult {
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
}

/** API レスポンスの型 */
interface VisitorResponse {
  visitorId: string;
  isNew: boolean;
  createdAt: string;
  onboardingCompletedAt?: string | null;
}

/**
 * visitorIdを管理するカスタムフック
 *
 * - localStorageにvisitorIdが存在しない場合、新規UUIDを生成してAPIに登録
 * - 既存のvisitorIdがある場合は、それを返す（APIは呼び出さない）
 * - オンボーディング完了状態も管理
 *
 * @example
 * ```tsx
 * const { visitorId, isLoading, isOnboarded, error } = useVisitorId();
 *
 * if (isLoading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage error={error} />;
 * if (!isOnboarded) return <Navigate to="/onboarding" />;
 * ```
 */
export function useVisitorId(): UseVisitorIdResult {
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // アンマウント検知用
  const isMountedRef = useRef(true);

  const initialize = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. localStorageから取得
      const storedVisitorId = localStorage.getItem(VISITOR_ID_KEY);
      const storedOnboardingCompleted = localStorage.getItem(ONBOARDING_COMPLETED_KEY);

      if (storedVisitorId) {
        // 既存visitorIdがある場合
        if (isMountedRef.current) {
          setVisitorId(storedVisitorId);
          setIsOnboarded(storedOnboardingCompleted === "true");
          setIsLoading(false);
        }
        return;
      }

      // 2. 新規UUID生成
      const newId = crypto.randomUUID();

      // 3. APIに登録
      const res = await api.visitors.$post({
        json: { visitorId: newId },
      });

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- res.ok は実行時に false になる可能性がある
      if (!res.ok) {
        throw new Error("Failed to register visitor");
      }

      const data: VisitorResponse = await res.json();

      // 4. 状態を更新（アンマウント済みの場合はスキップ）
      if (isMountedRef.current) {
        // localStorageに保存
        localStorage.setItem(VISITOR_ID_KEY, newId);

        // サーバーからonboardingCompletedAtが返された場合は同期
        if (data.onboardingCompletedAt) {
          localStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
          setIsOnboarded(true);
        }

        setVisitorId(newId);
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

  return {
    visitorId,
    isLoading,
    isOnboarded,
    error,
    refresh: initialize,
  };
}
