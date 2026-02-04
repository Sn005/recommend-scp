/**
 * @file useHistory フック
 * @description 閲覧履歴の管理フック
 * @see specs/010-ja-article-display/010-04-history-excerpt/010-04-01.md
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import {
  addHistory as addToStorage,
  getHistory as getFromStorage,
  clearHistory as clearFromStorage,
  type HistoryEntryInput,
} from "../_lib/historyStorage";
import type { HistoryEntry } from "../_types";

/**
 * useHistory 戻り値
 */
export interface UseHistoryResult {
  /** 閲覧履歴 */
  history: HistoryEntry[];
  /** 履歴を追加 */
  add: (entry: HistoryEntryInput) => HistoryEntry;
  /** 履歴を全て削除 */
  clear: () => void;
  /** 履歴を再読み込み */
  refresh: () => void;
}

/**
 * 閲覧履歴管理フック
 *
 * @returns 履歴管理機能
 *
 * @example
 * ```tsx
 * const { history, add, clear } = useHistory();
 *
 * // 履歴を追加
 * add({
 *   scpNumber: "scp-173",
 *   title: "彫刻 - オリジナル",
 *   excerpt: "アイテム番号: SCP-173",
 *   objectClass: "Euclid",
 * });
 *
 * // 履歴を表示
 * history.forEach((entry) => {
 *   console.log(entry.scpNumber, entry.title, entry.excerpt);
 * });
 * ```
 */
export function useHistory(): UseHistoryResult {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // 初期読み込み（SSR→クライアントのハイドレーション後に同期）
  useEffect(() => {
    setHistory(getFromStorage());
  }, []);

  // 履歴を追加
  const add = useCallback((entry: HistoryEntryInput): HistoryEntry => {
    const newEntry = addToStorage(entry);
    setHistory(getFromStorage());
    return newEntry;
  }, []);

  // 履歴を削除
  const clear = useCallback(() => {
    clearFromStorage();
    setHistory([]);
  }, []);

  // 履歴を再読み込み
  const refresh = useCallback(() => {
    setHistory(getFromStorage());
  }, []);

  return { history, add, clear, refresh };
}
