import { useState, useCallback } from "react";

/** オンボーディングのステップ */
export type OnboardingStep = "select" | "pack" | "custom";

/** useOnboardingの戻り値の型 */
export interface UseOnboardingResult {
  /** 現在のステップ */
  step: OnboardingStep;
  /** ステップを変更する */
  setStep: (step: OnboardingStep) => void;
  /** 選択画面に戻る */
  goBack: () => void;
}

/**
 * オンボーディングフローを管理するカスタムフック
 *
 * @example
 * ```tsx
 * const { step, setStep, goBack } = useOnboarding();
 *
 * switch (step) {
 *   case "select":
 *     return <OnboardingSelect onSelectPack={() => setStep("pack")} />;
 *   case "pack":
 *     return <PackSelector onBack={goBack} />;
 * }
 * ```
 */
export function useOnboarding(): UseOnboardingResult {
  const [step, setStep] = useState<OnboardingStep>("select");

  const goBack = useCallback(() => {
    setStep("select");
  }, []);

  return {
    step,
    setStep,
    goBack,
  };
}
