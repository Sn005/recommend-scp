"use client";

import { useState, useCallback, useEffect } from "react";
import { api } from "@/shared/lib/api-client";

export interface StarterPackInfo {
  type: "classic" | "horror" | "scifi" | "heartwarming" | "mystery" | "jp";
  displayName: string;
  description: string;
  primaryTags: string[];
}

interface UsePackSelectorResult {
  packs: StarterPackInfo[];
  isLoadingPacks: boolean;
  packsError: Error | null;
  selectedPacks: Set<string>;
  togglePack: (packType: string) => void;
  confirmSelection: () => Promise<void>;
  isConfirming: boolean;
  confirmError: Error | null;
  retryLoadPacks: () => void;
}

export function usePackSelector(visitorId: string): UsePackSelectorResult {
  const [packs, setPacks] = useState<StarterPackInfo[]>([]);
  const [isLoadingPacks, setIsLoadingPacks] = useState(true);
  const [packsError, setPacksError] = useState<Error | null>(null);
  const [selectedPacks, setSelectedPacks] = useState<Set<string>>(new Set());
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<Error | null>(null);

  const loadPacks = useCallback(async () => {
    setIsLoadingPacks(true);
    setPacksError(null);

    try {
      const res = await api.onboarding.packs.$get();

      // res.okは型定義上は常にtrueだが、ネットワークエラー時はfalseになる可能性がある
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!res.ok) {
        throw new Error("パック一覧の取得に失敗しました");
      }

      const data = (await res.json()) as { packs: StarterPackInfo[] };
      setPacks(data.packs);
    } catch (e) {
      setPacksError(e instanceof Error ? e : new Error("パック一覧の取得に失敗しました"));
    } finally {
      setIsLoadingPacks(false);
    }
  }, []);

  useEffect(() => {
    void loadPacks();
  }, [loadPacks]);

  const togglePack = useCallback((packType: string) => {
    setSelectedPacks((prev) => {
      const next = new Set(prev);
      if (next.has(packType)) {
        next.delete(packType);
      } else {
        next.add(packType);
      }
      return next;
    });
    setConfirmError(null);
  }, []);

  const confirmSelection = useCallback(async () => {
    if (selectedPacks.size === 0) {
      return;
    }

    setIsConfirming(true);
    setConfirmError(null);

    try {
      const res = await api.onboarding.select.$post({
        json: {
          visitorId,
          packTypes: Array.from(selectedPacks) as (
            | "classic"
            | "horror"
            | "scifi"
            | "heartwarming"
            | "mystery"
            | "jp"
          )[],
        },
      });

      // res.okは型定義上は常にtrueだが、ネットワークエラー時はfalseになる可能性がある
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!res.ok) {
        const errorData = (await res.json()) as { title?: string };
        throw new Error(errorData.title ?? "選択に失敗しました");
      }
    } catch (e) {
      const error = e instanceof Error ? e : new Error("選択に失敗しました");
      setConfirmError(error);
      throw error;
    } finally {
      setIsConfirming(false);
    }
  }, [selectedPacks, visitorId]);

  const retryLoadPacks = useCallback(() => {
    void loadPacks();
  }, [loadPacks]);

  return {
    packs,
    isLoadingPacks,
    packsError,
    selectedPacks,
    togglePack,
    confirmSelection,
    isConfirming,
    confirmError,
    retryLoadPacks,
  };
}
