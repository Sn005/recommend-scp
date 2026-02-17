"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ObjectClassBadge } from "@/shared/components/ui/ObjectClassBadge";

/** タイミング定数 */
const CARD_MIN_MS = 500;
const CARD_SAFETY_TIMEOUT_MS = 15_000;
const FADE_DURATION_MS = 150;

/** グラデーションマッピング */
const GRADIENTS: Record<string, string> = {
  SAFE: "linear-gradient(135deg, #065F46, #10B981)",
  EUCLID: "linear-gradient(135deg, #92400E, #F59E0B)",
  KETER: "linear-gradient(135deg, #991B1B, #EF4444)",
  THAUMIEL: "linear-gradient(135deg, #3730A3, #6366F1)",
  NEUTRALIZED: "linear-gradient(135deg, #374151, #6B7280)",
  APOLLYON: "linear-gradient(135deg, #450A0A, #DC2626)",
  ARCHON: "linear-gradient(135deg, #4C1D95, #8B5CF6)",
};

const DEFAULT_GRADIENT = "linear-gradient(135deg, #4B5563, #9CA3AF)";

/** objectClassからグラデーション文字列を取得 */
const getGradient = (objectClass: string | null): string =>
  objectClass ? (GRADIENTS[objectClass.toUpperCase()] ?? DEFAULT_GRADIENT) : DEFAULT_GRADIENT;

/**
 * objectClass (例: "EUCLID") を ObjectClassBadge の variant (例: "Euclid") に正規化
 * null の場合は "Unknown" を返す
 */
const normalizeClass = (objectClass: string | null): string => {
  if (!objectClass) return "Unknown";
  const lower = objectClass.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

export interface TransitionCardProps {
  /** SCP番号（例: "SCP-173"） */
  scpNumber: string;
  /** オブジェクトクラス（例: "EUCLID"）。nullの場合Unknown */
  objectClass: string | null;
  /** 記事の評価値。nullの場合非表示 */
  rating: number | null;
  /** 表示状態 */
  isVisible: boolean;
  /** iframe読み込み完了通知 */
  isContentReady: boolean;
  /** カード非表示完了コールバック */
  onDismissed: () => void;
}

type Phase = "fading-in" | "visible" | "fading-out" | "dismissed";

/**
 * 記事遷移時に表示されるカードコンポーネント
 *
 * オブジェクトクラス別グラデーション背景に、SCP番号・クラスバッジ・ratingを表示し、
 * フェードイン→適応型タイミング→フェードアウトで遷移を演出する。
 */
export function TransitionCard({
  scpNumber,
  objectClass,
  rating,
  isVisible,
  isContentReady,
  onDismissed,
}: TransitionCardProps) {
  const [phase, setPhase] = useState<Phase>("fading-in");
  const [opacity, setOpacity] = useState(0);
  const minTimeReachedRef = useRef(false);
  const contentReadyRef = useRef(false);
  const dismissedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((t) => {
      clearTimeout(t);
    });
    timersRef.current = [];
  }, []);

  const addTimer = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  const startFadeOut = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setPhase("fading-out");
    setOpacity(0);

    addTimer(() => {
      setPhase("dismissed");
      onDismissed();
    }, FADE_DURATION_MS);
  }, [onDismissed, addTimer]);

  // Reset state from props: when isVisible transitions to true
  const [prevIsVisible, setPrevIsVisible] = useState(false);
  if (isVisible && !prevIsVisible) {
    setPrevIsVisible(true);
    setPhase("fading-in");
    setOpacity(0);
  }
  if (!isVisible && prevIsVisible) {
    setPrevIsVisible(false);
  }

  // isVisible becomes true → reset refs and start timers
  useEffect(() => {
    if (!isVisible) return;

    // Reset refs (safe in effects)
    dismissedRef.current = false;
    minTimeReachedRef.current = false;
    contentReadyRef.current = false;

    // Kick off fade-in on next frame (CSS transition needs initial render with opacity=0)
    const rafId = requestAnimationFrame(() => {
      setOpacity(1);
    });

    // After fade-in completes
    addTimer(() => {
      setPhase("visible");
    }, FADE_DURATION_MS);

    // Min time reached → check if content is already ready
    addTimer(() => {
      minTimeReachedRef.current = true;
      if (contentReadyRef.current) {
        startFadeOut();
      }
    }, CARD_MIN_MS);

    // Safety timeout → iframe読み込みタイムアウトに合わせた安全弁（15秒）
    addTimer(() => {
      startFadeOut();
    }, CARD_SAFETY_TIMEOUT_MS);

    return () => {
      cancelAnimationFrame(rafId);
      clearAllTimers();
    };
  }, [isVisible, addTimer, clearAllTimers, startFadeOut]);

  // Track content ready state and trigger fade out when appropriate
  useEffect(() => {
    contentReadyRef.current = isContentReady;

    if (!isVisible || !isContentReady || dismissedRef.current) return;

    if (minTimeReachedRef.current) {
      // Min time already passed → deferred fade out to avoid synchronous setState in effect
      const id = addTimer(() => {
        startFadeOut();
      }, 0);
      return () => {
        clearTimeout(id);
      };
    }
    // Otherwise, the min timer callback will handle it when it fires
  }, [isContentReady, isVisible, startFadeOut, addTimer]);

  if (!isVisible) return null;
  if (phase === "dismissed") return null;

  return (
    <div
      data-testid="transition-card"
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{
        background: getGradient(objectClass),
        opacity,
        transition: `opacity ${String(FADE_DURATION_MS)}ms ease`,
      }}
    >
      <div className="text-center text-white">
        <p className="mb-3 text-3xl font-bold">{scpNumber}</p>
        <div className="flex items-center justify-center gap-3">
          <ObjectClassBadge variant={normalizeClass(objectClass)} />
          {rating !== null && (
            <span className="text-lg font-medium">★ {rating.toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}
