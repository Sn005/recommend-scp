import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ErrorState } from "./index";

describe("ErrorState", () => {
  const testError = new Error("ネットワークエラー");
  const mockOnRetry = vi.fn();

  it("「エラーが発生しました」メッセージが表示される", () => {
    render(<ErrorState error={testError} onRetry={mockOnRetry} />);

    expect(screen.getByText("エラーが発生しました")).toBeInTheDocument();
  });

  it("エラーメッセージが表示される", () => {
    render(<ErrorState error={testError} onRetry={mockOnRetry} />);

    expect(screen.getByText(testError.message)).toBeInTheDocument();
  });

  it("「再試行」ボタンが表示される", () => {
    render(<ErrorState error={testError} onRetry={mockOnRetry} />);

    expect(screen.getByRole("button", { name: "再試行" })).toBeInTheDocument();
  });

  it("「再試行」ボタンをクリックするとonRetryが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<ErrorState error={testError} onRetry={mockOnRetry} />);

    const retryButton = screen.getByRole("button", { name: "再試行" });
    await user.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalled();
  });

  it('data-testid="error-state"が設定されている', () => {
    render(<ErrorState error={testError} onRetry={mockOnRetry} />);

    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("isRetrying=trueの場合、ボタンが無効化される", () => {
    render(<ErrorState error={testError} onRetry={mockOnRetry} isRetrying />);

    const retryButton = screen.getByRole("button", { name: "読み込み中..." });
    expect(retryButton).toBeDisabled();
  });

  it("エラーメッセージが空の場合、デフォルトメッセージが表示される", () => {
    const emptyError = new Error("");
    render(<ErrorState error={emptyError} onRetry={mockOnRetry} />);

    // 見出しと詳細メッセージの両方に「エラーが発生しました」が表示される
    const errorMessages = screen.getAllByText("エラーが発生しました");
    expect(errorMessages).toHaveLength(2);
  });
});
