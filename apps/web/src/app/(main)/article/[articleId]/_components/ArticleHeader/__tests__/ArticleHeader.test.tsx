/**
 * @file ArticleHeader コンポーネントのテスト
 * @description 記事閲覧ページヘッダーのUIテスト
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ArticleHeader } from "../index";

// next/navigation のモック
const mockBack = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}));

describe("ArticleHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("戻るボタンが表示される", () => {
    render(<ArticleHeader />);

    const backButton = screen.getByLabelText("戻る");
    expect(backButton).toBeInTheDocument();
  });

  it("戻るボタンをクリックするとrouter.back()が呼ばれる", () => {
    render(<ArticleHeader />);

    const backButton = screen.getByLabelText("戻る");
    fireEvent.click(backButton);

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("data-testid='article-header'が設定されている", () => {
    render(<ArticleHeader />);

    expect(screen.getByTestId("article-header")).toBeInTheDocument();
  });

  it("グラスモーフィズムのスタイルが適用されている", () => {
    render(<ArticleHeader />);

    const header = screen.getByTestId("article-header");
    expect(header).toHaveClass("bg-white/70");
    expect(header).toHaveClass("backdrop-blur-glass");
    expect(header).toHaveClass("shadow-sm");
  });
});
