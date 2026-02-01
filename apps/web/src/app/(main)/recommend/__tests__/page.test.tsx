import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// モックの戻り値を管理するオブジェクト
const mockUseInfiniteArticlesResult = {
  articles: [] as {
    id: string;
    title: string;
    similarityScore: number;
    source: "preference" | "serendipity";
    url: string;
  }[],
  currentIndex: 0,
  isLoading: true,
  error: null as Error | null,
  isEmpty: false,
  loadMore: vi.fn(),
  goToNext: vi.fn(),
  refetch: vi.fn(),
};

const mockUseFeedbackResult = {
  recordLike: vi.fn(),
  recordDislike: vi.fn(),
};

const mockUseArticleFavoriteResult = {
  isFavorited: false,
  toggleFavorite: vi.fn(),
};

// useInfiniteArticlesをモック
vi.mock("../_hooks/useInfiniteArticles", () => ({
  useInfiniteArticles: () => mockUseInfiniteArticlesResult,
}));

// useFeedbackをモック
vi.mock("../_hooks/useFeedback", () => ({
  useFeedback: () => mockUseFeedbackResult,
}));

// useArticleFavoriteをモック
vi.mock("../_hooks/useArticleFavorite", () => ({
  useArticleFavorite: () => mockUseArticleFavoriteResult,
}));

// コンポーネントをインポート（モックの後）
import RecommendPage from "../page";

// テストデータ
const mockArticle = {
  id: "1",
  title: "彫刻 - オリジナル",
  similarityScore: 0.95,
  source: "preference" as const,
  url: "https://scp-jp.wikidot.com/scp-173",
};

const mockArticles = [
  mockArticle,
  {
    id: "2",
    title: "不死身の爬虫類",
    similarityScore: 0.92,
    source: "preference" as const,
    url: "https://scp-jp.wikidot.com/scp-682",
  },
  {
    id: "3",
    title: "くすぐりモンスター",
    similarityScore: 0.89,
    source: "serendipity" as const,
    url: "https://scp-jp.wikidot.com/scp-999",
  },
];

describe("RecommendPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルト値にリセット
    mockUseInfiniteArticlesResult.articles = [];
    mockUseInfiniteArticlesResult.currentIndex = 0;
    mockUseInfiniteArticlesResult.isLoading = true;
    mockUseInfiniteArticlesResult.error = null;
    mockUseInfiniteArticlesResult.isEmpty = false;
    mockUseArticleFavoriteResult.isFavorited = false;
  });

  describe("AC-1: ページ初期表示", () => {
    it("ローディング中はスケルトンUIが表示される", () => {
      mockUseInfiniteArticlesResult.isLoading = true;

      render(<RecommendPage />);

      expect(screen.getByTestId("skeleton-loader")).toBeInTheDocument();
    });

    it("/recommendにアクセスすると記事閲覧ページが表示される", async () => {
      mockUseInfiniteArticlesResult.isLoading = false;
      mockUseInfiniteArticlesResult.articles = mockArticles;

      render(<RecommendPage />);

      await waitFor(() => {
        expect(screen.getByTestId("article-viewer")).toBeInTheDocument();
      });
    });
  });

  describe("AC-2: 記事表示レイアウト", () => {
    beforeEach(() => {
      mockUseInfiniteArticlesResult.isLoading = false;
      mockUseInfiniteArticlesResult.articles = mockArticles;
    });

    it("推薦記事取得完了後、ArticleWebViewに記事URLが渡される", async () => {
      render(<RecommendPage />);

      await waitFor(() => {
        const webview = screen.getByTestId("article-webview");
        expect(webview).toHaveAttribute("data-url", mockArticle.url);
      });
    });

    it("画面下部にPillNavが表示される", async () => {
      render(<RecommendPage />);

      await waitFor(() => {
        expect(screen.getByTestId("pill-nav")).toBeInTheDocument();
      });
    });

    it("画面下部にProgressBarが表示される", async () => {
      render(<RecommendPage />);

      await waitFor(() => {
        expect(screen.getByRole("progressbar")).toBeInTheDocument();
      });
    });
  });

  describe("AC-3: 推薦切れ表示", () => {
    beforeEach(() => {
      mockUseInfiniteArticlesResult.isLoading = false;
      mockUseInfiniteArticlesResult.isEmpty = true;
      mockUseInfiniteArticlesResult.articles = [];
    });

    it("POST /recommend APIが空配列を返すとEmptyStateが表示される", async () => {
      render(<RecommendPage />);

      await waitFor(() => {
        expect(screen.getByTestId("empty-state")).toBeInTheDocument();
      });
    });

    it("EmptyStateに「すべての推薦を読みました」メッセージが表示される", async () => {
      render(<RecommendPage />);

      await waitFor(() => {
        expect(screen.getByText("すべての推薦を読みました")).toBeInTheDocument();
      });
    });

    it("EmptyStateに「好みを再設定」ボタンが表示される", async () => {
      render(<RecommendPage />);

      await waitFor(() => {
        expect(screen.getByRole("link", { name: "好みを再設定" })).toBeInTheDocument();
      });
    });
  });

  describe("AC-4: エラー表示", () => {
    const testError = new Error("ネットワークエラー");

    beforeEach(() => {
      mockUseInfiniteArticlesResult.isLoading = false;
      mockUseInfiniteArticlesResult.error = testError;
    });

    it("記事取得エラー時にErrorStateが表示される", async () => {
      render(<RecommendPage />);

      await waitFor(() => {
        expect(screen.getByTestId("error-state")).toBeInTheDocument();
      });
    });

    it("ErrorStateにエラーメッセージが表示される", async () => {
      render(<RecommendPage />);

      await waitFor(() => {
        expect(screen.getByText("エラーが発生しました")).toBeInTheDocument();
        expect(screen.getByText(testError.message)).toBeInTheDocument();
      });
    });

    it("ErrorStateに「再試行」ボタンが表示される", async () => {
      render(<RecommendPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "再試行" })).toBeInTheDocument();
      });
    });
  });

  describe("AC-5: 再試行処理", () => {
    const testError = new Error("ネットワークエラー");

    beforeEach(() => {
      mockUseInfiniteArticlesResult.isLoading = false;
      mockUseInfiniteArticlesResult.error = testError;
      mockUseInfiniteArticlesResult.refetch.mockResolvedValue(undefined);
    });

    it("「再試行」ボタンクリックでrefetchが呼ばれる", async () => {
      const user = userEvent.setup();
      render(<RecommendPage />);

      const retryButton = await screen.findByRole("button", { name: "再試行" });
      await user.click(retryButton);

      expect(mockUseInfiniteArticlesResult.refetch).toHaveBeenCalled();
    });
  });

  describe("エッジケース", () => {
    it("記事が1件の場合でもProgressBarが表示される", async () => {
      mockUseInfiniteArticlesResult.isLoading = false;
      mockUseInfiniteArticlesResult.articles = [mockArticle];

      render(<RecommendPage />);

      await waitFor(() => {
        expect(screen.getByRole("progressbar")).toBeInTheDocument();
      });
    });

    it("お気に入りボタンをクリックするとtoggleFavoriteが呼ばれる", async () => {
      const user = userEvent.setup();
      mockUseInfiniteArticlesResult.isLoading = false;
      mockUseInfiniteArticlesResult.articles = mockArticles;

      render(<RecommendPage />);

      // お気に入りボタン（ハート）をクリック
      const favoriteButton = await screen.findByLabelText("お気に入りに追加");
      await user.click(favoriteButton);

      expect(mockUseArticleFavoriteResult.toggleFavorite).toHaveBeenCalled();
    });

    it("次へボタンをクリックするとgoToNextとrecordDislikeが呼ばれる", async () => {
      const user = userEvent.setup();
      mockUseInfiniteArticlesResult.isLoading = false;
      mockUseInfiniteArticlesResult.articles = mockArticles;

      render(<RecommendPage />);

      // 次へボタンをクリック
      const nextButton = await screen.findByLabelText("次の記事へ");
      await user.click(nextButton);

      expect(mockUseFeedbackResult.recordDislike).toHaveBeenCalledWith(mockArticle.id);
      expect(mockUseInfiniteArticlesResult.goToNext).toHaveBeenCalled();
    });
  });
});
