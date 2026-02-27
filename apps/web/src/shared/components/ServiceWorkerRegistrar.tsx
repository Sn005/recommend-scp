"use client";
import { useEffect } from "react";

/** SW更新チェック間隔: 60分 */
const SW_UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let intervalId: ReturnType<typeof setInterval> | undefined;

    void navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        intervalId = setInterval(() => {
          void registration.update();
        }, SW_UPDATE_CHECK_INTERVAL_MS);
      })
      .catch(() => {
        // SW登録失敗はアプリ機能に影響しない（AC-3準拠）
      });

    return () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
      }
    };
  }, []);
  return null;
}
