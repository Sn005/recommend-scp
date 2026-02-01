"use client";

import type { StarterPackInfo } from "./usePackSelector";

interface PackCardProps {
  pack: StarterPackInfo;
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
}

const icons: Record<string, string> = {
  horror: "👻",
  surreal: "🌀",
  scientific: "🔬",
  heartwarming: "💝",
  mystery: "🔍",
};

export function PackCard({ pack, isSelected, onSelect, disabled }: PackCardProps) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`relative rounded-2xl border-2 bg-white p-4 text-left shadow-sm transition-all ${
        isSelected ? "border-primary ring-4 ring-primary/10" : "border-transparent hover:shadow-md"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      {/* チェックマーク（選択時のみ表示） */}
      {isSelected && (
        <div
          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary"
          data-testid="pack-check"
        >
          <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icons[pack.type] ?? "📦"}</span>
        <div>
          <h3 className="font-semibold text-gray-800">{pack.displayName}</h3>
          <p className="text-sm text-gray-500">{pack.description}</p>
        </div>
      </div>
    </button>
  );
}
