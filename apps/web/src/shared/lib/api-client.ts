import { hc, type ClientResponse, type InferResponseType } from "hono/client";
import type { Hono } from "hono";

/**
 * AppType定義
 *
 * TODO: api-typesパッケージのビルドが安定したら、以下のように変更:
 * import type { AppType } from "@recommend-scp/api-types";
 *
 * 現在は型定義のみを使用するため、一時的にHono型として定義
 * 実際のAPI呼び出しは実行時に行われるため、型安全性は実行時に担保される
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppType = Hono<any, any, any>;

/**
 * APIベースURL
 * 環境変数から取得、未設定時はエラー
 */
const getBaseUrl = (): string => {
  // eslint-disable-next-line n/no-process-env
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
