/**
 * E2Eテスト用セットアップヘルパー
 *
 * Playwrightテストの前提条件（localStorage + 本番API状態）を管理。
 * mock は使わず、本番URL対向でも決定論的に動くよう、
 * 冪等な API（POST /visitors, /onboarding/select, /favorites/:id）で
 * テスト visitor の DB 状態を毎回整える。
 */
import type { Page } from "@playwright/test";
import {
  mockVisitorOnboarded,
  mockVisitorNew,
  mockHistoryEntries,
  STORAGE_KEYS,
} from "./mock-data";
import { ensureFavorite, prepareOnboardedVisitor } from "./api-setup";

/** お気に入りテスト用に常時1件以上を保証する記事（horror パックの seed 記事） */
const FAVORITE_SEED_ARTICLE_ID = "scp-087";

/**
 * 閲覧履歴のlocalStorageをシードする
 */
export async function seedHistory(page: Page): Promise<void> {
  await page.addInitScript(
    ({ storageKey, entries }) => {
      localStorage.setItem(storageKey, JSON.stringify(entries));
    },
    { storageKey: STORAGE_KEYS.history, entries: mockHistoryEntries }
  );
}

/**
 * オンボーディング完了状態のlocalStorageを設定する
 */
export async function seedOnboardingCompleted(page: Page): Promise<void> {
  await page.addInitScript(
    ({ visitorIdKey, onboardingKey, visitorId }) => {
      localStorage.setItem(visitorIdKey, visitorId);
      localStorage.setItem(onboardingKey, "true");
    },
    {
      visitorIdKey: STORAGE_KEYS.visitorId,
      onboardingKey: STORAGE_KEYS.onboardingCompleted,
      visitorId: mockVisitorOnboarded.visitorId,
    }
  );
}

/**
 * visitorIdのみをlocalStorageにシードする（オンボーディング完了フラグはセットしない）
 */
export async function seedVisitorId(page: Page): Promise<void> {
  await page.addInitScript(
    ({ visitorIdKey, visitorId }) => {
      localStorage.setItem(visitorIdKey, visitorId);
    },
    {
      visitorIdKey: STORAGE_KEYS.visitorId,
      visitorId: mockVisitorNew.visitorId,
    }
  );
}

/**
 * 推薦画面テスト用のフルセットアップ
 *
 * 本番DB上に固定 test visitor を冪等にオンボーディング済み状態で配置し、
 * フロント側の localStorage にも同じ visitorId を seed する。
 */
export async function setupRecommendTest(page: Page): Promise<void> {
  await prepareOnboardedVisitor(page, mockVisitorOnboarded.visitorId);
  await seedOnboardingCompleted(page);
}

/**
 * お気に入り画面テスト用のフルセットアップ
 *
 * オンボーディング済み visitor の状態に加え、お気に入りが
 * 必ず 1 件以上存在する状態を冪等に作る。
 */
export async function setupFavoritesTest(page: Page): Promise<void> {
  await prepareOnboardedVisitor(page, mockVisitorOnboarded.visitorId);
  await ensureFavorite(page, mockVisitorOnboarded.visitorId, FAVORITE_SEED_ARTICLE_ID);
  await seedOnboardingCompleted(page);
}

/**
 * 閲覧履歴画面テスト用のフルセットアップ
 *
 * 履歴は localStorage に保持されるため API セットアップは不要だが、
 * /history への遷移後に visitor ベースの API（お気に入りバッジ等）が
 * 失敗しないよう、visitor だけは登録しておく。
 */
export async function setupHistoryTest(page: Page): Promise<void> {
  await prepareOnboardedVisitor(page, mockVisitorOnboarded.visitorId);
  await seedOnboardingCompleted(page);
  await seedHistory(page);
}

/**
 * オンボーディング画面テスト用のフルセットアップ
 *
 * 新規ビジター（オンボーディング未完了）のlocalStorageを設定
 */
export async function setupOnboardingTest(page: Page): Promise<void> {
  await seedVisitorId(page);
}
