import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// モックを先に定義
const mockRouterReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockRouterReplace,
    back: vi.fn(),
  }),
}));

// useVisitorIdのモック
const mockUseVisitorIdResult = {
  visitorId: null as string | null,
  isLoading: false,
  isOnboarded: false,
  error: null as Error | null,
  refresh: vi.fn(),
  markOnboarded: vi.fn(),
};

vi.mock("@/shared/hooks/useVisitorId", () => ({
  useVisitorId: () => mockUseVisitorIdResult,
}));

// コンポーネントをインポート（モックの後）
import { OnboardingGuard } from "../OnboardingGuard";

describe("OnboardingGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルト値にリセット
    mockUseVisitorIdResult.visitorId = "test-visitor-id";
    mockUseVisitorIdResult.isLoading = false;
    mockUseVisitorIdResult.isOnboarded = true;
    mockUseVisitorIdResult.error = null;
  });

  describe("AC-2: 初回訪問リダイレクト", () => {
    it("オンボーディング未完了の場合、/onboarding にリダイレクトされる", async () => {
      mockUseVisitorIdResult.isOnboarded = false;

      render(
        <OnboardingGuard>
          <div>Protected Content</div>
        </OnboardingGuard>
      );

      await waitFor(() => {
        expect(mockRouterReplace).toHaveBeenCalledWith("/onboarding");
      });
    });

    it("visitorIdが未登録の場合、/onboarding にリダイレクトされる", async () => {
      mockUseVisitorIdResult.visitorId = null;
      mockUseVisitorIdResult.isOnboarded = false;

      render(
        <OnboardingGuard>
          <div>Protected Content</div>
        </OnboardingGuard>
      );

      await waitFor(() => {
        expect(mockRouterReplace).toHaveBeenCalledWith("/onboarding");
      });
    });

    it("オンボーディング完了済みの場合、childrenが表示される", () => {
      mockUseVisitorIdResult.isOnboarded = true;

      render(
        <OnboardingGuard>
          <div>Protected Content</div>
        </OnboardingGuard>
      );

      expect(screen.getByText("Protected Content")).toBeInTheDocument();
      expect(mockRouterReplace).not.toHaveBeenCalled();
    });
  });

  describe("ローディング状態", () => {
    it("ローディング中はchildrenがそのまま表示される", () => {
      mockUseVisitorIdResult.isLoading = true;
      mockUseVisitorIdResult.visitorId = null;
      mockUseVisitorIdResult.isOnboarded = false;

      render(
        <OnboardingGuard>
          <div>Protected Content</div>
        </OnboardingGuard>
      );

      expect(screen.getByText("Protected Content")).toBeInTheDocument();
      expect(screen.queryByTestId("main-loading-indicator")).not.toBeInTheDocument();
    });

    it("ローディング中はリダイレクトしない", () => {
      mockUseVisitorIdResult.isLoading = true;
      mockUseVisitorIdResult.isOnboarded = false;

      render(
        <OnboardingGuard>
          <div>Protected Content</div>
        </OnboardingGuard>
      );

      expect(mockRouterReplace).not.toHaveBeenCalled();
    });

    it("ローディングから未完了への状態遷移時、リダイレクトされる", async () => {
      mockUseVisitorIdResult.isLoading = true;
      mockUseVisitorIdResult.isOnboarded = false;

      const { rerender } = render(
        <OnboardingGuard>
          <div>Protected Content</div>
        </OnboardingGuard>
      );

      expect(mockRouterReplace).not.toHaveBeenCalled();

      // ローディング完了 → 未オンボーディング
      mockUseVisitorIdResult.isLoading = false;
      rerender(
        <OnboardingGuard>
          <div>Protected Content</div>
        </OnboardingGuard>
      );

      await waitFor(() => {
        expect(mockRouterReplace).toHaveBeenCalledWith("/onboarding");
      });
    });
  });

  describe("エラー状態", () => {
    it("エラー発生時はエラーメッセージが表示される", () => {
      const testError = new Error("Network Error");
      mockUseVisitorIdResult.error = testError;
      mockUseVisitorIdResult.visitorId = null;
      mockUseVisitorIdResult.isOnboarded = false;

      render(
        <OnboardingGuard>
          <div>Protected Content</div>
        </OnboardingGuard>
      );

      expect(screen.getByTestId("main-error-message")).toBeInTheDocument();
      expect(screen.getByText(/エラーが発生しました/i)).toBeInTheDocument();
      expect(screen.getByText(testError.message)).toBeInTheDocument();
    });

    it("エラー時はリダイレクトしない", () => {
      mockUseVisitorIdResult.error = new Error("Network Error");
      mockUseVisitorIdResult.isOnboarded = false;

      render(
        <OnboardingGuard>
          <div>Protected Content</div>
        </OnboardingGuard>
      );

      expect(mockRouterReplace).not.toHaveBeenCalled();
    });

    it("リトライボタンをクリックするとページがリロードされる", async () => {
      const user = userEvent.setup();
      const mockReload = vi.fn();
      Object.defineProperty(window, "location", {
        value: { reload: mockReload },
        writable: true,
      });

      mockUseVisitorIdResult.error = new Error("Network Error");
      mockUseVisitorIdResult.visitorId = null;

      render(
        <OnboardingGuard>
          <div>Protected Content</div>
        </OnboardingGuard>
      );

      const retryButton = screen.getByRole("button", { name: /リトライ/i });
      await user.click(retryButton);

      expect(mockReload).toHaveBeenCalled();
    });
  });
});
