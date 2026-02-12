/**
 * @file FloatingFavoriteButton コンポーネントのテスト
 * @description 記事閲覧ページのフローティングお気に入りボタンのUIテスト
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FloatingFavoriteButton } from "../index";

// useArticleFavorite のモック
const mockToggleFavorite = vi.fn();
let mockIsFavorited = true;
vi.mock("@/shared/hooks/useArticleFavorite", () => ({
  useArticleFavorite: () => ({
    isFavorited: mockIsFavorited,
    isProcessing: false,
    toggleFavorite: mockToggleFavorite,
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
  }),
}));

describe("FloatingFavoriteButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsFavorited = true;
  });

  it("data-testid='floating-favorite-button'が設定されている", () => {
    render(<FloatingFavoriteButton articleId="scp-173" />);

    expect(screen.getByTestId("floating-favorite-button")).toBeInTheDocument();
  });

  it("初期状態でお気に入り済み（お気に入り一覧からの遷移）", () => {
    render(<FloatingFavoriteButton articleId="scp-173" />);

    const button = screen.getByLabelText("お気に入りから削除");
    expect(button).toBeInTheDocument();
  });

  it("ボタンをクリックするとtoggleFavoriteが呼ばれる", () => {
    render(<FloatingFavoriteButton articleId="scp-173" />);

    const button = screen.getByLabelText("お気に入りから削除");
    fireEvent.click(button);

    expect(mockToggleFavorite).toHaveBeenCalledTimes(1);
  });

  it("お気に入り解除状態のときaria-labelが「お気に入りに追加」になる", () => {
    mockIsFavorited = false;
    render(<FloatingFavoriteButton articleId="scp-173" />);

    const button = screen.getByLabelText("お気に入りに追加");
    expect(button).toBeInTheDocument();
  });

  describe("デザイン準拠チェック", () => {
    it("fixed bottom-8 right-4で右下に配置される", () => {
      render(<FloatingFavoriteButton articleId="scp-173" />);

      const container = screen.getByTestId("floating-favorite-button");
      expect(container).toHaveClass("fixed");
      expect(container).toHaveClass("bottom-8");
      expect(container).toHaveClass("right-4");
    });

    it("z-navで適切なz-indexが設定されている", () => {
      render(<FloatingFavoriteButton articleId="scp-173" />);

      const container = screen.getByTestId("floating-favorite-button");
      expect(container).toHaveClass("z-nav");
    });

    it("グラスモーフィズムのスタイルが適用されている", () => {
      mockIsFavorited = false;
      render(<FloatingFavoriteButton articleId="scp-173" />);

      const button = screen.getByLabelText("お気に入りに追加");
      expect(button).toHaveClass("bg-white/30");
      expect(button).toHaveClass("backdrop-blur-glass");
      expect(button).toHaveClass("shadow-glass");
      expect(button).toHaveClass("rounded-full");
    });

    it("ボタンサイズがw-12 h-12（48px）", () => {
      mockIsFavorited = false;
      render(<FloatingFavoriteButton articleId="scp-173" />);

      const button = screen.getByLabelText("お気に入りに追加");
      expect(button).toHaveClass("w-12");
      expect(button).toHaveClass("h-12");
    });
  });
});
