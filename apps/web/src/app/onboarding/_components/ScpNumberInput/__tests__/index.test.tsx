import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// api-clientをモック（他のimportより先に定義）
const mockCustomPost = vi.fn<
  (params: { json: { visitorId: string; articleIds: string[] } }) => Promise<{
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
  }>
>();

vi.mock("@/shared/lib/api-client", () => ({
  api: {
    onboarding: {
      select: {
        custom: {
          $post: (params: { json: { visitorId: string; articleIds: string[] } }) =>
            mockCustomPost(params),
        },
      },
    },
  },
}));

// コンポーネントをインポート（モックの後）
import { ScpNumberInput } from "../index";

describe("ScpNumberInput", () => {
  const mockOnComplete = vi.fn();
  const mockOnBack = vi.fn();
  const mockVisitorId = "test-visitor-id";

  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトの成功レスポンスを設定
    mockCustomPost.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, visitorId: mockVisitorId, articleCount: 3 }),
    });
  });

  describe("AC-1: SCP番号入力フォーム", () => {
    it("初回表示時に入力フィールドと「追加」ボタンが表示される", () => {
      render(
        <ScpNumberInput visitorId={mockVisitorId} onComplete={mockOnComplete} onBack={mockOnBack} />
      );

      expect(screen.getByPlaceholderText("例: 173, SCP-682")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "追加" })).toBeInTheDocument();
    });

    it("初回表示時に「まだSCP番号が入力されていません」メッセージが表示される", () => {
      render(
        <ScpNumberInput visitorId={mockVisitorId} onComplete={mockOnComplete} onBack={mockOnBack} />
      );

      expect(screen.getByText("まだSCP番号が入力されていません")).toBeInTheDocument();
    });
  });

  describe("AC-2: SCP番号追加", () => {
    it("有効な形式（173）で追加できる", async () => {
      const user = userEvent.setup();
      render(
        <ScpNumberInput visitorId={mockVisitorId} onComplete={mockOnComplete} onBack={mockOnBack} />
      );

      const input = screen.getByPlaceholderText("例: 173, SCP-682");
      await user.type(input, "173");

      const addButton = screen.getByRole("button", { name: "追加" });
      await user.click(addButton);

      expect(screen.getByText("SCP-173")).toBeInTheDocument();
    });

    it("有効な形式（SCP-682）で追加できる", async () => {
      const user = userEvent.setup();
      render(
        <ScpNumberInput visitorId={mockVisitorId} onComplete={mockOnComplete} onBack={mockOnBack} />
      );

      const input = screen.getByPlaceholderText("例: 173, SCP-682");
      await user.type(input, "SCP-682");

      const addButton = screen.getByRole("button", { name: "追加" });
      await user.click(addButton);

      expect(screen.getByText("SCP-682")).toBeInTheDocument();
    });

    it("追加後に入力フィールドがクリアされる", async () => {
      const user = userEvent.setup();
      render(
        <ScpNumberInput visitorId={mockVisitorId} onComplete={mockOnComplete} onBack={mockOnBack} />
      );

      const input = screen.getByPlaceholderText<HTMLInputElement>("例: 173, SCP-682");
      await user.type(input, "173");
      expect(input.value).toBe("173");

      const addButton = screen.getByRole("button", { name: "追加" });
      await user.click(addButton);

      expect(input.value).toBe("");
    });
  });

  describe("AC-3: 入力形式バリデーション", () => {
    it("無効な形式でエラーメッセージが表示される", async () => {
      const user = userEvent.setup();
      render(
        <ScpNumberInput visitorId={mockVisitorId} onComplete={mockOnComplete} onBack={mockOnBack} />
      );

      const input = screen.getByPlaceholderText("例: 173, SCP-682");
      await user.type(input, "invalid");

      const addButton = screen.getByRole("button", { name: "追加" });
      await user.click(addButton);

      expect(screen.getByText("無効な形式です。例: 173, SCP-173")).toBeInTheDocument();
    });
  });

  describe("AC-4: 重複チェック", () => {
    it("既に追加済みの番号を入力すると「既に追加済みです」エラーが表示される", async () => {
      const user = userEvent.setup();
      render(
        <ScpNumberInput visitorId={mockVisitorId} onComplete={mockOnComplete} onBack={mockOnBack} />
      );

      const input = screen.getByPlaceholderText("例: 173, SCP-682");
      const addButton = screen.getByRole("button", { name: "追加" });

      // 1回目の追加
      await user.type(input, "173");
      await user.click(addButton);

      // 2回目の追加（重複）
      await user.type(input, "SCP-173");
      await user.click(addButton);

      expect(screen.getByText("既に追加済みです")).toBeInTheDocument();
    });
  });

  describe("AC-5: SCP番号削除", () => {
    it("「×」クリックで番号が削除される", async () => {
      const user = userEvent.setup();
      render(
        <ScpNumberInput visitorId={mockVisitorId} onComplete={mockOnComplete} onBack={mockOnBack} />
      );

      const input = screen.getByPlaceholderText("例: 173, SCP-682");
      const addButton = screen.getByRole("button", { name: "追加" });

      await user.type(input, "173");
      await user.click(addButton);

      expect(screen.getByText("SCP-173")).toBeInTheDocument();

      // 削除ボタンをクリック
      const deleteButton = screen.getByLabelText("SCP-173を削除");
      await user.click(deleteButton);

      expect(screen.queryByText("SCP-173")).not.toBeInTheDocument();
    });
  });

  describe("AC-6: 最低件数チェック", () => {
    it("3件未満では「始める」ボタンが無効", async () => {
      const user = userEvent.setup();
      render(
        <ScpNumberInput visitorId={mockVisitorId} onComplete={mockOnComplete} onBack={mockOnBack} />
      );

      const input = screen.getByPlaceholderText("例: 173, SCP-682");
      const addButton = screen.getByRole("button", { name: "追加" });

      await user.type(input, "173");
      await user.click(addButton);

      await user.type(input, "682");
      await user.click(addButton);

      const startButton = screen.getByRole("button", { name: /始める/ });
      expect(startButton).toBeDisabled();
    });

    it("3件未満では「あと○件必要です」メッセージが表示される", async () => {
      const user = userEvent.setup();
      render(
        <ScpNumberInput visitorId={mockVisitorId} onComplete={mockOnComplete} onBack={mockOnBack} />
      );

      // 初期状態で3件必要
      expect(screen.getByText("あと3件必要です")).toBeInTheDocument();

      const input = screen.getByPlaceholderText("例: 173, SCP-682");
      const addButton = screen.getByRole("button", { name: "追加" });

      await user.type(input, "173");
      await user.click(addButton);

      expect(screen.getByText("あと2件必要です")).toBeInTheDocument();

      await user.type(input, "682");
      await user.click(addButton);

      expect(screen.getByText("あと1件必要です")).toBeInTheDocument();
    });

    it("3件以上で「始める」ボタンが有効になる", async () => {
      const user = userEvent.setup();
      render(
        <ScpNumberInput visitorId={mockVisitorId} onComplete={mockOnComplete} onBack={mockOnBack} />
      );

      const input = screen.getByPlaceholderText("例: 173, SCP-682");
      const addButton = screen.getByRole("button", { name: "追加" });

      await user.type(input, "173");
      await user.click(addButton);

      await user.type(input, "682");
      await user.click(addButton);

      await user.type(input, "999");
      await user.click(addButton);

      const startButton = screen.getByRole("button", { name: /始める/ });
      expect(startButton).not.toBeDisabled();
    });
  });

  describe("AC-7: オンボーディング確定", () => {
    it("「始める」クリックでPOST /onboarding/select/custom APIが呼び出される", async () => {
      const user = userEvent.setup();
      render(
        <ScpNumberInput visitorId={mockVisitorId} onComplete={mockOnComplete} onBack={mockOnBack} />
      );

      const input = screen.getByPlaceholderText("例: 173, SCP-682");
      const addButton = screen.getByRole("button", { name: "追加" });

      await user.type(input, "173");
      await user.click(addButton);

      await user.type(input, "682");
      await user.click(addButton);

      await user.type(input, "999");
      await user.click(addButton);

      const startButton = screen.getByRole("button", { name: /始める/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(mockCustomPost).toHaveBeenCalledWith({
          json: {
            visitorId: mockVisitorId,
            articleIds: ["scp-173", "scp-682", "scp-999"],
          },
        });
      });
    });

    it("確定中は「設定中...」と表示される", async () => {
      const user = userEvent.setup();

      // API応答を遅延させる
      mockCustomPost.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => {
              resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ success: true }),
              });
            }, 1000)
          )
      );

      render(
        <ScpNumberInput visitorId={mockVisitorId} onComplete={mockOnComplete} onBack={mockOnBack} />
      );

      const input = screen.getByPlaceholderText("例: 173, SCP-682");
      const addButton = screen.getByRole("button", { name: "追加" });

      await user.type(input, "173");
      await user.click(addButton);

      await user.type(input, "682");
      await user.click(addButton);

      await user.type(input, "999");
      await user.click(addButton);

      const startButton = screen.getByRole("button", { name: /始める/ });
      await user.click(startButton);

      expect(screen.getByRole("button", { name: /設定中.../ })).toBeInTheDocument();
    });

    it("確定成功時にonCompleteが呼ばれる", async () => {
      const user = userEvent.setup();
      render(
        <ScpNumberInput visitorId={mockVisitorId} onComplete={mockOnComplete} onBack={mockOnBack} />
      );

      const input = screen.getByPlaceholderText("例: 173, SCP-682");
      const addButton = screen.getByRole("button", { name: "追加" });

      await user.type(input, "173");
      await user.click(addButton);

      await user.type(input, "682");
      await user.click(addButton);

      await user.type(input, "999");
      await user.click(addButton);

      const startButton = screen.getByRole("button", { name: /始める/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("AC-8: 存在しないSCP番号エラー", () => {
    it("存在しないSCPエラー時に該当番号がハイライト表示される", async () => {
      const user = userEvent.setup();

      mockCustomPost.mockResolvedValue({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve({
            type: "https://recommend-scp.dev/errors/not-found",
            title: "Articles Not Found",
            status: 404,
            detail: "Some articles were not found",
            invalidIds: ["scp-9999"],
          }),
      });

      render(
        <ScpNumberInput visitorId={mockVisitorId} onComplete={mockOnComplete} onBack={mockOnBack} />
      );

      const input = screen.getByPlaceholderText("例: 173, SCP-682");
      const addButton = screen.getByRole("button", { name: "追加" });

      await user.type(input, "173");
      await user.click(addButton);

      await user.type(input, "682");
      await user.click(addButton);

      await user.type(input, "9999");
      await user.click(addButton);

      const startButton = screen.getByRole("button", { name: /始める/ });
      await user.click(startButton);

      await waitFor(() => {
        // エラーメッセージが表示される
        expect(screen.getByText(/存在しないSCP番号があります/)).toBeInTheDocument();
      });

      // ハイライト表示されたタグを確認（赤い背景色）
      const invalidTag = screen.getByText("SCP-9999").closest("span");
      expect(invalidTag).toHaveClass("bg-red-100");
    });
  });

  describe("AC-9: 戻るボタン", () => {
    it("「戻る」クリックでonBackが呼ばれる", async () => {
      const user = userEvent.setup();
      render(
        <ScpNumberInput visitorId={mockVisitorId} onComplete={mockOnComplete} onBack={mockOnBack} />
      );

      const backButton = screen.getByText("← 戻る");
      await user.click(backButton);

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("AC-10: キーボード操作", () => {
    it("Enterキーで追加できる", async () => {
      const user = userEvent.setup();
      render(
        <ScpNumberInput visitorId={mockVisitorId} onComplete={mockOnComplete} onBack={mockOnBack} />
      );

      const input = screen.getByPlaceholderText("例: 173, SCP-682");
      await user.type(input, "173");
      await user.keyboard("{Enter}");

      expect(screen.getByText("SCP-173")).toBeInTheDocument();
    });
  });
});
