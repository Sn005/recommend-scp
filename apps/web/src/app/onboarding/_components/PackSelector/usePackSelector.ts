"use client";

import { useState, useCallback, useEffect } from "react";
import { api } from "@/shared/lib/api-client";

export interface StarterPackInfo {
  type: "horror" | "surreal" | "scientific" | "heartwarming" | "mystery";
  displayName: string;
  description: string;
  primaryTags: string[];
}

interface UsePackSelectorResult {
  packs: StarterPackInfo[];
  isLoadingPacks: boolean;
  packsError: Error | null;
  selectedPack: StarterPackInfo | null;
  selectPack: (pack: StarterPackInfo) => void;
  confirmSelection: () => Promise<void>;
  isConfirming: boolean;
  confirmError: Error | null;
  retryLoadPacks: () => void;
}

export function usePackSelector(visitorId: string): UsePackSelectorResult {
  const [packs, setPacks] = useState<StarterPackInfo[]>([]);
  const [isLoadingPacks, setIsLoadingPacks] = useState(true);
  const [packsError, setPacksError] = useState<Error | null>(null);
  const [selectedPack, setSelectedPack] = useState<StarterPackInfo | null>(null);
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

  const selectPack = useCallback((pack: StarterPackInfo) => {
    setSelectedPack(pack);
    setConfirmError(null);
  }, []);

  const confirmSelection = useCallback(async () => {
    if (!selectedPack) {
      return;
    }

    setIsConfirming(true);
    setConfirmError(null);

    try {
      const res = await api.onboarding.select.$post({
        json: {
          visitorId,
          packType: selectedPack.type,
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
  }, [selectedPack, visitorId]);

  const retryLoadPacks = useCallback(() => {
    void loadPacks();
  }, [loadPacks]);

  return {
    packs,
    isLoadingPacks,
    packsError,
    selectedPack,
    selectPack,
    confirmSelection,
    isConfirming,
    confirmError,
    retryLoadPacks,
  };
}
