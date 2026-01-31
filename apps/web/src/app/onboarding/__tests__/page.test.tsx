import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// モックをテストの前に定義
const mockReplace = vi.fn();
const mockReload = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/onboarding",
  useSearchParams: () => new URLSearchParams(),
}));

// useVisitorIdのモック
const mockUseVisitorId = vi.fn();
vi.mock("@/shared/hooks/useVisitorId", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  useVisitorId: () => mockUseVisitorId(),
  VISITOR_ID_KEY: "recommend_scp_visitor_id",
  ONBOARDING_COMPLETED_KEY: "recommend_scp_onboarding_completed",
}));

// window.location.reloadのモック
Object.defineProperty(window, "location", {
  value: { reload: mockReload },
  writable: true,
});

import OnboardingPage from "../page";

describe("OnboardingPage", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockReload.mockClear();
    mockUseVisitorId.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("AC-1: オンボーディング画面表示", () => {
    it("/onboarding にアクセスすると選択肢画面が表示される", async () => {
      // Arrange
      mockUseVisitorId.mockReturnValue({
        visitorId: "test-visitor-id",
        isLoading: false,
        isOnboarded: false,
        error: null,
        refresh: vi.fn(),
      });

      // Act
      render(<OnboardingPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText("ようこそ！")).toBeInTheDocument();
      });
    });

    it("「スターターパックから選ぶ」ボタンが表示される", async () => {
      // Arrange
      mockUseVisitorId.mockReturnValue({
        visitorId: "test-visitor-id",
        isLoading: false,
        isOnboarded: false,
        error: null,
        refresh: vi.fn(),
      });

      // Act
      render(<OnboardingPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/スターターパックから選ぶ/)).toBeInTheDocument();
      });
    });

    it("「好きなSCPを教える」ボタンが表示される", async () => {
      // Arrange
      mockUseVisitorId.mockReturnValue({
        visitorId: "test-visitor-id",
        isLoading: false,
        isOnboarded: false,
        error: null,
        refresh: vi.fn(),
      });

      // Act
      render(<OnboardingPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/好きなSCPを教える/)).toBeInTheDocument();
      });
    });
  });

  describe("AC-3: オンボーディング完了済みリダイレクト", () => {
    it("オンボーディング完了済みの場合 /reader にリダイレクトされる", async () => {
      // Arrange
      mockUseVisitorId.mockReturnValue({
        visitorId: "test-visitor-id",
        isLoading: false,
        isOnboarded: true,
        error: null,
        refresh: vi.fn(),
      });

      // Act
      render(<OnboardingPage />);

      // Assert
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/reader");
      });
    });
  });

  describe("AC-4: スターターパック選択遷移", () => {
    it("「スターターパックから選ぶ」クリックでPackSelectorが表示される", async () => {
      // Arrange
      const user = userEvent.setup();
      mockUseVisitorId.mockReturnValue({
        visitorId: "test-visitor-id",
        isLoading: false,
        isOnboarded: false,
        error: null,
        refresh: vi.fn(),
      });

      // Act
      render(<OnboardingPage />);
      const packButton = await screen.findByText(/スターターパックから選ぶ/);
      await user.click(packButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId("pack-selector")).toBeInTheDocument();
      });
    });
  });

  describe("AC-5: SCP番号入力遷移", () => {
    it("「好きなSCPを教える」クリックでScpNumberInputが表示される", async () => {
      // Arrange
      const user = userEvent.setup();
      mockUseVisitorId.mockReturnValue({
        visitorId: "test-visitor-id",
        isLoading: false,
        isOnboarded: false,
        error: null,
        refresh: vi.fn(),
      });

      // Act
      render(<OnboardingPage />);
      const customButton = await screen.findByText(/好きなSCPを教える/);
      await user.click(customButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId("scp-number-input")).toBeInTheDocument();
      });
    });
  });

  describe("AC-6: ローディング状態", () => {
    it("visitorId初期化中はローディングインジケーターが表示される", () => {
      // Arrange
      mockUseVisitorId.mockReturnValue({
        visitorId: null,
        isLoading: true,
        isOnboarded: false,
        error: null,
        refresh: vi.fn(),
      });

      // Act
      render(<OnboardingPage />);

      // Assert
      expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();
    });
  });

  describe("AC-7: エラー状態", () => {
    it("visitorId初期化エラー時にエラーメッセージが表示される", async () => {
      // Arrange
      mockUseVisitorId.mockReturnValue({
        visitorId: null,
        isLoading: false,
        isOnboarded: false,
        error: new Error("Failed to initialize"),
        refresh: vi.fn(),
      });

      // Act
      render(<OnboardingPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toBeInTheDocument();
      });
    });

    it("エラー時にリトライボタンが表示される", async () => {
      // Arrange
      mockUseVisitorId.mockReturnValue({
        visitorId: null,
        isLoading: false,
        isOnboarded: false,
        error: new Error("Failed to initialize"),
        refresh: vi.fn(),
      });

      // Act
      render(<OnboardingPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /リトライ/ })).toBeInTheDocument();
      });
    });

    it("リトライボタンクリックで再読み込みされる", async () => {
      // Arrange
      const user = userEvent.setup();
      mockUseVisitorId.mockReturnValue({
        visitorId: null,
        isLoading: false,
        isOnboarded: false,
        error: new Error("Failed to initialize"),
        refresh: vi.fn(),
      });

      // Act
      render(<OnboardingPage />);
      const retryButton = await screen.findByRole("button", { name: /リトライ/ });
      await user.click(retryButton);

      // Assert
      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe("ステップ遷移", () => {
    it("PackSelectorから戻るボタンで選択画面に戻れる", async () => {
      // Arrange
      const user = userEvent.setup();
      mockUseVisitorId.mockReturnValue({
        visitorId: "test-visitor-id",
        isLoading: false,
        isOnboarded: false,
        error: null,
        refresh: vi.fn(),
      });

      // Act
      render(<OnboardingPage />);
      const packButton = await screen.findByText(/スターターパックから選ぶ/);
      await user.click(packButton);

      // PackSelectorが表示される
      expect(screen.getByTestId("pack-selector")).toBeInTheDocument();

      // 戻るボタンをクリック
      const backButton = screen.getByTestId("pack-selector-back");
      await user.click(backButton);

      // Assert - 選択画面に戻る
      await waitFor(() => {
        expect(screen.getByText(/スターターパックから選ぶ/)).toBeInTheDocument();
      });
    });

    it("ScpNumberInputから戻るボタンで選択画面に戻れる", async () => {
      // Arrange
      const user = userEvent.setup();
      mockUseVisitorId.mockReturnValue({
        visitorId: "test-visitor-id",
        isLoading: false,
        isOnboarded: false,
        error: null,
        refresh: vi.fn(),
      });

      // Act
      render(<OnboardingPage />);
      const customButton = await screen.findByText(/好きなSCPを教える/);
      await user.click(customButton);

      // ScpNumberInputが表示される
      expect(screen.getByTestId("scp-number-input")).toBeInTheDocument();

      // 戻るボタンをクリック
      const backButton = screen.getByTestId("scp-number-input-back");
      await user.click(backButton);

      // Assert - 選択画面に戻る
      await waitFor(() => {
        expect(screen.getByText(/好きなSCPを教える/)).toBeInTheDocument();
      });
    });
  });
});
