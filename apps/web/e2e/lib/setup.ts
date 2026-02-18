/**
 * E2Eテスト用セットアップヘルパー
 *
 * Playwrightテストの前提条件（APIモック・localStorage設定）を管理
 */
import type { Page } from "@playwright/test";
import {
  mockVisitorOnboarded,
  mockRecommendResponse,
  mockFavoritesResponse,
  mockHistoryEntries,
  STORAGE_KEYS,
} from "./mock-data";

/**
 * オンボーディング完了済みユーザーのAPIモックを設定
 *
 * POST /visitors → オンボーディング完了済みのレスポンスを返す
 */
export async function setupOnboardedVisitor(page: Page): Promise<void> {
  await page.route("**/visitors", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockVisitorOnboarded),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * 推薦APIのモックを設定
 *
 * POST /recommend → テスト用記事データを返す
 */
export async function setupRecommendMock(page: Page): Promise<void> {
  await page.route("**/recommend", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockRecommendResponse),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * お気に入りAPIのモックを設定
 *
 * GET /favorites → テスト用お気に入りデータを返す
 * DELETE /favorites/:articleId → 204を返す
 */
export async function setupFavoritesMock(page: Page): Promise<void> {
  await page.route("**/favorites**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockFavoritesResponse),
      });
    } else if (route.request().method() === "DELETE") {
      await route.fulfill({ status: 204 });
    } else {
      await route.continue();
    }
  });
}

/**
 * フィードバックAPIのモックを設定
 *
 * POST /feedback → 成功レスポンスを返す
 * POST /favorites → 成功レスポンスを返す（お気に入り追加）
 */
export async function setupFeedbackMock(page: Page): Promise<void> {
  await page.route("**/feedback", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });
}

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
 * 推薦画面テスト用のフルセットアップ
 */
export async function setupRecommendTest(page: Page): Promise<void> {
  await setupOnboardedVisitor(page);
  await setupRecommendMock(page);
  await setupFeedbackMock(page);
  await seedOnboardingCompleted(page);
}

/**
 * お気に入り画面テスト用のフルセットアップ
 */
export async function setupFavoritesTest(page: Page): Promise<void> {
  await setupOnboardedVisitor(page);
  await setupFavoritesMock(page);
  await seedOnboardingCompleted(page);
}

/**
 * 閲覧履歴画面テスト用のフルセットアップ
 */
export async function setupHistoryTest(page: Page): Promise<void> {
  await setupOnboardedVisitor(page);
  await seedOnboardingCompleted(page);
  await seedHistory(page);
}
