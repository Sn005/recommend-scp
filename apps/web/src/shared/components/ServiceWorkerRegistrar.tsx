"use client";
import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW登録失敗はアプリ機能に影響しない（AC-3準拠）
      });
    }
  }, []);
  return null;
}
