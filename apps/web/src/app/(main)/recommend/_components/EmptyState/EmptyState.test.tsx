import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { EmptyState } from "./index";

describe("EmptyState", () => {
  it("「すべての推薦を読みました」メッセージが表示される", () => {
    render(<EmptyState />);

    expect(screen.getByText("すべての推薦を読みました")).toBeInTheDocument();
  });

  it("「好みを再設定」ボタンが表示される", () => {
    render(<EmptyState />);

    const link = screen.getByRole("link", { name: "好みを再設定" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/onboarding?reset=true");
  });

  it('data-testid="empty-state"が設定されている', () => {
    render(<EmptyState />);

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("説明文が表示される", () => {
    render(<EmptyState />);

    expect(screen.getByText(/好みを再設定すると、新しい推薦を受け取れます/)).toBeInTheDocument();
  });
});
