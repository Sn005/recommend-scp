/**
 * @file 閲覧履歴のLocalStorageストレージ
 * @description 閲覧履歴の保存・取得・削除を行う
 * @see specs/010-ja-article-display/010-04-history-excerpt/010-04-01.md
 */

import type { HistoryEntry, ObjectClass } from "../_types";

/** LocalStorageのキー */
const STORAGE_KEY = "scp-history";

/** 履歴の最大保存件数 */
const MAX_HISTORY_SIZE = 100;

/**
 * 履歴を取得する
 * @returns 履歴エントリの配列（新しい順）
 */
export const getHistory = (): HistoryEntry[] => {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored) as unknown[];
    // 後方互換性のためのマイグレーション（excerptがない場合は空文字列）
    return parsed.map((item) => {
      const entry = item as Record<string, unknown>;
      const excerpt = entry.excerpt;
      return {
        scpNumber: entry.scpNumber as string,
        title: entry.title as string,
        excerpt: typeof excerpt === "string" ? excerpt : "", // 後方互換性
        objectClass: entry.objectClass as ObjectClass,
        viewedAt: entry.viewedAt as string,
      };
    });
  } catch {
    return [];
  }
};

/**
 * 履歴を追加する
 * @param entry 追加する履歴エントリ（viewedAtは自動設定）
 * @returns 追加された履歴エントリ
 */
export const addHistory = (entry: Omit<HistoryEntry, "viewedAt">): HistoryEntry => {
  const newEntry: HistoryEntry = {
    scpNumber: entry.scpNumber,
    title: entry.title,
    excerpt: entry.excerpt,
    objectClass: entry.objectClass,
    viewedAt: new Date().toISOString(),
  };

  const history = getHistory();

  // 同じSCP番号の古いエントリを削除
  const filtered = history.filter((h) => h.scpNumber !== entry.scpNumber);

  // 新しいエントリを先頭に追加
  const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY_SIZE);

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  return newEntry;
};

/**
 * 履歴を削除する
 * @param scpNumber 削除するSCP番号
 */
export const removeHistory = (scpNumber: string): void => {
  const history = getHistory();
  const filtered = history.filter((h) => h.scpNumber !== scpNumber);

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
};

/**
 * 履歴を全て削除する
 */
export const clearHistory = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
};
