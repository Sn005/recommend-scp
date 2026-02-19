"use client";

import { useState } from "react";
import { api } from "@/shared/lib/api-client";

/**
 * 嗜好リセットAPI呼び出しフック
 */
export const useResetPreference = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = async (visitorId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.visitors.reset.$post({
        json: { visitorId },
      });
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- res.ok は実行時に false になる可能性がある
      if (!res.ok) {
        throw new Error("リセットに失敗しました");
      }
      return true;
    } catch {
      setError("リセットに失敗しました。もう一度お試しください。");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { reset, isLoading, error };
};
