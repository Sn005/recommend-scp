"use client";

interface ScpNumberTagProps {
  number: string;
  onRemove: () => void;
  isInvalid: boolean;
  disabled: boolean;
}

export function ScpNumberTag({ number, onRemove, isInvalid, disabled }: ScpNumberTagProps) {
  // "scp-173" → "SCP-173" に表示用変換
  const displayNumber = number.toUpperCase();

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm ${
        isInvalid ? "border border-red-300 bg-red-100 text-red-800" : "bg-gray-700 text-gray-200"
      }`}
    >
      {displayNumber}
      <button
        onClick={onRemove}
        disabled={disabled}
        className="ml-1 text-gray-400 hover:text-gray-200 disabled:opacity-50"
        aria-label={`${displayNumber}を削除`}
      >
        ×
      </button>
    </span>
  );
}
