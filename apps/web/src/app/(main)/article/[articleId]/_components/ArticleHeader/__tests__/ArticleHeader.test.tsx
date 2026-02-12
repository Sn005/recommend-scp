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

// useArticleFavorite のモック
const mockToggleFavorite = vi.fn();
let mockIsFavorited = false;
vi.mock("@/shared/hooks/useArticleFavorite", () => ({
  useArticleFavorite: () => ({
    isFavorited: mockIsFavorited,
    isProcessing: false,
    toggleFavorite: mockToggleFavorite,
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
  }),
}));

describe("ArticleHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsFavorited = false;
  });

  it("戻るボタンが表示される", () => {
    render(<ArticleHeader articleId="scp-173" />);

    const backButton = screen.getByLabelText("戻る");
    expect(backButton).toBeInTheDocument();
  });

  it("戻るボタンをクリックするとrouter.back()が呼ばれる", () => {
    render(<ArticleHeader articleId="scp-173" />);

    const backButton = screen.getByLabelText("戻る");
    fireEvent.click(backButton);

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("お気に入りボタンが表示される", () => {
    render(<ArticleHeader articleId="scp-173" />);

    const favButton = screen.getByLabelText("お気に入りに追加");
    expect(favButton).toBeInTheDocument();
  });

  it("お気に入りボタンをクリックするとtoggleFavoriteが呼ばれる", () => {
    render(<ArticleHeader articleId="scp-173" />);

    const favButton = screen.getByLabelText("お気に入りに追加");
    fireEvent.click(favButton);

    expect(mockToggleFavorite).toHaveBeenCalledTimes(1);
  });

  it("お気に入り状態のときaria-labelが「お気に入りから削除」になる", () => {
    mockIsFavorited = true;
    render(<ArticleHeader articleId="scp-173" />);

    const favButton = screen.getByLabelText("お気に入りから削除");
    expect(favButton).toBeInTheDocument();
  });

  it("data-testid='article-header'が設定されている", () => {
    render(<ArticleHeader articleId="scp-173" />);

    expect(screen.getByTestId("article-header")).toBeInTheDocument();
  });
});
