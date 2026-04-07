/**
 * @file お気に入りページのテスト
 * @description お気に入り画面の統合テスト
 * @see specs/006-frontend/006-03-favorites/006-03-01.md
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FavoritesPage from "../page";

// モック
vi.mock("../_hooks/useFavorites");
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));
vi.mock("@/shared/components/ui/Drawer", () => ({
  useDrawer: vi.fn(),
  DrawerProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { useFavorites } from "../_hooks/useFavorites";
import { useRouter } from "next/navigation";
import { useDrawer } from "@/shared/components/ui/Drawer";

// モックの型アサーション
const mockUseFavorites = vi.mocked(useFavorites);
const mockUseRouter = vi.mocked(useRouter);
const mockUseDrawer = vi.mocked(useDrawer);

// モックデータ
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

describe("FavoritesPage", () => {
  const mockPush = vi.fn();
  const mockRefresh = vi.fn();
  const mockRemoveFavorite = vi.fn();
  const mockToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのモック設定
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    } as ReturnType<typeof useRouter>);

    mockUseDrawer.mockReturnValue({
      isOpen: false,
      open: vi.fn(),
      close: vi.fn(),
      toggle: mockToggle,
    });

    // デフォルト: 正常データ取得
    mockUseFavorites.mockReturnValue({
      favorites: mockFavorites,
      isLoading: false,
      error: null,
      removeFavorite: mockRemoveFavorite,
      refresh: mockRefresh,
    });
  });

  describe("AC-1: ページルーティング", () => {
    it("/favorites でページが表示される", () => {
      render(<FavoritesPage />);

      expect(screen.getByTestId("favorites-page")).toBeInTheDocument();
    });
  });

  describe("AC-2: ヘッダー表示", () => {
    it("ヘッダーに「お気に入り」タイトルが表示される", () => {
      render(<FavoritesPage />);

      expect(screen.getByText("お気に入り")).toBeInTheDocument();
    });

    it('右側に件数が表示される（例: "3件"）', () => {
      render(<FavoritesPage />);

      expect(screen.getByText("3件")).toBeInTheDocument();
    });

    it('0件の場合は"0件"と表示される', () => {
      mockUseFavorites.mockReturnValue({
        favorites: [],
        isLoading: false,
        error: null,
        removeFavorite: mockRemoveFavorite,
        refresh: mockRefresh,
      });

      render(<FavoritesPage />);

      expect(screen.getByText("0件")).toBeInTheDocument();
    });

    it("100件以上の場合も正しく表示される", () => {
      const manyFavorites = Array.from({ length: 150 }, (_, i) => ({
        ...mockFavorites[0],
        id: `fav-${String(i)}`,
        articleId: `scp-${String(i)}`,
      }));

      mockUseFavorites.mockReturnValue({
        favorites: manyFavorites,
        isLoading: false,
        error: null,
        removeFavorite: mockRemoveFavorite,
        refresh: mockRefresh,
      });

      render(<FavoritesPage />);

      expect(screen.getByText("150件")).toBeInTheDocument();
    });
  });

  // AC-3: MenuButton はMainLayoutの責務のため、layout.test.tsx でテスト済み

  describe("AC-4: 空状態", () => {
    beforeEach(() => {
      mockUseFavorites.mockReturnValue({
        favorites: [],
        isLoading: false,
        error: null,
        removeFavorite: mockRemoveFavorite,
        refresh: mockRefresh,
      });
    });

    it("お気に入りが0件の場合、EmptyStateコンポーネントが表示される", () => {
      render(<FavoritesPage />);

      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });

    it("「まだお気に入りがありません」メッセージが表示される", () => {
      render(<FavoritesPage />);

      expect(screen.getByText("まだお気に入りがありません")).toBeInTheDocument();
    });

    it("補足メッセージが表示される", () => {
      render(<FavoritesPage />);

      expect(
        screen.getByText("気に入った記事を保存して、いつでも読み返せます")
      ).toBeInTheDocument();
    });
  });

  describe("AC-5: エラー状態", () => {
    beforeEach(() => {
      mockUseFavorites.mockReturnValue({
        favorites: [],
        isLoading: false,
        error: new Error("Failed to fetch favorites"),
        removeFavorite: mockRemoveFavorite,
        refresh: mockRefresh,
      });
    });

    it("API取得に失敗した場合、ErrorStateコンポーネントが表示される", () => {
      render(<FavoritesPage />);

      expect(screen.getByTestId("error-state")).toBeInTheDocument();
    });

    it("「読み込みに失敗しました」メッセージが表示される", () => {
      render(<FavoritesPage />);

      expect(screen.getByText("読み込みに失敗しました")).toBeInTheDocument();
    });

    it("「再試行」ボタンが表示される", () => {
      render(<FavoritesPage />);

      expect(screen.getByRole("button", { name: /再試行/ })).toBeInTheDocument();
    });

    it("ボタンタップでrefreshを呼び出す", async () => {
      const user = userEvent.setup();
      render(<FavoritesPage />);

      const button = screen.getByRole("button", { name: /再試行/ });
      await user.click(button);

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe("AC-6: ローディング状態", () => {
    beforeEach(() => {
      mockUseFavorites.mockReturnValue({
        favorites: [],
        isLoading: true,
        error: null,
        removeFavorite: mockRemoveFavorite,
        refresh: mockRefresh,
      });
    });

    it("データ取得中の場合、スケルトンローダーが表示される", () => {
      render(<FavoritesPage />);

      expect(screen.getByTestId("skeleton-loader")).toBeInTheDocument();
    });

    it("カード形状のプレースホルダーが3つ表示される", () => {
      render(<FavoritesPage />);

      const placeholders = screen.getAllByTestId("skeleton-card");
      expect(placeholders).toHaveLength(3);
    });
  });

  describe("AC-8: 全体統合", () => {
    it("ページが正常に読み込まれた際、FavoriteListにデータを渡して表示する", () => {
      render(<FavoritesPage />);

      expect(screen.getByTestId("favorite-list")).toBeInTheDocument();

      const cards = screen.getAllByTestId("favorite-card");
      expect(cards).toHaveLength(mockFavorites.length);
    });

    it("削除操作がuseFavorites.removeFavoriteを呼び出す", async () => {
      const user = userEvent.setup();
      render(<FavoritesPage />);

      const deleteButtons = screen.getAllByRole("button", { name: /お気に入りから削除/i });
      await user.click(deleteButtons[0]);

      expect(mockRemoveFavorite).toHaveBeenCalledWith("scp-173");
    });

    it("各カードにタイトルが表示される", () => {
      render(<FavoritesPage />);

      expect(screen.getByText("彫刻 - オリジナル")).toBeInTheDocument();
      expect(screen.getByText("不死身の爬虫類")).toBeInTheDocument();
      expect(screen.getByText("くすぐりオバケ")).toBeInTheDocument();
    });
  });

  describe("AC-PC-1: コンテンツ中央寄せ（PC版レイアウト）", () => {
    it("中央カラムにmd:max-w-[768px]とmd:shrink-0が適用される", () => {
      render(<FavoritesPage />);

      const page = screen.getByTestId("favorites-page");
      const centerColumn = page.querySelector(".md\\:max-w-\\[768px\\]");
      expect(centerColumn).toBeInTheDocument();
      expect(centerColumn?.className).toContain("md:shrink-0");
    });

    it("三カラムレイアウトにmd:flexが適用される", () => {
      render(<FavoritesPage />);

      const page = screen.getByTestId("favorites-page");
      const flexWrapper = page.querySelector(".md\\:flex");
      expect(flexWrapper).toBeInTheDocument();
    });

    it("ローディング状態でもmd:max-w-[768px]が適用される", () => {
      mockUseFavorites.mockReturnValue({
        favorites: [],
        isLoading: true,
        error: null,
        removeFavorite: mockRemoveFavorite,
        refresh: mockRefresh,
      });

      render(<FavoritesPage />);

      const page = screen.getByTestId("favorites-page");
      const centerColumn = page.querySelector(".md\\:max-w-\\[768px\\]");
      expect(centerColumn).toBeInTheDocument();
    });

    it("エラー状態でもmd:max-w-[768px]が適用される", () => {
      mockUseFavorites.mockReturnValue({
        favorites: [],
        isLoading: false,
        error: new Error("error"),
        removeFavorite: mockRemoveFavorite,
        refresh: mockRefresh,
      });

      render(<FavoritesPage />);

      const page = screen.getByTestId("favorites-page");
      const centerColumn = page.querySelector(".md\\:max-w-\\[768px\\]");
      expect(centerColumn).toBeInTheDocument();
    });

    it("空状態でもmd:max-w-[768px]が適用される", () => {
      mockUseFavorites.mockReturnValue({
        favorites: [],
        isLoading: false,
        error: null,
        removeFavorite: mockRemoveFavorite,
        refresh: mockRefresh,
      });

      render(<FavoritesPage />);

      const page = screen.getByTestId("favorites-page");
      const centerColumn = page.querySelector(".md\\:max-w-\\[768px\\]");
      expect(centerColumn).toBeInTheDocument();
    });
  });

  describe("AC-PC-4: ページタイトルpadding調整（PC版）", () => {
    it("ヘッダーにmd:pl-4クラスが付与される", () => {
      render(<FavoritesPage />);

      const title = screen.getByText("お気に入り");
      const header = title.closest("div");
      expect(header?.className).toContain("md:pl-4");
    });

    it("モバイル用pl-12クラスが維持される", () => {
      render(<FavoritesPage />);

      const title = screen.getByText("お気に入り");
      const header = title.closest("div");
      expect(header).toHaveClass("pl-12");
    });

    it("ローディング状態のヘッダーにもmd:pl-4が付与される", () => {
      mockUseFavorites.mockReturnValue({
        favorites: [],
        isLoading: true,
        error: null,
        removeFavorite: mockRemoveFavorite,
        refresh: mockRefresh,
      });

      render(<FavoritesPage />);

      const title = screen.getByText("お気に入り");
      const header = title.closest("div");
      expect(header?.className).toContain("md:pl-4");
    });

    it("エラー状態のヘッダーにもmd:pl-4が付与される", () => {
      mockUseFavorites.mockReturnValue({
        favorites: [],
        isLoading: false,
        error: new Error("error"),
        removeFavorite: mockRemoveFavorite,
        refresh: mockRefresh,
      });

      render(<FavoritesPage />);

      const title = screen.getByText("お気に入り");
      const header = title.closest("div");
      expect(header?.className).toContain("md:pl-4");
    });

    it("空状態のヘッダーにもmd:pl-4が付与される", () => {
      mockUseFavorites.mockReturnValue({
        favorites: [],
        isLoading: false,
        error: null,
        removeFavorite: mockRemoveFavorite,
        refresh: mockRefresh,
      });

      render(<FavoritesPage />);

      const title = screen.getByText("お気に入り");
      const header = title.closest("div");
      expect(header?.className).toContain("md:pl-4");
    });
  });

  describe("AC-PC-5: モバイル非破壊確認", () => {
    it("PC版クラス追加後もカードクリックでarticleページへ遷移できる", async () => {
      const user = userEvent.setup();
      render(<FavoritesPage />);

      const cards = screen.getAllByTestId("favorite-card");
      await user.click(cards[0]);

      expect(mockPush).toHaveBeenCalledWith("/article/scp-173");
    });

    it("PC版クラス追加後も削除ボタンでonRemoveが呼ばれる", async () => {
      const user = userEvent.setup();
      render(<FavoritesPage />);

      const deleteButtons = screen.getAllByRole("button", { name: /お気に入りから削除/i });
      await user.click(deleteButtons[0]);

      expect(mockRemoveFavorite).toHaveBeenCalledWith("scp-173");
    });
  });

  describe("デザイン準拠チェック", () => {
    it("ヘッダーのタイトルにtext-lg font-semibold text-gray-800が適用される", () => {
      render(<FavoritesPage />);

      const title = screen.getByText("お気に入り");
      expect(title).toHaveClass("text-lg", "font-semibold", "text-gray-800");
    });

    it("件数にtext-sm text-gray-400が適用される", () => {
      render(<FavoritesPage />);

      const count = screen.getByText("3件");
      expect(count).toHaveClass("text-sm", "text-gray-400");
    });

    it("全体レイアウトにbg-gray-50が適用される", () => {
      render(<FavoritesPage />);

      const page = screen.getByTestId("favorites-page");
      expect(page).toHaveClass("bg-gray-50");
    });
  });
});
