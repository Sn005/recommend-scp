"use client";

import { cn } from "@/shared/lib/utils";
import { PillNav } from "@/shared/components/ui/PillNav";
import { useFloatingUIVisibility } from "./useFloatingUIVisibility";
import type { FloatingUIProps } from "./index";

export function FloatingUI({
  isFavorited,
  onFavorite,
  onNext,
  scrollPercentage = 0,
}: FloatingUIProps) {
  const { isPillNavVisible } = useFloatingUIVisibility({
    scrollPercentage,
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 z-nav pointer-events-none md:hidden">
      {/* PillNav - スクロールで表示/非表示 */}
      <div
        className={cn(
          "flex justify-center pb-4 transition-opacity duration-300",
          isPillNavVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        data-testid="pill-nav"
      >
        <PillNav isFavorited={isFavorited} onFavorite={onFavorite} onNext={onNext} />
      </div>
    </div>
  );
}
