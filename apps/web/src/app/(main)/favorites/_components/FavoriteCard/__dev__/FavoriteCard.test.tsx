/**
 * @file FavoriteCard コンポーネントのテスト
 * @description お気に入りカードのUIテスト
 * @see specs/006-frontend/006-03-favorites/006-03-02.md
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FavoriteCard } from "../index";

// next/navigation のモック
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("FavoriteCard", () => {
  const mockArticle = {
    id: "fav-1",
    articleId: "scp-173",
    title: "彫刻 - オリジナル",
    objectClass: "euclid",
    rating: 4102,
    favoritedAt: "2024-01-15T10:00:00.000Z",
  };

  const mockOnRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AC-1: カード情報表示", () => {
    it("オブジェクトクラスバッジが正しく表示される", () => {
      render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} />);

      expect(screen.getByText("Euclid")).toBeInTheDocument();
    });

    it("評価が+付きで3桁区切りで表示される", () => {
      render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} />);

      expect(screen.getByText("+4,102")).toBeInTheDocument();
    });

    it("記事タイトルがfont-semiboldで表示される", () => {
      render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} />);

      const title = screen.getByText("彫刻 - オリジナル");
      expect(title).toHaveClass("font-semibold");
    });

    it("評価が0の場合は+0と表示される", () => {
      const articleWithZeroRating = { ...mockArticle, rating: 0 };
      render(<FavoriteCard article={articleWithZeroRating} onRemove={mockOnRemove} />);

      expect(screen.getByText("+0")).toBeInTheDocument();
    });

    it("評価がnullの場合は評価を表示しない", () => {
      const articleWithNullRating = { ...mockArticle, rating: null };
      render(<FavoriteCard article={articleWithNullRating} onRemove={mockOnRemove} />);

      expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
    });

    it("タイトルがnullの場合でもエラーにならない", () => {
      const articleWithNullTitle = { ...mockArticle, title: null };
      expect(() =>
        render(<FavoriteCard article={articleWithNullTitle} onRemove={mockOnRemove} />)
      ).not.toThrow();
    });

    it("objectClassがnullの場合はバッジを表示しない", () => {
      const articleWithNullClass = { ...mockArticle, objectClass: null };
      render(<FavoriteCard article={articleWithNullClass} onRemove={mockOnRemove} />);

      expect(screen.queryByText("Safe")).not.toBeInTheDocument();
      expect(screen.queryByText("Euclid")).not.toBeInTheDocument();
      expect(screen.queryByText("Keter")).not.toBeInTheDocument();
    });

    it("概要（excerpt）がある場合はline-clamp-1で表示される", () => {
      const articleWithExcerpt = {
        ...mockArticle,
        excerpt: "SCP-173は常に目視が必要な...",
      };
      render(<FavoriteCard article={articleWithExcerpt} onRemove={mockOnRemove} />);

      const excerpt = screen.getByText("SCP-173は常に目視が必要な...");
      expect(excerpt).toBeInTheDocument();
      expect(excerpt).toHaveClass("line-clamp-1");
      expect(excerpt).toHaveClass("text-gray-500");
    });

    it("概要（excerpt）がnullの場合は表示されない", () => {
      const articleWithNullExcerpt = { ...mockArticle, excerpt: null };
      render(<FavoriteCard article={articleWithNullExcerpt} onRemove={mockOnRemove} />);

      // excerptがないので概要は表示されない
      const card = screen.getByTestId("favorite-card");
      expect(card.querySelector(".line-clamp-1")).not.toBeInTheDocument();
    });

    it("概要（excerpt）がundefinedの場合は表示されない", () => {
      render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} />);

      // mockArticleにはexcerptがないので概要は表示されない
      const card = screen.getByTestId("favorite-card");
      expect(card.querySelector(".line-clamp-1")).not.toBeInTheDocument();
    });
  });

  describe("AC-2: カードタップで遷移", () => {
    it("カードタップで/article/{articleId}に遷移する", () => {
      render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} />);

      const card = screen.getByTestId("favorite-card");
      fireEvent.click(card);

      expect(mockPush).toHaveBeenCalledWith("/article/scp-173");
    });

    it("articleIdに特殊文字が含まれる場合は正しくエンコードされる", () => {
      const articleWithSpecialChars = { ...mockArticle, articleId: "scp-173?test=1&foo=bar" };
      render(<FavoriteCard article={articleWithSpecialChars} onRemove={mockOnRemove} />);

      const card = screen.getByTestId("favorite-card");
      fireEvent.click(card);

      expect(mockPush).toHaveBeenCalledWith(
        "/article/" + encodeURIComponent("scp-173?test=1&foo=bar")
      );
    });
  });

  describe("AC-3: 削除ボタン", () => {
    it("削除ボタンタップでonRemoveコールバックが呼ばれる", () => {
      render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} />);

      const removeButton = screen.getByLabelText("お気に入りから削除");
      fireEvent.click(removeButton);

      expect(mockOnRemove).toHaveBeenCalledWith("scp-173");
      expect(mockOnRemove).toHaveBeenCalledTimes(1);
    });

    it("削除ボタンタップ時にカードクリックイベントが発火しない", () => {
      render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} />);

      const removeButton = screen.getByLabelText("お気に入りから削除");
      fireEvent.click(removeButton);

      expect(mockPush).not.toHaveBeenCalled();
      expect(mockOnRemove).toHaveBeenCalledTimes(1);
    });

    it("削除ボタンにaria-labelが設定されている", () => {
      render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} />);

      const removeButton = screen.getByLabelText("お気に入りから削除");
      expect(removeButton).toHaveAttribute("aria-label", "お気に入りから削除");
    });
  });

  describe("AC-4: 削除アニメーション", () => {
    it("isRemoving=trueでopacity-0とscale-95が適用される", () => {
      render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} isRemoving={true} />);

      const card = screen.getByTestId("favorite-card");
      expect(card).toHaveClass("opacity-0");
      expect(card).toHaveClass("scale-95");
    });

    it("transition-all duration-300が適用される", () => {
      render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} />);

      const card = screen.getByTestId("favorite-card");
      expect(card).toHaveClass("transition-all");
      expect(card).toHaveClass("duration-300");
    });

    it("isRemoving=falseの場合は通常の表示状態", () => {
      render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} isRemoving={false} />);

      const card = screen.getByTestId("favorite-card");
      expect(card).not.toHaveClass("opacity-0");
      expect(card).not.toHaveClass("scale-95");
    });

    it("isRemoving=undefinedの場合は通常の表示状態", () => {
      render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} />);

      const card = screen.getByTestId("favorite-card");
      expect(card).not.toHaveClass("opacity-0");
      expect(card).not.toHaveClass("scale-95");
    });
  });

  describe("AC-6: 右矢印アイコン", () => {
    it("chevron-rightアイコンが表示される", () => {
      const { container } = render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} />);

      // SVGアイコンがtext-gray-300クラスを持つことで確認
      const icon = container.querySelector("svg.text-gray-300.flex-shrink-0");
      expect(icon).toBeInTheDocument();
    });

    it("アイコン色がtext-gray-300", () => {
      const { container } = render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} />);

      const icon = container.querySelector("svg.text-gray-300");
      expect(icon).toHaveClass("text-gray-300");
    });

    it("アイコンがflex-shrink-0で固定幅を確保している", () => {
      const { container } = render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} />);

      const icon = container.querySelector("svg.flex-shrink-0.text-gray-300");
      expect(icon).toHaveClass("flex-shrink-0");
    });
  });

  describe("AC-PC-2: カードホバーエフェクト（PC版クラス）", () => {
    it("カードにmd:hover:-translate-y-0.5クラスが付与される", () => {
      render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} />);

      const card = screen.getByTestId("favorite-card");
      expect(card.className).toContain("md:hover:-translate-y-0.5");
    });

    it("カードにmd:hover:shadow相当のshadowクラスが付与される", () => {
      render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} />);

      const card = screen.getByTestId("favorite-card");
      expect(card.className).toMatch(/md:hover:shadow/);
    });

    it("カードにmd:duration-200クラスが含まれる", () => {
      render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} />);

      const card = screen.getByTestId("favorite-card");
      expect(card.className).toContain("md:duration-200");
    });

    it("モバイル用のhover:-translate-yクラス（md:プレフィックスなし）は付与されない", () => {
      render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} />);

      const card = screen.getByTestId("favorite-card");
      const classes = card.className.split(" ");
      const mobileHoverTranslate = classes.filter(
        (c) => c.startsWith("hover:-translate-y") && !c.startsWith("md:")
      );
      expect(mobileHoverTranslate).toHaveLength(0);
    });

    it("isRemoving=trueの場合もhoverクラスが共存する", () => {
      render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} isRemoving={true} />);

      const card = screen.getByTestId("favorite-card");
      expect(card.className).toContain("md:hover:-translate-y-0.5");
    });
  });

  describe("AC-PC-3: カードパディング調整（PC版）", () => {
    it("カードにmd:p-5クラスが付与される", () => {
      render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} />);

      const card = screen.getByTestId("favorite-card");
      expect(card.className).toContain("md:p-5");
    });

    it("モバイル用p-4クラスが維持される", () => {
      render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} />);

      const card = screen.getByTestId("favorite-card");
      expect(card).toHaveClass("p-4");
    });
  });

  describe("デザイン準拠チェック", () => {
    it("カード背景色がwhite（bg-white）", () => {
      render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} />);

      const card = screen.getByTestId("favorite-card");
      expect(card).toHaveClass("bg-white");
    });

    it("border-radiusが12px（rounded-xl）", () => {
      render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} />);

      const card = screen.getByTestId("favorite-card");
      expect(card).toHaveClass("rounded-xl");
    });

    it("paddingが16px（p-4）", () => {
      render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} />);

      const card = screen.getByTestId("favorite-card");
      expect(card).toHaveClass("p-4");
    });

    it("カーソルがpointer", () => {
      render(<FavoriteCard article={mockArticle} onRemove={mockOnRemove} />);

      const card = screen.getByTestId("favorite-card");
      expect(card).toHaveClass("cursor-pointer");
    });
  });
});
