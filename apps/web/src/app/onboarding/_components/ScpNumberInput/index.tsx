"use client";

import { useState, useCallback } from "react";
import { api } from "@/shared/lib/api-client";
import { useVisitorId } from "@/shared/hooks/useVisitorId";

export interface ScpNumberInputProps {
  visitorId: string;
  onComplete: () => void;
}

const PLACEHOLDERS = ["例: 173", "例: 5000", "例: 999", "", ""];
const MAX_INPUTS = 5;

// 許可される入力形式
const SCP_NUMBER_PATTERNS = [
  /^(\d{1,4})$/, // 例: 173, 2000
  /^SCP-(\d{1,4})$/i, // 例: SCP-173, scp-173
  /^(\d{1,4})-JP$/i, // 例: 999-JP
];

// 正規化関数
function normalizeScpNumber(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  for (const pattern of SCP_NUMBER_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const num = match[1];
      // 3桁以上にパディング
      const paddedNum = num.length < 3 ? num.padStart(3, "0") : num;
      // JP支部判定
      if (trimmed.toUpperCase().includes("-JP")) {
        return `scp-${paddedNum}-JP`;
      }
      return `scp-${paddedNum}`;
    }
  }
  return null;
}

/**
 * SCP番号入力コンポーネント（モック準拠）
 *
 * 5つの入力フィールドでSCP番号を入力
 */
export function ScpNumberInput({ visitorId, onComplete }: ScpNumberInputProps) {
  const { markOnboarded } = useVisitorId();
  const [inputs, setInputs] = useState<string[]>(Array(MAX_INPUTS).fill(""));
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<Error | null>(null);

  const handleInputChange = useCallback((index: number, value: string) => {
    setInputs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setConfirmError(null);
  }, []);

  // 有効な入力値があるかチェック
  const hasValidInput = inputs.some((input) => {
    const normalized = normalizeScpNumber(input);
    return normalized !== null;
  });

  const handleSubmit = async () => {
    // 有効な入力値を収集
    const validIds = inputs
      .map((input) => normalizeScpNumber(input))
      .filter((id): id is string => id !== null);

    if (validIds.length === 0) {
      return;
    }

    setIsConfirming(true);
    setConfirmError(null);

    try {
      const res = await api.onboarding.select.custom.$post({
        json: {
          visitorId,
          articleIds: validIds,
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!res.ok) {
        const errorData = (await res.json()) as { title?: string };
        throw new Error(errorData.title ?? "エラーが発生しました");
      }

      // オンボーディング完了をコンテキスト（+ localStorage）に反映
      markOnboarded();

      onComplete();
    } catch (e) {
      const error = e instanceof Error ? e : new Error("Unknown error");
      setConfirmError(error);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <>
      {/* 入力フォーム */}
      <main className="flex-1 px-4 py-6 pb-28" data-testid="scp-number-input">
        <p className="mb-4 text-sm text-gray-500">好きなSCPの番号を入力してください（最大5つ）</p>

        <div
          data-testid="scp-input-grid"
          className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0"
        >
          {inputs.map((value, index) => {
            const isFullWidth = index === MAX_INPUTS - 1;
            const inputEl = (
              <input
                type="text"
                value={value}
                onChange={(e) => {
                  handleInputChange(index, e.target.value);
                }}
                placeholder={PLACEHOLDERS[index]}
                disabled={isConfirming}
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-lg transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-50"
              />
            );
            if (isFullWidth) {
              return (
                <div key={index} data-testid="scp-input-full-width" className="md:col-span-2">
                  {inputEl}
                </div>
              );
            }
            return <div key={index}>{inputEl}</div>;
          })}
        </div>

        <p className="mt-4 text-xs text-gray-400">
          ※ 番号のみ入力。JPの場合は「999-JP」のように入力
        </p>

        {/* エラーメッセージ */}
        {confirmError && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-500">
            エラーが発生しました。もう一度お試しください。
          </div>
        )}
      </main>

      {/* 開始ボタン（固定フッター） */}
      <div
        data-testid="start-button-container"
        className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-50 via-gray-50 p-4 md:left-0 md:right-0 md:max-w-[768px] md:mx-auto"
      >
        <button
          onClick={() => {
            void handleSubmit();
          }}
          disabled={!hasValidInput || isConfirming}
          className="w-full rounded-full bg-primary py-4 text-lg font-semibold text-white shadow-lg shadow-primary/40 transition-all disabled:bg-gray-300 disabled:shadow-none"
        >
          {isConfirming ? "設定中..." : "推薦を開始"}
        </button>
      </div>
    </>
  );
}
