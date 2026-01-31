"use client";

import { useScpNumberInput } from "./useScpNumberInput";
import { ScpNumberTag } from "./ScpNumberTag";

export interface ScpNumberInputProps {
  visitorId: string;
  onComplete: () => void;
  onBack: () => void;
}

/**
 * SCP番号入力コンポーネント
 *
 * ユーザーが好きなSCP番号を入力して登録できる
 */
export function ScpNumberInput({ visitorId, onComplete, onBack }: ScpNumberInputProps) {
  const {
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
  } = useScpNumberInput(visitorId);

  const handleSubmit = async () => {
    try {
      await confirmSelection();
      onComplete();
    } catch {
      // エラーはhook内で処理
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addNumber();
    }
  };

  return (
    <div className="flex min-h-screen flex-col p-4 text-white" data-testid="scp-number-input">
      <header className="mb-6">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-200">
          ← 戻る
        </button>
        <h1 className="mt-2 text-xl font-bold">好きなSCPを教えてください</h1>
        <p className="mt-1 text-sm text-gray-400">最低3つのSCP番号を入力してください</p>
      </header>

      {/* 入力フォーム */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder="例: 173, SCP-682"
          className="flex-1 rounded-lg border border-gray-600 bg-gray-800 p-3 text-white placeholder-gray-500"
          disabled={isConfirming}
        />
        <button
          onClick={addNumber}
          disabled={isConfirming || !inputValue.trim()}
          className="rounded-lg bg-gray-700 px-4 py-2 text-white disabled:opacity-50"
        >
          追加
        </button>
      </div>

      {inputError && <p className="mb-4 text-sm text-red-400">{inputError}</p>}

      {/* 入力済みリスト */}
      <div className="flex-1">
        <div className="flex flex-wrap gap-2">
          {scpNumbers.map((num) => (
            <ScpNumberTag
              key={num}
              number={num}
              onRemove={() => {
                removeNumber(num);
              }}
              isInvalid={invalidNumbers.includes(num)}
              disabled={isConfirming}
            />
          ))}
        </div>

        {scpNumbers.length === 0 && (
          <p className="mt-8 text-center text-gray-500">まだSCP番号が入力されていません</p>
        )}
      </div>

      {/* 残り件数 */}
      {!isValid && (
        <p className="mt-4 text-center text-sm text-gray-400">あと{remainingCount}件必要です</p>
      )}

      {/* 確定エラー */}
      {confirmError && (
        <div className="mt-4 text-sm text-red-400">
          {invalidNumbers.length > 0
            ? `存在しないSCP番号があります: ${invalidNumbers.join(", ")}`
            : "エラーが発生しました。もう一度お試しください。"}
        </div>
      )}

      {/* 確定ボタン */}
      <footer className="mt-6">
        <button
          onClick={() => {
            void handleSubmit();
          }}
          disabled={!isValid || isConfirming}
          className="w-full rounded-lg bg-blue-600 py-3 text-white disabled:opacity-50"
        >
          {isConfirming ? "設定中..." : `始める（${String(scpNumbers.length)}件選択中）`}
        </button>
      </footer>
    </div>
  );
}
