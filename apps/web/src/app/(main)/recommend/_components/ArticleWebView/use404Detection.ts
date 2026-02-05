/**
 * @file 404検知フック
 * @description WebViewでの404検知を行うカスタムフック
 * @see specs/010-ja-article-display/010-03-webview-ja/010-03-02.md
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const CHECK_URL_TIMEOUT_MS = 5_000;

interface CheckUrlResponse {
  exists: boolean;
}

interface Use404DetectionOptions {
  /** チェック対象のURL */
  url: string;
  /** 404検知時のコールバック（同期・非同期どちらも対応） */
  onNotFound: () => void | Promise<void>;
}

interface Use404DetectionReturn {
  /** チェック中かどうか */
  isChecking: boolean;
  /** 404（翻訳なし）かどうか */
  isNotFound: boolean;
}

/**
 * 404検知フック
 *
 * URLが存在するかをサーバーサイドプロキシ経由で確認し、
 * 404の場合はonNotFoundコールバックを呼び出す。
 *
 * @param options - オプション
 * @returns 404検知状態
 */
export function use404Detection(options: Use404DetectionOptions): Use404DetectionReturn {
  const { url, onNotFound } = options;

  const [isChecking, setIsChecking] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const hasCalledNotFound = useRef(false);

  // onNotFoundをrefで保持（useEffect依存配列から除外するため）
  const onNotFoundRef = useRef(onNotFound);
  onNotFoundRef.current = onNotFound;

  const checkUrl = useCallback(async (targetUrl: string) => {
    // 空URLは翻訳なしとして即座に処理
    if (!targetUrl) {
      setIsChecking(false);
      if (!hasCalledNotFound.current) {
        hasCalledNotFound.current = true;
        setIsNotFound(true);
        void onNotFoundRef.current();
      }
      return;
    }

    setIsChecking(true);
    setIsNotFound(false);
    hasCalledNotFound.current = false;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, CHECK_URL_TIMEOUT_MS);

    try {
      const response = await fetch(`/api/check-url?url=${encodeURIComponent(targetUrl)}`, {
        signal: controller.signal,
      });
      const data = (await response.json()) as CheckUrlResponse;

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- race condition guard for concurrent calls
      if (!data.exists && !hasCalledNotFound.current) {
        hasCalledNotFound.current = true;
        setIsNotFound(true);
        void onNotFoundRef.current();
      }
    } catch {
      // ネットワークエラー・タイムアウトは404として扱わない
    } finally {
      clearTimeout(timeoutId);
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkUrl(url);
  }, [url, checkUrl]);

  return { isChecking, isNotFound };
}
