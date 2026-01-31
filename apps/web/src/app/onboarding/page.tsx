"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useVisitorId } from "@/shared/hooks/useVisitorId";
import { useOnboarding } from "./_hooks/useOnboarding";
import { OnboardingSelect } from "./_components/OnboardingSelect";
import { PackSelector } from "./_components/PackSelector";
import { ScpNumberInput } from "./_components/ScpNumberInput";

function LoadingIndicator() {
  return (
    <div
      data-testid="loading-indicator"
      className="flex min-h-screen flex-col items-center justify-center p-4"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-600 border-t-white" />
      <p className="mt-4 text-gray-400">読み込み中...</p>
    </div>
  );
}

interface ErrorMessageProps {
  onRetry: () => void;
}

function ErrorMessage({ onRetry }: ErrorMessageProps) {
  return (
    <div
      data-testid="error-message"
      className="flex min-h-screen flex-col items-center justify-center p-4"
    >
      <p className="mb-4 text-red-400">エラーが発生しました</p>
      <button
        onClick={onRetry}
        className="rounded-lg bg-gray-800 px-4 py-2 text-white hover:bg-gray-700"
      >
        リトライ
      </button>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { visitorId, isLoading: isVisitorLoading, isOnboarded, error } = useVisitorId();
  const { step, setStep } = useOnboarding();

  // オンボーディング完了済みならリダイレクト
  useEffect(() => {
    if (!isVisitorLoading && isOnboarded) {
      router.replace("/reader");
    }
  }, [isVisitorLoading, isOnboarded, router]);

  if (isVisitorLoading) {
    return <LoadingIndicator />;
  }

  if (error) {
    return (
      <ErrorMessage
        onRetry={() => {
          window.location.reload();
        }}
      />
    );
  }

  // visitorIdがnullの場合はローディング表示（通常はisLoadingでカバーされる）
  if (!visitorId) {
    return <LoadingIndicator />;
  }

  switch (step) {
    case "select":
      return (
        <OnboardingSelect
          onSelectPack={() => {
            setStep("pack");
          }}
          onSelectCustom={() => {
            setStep("custom");
          }}
        />
      );
    case "pack":
      return (
        <PackSelector
          visitorId={visitorId}
          onComplete={() => {
            router.push("/reader");
          }}
          onBack={() => {
            setStep("select");
          }}
        />
      );
    case "custom":
      return (
        <ScpNumberInput
          visitorId={visitorId}
          onComplete={() => {
            router.push("/reader");
          }}
          onBack={() => {
            setStep("select");
          }}
        />
      );
  }
}
