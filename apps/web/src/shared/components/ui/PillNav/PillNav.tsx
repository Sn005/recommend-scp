import { Heart, ArrowRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface PillNavProps {
  onFavorite: () => void;
  onNext: () => void;
  isFavorited: boolean;
  className?: string;
}

export const PillNav = ({ onFavorite, onNext, isFavorited, className }: PillNavProps) => {
  return (
    <nav
      className={cn(
        "inline-flex items-center gap-6 px-5 py-2 rounded-full",
        "bg-white/30 backdrop-blur-glass shadow-glass",
        className
      )}
    >
      <button
        type="button"
        onClick={onFavorite}
        aria-label={isFavorited ? "お気に入りから削除" : "お気に入りに追加"}
        className={cn(
          "min-w-[48px] min-h-[48px] flex items-center justify-center",
          "rounded-full transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          isFavorited
            ? "text-favorite animate-heart-pop"
            : "text-favorite-outline hover:text-favorite/70"
        )}
      >
        <Heart
          size={26}
          fill={isFavorited ? "currentColor" : "none"}
          strokeWidth={isFavorited ? 0 : 2}
        />
      </button>

      <button
        type="button"
        onClick={onNext}
        aria-label="次のSCPへ"
        className={cn(
          "min-w-[48px] min-h-[48px] flex items-center justify-center",
          "rounded-full transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          "text-primary hover:text-primary-dark"
        )}
      >
        <ArrowRight size={26} strokeWidth={2} />
      </button>
    </nav>
  );
};
