/**
 * @file FavoriteList コンポーネントのテスト
 * @description お気に入りリストのUIテスト
 * @see specs/006-frontend/006-03-favorites/006-03-02.md
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { FavoriteList } from "../index";

// next/navigation のモック
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("FavoriteList", () => {
  const mockFavorites = [
    {
      id: "fav-1",
      articleId: "scp-173",
      title: "彫刻 - オリジナル",
      objectClass: "euclid",
      rating: 4102,
      favoritedAt: "2024-01-15T10:00:00.000Z",
    },
    {
      id: "fav-2",
      articleId: "scp-682",
      title: "不死身の爬虫類",
      objectClass: "keter",
      rating: 2841,
      favoritedAt: "2024-01-14T10:00:00.000Z",
    },
    {
      id: "fav-3",
      articleId: "scp-999",
      title: "くすぐりオバケ",
      objectClass: "safe",
      rating: 1256,
      favoritedAt: "2024-01-13T10:00:00.000Z",
    },
  ];

  const mockOnRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AC-5: リスト配置", () => {
    it("カードがspace-y-3で縦に配置される", () => {
      render(<FavoriteList favorites={mockFavorites} onRemove={mockOnRemove} />);

      const list = screen.getByTestId("favorite-list");
      expect(list).toHaveClass("space-y-3");
    });

    it("空配列の場合は何も表示されない", () => {
      render(<FavoriteList favorites={[]} onRemove={mockOnRemove} />);

      const cards = screen.queryAllByTestId("favorite-card");
      expect(cards).toHaveLength(0);
    });

    it("1件のみの場合は正しく表示される", () => {
      render(<FavoriteList favorites={[mockFavorites[0]]} onRemove={mockOnRemove} />);

      const cards = screen.getAllByTestId("favorite-card");
      expect(cards).toHaveLength(1);
    });

    it("複数件の場合は全て表示される", () => {
      render(<FavoriteList favorites={mockFavorites} onRemove={mockOnRemove} />);

      const cards = screen.getAllByTestId("favorite-card");
      expect(cards).toHaveLength(3);
    });
  });

  describe("AC-PC-3: カード間gap調整（PC版）", () => {
    it("リストにmd:gap-3クラスが付与される", () => {
      render(<FavoriteList favorites={mockFavorites} onRemove={mockOnRemove} />);

      const list = screen.getByTestId("favorite-list");
      expect(list.className).toContain("md:gap-3");
    });

    it("モバイル用space-y-3クラスが維持される", () => {
      render(<FavoriteList favorites={mockFavorites} onRemove={mockOnRemove} />);

      const list = screen.getByTestId("favorite-list");
      expect(list).toHaveClass("space-y-3");
    });
  });

  describe("統合テスト", () => {
    it("各カードにタイトルが表示される", () => {
      render(<FavoriteList favorites={mockFavorites} onRemove={mockOnRemove} />);

      expect(screen.getByText("彫刻 - オリジナル")).toBeInTheDocument();
      expect(screen.getByText("不死身の爬虫類")).toBeInTheDocument();
      expect(screen.getByText("くすぐりオバケ")).toBeInTheDocument();
    });

    it("removingIdsに含まれるIDのカードがisRemoving=trueで表示される", () => {
      const removingIds = new Set(["scp-173"]);
      render(
        <FavoriteList favorites={mockFavorites} onRemove={mockOnRemove} removingIds={removingIds} />
      );

      const cards = screen.getAllByTestId("favorite-card");
      // 最初のカードが削除中の状態
      expect(cards[0]).toHaveClass("opacity-0");
      // 他のカードは通常状態
      expect(cards[1]).not.toHaveClass("opacity-0");
      expect(cards[2]).not.toHaveClass("opacity-0");
    });

    it("removingIdsに複数のIDが含まれる場合、それぞれのカードがisRemoving=true", () => {
      const removingIds = new Set(["scp-173", "scp-999"]);
      render(
        <FavoriteList favorites={mockFavorites} onRemove={mockOnRemove} removingIds={removingIds} />
      );

      const cards = screen.getAllByTestId("favorite-card");
      expect(cards[0]).toHaveClass("opacity-0"); // scp-173
      expect(cards[1]).not.toHaveClass("opacity-0"); // scp-682
      expect(cards[2]).toHaveClass("opacity-0"); // scp-999
    });

    it("removingIdsがundefinedの場合は全カードが通常表示", () => {
      render(<FavoriteList favorites={mockFavorites} onRemove={mockOnRemove} />);

      const cards = screen.getAllByTestId("favorite-card");
      cards.forEach((card) => {
        expect(card).not.toHaveClass("opacity-0");
      });
    });

    it("100件のカードが正しくレンダリングされる", () => {
      const manyFavorites = Array.from({ length: 100 }, (_, i) => ({
        ...mockFavorites[0],
        id: `fav-${String(i)}`,
        articleId: `scp-${String(i)}`,
      }));

      render(<FavoriteList favorites={manyFavorites} onRemove={mockOnRemove} />);

      const cards = screen.getAllByTestId("favorite-card");
      expect(cards).toHaveLength(100);
    });
  });
});
