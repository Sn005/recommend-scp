import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// api-clientをモック（他のimportより先に定義）
vi.mock("@/shared/lib/api-client", () => ({
  api: {
    onboarding: {
      packs: {
        $get: vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              packs: [
                {
                  type: "horror",
                  displayName: "ホラー好き",
                  description: "恐怖と不気味さを求めるあなたに",
                  primaryTags: ["ホラー", "恐怖", "不気味"],
                },
              ],
            }),
        }),
      },
      select: {
        $post: vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        }),
        custom: {
          $post: vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          }),
        },
      },
    },
  },
}));

// モックを先に定義
const mockRouterReplace = vi.fn();
const mockRouterPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
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
};

vi.mock("@/shared/hooks/useVisitorId", () => ({
  useVisitorId: () => mockUseVisitorIdResult,
}));

// コンポーネントをインポート（モックの後）
import OnboardingPage from "../page";

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルト値にリセット
    mockUseVisitorIdResult.visitorId = "test-visitor-id";
    mockUseVisitorIdResult.isLoading = false;
    mockUseVisitorIdResult.isOnboarded = false;
    mockUseVisitorIdResult.error = null;
  });

  describe("AC-1: オンボーディング画面表示", () => {
    it("オンボーディング画面が表示される", () => {
      render(<OnboardingPage />);

      expect(screen.getByRole("heading", { name: "ようこそ！" })).toBeInTheDocument();
      expect(screen.getByText("どちらの方法で始めますか？")).toBeInTheDocument();
    });

    it("「スターターパックから選ぶ」ボタンが表示される", () => {
      render(<OnboardingPage />);

      expect(screen.getByRole("button", { name: /スターターパックから選ぶ/i })).toBeInTheDocument();
      expect(screen.getByText(/おすすめのSCPカテゴリから選択/i)).toBeInTheDocument();
    });

    it("「好きなSCPを教える」ボタンが表示される", () => {
      render(<OnboardingPage />);

      expect(screen.getByRole("button", { name: /好きなSCPを教える/i })).toBeInTheDocument();
      expect(screen.getByText(/お気に入りのSCP番号を入力/i)).toBeInTheDocument();
    });
  });

  describe("AC-3: オンボーディング完了済みリダイレクト", () => {
    it("オンボーディングが既に完了している場合、/reader にリダイレクトされる", async () => {
      mockUseVisitorIdResult.isOnboarded = true;

      render(<OnboardingPage />);

      await waitFor(() => {
        expect(mockRouterReplace).toHaveBeenCalledWith("/reader");
      });
    });

    it("オンボーディング完了済みの場合、選択肢画面は表示されない", () => {
      mockUseVisitorIdResult.isOnboarded = true;

      render(<OnboardingPage />);

      expect(screen.queryByText("ようこそ！")).not.toBeInTheDocument();
    });
  });

  describe("AC-4: スターターパック選択遷移", () => {
    it("「スターターパックから選ぶ」をクリックするとPackSelectorが表示される", async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      const packButton = screen.getByRole("button", { name: /スターターパックから選ぶ/i });
      await user.click(packButton);

      expect(screen.getByTestId("pack-selector")).toBeInTheDocument();
      expect(screen.queryByText("どちらの方法で始めますか？")).not.toBeInTheDocument();
    });

    it("PackSelectorで「戻る」ボタンをクリックすると選択画面に戻る", async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      // PackSelectorへ遷移
      const packButton = screen.getByRole("button", { name: /スターターパックから選ぶ/i });
      await user.click(packButton);

      // 戻るボタンをクリック
      const backButton = screen.getByRole("button", { name: /戻る/ });
      await user.click(backButton);

      // 選択画面に戻っていることを確認
      expect(screen.getByText("どちらの方法で始めますか？")).toBeInTheDocument();
    });
  });

  describe("AC-5: SCP番号入力遷移", () => {
    it("「好きなSCPを教える」をクリックするとScpNumberInputが表示される", async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      const customButton = screen.getByRole("button", { name: /好きなSCPを教える/i });
      await user.click(customButton);

      expect(screen.getByTestId("scp-number-input")).toBeInTheDocument();
      expect(screen.queryByText("どちらの方法で始めますか？")).not.toBeInTheDocument();
    });

    it("ScpNumberInputで「戻る」ボタンをクリックすると選択画面に戻る", async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      // ScpNumberInputへ遷移
      const customButton = screen.getByRole("button", { name: /好きなSCPを教える/i });
      await user.click(customButton);

      // 戻るボタンをクリック
      const backButton = screen.getByRole("button", { name: /戻る/ });
      await user.click(backButton);

      // 選択画面に戻っていることを確認
      expect(screen.getByText("どちらの方法で始めますか？")).toBeInTheDocument();
    });
  });

  describe("AC-6: ローディング状態", () => {
    it("visitorIdの初期化中はローディングインジケーターが表示される", () => {
      mockUseVisitorIdResult.isLoading = true;
      mockUseVisitorIdResult.visitorId = null;

      render(<OnboardingPage />);

      expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();
      expect(screen.queryByText("ようこそ！")).not.toBeInTheDocument();
    });

    it("ローディングインジケーターにはaria-labelが設定されている", () => {
      mockUseVisitorIdResult.isLoading = true;
      mockUseVisitorIdResult.visitorId = null;

      render(<OnboardingPage />);

      const loadingIndicator = screen.getByTestId("loading-indicator");
      expect(loadingIndicator).toHaveAttribute("aria-label", "読み込み中");
      expect(loadingIndicator).toHaveAttribute("role", "status");
    });
  });

  describe("AC-7: エラー状態", () => {
    it("visitorId初期化でエラーが発生した際、エラーメッセージが表示される", () => {
      const testError = new Error("Failed to register visitor");
      mockUseVisitorIdResult.error = testError;
      mockUseVisitorIdResult.visitorId = null;

      render(<OnboardingPage />);

      expect(screen.getByText(/エラーが発生しました/i)).toBeInTheDocument();
      expect(screen.getByText(testError.message)).toBeInTheDocument();
    });

    it("リトライボタンが表示される", () => {
      mockUseVisitorIdResult.error = new Error("Network Error");
      mockUseVisitorIdResult.visitorId = null;

      render(<OnboardingPage />);

      expect(screen.getByRole("button", { name: /リトライ/i })).toBeInTheDocument();
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

      render(<OnboardingPage />);

      const retryButton = screen.getByRole("button", { name: /リトライ/i });
      await user.click(retryButton);

      expect(mockReload).toHaveBeenCalled();
    });
  });
});
