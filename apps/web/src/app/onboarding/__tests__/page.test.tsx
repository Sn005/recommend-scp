/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-return */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// api-clientをモック（他のimportより先に定義）
const mockPacksGet = vi.fn();
const mockSelectPost = vi.fn();
const mockCustomPost = vi.fn();

vi.mock("@/shared/lib/api-client", () => ({
  api: {
    onboarding: {
      packs: {
        $get: () => mockPacksGet(),
      },
      select: {
        $post: (params: { json: { visitorId: string; packTypes: string[] } }) =>
          mockSelectPost(params),
        custom: {
          $post: (params: { json: { visitorId: string; articleIds: string[] } }) =>
            mockCustomPost(params),
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
  useSearchParams: () => new URLSearchParams(),
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
  ONBOARDING_COMPLETED_KEY: "recommend_scp_onboarding_completed",
}));

// コンポーネントをインポート（モックの後）
import OnboardingPage from "../page";

const mockPacks = [
  {
    type: "classic" as const,
    displayName: "定番・名作",
    description: "SCP-173, 682, 999など誰もが知る人気作",
    primaryTags: ["定番", "名作"],
  },
  {
    type: "horror" as const,
    displayName: "ホラー・恐怖",
    description: "背筋が凍るような恐怖系SCP",
    primaryTags: ["ホラー", "恐怖"],
  },
  {
    type: "scifi" as const,
    displayName: "SF・テクノロジー",
    description: "未来技術や宇宙に関連したSCP",
    primaryTags: ["SF", "テクノロジー"],
  },
  {
    type: "heartwarming" as const,
    displayName: "感動・ハートフル",
    description: "心温まる物語や切ないSCP",
    primaryTags: ["感動", "ハートフル"],
  },
  {
    type: "mystery" as const,
    displayName: "ミステリー・考察",
    description: "謎解きや深い考察が必要なSCP",
    primaryTags: ["ミステリー", "考察"],
  },
  {
    type: "jp" as const,
    displayName: "日本支部オリジナル",
    description: "SCP-JP発の人気作品",
    primaryTags: ["日本支部", "JP"],
  },
];

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルト値にリセット
    mockUseVisitorIdResult.visitorId = "test-visitor-id";
    mockUseVisitorIdResult.isLoading = false;
    mockUseVisitorIdResult.isOnboarded = false;
    mockUseVisitorIdResult.error = null;
    // デフォルトの成功レスポンスを設定
    mockPacksGet.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ packs: mockPacks }),
    });
    mockSelectPost.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    mockCustomPost.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    });
  });

  describe("AC-1: タブUI実装", () => {
    it("オンボーディング画面を開いた際、「スターターパック」タブが表示される", async () => {
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: "スターターパック" })).toBeInTheDocument();
      });
    });

    it("オンボーディング画面を開いた際、「SCP番号を入力」タブが表示される", async () => {
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: "SCP番号を入力" })).toBeInTheDocument();
      });
    });

    it("初期状態では「スターターパック」タブがアクティブである", async () => {
      render(<OnboardingPage />);

      await waitFor(() => {
        const packTab = screen.getByRole("tab", { name: "スターターパック" });
        expect(packTab).toHaveAttribute("aria-selected", "true");
      });
    });

    it("「SCP番号を入力」タブをクリックするとタブが切り替わる", async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: "SCP番号を入力" })).toBeInTheDocument();
      });

      const manualTab = screen.getByRole("tab", { name: "SCP番号を入力" });
      await user.click(manualTab);

      expect(manualTab).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tab", { name: "スターターパック" })).toHaveAttribute(
        "aria-selected",
        "false"
      );
    });

    it("タブ切り替えで1画面内でコンテンツが切り替わる", async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      // 初期状態: PackSelector表示
      await waitFor(() => {
        expect(screen.getByTestId("pack-selector")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("scp-number-input")).not.toBeInTheDocument();

      // タブ切り替え
      await user.click(screen.getByRole("tab", { name: "SCP番号を入力" }));

      // ScpNumberInput表示
      await waitFor(() => {
        expect(screen.getByTestId("scp-number-input")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("pack-selector")).not.toBeInTheDocument();
    });

    it("選択画面（OnboardingSelect）は表示されない", async () => {
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: "スターターパック" })).toBeInTheDocument();
      });

      expect(screen.queryByText("どちらの方法で始めますか？")).not.toBeInTheDocument();
    });

    it("タブを高速で連続切り替えしても正しく表示される", async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: "スターターパック" })).toBeInTheDocument();
      });

      const packTab = screen.getByRole("tab", { name: "スターターパック" });
      const manualTab = screen.getByRole("tab", { name: "SCP番号を入力" });

      // 高速で10回切り替え
      for (let i = 0; i < 10; i++) {
        await user.click(i % 2 === 0 ? manualTab : packTab);
      }

      // 最終的にPackSelectorが表示されている
      await waitFor(() => {
        expect(screen.getByTestId("pack-selector")).toBeInTheDocument();
      });
    });
  });

  describe("AC-2: 複数パック選択対応", () => {
    it("パックカードをタップすると選択状態がトグルされる", async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByText("ホラー・恐怖")).toBeInTheDocument();
      });

      const packCard = screen.getByText("ホラー・恐怖").closest("button")!;

      // 未選択
      expect(screen.queryByTestId("pack-check")).not.toBeInTheDocument();

      // 1回クリック: 選択
      await user.click(packCard);
      expect(screen.getByTestId("pack-check")).toBeInTheDocument();

      // 2回クリック: 選択解除
      await user.click(packCard);
      expect(screen.queryByTestId("pack-check")).not.toBeInTheDocument();
    });

    it("複数のパックを同時に選択できる", async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByText("ホラー・恐怖")).toBeInTheDocument();
      });

      await user.click(screen.getByText("ホラー・恐怖").closest("button")!);
      await user.click(screen.getByText("ミステリー・考察").closest("button")!);
      await user.click(screen.getByText("定番・名作").closest("button")!);

      expect(screen.getAllByTestId("pack-check")).toHaveLength(3);
    });

    it("選択されたパック数が0の場合「推薦を開始」ボタンは非活性", async () => {
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByText("ホラー・恐怖")).toBeInTheDocument();
      });

      const startButton = screen.getByRole("button", { name: /推薦を開始/ });
      expect(startButton).toBeDisabled();
    });

    it("パックを1つでも選択すると「推薦を開始」ボタンが活性化される", async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByText("ホラー・恐怖")).toBeInTheDocument();
      });

      const startButton = screen.getByRole("button", { name: /推薦を開始/ });
      expect(startButton).toBeDisabled();

      await user.click(screen.getByText("ホラー・恐怖").closest("button")!);

      expect(startButton).not.toBeDisabled();
    });

    it("全選択を解除すると「推薦を開始」ボタンが非活性になる", async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByText("ホラー・恐怖")).toBeInTheDocument();
      });

      const horrorCard = screen.getByText("ホラー・恐怖").closest("button")!;
      const startButton = screen.getByRole("button", { name: /推薦を開始/ });

      // 選択
      await user.click(horrorCard);
      expect(startButton).not.toBeDisabled();

      // 選択解除
      await user.click(horrorCard);
      expect(startButton).toBeDisabled();
    });

    it("全パック（6個）を選択できる", async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByText("定番・名作")).toBeInTheDocument();
      });

      const packNames = [
        "定番・名作",
        "ホラー・恐怖",
        "SF・テクノロジー",
        "感動・ハートフル",
        "ミステリー・考察",
        "日本支部オリジナル",
      ];

      for (const name of packNames) {
        await user.click(screen.getByText(name).closest("button")!);
      }

      expect(screen.getAllByTestId("pack-check")).toHaveLength(6);
    });
  });

  describe("AC-4: パックカードのアイコン", () => {
    it("定番・名作のアイコンが🏛️である", async () => {
      render(<OnboardingPage />);

      await waitFor(() => {
        const packCard = screen.getByText("定番・名作").closest("button")!;
        expect(packCard).toHaveTextContent("🏛️");
      });
    });

    it("ホラー・恐怖のアイコンが👻である", async () => {
      render(<OnboardingPage />);

      await waitFor(() => {
        const packCard = screen.getByText("ホラー・恐怖").closest("button")!;
        expect(packCard).toHaveTextContent("👻");
      });
    });

    it("SF・テクノロジーのアイコンが🚀である", async () => {
      render(<OnboardingPage />);

      await waitFor(() => {
        const packCard = screen.getByText("SF・テクノロジー").closest("button")!;
        expect(packCard).toHaveTextContent("🚀");
      });
    });

    it("感動・ハートフルのアイコンが💝である", async () => {
      render(<OnboardingPage />);

      await waitFor(() => {
        const packCard = screen.getByText("感動・ハートフル").closest("button")!;
        expect(packCard).toHaveTextContent("💝");
      });
    });

    it("ミステリー・考察のアイコンが🔍である", async () => {
      render(<OnboardingPage />);

      await waitFor(() => {
        const packCard = screen.getByText("ミステリー・考察").closest("button")!;
        expect(packCard).toHaveTextContent("🔍");
      });
    });

    it("日本支部オリジナルのアイコンが🇯🇵である", async () => {
      render(<OnboardingPage />);

      await waitFor(() => {
        const packCard = screen.getByText("日本支部オリジナル").closest("button")!;
        expect(packCard).toHaveTextContent("🇯🇵");
      });
    });
  });

  describe("AC-5: SCP番号入力タブ", () => {
    it("「SCP番号を入力」タブを選択すると番号入力フォームが表示される", async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: "SCP番号を入力" })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: "SCP番号を入力" }));

      await waitFor(() => {
        expect(screen.getByTestId("scp-number-input")).toBeInTheDocument();
      });
    });

    it("プレースホルダーが「例: 173」になっている", async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: "SCP番号を入力" })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: "SCP番号を入力" }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("例: 173")).toBeInTheDocument();
      });
    });
  });

  describe("AC-6: フローティング開始ボタン", () => {
    it("画面下部に固定の「推薦を開始」ボタンが表示される", async () => {
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByText("ホラー・恐怖")).toBeInTheDocument();
      });

      const startButton = screen.getByRole("button", { name: /推薦を開始/ });
      const buttonContainer = startButton.parentElement;

      expect(buttonContainer).toHaveClass("fixed", "bottom-0");
    });

    it("パック未選択の場合はボタンが非活性", async () => {
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByText("ホラー・恐怖")).toBeInTheDocument();
      });

      const startButton = screen.getByRole("button", { name: /推薦を開始/ });
      expect(startButton).toBeDisabled();
    });

    it("パック選択後はボタンが活性化される", async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByText("ホラー・恐怖")).toBeInTheDocument();
      });

      const startButton = screen.getByRole("button", { name: /推薦を開始/ });
      expect(startButton).toBeDisabled();

      await user.click(screen.getByText("ホラー・恐怖").closest("button")!);

      expect(startButton).not.toBeDisabled();
    });

    it("パック選択後、「推薦を開始」ボタンクリックでAPIが呼び出される", async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByText("ホラー・恐怖")).toBeInTheDocument();
      });

      await user.click(screen.getByText("ホラー・恐怖").closest("button")!);
      await user.click(screen.getByText("ミステリー・考察").closest("button")!);

      const startButton = screen.getByRole("button", { name: /推薦を開始/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(mockSelectPost).toHaveBeenCalledWith({
          json: {
            visitorId: "test-visitor-id",
            packTypes: ["horror", "mystery"],
          },
        });
      });
    });

    it("確定成功時に/recommendにリダイレクトされる", async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      await waitFor(() => {
        expect(screen.getByText("ホラー・恐怖")).toBeInTheDocument();
      });

      await user.click(screen.getByText("ホラー・恐怖").closest("button")!);

      const startButton = screen.getByRole("button", { name: /推薦を開始/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith("/recommend");
      });
    });
  });

  describe("ローディング状態", () => {
    it("visitorIdの初期化中はローディングインジケーターが表示される", () => {
      mockUseVisitorIdResult.isLoading = true;
      mockUseVisitorIdResult.visitorId = null;

      render(<OnboardingPage />);

      expect(screen.getByTestId("skeleton-loader")).toBeInTheDocument();
    });
  });

  describe("エラー状態", () => {
    it("visitorId初期化でエラーが発生した際、エラーメッセージが表示される", () => {
      const testError = new Error("Failed to register visitor");
      mockUseVisitorIdResult.error = testError;
      mockUseVisitorIdResult.visitorId = null;

      render(<OnboardingPage />);

      expect(screen.getByText(/エラーが発生しました/i)).toBeInTheDocument();
      expect(screen.getByText(testError.message)).toBeInTheDocument();
    });
  });

  describe("オンボーディング完了済みリダイレクト", () => {
    it("オンボーディングが既に完了している場合、/recommend にリダイレクトされる", async () => {
      mockUseVisitorIdResult.isOnboarded = true;

      render(<OnboardingPage />);

      await waitFor(() => {
        expect(mockRouterReplace).toHaveBeenCalledWith("/recommend");
      });
    });
  });
});
