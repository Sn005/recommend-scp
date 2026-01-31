import { cn } from "@/shared/lib/utils";

export interface ProgressBarProps {
  /** 現在の進捗値（0-100） */
  value: number;
  /** 最大値（デフォルト: 100） */
  max?: number;
  /** 追加のCSSクラス */
  className?: string;
}

/**
 * プログレスバーコンポーネント
 *
 * 進捗状況を視覚的に表示するバー。
 * アクセシビリティに対応し、スムーズなアニメーションで進捗を表示します。
 *
 * @example
 * <ProgressBar value={50} />
 * <ProgressBar value={25} max={50} />
 */
export const ProgressBar = ({ value, max = 100, className }: ProgressBarProps) => {
  // 0〜100にクランプ
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("h-1 w-full rounded-sm bg-gray-200 overflow-hidden", className)}
    >
      <div
        className="h-full bg-primary rounded-sm transition-[width] duration-300 ease-out"
        style={{ width: `${String(percentage)}%` }}
      />
    </div>
  );
};
