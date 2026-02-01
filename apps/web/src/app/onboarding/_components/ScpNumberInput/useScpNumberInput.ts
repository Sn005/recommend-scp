"use client";

import { useState, useCallback, useMemo } from "react";
import { api } from "@/shared/lib/api-client";

const MIN_REQUIRED_COUNT = 3;

// 許可される入力形式
const SCP_NUMBER_PATTERNS = [
  /^(\d{1,4})$/, // 例: 173, 2000
  /^SCP-(\d{1,4})$/i, // 例: SCP-173, scp-173
  /^SCP_(\d{1,4})$/i, // 例: SCP_173
];

// 正規化関数
function normalizeScpNumber(input: string): string | null {
  const trimmed = input.trim();
  for (const pattern of SCP_NUMBER_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const num = match[1];
      // 3桁以上にパディング
      const paddedNum = num.length < 3 ? num.padStart(3, "0") : num;
      return `scp-${paddedNum}`;
    }
  }
  return null;
}

interface UseScpNumberInputResult {
  /** 入力中の値 */
  inputValue: string;
  setInputValue: (value: string) => void;
  /** 追加済みSCP番号リスト（正規化済み） */
  scpNumbers: string[];
  /** 入力バリデーションエラー */
  inputError: string | null;
  /** 番号を追加 */
  addNumber: () => void;
  /** 番号を削除 */
  removeNumber: (number: string) => void;
  /** 最低件数を満たしているか */
  isValid: boolean;
  /** 残り必要件数 */
  remainingCount: number;
  /** オンボーディング確定 */
  confirmSelection: () => Promise<void>;
  /** 確定処理中 */
  isConfirming: boolean;
  /** 確定エラー */
  confirmError: Error | null;
  /** 存在しないSCP番号（APIエラー時） */
  invalidNumbers: string[];
}

export function useScpNumberInput(visitorId: string): UseScpNumberInputResult {
  const [inputValue, setInputValueState] = useState("");
  const [scpNumbers, setScpNumbers] = useState<string[]>([]);
  const [inputError, setInputError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<Error | null>(null);
  const [invalidNumbers, setInvalidNumbers] = useState<string[]>([]);

  const setInputValue = useCallback((value: string) => {
    setInputValueState(value);
    setInputError(null); // 入力値変更時にエラーをクリア
  }, []);

  const isValid = useMemo(() => scpNumbers.length >= MIN_REQUIRED_COUNT, [scpNumbers.length]);

  const remainingCount = useMemo(
    () => Math.max(0, MIN_REQUIRED_COUNT - scpNumbers.length),
    [scpNumbers.length]
  );

  const addNumber = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      return;
    }

    const normalized = normalizeScpNumber(trimmed);
    if (!normalized) {
      setInputError("無効な形式です。例: 173, SCP-173");
      return;
    }

    // 重複チェック
    if (scpNumbers.includes(normalized)) {
      setInputError("既に追加済みです");
      return;
    }

    setScpNumbers((prev) => [...prev, normalized]);
    setInputValueState("");
    setInputError(null);
  }, [inputValue, scpNumbers]);

  const removeNumber = useCallback((number: string) => {
    setScpNumbers((prev) => prev.filter((n) => n !== number));
    // 削除した番号がinvalidNumbersに含まれていたら除去
    setInvalidNumbers((prev) => prev.filter((n) => n !== number));
  }, []);

  const confirmSelection = useCallback(async () => {
    if (!isValid) {
      return;
    }

    setIsConfirming(true);
    setConfirmError(null);
    setInvalidNumbers([]);

    try {
      const res = await api.onboarding.select.custom.$post({
        json: {
          visitorId,
          articleIds: scpNumbers,
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- res.ok は実行時に false になる可能性がある
      if (!res.ok) {
        const errorData = (await res.json()) as {
          title?: string;
          invalidIds?: string[];
        };
        // Hono RPCの型推論では res.status が 200 型に推論されるが、実行時には 404 になる可能性がある
        if ((res.status as number) === 404 && errorData.invalidIds) {
          setInvalidNumbers(errorData.invalidIds);
        }
        throw new Error(errorData.title ?? "エラーが発生しました");
      }
    } catch (e) {
      const error = e instanceof Error ? e : new Error("Unknown error");
      setConfirmError(error);
      throw error;
    } finally {
      setIsConfirming(false);
    }
  }, [isValid, visitorId, scpNumbers]);

  return {
    inputValue,
    setInputValue,
    scpNumbers,
    inputError,
    addNumber,
    removeNumber,
    isValid,
    remainingCount,
    confirmSelection,
    isConfirming,
    confirmError,
    invalidNumbers,
  };
}
