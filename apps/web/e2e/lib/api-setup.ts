/**
 * E2Eテスト用 API セットアップヘルパー
 *
 * 本番URL対向のE2Eで mock を使わず、実バックエンドの冪等エンドポイントを叩いて
 * テスト visitor の状態（オンボーディング完了 / お気に入り 1件以上）を確実に整える。
 *
 * - POST /visitors           : 既存なら 200, 新規なら 201（冪等）
 * - POST /onboarding/select  : 再オンボーディング時は履歴/推薦ログ/フィードバックを clear（冪等）
 * - POST /favorites/:id      : 既登録なら 200, 新規なら 201（冪等）
 */
import type { Page } from "@playwright/test";

const DEFAULT_LOCAL_API_URL = "http://localhost:3001";

/**
 * 利用する API ベースURL を解決する
 *
 * 優先順位:
 * 1. PLAYWRIGHT_API_URL（CI で明示指定）
 * 2. PLAYWRIGHT_BASE_URL + "/api"（Vercel デプロイは /api 配下に Hono を mount）
 * 3. http://localhost:3001（ローカルの api-server スタンドアロン）
 */
export function getApiBaseUrl(): string {
  const explicit = process.env.PLAYWRIGHT_API_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const baseUrl = process.env.PLAYWRIGHT_BASE_URL;
  if (baseUrl) return `${baseUrl.replace(/\/$/, "")}/api`;

  return DEFAULT_LOCAL_API_URL;
}

async function postJson(page: Page, url: string, body: unknown, context: string): Promise<unknown> {
  const res = await page.request.post(url, { data: body });
  if (!res.ok()) {
    const text = await res.text();
    throw new Error(
      `[E2E setup] ${context} failed: ${String(res.status())} ${url} body=${text.slice(0, 300)}`
    );
  }
  // 204 No Content など本文が無いケースがある
  const ct = res.headers()["content-type"] ?? "";
  if (ct.includes("application/json")) {
    return (await res.json()) as unknown;
  }
  return null;
}

/**
 * テスト visitor がオンボーディング完了状態になるよう本番DBを冪等にセットアップする。
 *
 * 1. POST /visitors          で visitor を確実に作成
 * 2. POST /onboarding/select で profile.onboarding_completed_at と
 *    preference_embedding を生成（既存の場合は履歴 clear + 再構築）
 *
 * 完了後は /recommend が API error 400 (OnboardingRequired) を返さなくなる。
 */
export async function prepareOnboardedVisitor(
  page: Page,
  visitorId: string,
  packType: "classic" | "horror" | "scifi" | "heartwarming" | "mystery" | "jp" = "horror"
): Promise<void> {
  const apiBase = getApiBaseUrl();
  await postJson(page, `${apiBase}/visitors`, { visitorId }, "register visitor");
  await postJson(
    page,
    `${apiBase}/onboarding/select`,
    { visitorId, packTypes: [packType] },
    "select starter pack"
  );
}

/**
 * テスト visitor のお気に入りに 1 件以上の記事を確実に追加する。
 *
 * 既にお気に入り済みなら 200 が返り、状態は維持される（冪等）。
 * 完了後は /favorites の取得結果が 1 件以上になり favorite-list が描画される。
 */
export async function ensureFavorite(
  page: Page,
  visitorId: string,
  articleId: string
): Promise<void> {
  const apiBase = getApiBaseUrl();
  await postJson(
    page,
    `${apiBase}/favorites/${articleId}`,
    { visitorId },
    `add favorite ${articleId}`
  );
}
