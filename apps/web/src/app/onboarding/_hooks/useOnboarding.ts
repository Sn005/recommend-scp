"use client";

import { useState, useCallback } from "react";

export type OnboardingStep = "select" | "pack" | "custom";

interface UseOnboardingResult {
  step: OnboardingStep;
  setStep: (step: OnboardingStep) => void;
}

export function useOnboarding(): UseOnboardingResult {
  const [step, setStepState] = useState<OnboardingStep>("select");

  const setStep = useCallback((newStep: OnboardingStep) => {
    setStepState(newStep);
  }, []);

  return {
    step,
    setStep,
  };
}
