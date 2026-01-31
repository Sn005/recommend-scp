import { hc, type ClientResponse, type InferResponseType } from "hono/client";
import type { AppType } from "@recommend-scp/api-types";

/**
 * APIベースURL
 * 環境変数から取得、未設定時はエラー
 */
const getBaseUrl = (): string => {
  // Note: NEXT_PUBLIC_* 環境変数はクライアントで使用するため直接参照
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_API_URL is not defined");
  }
  return url;
};

/**
 * Hono RPCクライアント
 * 型安全なAPI呼び出しを提供
 *
 * 使用例:
 * ```typescript
 * const res = await api.onboarding.packs.$get();
 * if (res.ok) {
 *   const data = await res.json();
 * }
 * ```
 */
export const api = hc<AppType>(getBaseUrl());

/**
 * APIクライアントの型エクスポート
 */
export type ApiClient = typeof api;

/**
 * レスポンス型ヘルパー（将来的にapi-types連携時に使用）
 */
export type { ClientResponse, InferResponseType };
