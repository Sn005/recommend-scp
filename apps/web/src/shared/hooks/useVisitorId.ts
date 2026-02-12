"use client";

import { useContext } from "react";
import { VisitorContext } from "../contexts/VisitorProvider";
import type { VisitorContextValue } from "../contexts/VisitorProvider";

// 定数をre-export（既存の利用箇所との後方互換性を維持）
export { VISITOR_ID_KEY, ONBOARDING_COMPLETED_KEY } from "../contexts/VisitorProvider";

/** useVisitorIdの戻り値の型 */
export type UseVisitorIdResult = VisitorContextValue;

/**
 * visitorIdを取得するカスタムフック
 *
 * VisitorProvider内で使用すること。
 * Providerが提供するContextから値を読み取るため、
 * 複数箇所で呼び出してもAPIリクエストは1回のみ。
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
  const context = useContext(VisitorContext);

  if (!context) {
    throw new Error("useVisitorId must be used within a VisitorProvider");
  }

  return context;
}
