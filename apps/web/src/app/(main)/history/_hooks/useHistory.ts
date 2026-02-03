/**
 * @file 閲覧履歴のカスタムフック
 * @description 閲覧履歴の状態管理を行う
 * @see specs/010-ja-article-display/010-04-history-excerpt/010-04-01.md
 */

"use client";

import { useCallback, useEffect, useState } from "react";

import type { HistoryEntry } from "../_types";
import { addHistory, clearHistory, getHistory, removeHistory } from "../_lib/historyStorage";

/** useHistoryフックの戻り値 */
export interface UseHistoryResult {
  /** 履歴エントリの配列（新しい順） */
  history: HistoryEntry[];
  /** 読み込み中 */
  isLoading: boolean;
  /** 履歴を追加 */
  add: (entry: Omit<HistoryEntry, "viewedAt">) => void;
  /** 履歴を削除 */
  remove: (scpNumber: string) => void;
  /** 履歴を全削除 */
  clear: () => void;
  /** 履歴を再読み込み */
  refresh: () => void;
}

/**
 * 閲覧履歴を管理するカスタムフック
 * @returns 履歴の状態と操作関数
 */
export const useHistory = (): UseHistoryResult => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 初回読み込み
  useEffect(() => {
    setHistory(getHistory());
    setIsLoading(false);
  }, []);

  const add = useCallback((entry: Omit<HistoryEntry, "viewedAt">) => {
    addHistory(entry);
    setHistory(getHistory());
  }, []);

  const remove = useCallback((scpNumber: string) => {
    removeHistory(scpNumber);
    setHistory(getHistory());
  }, []);

  const clear = useCallback(() => {
    clearHistory();
    setHistory([]);
  }, []);

  const refresh = useCallback(() => {
    setHistory(getHistory());
  }, []);

  return {
    history,
    isLoading,
    add,
    remove,
    clear,
    refresh,
  };
};
