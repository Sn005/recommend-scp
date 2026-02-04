/**
 * @file 履歴ストレージ
 * @description localStorageを使用した閲覧履歴の保存・取得
 * @see specs/010-ja-article-display/010-04-history-excerpt/010-04-01.md
 */

import type { HistoryEntry, ObjectClass } from "../_types";

/** ストレージキー */
export const STORAGE_KEY = "scp-history";

/** 履歴の最大保存件数 */
const MAX_HISTORY_ITEMS = 100;

/**
 * 履歴エントリの入力型（viewedAtは自動付与）
 */
export type HistoryEntryInput = Omit<HistoryEntry, "viewedAt"> & {
  excerpt?: string;
};

/**
 * 履歴を追加する
 *
 * @param entry - 追加する履歴エントリ
 * @returns 追加された履歴エントリ（viewedAt付き）
 *
 * @example
 * ```ts
 * const entry = addHistory({
 *   scpNumber: "scp-173",
 *   title: "彫刻 - オリジナル",
 *   excerpt: "アイテム番号: SCP-173",
 *   objectClass: "Euclid",
 * });
 * ```
 */
export function addHistory(entry: HistoryEntryInput): HistoryEntry {
  const newEntry: HistoryEntry = {
    scpNumber: entry.scpNumber,
    title: entry.title,
    excerpt: entry.excerpt || "",
    objectClass: entry.objectClass,
    viewedAt: new Date().toISOString(),
  };

  if (typeof window === "undefined") {
    return newEntry;
  }

  const history = getHistory();

  // 同じSCP番号の履歴を削除（重複排除）
  const filteredHistory = history.filter((item) => item.scpNumber !== entry.scpNumber);

  // 新しい履歴を先頭に追加
  const updatedHistory = [newEntry, ...filteredHistory];

  // 最大件数を超えた場合は古いものを削除
  const trimmedHistory = updatedHistory.slice(0, MAX_HISTORY_ITEMS);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));

  return newEntry;
}

/**
 * 履歴を取得する
 *
 * @returns 閲覧履歴（新しい順）
 *
 * @example
 * ```ts
 * const history = getHistory();
 * history.forEach((entry) => {
 *   console.log(entry.scpNumber, entry.title, entry.excerpt);
 * });
 * ```
 */
export function getHistory(): HistoryEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored) as unknown[];

    // 後方互換性: excerptがないデータにはデフォルト値を設定
    const history = parsed.map((item) => {
      const record = item as Record<string, unknown>;
      return {
        scpNumber: record.scpNumber as string,
        title: record.title as string,
        excerpt: typeof record.excerpt === "string" ? record.excerpt : "",
        objectClass: record.objectClass as ObjectClass,
        viewedAt: record.viewedAt as string,
      };
    });

    // 新しい順（viewedAt降順）でソート
    return history.sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime());
  } catch {
    // 不正なJSONの場合は空配列を返す
    return [];
  }
}

/**
 * 履歴を全て削除する
 *
 * @example
 * ```ts
 * clearHistory();
 * ```
 */
export function clearHistory(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}
