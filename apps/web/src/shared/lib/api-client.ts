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
 * Hono RPCクライアント（遅延初期化）
 * 型安全なAPI呼び出しを提供
 *
 * モジュールスコープでの即座初期化を避け、実際のAPI呼び出し時に初期化する。
 * これにより、Next.jsのSSR/プリレンダリング時にNEXT_PUBLIC_API_URLが
 * 未設定でもモジュールの読み込みが失敗しない。
 *
 * 使用例:
 * ```typescript
 * const res = await api.onboarding.packs.$get();
 * if (res.ok) {
 *   const data = await res.json();
 * }
 * ```
 */
type ApiClientType = ReturnType<typeof hc<AppType>>;
let _client: ApiClientType | null = null;

const getClient = (): ApiClientType => {
  _client ??= hc<AppType>(getBaseUrl());
  return _client;
};

export const api: ApiClientType = new Proxy({} as ApiClientType, {
  get(_, prop: string | symbol) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- Proxy経由の遅延初期化のため、実行時の型はApiClientTypeと一致する
    return Reflect.get(getClient(), prop);
  },
});

/**
 * APIクライアントの型エクスポート
 */
export type ApiClient = typeof api;

/**
 * レスポンス型ヘルパー（将来的にapi-types連携時に使用）
 */
export type { ClientResponse, InferResponseType };
