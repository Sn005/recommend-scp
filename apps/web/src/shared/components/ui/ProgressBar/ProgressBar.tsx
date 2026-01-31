import { cn } from "@/shared/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
}

export const ProgressBar = ({ value, max = 100, className }: ProgressBarProps) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("h-1 w-full bg-gray-200 rounded-full overflow-hidden", className)}
    >
      <div
        className="h-full bg-primary rounded-full transition-[width] duration-300 ease-out"
        style={{ width: `${String(percentage)}%` }}
      />
    </div>
  );
};
