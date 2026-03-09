/**
 * E2Eテスト用セットアップヘルパー
 *
 * Playwrightテストの前提条件（localStorage設定）を管理
 * APIは本番対向で実行（モックなし）
 */
import type { Page } from "@playwright/test";
import {
  mockVisitorOnboarded,
  mockVisitorNew,
  mockHistoryEntries,
  STORAGE_KEYS,
} from "./mock-data";

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
 */
export async function setupRecommendTest(page: Page): Promise<void> {
  await seedOnboardingCompleted(page);
}

/**
 * お気に入り画面テスト用のフルセットアップ
 */
export async function setupFavoritesTest(page: Page): Promise<void> {
  await seedOnboardingCompleted(page);
}

/**
 * 閲覧履歴画面テスト用のフルセットアップ
 */
export async function setupHistoryTest(page: Page): Promise<void> {
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
