/**
 * @file ResetConfirmDialog コンポーネントテスト
 * @description 013-01-03: フロントエンドUI（ドロワー・確認ダイアログ）
 * @see specs/013-preference-reset/013-01-preference-reset/013-01-03.md
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ResetConfirmDialog } from "../ResetConfirmDialog";

// APIクライアントのモック
const mockResetPost = vi.fn();
vi.mock("@/shared/lib/api-client", () => ({
  api: {
    visitors: {
      reset: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- テスト用モック
        $post: (...args: unknown[]) => mockResetPost(...args),
      },
    },
  },
}));

describe("ResetConfirmDialog", () => {
  const defaultProps = {
    visitorId: "test-visitor-id",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockResetPost.mockResolvedValue({ ok: true });
  });

  describe("AC-2: 確認ダイアログ表示", () => {
    it("確認ダイアログにタイトル「推薦をリセット」が表示される", () => {
      render(<ResetConfirmDialog {...defaultProps} />);

      expect(screen.getByText("推薦をリセット")).toBeInTheDocument();
    });

    it("確認ダイアログにリセット内容の説明が表示される", () => {
      render(<ResetConfirmDialog {...defaultProps} />);

      expect(
        screen.getByText("これまでの趣味嗜好データが初期化され、オンボーディングからやり直します。")
      ).toBeInTheDocument();
    });

    it("確認ダイアログに保持データの説明が表示される", () => {
      render(<ResetConfirmDialog {...defaultProps} />);

      expect(screen.getByText("※ お気に入りと閲覧履歴は保持されます。")).toBeInTheDocument();
    });

    it("「リセットする」ボタンが赤系カラーで表示される", () => {
      render(<ResetConfirmDialog {...defaultProps} />);

      const confirmButton = screen.getByTestId("reset-confirm");
      expect(confirmButton).toHaveClass("bg-red-600");
      expect(confirmButton).toHaveTextContent("リセットする");
    });

    it("「キャンセル」ボタンが表示される", () => {
      render(<ResetConfirmDialog {...defaultProps} />);

      const cancelButton = screen.getByTestId("reset-cancel");
      expect(cancelButton).toHaveTextContent("キャンセル");
    });

    it('ダイアログにrole="dialog"が設定される', () => {
      render(<ResetConfirmDialog {...defaultProps} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("AC-3: キャンセル操作", () => {
    it("「キャンセル」タップでonCancelが呼ばれる", async () => {
      const user = userEvent.setup();
      render(<ResetConfirmDialog {...defaultProps} />);

      await user.click(screen.getByTestId("reset-cancel"));

      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it("ダイアログ外タップでonCancelが呼ばれる", async () => {
      const user = userEvent.setup();
      render(<ResetConfirmDialog {...defaultProps} />);

      await user.click(screen.getByTestId("reset-dialog-overlay"));

      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it("ダイアログ内クリックではonCancelが呼ばれない", async () => {
      const user = userEvent.setup();
      render(<ResetConfirmDialog {...defaultProps} />);

      await user.click(screen.getByTestId("reset-dialog"));

      expect(defaultProps.onCancel).not.toHaveBeenCalled();
    });

    it("Escapeキーでダイアログが閉じる", async () => {
      const user = userEvent.setup();
      render(<ResetConfirmDialog {...defaultProps} />);

      await user.keyboard("{Escape}");

      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it("キャンセル時にAPIは呼ばれない", async () => {
      const user = userEvent.setup();
      render(<ResetConfirmDialog {...defaultProps} />);

      await user.click(screen.getByTestId("reset-cancel"));

      expect(mockResetPost).not.toHaveBeenCalled();
    });
  });

  describe("AC-4: リセット実行", () => {
    it("「リセットする」タップでPOST /visitors/reset APIが呼び出される", async () => {
      const user = userEvent.setup();
      render(<ResetConfirmDialog {...defaultProps} />);

      await user.click(screen.getByTestId("reset-confirm"));

      await waitFor(() => {
        expect(mockResetPost).toHaveBeenCalledWith({
          json: { visitorId: "test-visitor-id" },
        });
      });
    });

    it("API成功後にonConfirmが呼ばれる", async () => {
      const user = userEvent.setup();
      render(<ResetConfirmDialog {...defaultProps} />);

      await user.click(screen.getByTestId("reset-confirm"));

      await waitFor(() => {
        expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("AC-5: エラーハンドリング", () => {
    it("API失敗時にエラーメッセージが表示される", async () => {
      mockResetPost.mockRejectedValueOnce(new Error("Network error"));
      const user = userEvent.setup();
      render(<ResetConfirmDialog {...defaultProps} />);

      await user.click(screen.getByTestId("reset-confirm"));

      await waitFor(() => {
        expect(screen.getByTestId("reset-error")).toBeInTheDocument();
        expect(
          screen.getByText("リセットに失敗しました。もう一度お試しください。")
        ).toBeInTheDocument();
      });
    });

    it("API失敗時にonConfirmが呼ばれない", async () => {
      mockResetPost.mockRejectedValueOnce(new Error("Network error"));
      const user = userEvent.setup();
      render(<ResetConfirmDialog {...defaultProps} />);

      await user.click(screen.getByTestId("reset-confirm"));

      await waitFor(() => {
        expect(screen.getByTestId("reset-error")).toBeInTheDocument();
      });
      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });

    it("API失敗後にリトライ可能（ダイアログは閉じない）", async () => {
      mockResetPost.mockRejectedValueOnce(new Error("Network error"));
      const user = userEvent.setup();
      render(<ResetConfirmDialog {...defaultProps} />);

      // 1回目: 失敗
      await user.click(screen.getByTestId("reset-confirm"));
      await waitFor(() => {
        expect(screen.getByTestId("reset-error")).toBeInTheDocument();
      });

      // 2回目: 成功
      mockResetPost.mockResolvedValueOnce({ ok: true });
      await user.click(screen.getByTestId("reset-confirm"));

      await waitFor(() => {
        expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("AC-6: 二重送信防止", () => {
    it("API呼び出し中にローディング表示される", async () => {
      // 解決しないPromiseでAPI呼び出し中を維持
      mockResetPost.mockReturnValueOnce(
        new Promise(() => {
          /* never resolves */
        })
      );
      const user = userEvent.setup();
      render(<ResetConfirmDialog {...defaultProps} />);

      await user.click(screen.getByTestId("reset-confirm"));

      await waitFor(() => {
        expect(screen.getByTestId("reset-confirm")).toHaveTextContent("リセット中...");
      });
    });

    it("API呼び出し中にボタンが無効化される", async () => {
      mockResetPost.mockReturnValueOnce(
        new Promise(() => {
          /* never resolves */
        })
      );
      const user = userEvent.setup();
      render(<ResetConfirmDialog {...defaultProps} />);

      await user.click(screen.getByTestId("reset-confirm"));

      await waitFor(() => {
        expect(screen.getByTestId("reset-confirm")).toBeDisabled();
        expect(screen.getByTestId("reset-cancel")).toBeDisabled();
      });
    });
  });
});
