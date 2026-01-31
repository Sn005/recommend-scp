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
  heartwarming: "💖",
  mystery: "🔍",
};

export function PackCard({ pack, isSelected, onSelect, disabled }: PackCardProps) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`rounded-lg border-2 p-4 text-left transition-colors ${
        isSelected
          ? "border-blue-500 bg-blue-900/30"
          : "border-gray-600 bg-gray-800 hover:border-gray-500"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icons[pack.type] || "📦"}</span>
        <div>
          <h3 className="font-bold text-white">{pack.displayName}</h3>
          <p className="mt-1 text-sm text-gray-400">{pack.description}</p>
          <div className="mt-2 flex gap-2">
            {pack.primaryTags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded bg-gray-700 px-2 py-1 text-xs text-gray-300">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}
