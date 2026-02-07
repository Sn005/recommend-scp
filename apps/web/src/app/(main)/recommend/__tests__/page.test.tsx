import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
  isLoadingMore: false,
  error: null as Error | null,
  isEmpty: false,
  hasMore: true,
  loadMore: vi.fn(),
  goToNext: vi.fn(),
  reset: vi.fn(),
  refetch: vi.fn(),
};

const mockUseFeedbackResult = {
  recordLike: vi.fn(),
  recordSkip: vi.fn(),
  recordFavorite: vi.fn(),
  hasRecorded: vi.fn().mockReturnValue(false),
  getFeedbackType: vi.fn().mockReturnValue(null),
  pendingCount: 0,
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
  calculateInterestLevel: (scrollDepth: number, dwellTime: number) => {
    if (scrollDepth < 10 && dwellTime < 5) return "skip";
    if (scrollDepth > 50 && dwellTime > 30) return "like";
    return "neutral";
  },
}));

// useArticleFavoriteをモック
vi.mock("../_hooks/useArticleFavorite", () => ({
  useArticleFavorite: () => mockUseArticleFavoriteResult,
}));

// ArticleWebViewをモック（コールバック制御のため）
vi.mock("../_components/ArticleWebView", () => ({
  ArticleWebView: ({
    url,
    articleId,
    onScrollEnd,
  }: {
    url: string;
    articleId?: string;
    onScrollEnd?: () => void;
    onSkip?: () => void;
    onContentLoaded?: (content: { title: string; excerpt: string }) => void;
    className?: string;
  }) => (
    <div data-testid="article-webview" data-url={url} data-article-id={articleId}>
      {onScrollEnd && (
        <button
          data-testid={`scroll-end-trigger-${articleId ?? "unknown"}`}
          onClick={onScrollEnd}
          type="button"
        >
          Scroll End
        </button>
      )}
    </div>
  ),
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
    mockUseInfiniteArticlesResult.isLoadingMore = false;
    mockUseInfiniteArticlesResult.error = null;
    mockUseInfiniteArticlesResult.isEmpty = false;
    mockUseInfiniteArticlesResult.hasMore = true;
    mockUseArticleFavoriteResult.isFavorited = false;
  });

  afterEach(() => {
    // フェイクタイマーが残らないよう常にリアルタイマーに戻す
    vi.useRealTimers();
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
        const webviews = screen.getAllByTestId("article-webview");
        expect(webviews[0]).toHaveAttribute("data-url", mockArticle.url);
      });
    });

    it("画面下部にPillNavが表示される", async () => {
      render(<RecommendPage />);

      await waitFor(() => {
        expect(screen.getByTestId("pill-nav")).toBeInTheDocument();
      });
    });

    it("画面下部にProgressBarは表示されない", async () => {
      render(<RecommendPage />);

      await waitFor(() => {
        expect(screen.getByTestId("article-viewer")).toBeInTheDocument();
      });

      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
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
    it("記事が1件の場合でもProgressBarは表示されない", async () => {
      mockUseInfiniteArticlesResult.isLoading = false;
      mockUseInfiniteArticlesResult.articles = [mockArticle];

      render(<RecommendPage />);

      await waitFor(() => {
        expect(screen.getByTestId("article-viewer")).toBeInTheDocument();
      });

      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
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

    it("次へボタンをクリックするとgoToNextとrecordSkipが呼ばれる", async () => {
      const user = userEvent.setup();
      mockUseInfiniteArticlesResult.isLoading = false;
      mockUseInfiniteArticlesResult.articles = mockArticles;

      render(<RecommendPage />);

      // 次へボタンをクリック
      const nextButton = await screen.findByLabelText("次の記事へ");
      await user.click(nextButton);

      expect(mockUseFeedbackResult.recordSkip).toHaveBeenCalledWith(
        mockArticle.id,

        expect.objectContaining({
          scrollDepth: expect.any(Number) as number,
          dwellTime: expect.any(Number) as number,
          interestLevel: expect.stringMatching(/^(skip|neutral|like)$/) as string,
        })
      );
      expect(mockUseInfiniteArticlesResult.goToNext).toHaveBeenCalled();
    });
  });

  // ===== 006-02-07: 推薦拡張・無限スクロール強化 =====

  describe("AC-4 (007): デュアルWebViewとスムーストランジション", () => {
    beforeEach(() => {
      mockUseInfiniteArticlesResult.isLoading = false;
      mockUseInfiniteArticlesResult.articles = mockArticles;
    });

    it("現在の記事と次の記事の2つのArticleWebViewが表示される", () => {
      render(<RecommendPage />);

      const webviews = screen.getAllByTestId("article-webview");
      expect(webviews).toHaveLength(2);
      expect(webviews[0]).toHaveAttribute("data-url", mockArticles[0].url);
      expect(webviews[1]).toHaveAttribute("data-url", mockArticles[1].url);
    });

    it("スクロール完了時にスムーストランジションが開始される", () => {
      vi.useFakeTimers();
      render(<RecommendPage />);

      const scrollEndButton = screen.getByTestId(`scroll-end-trigger-${mockArticles[0].id}`);

      act(() => {
        scrollEndButton.click();
      });

      // Likeが記録される
      expect(mockUseFeedbackResult.recordLike).toHaveBeenCalledWith(mockArticles[0].id);

      // 遷移開始されたがまだ完了していない
      expect(mockUseInfiniteArticlesResult.goToNext).not.toHaveBeenCalled();

      // 遷移完了（タイマー進行）
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // goToNextが呼ばれる
      expect(mockUseInfiniteArticlesResult.goToNext).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it("最後の記事では次のArticleWebViewが表示されない", () => {
      mockUseInfiniteArticlesResult.articles = [mockArticle];

      render(<RecommendPage />);

      const webviews = screen.getAllByTestId("article-webview");
      expect(webviews).toHaveLength(1);
    });

    it("次の記事がない場合はスクロール遷移が開始されない", () => {
      vi.useFakeTimers();
      mockUseInfiniteArticlesResult.articles = [mockArticle];

      render(<RecommendPage />);

      const scrollEndButton = screen.getByTestId(`scroll-end-trigger-${mockArticle.id}`);
      act(() => {
        scrollEndButton.click();
      });

      // Likeは記録される
      expect(mockUseFeedbackResult.recordLike).toHaveBeenCalledWith(mockArticle.id);

      // タイマー進行しても遷移は発生しない
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockUseInfiniteArticlesResult.goToNext).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe("AC-8 (007): 過去記事のメモリ解放", () => {
    it("DOM上に最大2つのArticleWebViewが存在する", () => {
      mockUseInfiniteArticlesResult.isLoading = false;
      mockUseInfiniteArticlesResult.articles = mockArticles;

      render(<RecommendPage />);

      const webviews = screen.getAllByTestId("article-webview");
      expect(webviews.length).toBeLessThanOrEqual(2);
    });

    it("現在の記事のみonScrollEndコールバックを持つ", () => {
      mockUseInfiniteArticlesResult.isLoading = false;
      mockUseInfiniteArticlesResult.articles = mockArticles;

      render(<RecommendPage />);

      // 現在の記事のみscroll-end-triggerを持つ
      expect(screen.getByTestId(`scroll-end-trigger-${mockArticles[0].id}`)).toBeInTheDocument();

      // 次の記事にはscroll-end-triggerがない
      expect(
        screen.queryByTestId(`scroll-end-trigger-${mockArticles[1].id}`)
      ).not.toBeInTheDocument();
    });
  });

  describe("AC-9 (007): 遷移中の操作制御", () => {
    beforeEach(() => {
      mockUseInfiniteArticlesResult.isLoading = false;
      mockUseInfiniteArticlesResult.articles = mockArticles;
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("スクロール遷移中に「次へ」ボタン連打で二重遷移しない", () => {
      vi.useFakeTimers();
      render(<RecommendPage />);

      // スクロール遷移を開始
      const scrollEndButton = screen.getByTestId(`scroll-end-trigger-${mockArticles[0].id}`);
      act(() => {
        scrollEndButton.click();
      });

      // 遷移中に「次へ」をクリック（fireEventで同期的にクリック）
      const nextButton = screen.getByLabelText("次の記事へ");
      fireEvent.click(nextButton);

      // 遷移中はrecordSkipが呼ばれない（ブロック）
      expect(mockUseFeedbackResult.recordSkip).not.toHaveBeenCalled();

      // 遷移完了
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // goToNextは遷移完了の1回のみ
      expect(mockUseInfiniteArticlesResult.goToNext).toHaveBeenCalledTimes(1);
    });

    it("遷移完了後に「次へ」ボタンが再び動作する", () => {
      vi.useFakeTimers();
      render(<RecommendPage />);

      // スクロール遷移を開始して完了
      const scrollEndButton = screen.getByTestId(`scroll-end-trigger-${mockArticles[0].id}`);
      act(() => {
        scrollEndButton.click();
      });
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockUseInfiniteArticlesResult.goToNext).toHaveBeenCalledTimes(1);

      // 遷移完了後に「次へ」をクリック（fireEventで同期的にクリック）
      const nextButton = screen.getByLabelText("次の記事へ");
      fireEvent.click(nextButton);

      // goToNextが再度呼ばれる
      expect(mockUseInfiniteArticlesResult.goToNext).toHaveBeenCalledTimes(2);
      expect(mockUseFeedbackResult.recordSkip).toHaveBeenCalledWith(
        mockArticles[0].id,

        expect.objectContaining({
          scrollDepth: expect.any(Number) as number,
          dwellTime: expect.any(Number) as number,
          interestLevel: expect.stringMatching(/^(skip|neutral|like)$/) as string,
        })
      );
    });

    it("スクロール遷移を連続で開始しても1回のみ実行される", () => {
      vi.useFakeTimers();
      render(<RecommendPage />);

      const scrollEndButton = screen.getByTestId(`scroll-end-trigger-${mockArticles[0].id}`);

      // 連続クリック
      act(() => {
        scrollEndButton.click();
        scrollEndButton.click();
        scrollEndButton.click();
      });

      // 遷移完了
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // goToNextは1回のみ
      expect(mockUseInfiniteArticlesResult.goToNext).toHaveBeenCalledTimes(1);
    });
  });

  describe("AC-6 (007): 下部到達時のLike記録と自動遷移", () => {
    it("スクロール完了時にLikeが記録される", () => {
      mockUseInfiniteArticlesResult.isLoading = false;
      mockUseInfiniteArticlesResult.articles = mockArticles;

      render(<RecommendPage />);

      const scrollEndButton = screen.getByTestId(`scroll-end-trigger-${mockArticles[0].id}`);
      act(() => {
        scrollEndButton.click();
      });

      expect(mockUseFeedbackResult.recordLike).toHaveBeenCalledWith(mockArticles[0].id);
    });

    it("スクロール完了時に次の記事への遷移が開始される", () => {
      vi.useFakeTimers();
      mockUseInfiniteArticlesResult.isLoading = false;
      mockUseInfiniteArticlesResult.articles = mockArticles;

      render(<RecommendPage />);

      const scrollEndButton = screen.getByTestId(`scroll-end-trigger-${mockArticles[0].id}`);
      act(() => {
        scrollEndButton.click();
      });

      // 遷移開始 - goToNextはまだ呼ばれない
      expect(mockUseInfiniteArticlesResult.goToNext).not.toHaveBeenCalled();

      // 遷移完了
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockUseInfiniteArticlesResult.goToNext).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });

  describe("AC-5 (007): 「次へ」ボタンの既存挙動維持", () => {
    it("「次へ」ボタンで即座にgoToNextが呼ばれる（アニメーションなし）", async () => {
      const user = userEvent.setup();
      mockUseInfiniteArticlesResult.isLoading = false;
      mockUseInfiniteArticlesResult.articles = mockArticles;

      render(<RecommendPage />);

      const nextButton = await screen.findByLabelText("次の記事へ");
      await user.click(nextButton);

      // 即座にgoToNextが呼ばれる（タイマー待ちなし）
      expect(mockUseInfiniteArticlesResult.goToNext).toHaveBeenCalledTimes(1);
      expect(mockUseFeedbackResult.recordSkip).toHaveBeenCalledWith(
        mockArticles[0].id,

        expect.objectContaining({
          scrollDepth: expect.any(Number) as number,
          dwellTime: expect.any(Number) as number,
          interestLevel: expect.stringMatching(/^(skip|neutral|like)$/) as string,
        })
      );
    });
  });
});
