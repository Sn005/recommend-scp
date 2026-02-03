import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// api-clientをモック（他のimportより先に定義）
const mockPacksGet = vi.fn<() => Promise<{ ok: boolean; json: () => Promise<unknown> }>>();
const mockSelectPost = vi.fn<
  (params: { json: { visitorId: string; packTypes: string[] } }) => Promise<{
    ok: boolean;
    json: () => Promise<unknown>;
  }>
>();

vi.mock("@/shared/lib/api-client", () => ({
  api: {
    onboarding: {
      packs: {
        $get: () => mockPacksGet(),
      },
      select: {
        $post: (params: { json: { visitorId: string; packTypes: string[] } }) =>
          mockSelectPost(params),
      },
    },
  },
}));

// コンポーネントをインポート（モックの後）
import { PackSelector } from "../index";

const mockPacks = [
  {
    type: "horror" as const,
    displayName: "ホラー好き",
    description: "恐怖と不気味さを求めるあなたに",
    primaryTags: ["ホラー", "恐怖", "不気味"],
  },
  {
    type: "mystery" as const,
    displayName: "ミステリー派",
    description: "謎解きと陰謀論を追求",
    primaryTags: ["ミステリー", "陰謀", "謎"],
  },
  {
    type: "scifi" as const,
    displayName: "サイエンス派",
    description: "SF的・科学的な収容物に興味",
    primaryTags: ["科学", "テクノロジー", "実験"],
  },
  {
    type: "heartwarming" as const,
    displayName: "ほのぼの派",
    description: "心温まる収容物を求めて",
    primaryTags: ["ほのぼの", "癒し", "友好"],
  },
  {
    type: "classic" as const,
    displayName: "定番派",
    description: "定番・名作を楽しむ",
    primaryTags: ["定番", "名作", "人気"],
  },
];

/**
 * パックカードを取得するヘルパー関数
 * パック名を含むボタンを取得する
 */
function getPackCard(packName: string): HTMLElement {
  const element = screen.getByText(packName).closest("button");
  if (!element) {
    throw new Error(`Pack card with name "${packName}" not found`);
  }
  return element;
}

describe("PackSelector", () => {
  const mockOnComplete = vi.fn();
  const mockVisitorId = "test-visitor-id";

  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトの成功レスポンスを設定
    mockPacksGet.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ packs: mockPacks }),
    });
    mockSelectPost.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  describe("AC-1: パック一覧表示", () => {
    it("初回表示時にGET /onboarding/packs APIが呼び出される", async () => {
      render(<PackSelector visitorId={mockVisitorId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(mockPacksGet).toHaveBeenCalledTimes(1);
      });
    });

    it("5種類のスターターパックが表示される", async () => {
      render(<PackSelector visitorId={mockVisitorId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText("ホラー好き")).toBeInTheDocument();
        expect(screen.getByText("ミステリー派")).toBeInTheDocument();
        expect(screen.getByText("サイエンス派")).toBeInTheDocument();
        expect(screen.getByText("ほのぼの派")).toBeInTheDocument();
        expect(screen.getByText("定番派")).toBeInTheDocument();
      });
    });

    it("各パックに名前・説明・アイコンが表示される", async () => {
      render(<PackSelector visitorId={mockVisitorId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        // ホラーパックの確認
        expect(screen.getByText("ホラー好き")).toBeInTheDocument();
        expect(screen.getByText("恐怖と不気味さを求めるあなたに")).toBeInTheDocument();
        expect(screen.getByText("👻")).toBeInTheDocument();
      });
    });
  });

  describe("AC-2: パック選択（複数選択対応）", () => {
    it("パッククリックで選択状態になりハイライト表示される", async () => {
      const user = userEvent.setup();
      render(<PackSelector visitorId={mockVisitorId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText("ホラー好き")).toBeInTheDocument();
      });

      const packButton = getPackCard("ホラー好き");
      await user.click(packButton);

      // チェックマークが表示される
      expect(screen.getByTestId("pack-check")).toBeInTheDocument();
    });

    it("パック選択後は「推薦を開始」ボタンが有効になる", async () => {
      const user = userEvent.setup();
      render(<PackSelector visitorId={mockVisitorId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText("ホラー好き")).toBeInTheDocument();
      });

      const startButton = screen.getByRole("button", { name: /推薦を開始/ });
      expect(startButton).toBeDisabled();

      const packButton = getPackCard("ホラー好き");
      await user.click(packButton);

      expect(startButton).not.toBeDisabled();
    });

    it("複数のパックを同時に選択できる", async () => {
      const user = userEvent.setup();
      render(<PackSelector visitorId={mockVisitorId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText("ホラー好き")).toBeInTheDocument();
      });

      // ホラーを選択
      const horrorButton = getPackCard("ホラー好き");
      await user.click(horrorButton);

      // ミステリーも選択
      const mysteryButton = getPackCard("ミステリー派");
      await user.click(mysteryButton);

      // チェックマークは2つ
      expect(screen.getAllByTestId("pack-check")).toHaveLength(2);
    });

    it("選択したパックを再度クリックすると選択解除される", async () => {
      const user = userEvent.setup();
      render(<PackSelector visitorId={mockVisitorId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText("ホラー好き")).toBeInTheDocument();
      });

      const packButton = getPackCard("ホラー好き");

      // 選択
      await user.click(packButton);
      expect(screen.getByTestId("pack-check")).toBeInTheDocument();

      // 選択解除
      await user.click(packButton);
      expect(screen.queryByTestId("pack-check")).not.toBeInTheDocument();
    });
  });

  describe("AC-3: パック確定", () => {
    it("「推薦を開始」ボタンクリックでPOST /onboarding/select APIが呼び出される", async () => {
      const user = userEvent.setup();
      render(<PackSelector visitorId={mockVisitorId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText("ホラー好き")).toBeInTheDocument();
      });

      // パックを選択
      const packButton = getPackCard("ホラー好き");
      await user.click(packButton);

      // 確定ボタンをクリック
      const startButton = screen.getByRole("button", { name: /推薦を開始/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(mockSelectPost).toHaveBeenCalledWith({
          json: {
            visitorId: mockVisitorId,
            packTypes: ["horror"],
          },
        });
      });
    });

    it("複数パック選択時、全てのpackTypesがAPIに送信される", async () => {
      const user = userEvent.setup();
      render(<PackSelector visitorId={mockVisitorId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText("ホラー好き")).toBeInTheDocument();
      });

      // 複数パックを選択
      await user.click(getPackCard("ホラー好き"));
      await user.click(getPackCard("ミステリー派"));

      // 確定ボタンをクリック
      const startButton = screen.getByRole("button", { name: /推薦を開始/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(mockSelectPost).toHaveBeenCalledWith({
          json: {
            visitorId: mockVisitorId,
            packTypes: ["horror", "mystery"],
          },
        });
      });
    });

    it("確定成功時にonCompleteが呼ばれる", async () => {
      const user = userEvent.setup();
      render(<PackSelector visitorId={mockVisitorId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText("ホラー好き")).toBeInTheDocument();
      });

      // パックを選択して確定
      const packButton = getPackCard("ホラー好き");
      await user.click(packButton);

      const startButton = screen.getByRole("button", { name: /推薦を開始/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("AC-4: ローディング状態（一覧取得）", () => {
    it("パック一覧取得中はスケルトンローダーが表示される", () => {
      // API応答を遅延させる
      mockPacksGet.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({ packs: mockPacks }),
              });
            }, 1000)
          )
      );

      render(<PackSelector visitorId={mockVisitorId} onComplete={mockOnComplete} />);

      expect(screen.getByTestId("pack-selector-skeleton")).toBeInTheDocument();
    });

    it("パック一覧取得完了後はスケルトンローダーが非表示になる", async () => {
      render(<PackSelector visitorId={mockVisitorId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.queryByTestId("pack-selector-skeleton")).not.toBeInTheDocument();
      });
    });
  });

  describe("AC-5: ローディング状態（選択確定）", () => {
    it("パック選択確定中は「設定中...」と表示される", async () => {
      const user = userEvent.setup();

      // API応答を遅延させる
      mockSelectPost.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({ success: true }),
              });
            }, 1000)
          )
      );

      render(<PackSelector visitorId={mockVisitorId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText("ホラー好き")).toBeInTheDocument();
      });

      // パックを選択して確定
      const packButton = getPackCard("ホラー好き");
      await user.click(packButton);

      const startButton = screen.getByRole("button", { name: /推薦を開始/ });
      await user.click(startButton);

      // ローディング状態を確認
      expect(screen.getByRole("button", { name: /設定中.../ })).toBeInTheDocument();
    });

    it("確定中はパックカードが操作不可になる", async () => {
      const user = userEvent.setup();

      // API応答を遅延させる
      mockSelectPost.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({ success: true }),
              });
            }, 1000)
          )
      );

      render(<PackSelector visitorId={mockVisitorId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText("ホラー好き")).toBeInTheDocument();
      });

      // パックを選択して確定
      const packButton = getPackCard("ホラー好き");
      await user.click(packButton);

      const startButton = screen.getByRole("button", { name: /推薦を開始/ });
      await user.click(startButton);

      // パックカードがdisabledになることを確認
      const mainContent = screen.getByTestId("pack-selector");
      const allPackButtons = within(mainContent)
        .getAllByRole("button")
        .filter((btn) => btn !== startButton);
      allPackButtons.forEach((btn) => {
        const text = btn.textContent;
        if (text && (text.includes("好き") || text.includes("派"))) {
          expect(btn).toBeDisabled();
        }
      });
    });
  });

  describe("AC-6: エラーハンドリング（一覧取得）", () => {
    it("GET APIエラー時にエラーメッセージが表示される", async () => {
      mockPacksGet.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Internal Server Error" }),
      });

      render(<PackSelector visitorId={mockVisitorId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText("パック一覧の取得に失敗しました")).toBeInTheDocument();
      });
    });

    it("エラー時にリトライボタンが表示される", async () => {
      mockPacksGet.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Network Error" }),
      });

      render(<PackSelector visitorId={mockVisitorId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /リトライ/ })).toBeInTheDocument();
      });
    });

    it("リトライボタンクリックで再度API呼び出しが行われる", async () => {
      const user = userEvent.setup();
      let callCount = 0;

      mockPacksGet.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: "Error" }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ packs: mockPacks }),
        });
      });

      render(<PackSelector visitorId={mockVisitorId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /リトライ/ })).toBeInTheDocument();
      });

      // リトライをクリック
      await user.click(screen.getByRole("button", { name: /リトライ/ }));

      // 正常にパック一覧が表示される
      await waitFor(() => {
        expect(screen.getByText("ホラー好き")).toBeInTheDocument();
      });
    });
  });

  describe("AC-7: エラーハンドリング（選択確定）", () => {
    it("POST APIエラー時にエラーメッセージが表示される", async () => {
      const user = userEvent.setup();
      mockSelectPost.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ title: "選択に失敗しました" }),
      });

      render(<PackSelector visitorId={mockVisitorId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText("ホラー好き")).toBeInTheDocument();
      });

      // パックを選択して確定
      const packButton = getPackCard("ホラー好き");
      await user.click(packButton);

      const startButton = screen.getByRole("button", { name: /推薦を開始/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(
          screen.getByText("選択に失敗しました。もう一度お試しください。")
        ).toBeInTheDocument();
      });
    });

    it("エラー時に選択状態が維持される", async () => {
      const user = userEvent.setup();
      mockSelectPost.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Error" }),
      });

      render(<PackSelector visitorId={mockVisitorId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText("ホラー好き")).toBeInTheDocument();
      });

      // パックを選択して確定
      const packButton = getPackCard("ホラー好き");
      await user.click(packButton);

      const startButton = screen.getByRole("button", { name: /推薦を開始/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(
          screen.getByText("選択に失敗しました。もう一度お試しください。")
        ).toBeInTheDocument();
      });

      // 選択状態（チェックマーク）が維持されている
      expect(screen.getByTestId("pack-check")).toBeInTheDocument();
    });
  });
});
