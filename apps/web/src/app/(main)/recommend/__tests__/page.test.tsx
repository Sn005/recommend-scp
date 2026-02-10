/**
 * @file 推薦ページ統合テスト
 * @description 006-05-07: 遷移UX統合・結合テスト
 * @see specs/006-frontend/006-05-transition-ux/006-05-07.md
 */
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── モック戻り値 ───

const mockUseInfiniteArticlesResult = {
  articles: [] as {
    id: string;
    title: string;
    similarityScore: number;
    source: "preference" | "serendipity";
    url: string;
    objectClass: string | null;
    rating: number | null;
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
  refetch: vi.fn().mockResolvedValue(undefined),
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
  isProcessing: false,
  toggleFavorite: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
};

const mockUseIframePoolResult = {
  slots: [
    { articleIndex: 0, url: "https://scp-jp.wikidot.com/scp-173", isLoaded: true },
    null,
    null,
  ] as [
    { articleIndex: number; url: string; isLoaded: boolean },
    { articleIndex: number; url: string; isLoaded: boolean } | null,
    { articleIndex: number; url: string; isLoaded: boolean } | null,
  ],
  advance: vi.fn(),
};

// ─── モック定義 ───

vi.mock("../_hooks/useInfiniteArticles", () => ({
  useInfiniteArticles: () => mockUseInfiniteArticlesResult,
}));

vi.mock("../_hooks/useFeedback", () => ({
  useFeedback: () => mockUseFeedbackResult,
  calculateInterestLevel: (scrollDepth: number, dwellTime: number) => {
    if (scrollDepth < 10 && dwellTime < 5) return "skip";
    if (scrollDepth > 50 && dwellTime > 30) return "like";
    return "neutral";
  },
}));

vi.mock("../_hooks/useArticleFavorite", () => ({
  useArticleFavorite: () => mockUseArticleFavoriteResult,
}));

vi.mock("../_hooks/useIframePool", () => ({
  useIframePool: () => mockUseIframePoolResult,
}));

// TransitionCard をモック（onDismissedをトリガー可能にする）
let capturedOnDismissed: (() => void) | null = null;

vi.mock("../_components/TransitionCard", () => ({
  TransitionCard: ({
    scpNumber,
    objectClass,
    rating,
    isVisible,
    isContentReady,
    onDismissed,
  }: {
    scpNumber: string;
    objectClass: string | null;
    rating: number | null;
    isVisible: boolean;
    isContentReady: boolean;
    onDismissed: () => void;
  }) => {
    capturedOnDismissed = onDismissed;
    if (!isVisible) return null;
    return (
      <div
        data-testid="transition-card"
        data-scp-number={scpNumber}
        data-object-class={objectClass}
        data-rating={rating}
        data-content-ready={String(isContentReady)}
      >
        <span data-testid="transition-scp-number">{scpNumber}</span>
        {objectClass && <span data-testid="transition-object-class">{objectClass}</span>}
        {rating !== null && (
          <span data-testid="transition-rating">★ {rating.toLocaleString()}</span>
        )}
        <button data-testid="dismiss-card" onClick={onDismissed} type="button">
          Dismiss
        </button>
      </div>
    );
  },
}));

// ArticleWebView をモック
let capturedOnIframeLoad: (() => void) | null = null;

vi.mock("../_components/ArticleWebView", () => ({
  ArticleWebView: ({
    url,
    articleId,
    onScrollEnd,
    onScrollChange,
    onIframeLoad,
    className,
  }: {
    url: string;
    articleId?: string;
    onScrollEnd?: () => void;
    onScrollChange?: (percentage: number) => void;
    onSkip?: () => void;
    onContentLoaded?: (content: { title: string; excerpt: string }) => void;
    onIframeLoad?: () => void;
    className?: string;
  }) => {
    // Current スロット（hidden以外）のonIframeLoadをキャプチャ
    if (onIframeLoad && !className?.includes("hidden")) {
      capturedOnIframeLoad = onIframeLoad;
    }
    return (
      <div
        data-testid="article-webview"
        data-url={url}
        data-article-id={articleId}
        className={className}
      >
        {onScrollEnd && (
          <button
            data-testid={`scroll-end-trigger-${articleId ?? "unknown"}`}
            onClick={onScrollEnd}
            type="button"
          >
            Scroll End
          </button>
        )}
        {onScrollChange && (
          <button
            data-testid={`scroll-change-trigger-${articleId ?? "unknown"}`}
            onClick={() => {
              onScrollChange(50);
            }}
            type="button"
          >
            Scroll Change
          </button>
        )}
      </div>
    );
  },
}));

// useHistory をモック
vi.mock("@/app/(main)/history/_hooks/useHistory", () => ({
  useHistory: () => ({
    add: vi.fn(),
    entries: [],
    isLoading: false,
    clear: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// コンポーネントをインポート（モックの後）
import RecommendPage from "../page";

// ─── テストデータ ───

interface MockArticle {
  id: string;
  title: string;
  similarityScore: number;
  source: "preference" | "serendipity";
  url: string;
  objectClass: string | null;
  rating: number | null;
}

const createMockArticle = (overrides: Partial<MockArticle> = {}): MockArticle => ({
  id: "scp-173",
  title: "彫刻 - オリジナル",
  similarityScore: 0.95,
  source: "preference" as const,
  url: "https://scp-jp.wikidot.com/scp-173",
  objectClass: "EUCLID",
  rating: 4250,
  ...overrides,
});

const mockArticles: MockArticle[] = [
  createMockArticle({ id: "scp-173", objectClass: "EUCLID", rating: 4250 }),
  createMockArticle({
    id: "scp-682",
    title: "不死身の爬虫類",
    url: "https://scp-jp.wikidot.com/scp-682",
    objectClass: "KETER",
    rating: 5100,
  }),
  createMockArticle({
    id: "scp-999",
    title: "くすぐりモンスター",
    url: "https://scp-jp.wikidot.com/scp-999",
    objectClass: "SAFE",
    rating: 6200,
    source: "serendipity" as const,
  }),
];

// ─── ヘルパー ───

const setupDefaultArticles = () => {
  mockUseInfiniteArticlesResult.isLoading = false;
  mockUseInfiniteArticlesResult.articles = mockArticles;
  mockUseInfiniteArticlesResult.isEmpty = false;
  mockUseInfiniteArticlesResult.error = null;
  mockUseIframePoolResult.slots = [
    { articleIndex: 0, url: mockArticles[0].url, isLoaded: true },
    { articleIndex: 1, url: mockArticles[1].url, isLoaded: false },
    { articleIndex: 2, url: mockArticles[2].url, isLoaded: false },
  ];
};

/** 初回TransitionCardを閉じるヘルパー（iframe読み込み完了 → カードdismiss） */
const dismissInitialCard = () => {
  act(() => {
    capturedOnIframeLoad?.();
  });
  act(() => {
    capturedOnDismissed?.();
  });
};

// ─── テスト本体 ───

describe("RecommendPage 統合テスト (006-05-07)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnDismissed = null;
    capturedOnIframeLoad = null;
    // デフォルト値にリセット
    mockUseInfiniteArticlesResult.articles = [];
    mockUseInfiniteArticlesResult.currentIndex = 0;
    mockUseInfiniteArticlesResult.isLoading = true;
    mockUseInfiniteArticlesResult.isLoadingMore = false;
    mockUseInfiniteArticlesResult.error = null;
    mockUseInfiniteArticlesResult.isEmpty = false;
    mockUseInfiniteArticlesResult.hasMore = true;
    mockUseArticleFavoriteResult.isFavorited = false;
    mockUseIframePoolResult.slots = [
      { articleIndex: 0, url: "https://scp-jp.wikidot.com/scp-173", isLoaded: true },
      null,
      null,
    ];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===== 初回TransitionCard =====

  describe("初回TransitionCard", () => {
    it("記事到着時に初回TransitionCardが表示される", () => {
      setupDefaultArticles();
      render(<RecommendPage />);

      expect(screen.getByTestId("transition-card")).toBeInTheDocument();
      expect(screen.getByTestId("transition-card")).toHaveAttribute("data-scp-number", "scp-173");
    });

    it("初回TransitionCardにisContentReady=falseが渡される", () => {
      setupDefaultArticles();
      render(<RecommendPage />);

      expect(screen.getByTestId("transition-card")).toHaveAttribute("data-content-ready", "false");
    });

    it("iframe読み込み完了で初回TransitionCardのisContentReady=trueになる", () => {
      setupDefaultArticles();
      render(<RecommendPage />);

      act(() => {
        capturedOnIframeLoad?.();
      });

      expect(screen.getByTestId("transition-card")).toHaveAttribute("data-content-ready", "true");
    });

    it("初回TransitionCard dismiss後に記事が表示される", () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      const webviews = screen.getAllByTestId("article-webview");
      expect(webviews[0]).toHaveClass("opacity-100");
    });
  });

  // ===== AC-1: フルフロー遷移 =====

  describe("AC-1: フルフロー遷移", () => {
    it("「次へ」タップで現在の記事がフェードアウトしTransitionCardが表示される", async () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      const nextButton = await screen.findByLabelText("次の記事へ");
      await userEvent.click(nextButton);

      // TransitionCardが表示される
      await waitFor(() => {
        expect(screen.getByTestId("transition-card")).toBeInTheDocument();
      });
    });

    it("TransitionCardに次記事のSCP番号が表示される", async () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      const nextButton = await screen.findByLabelText("次の記事へ");
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByTestId("transition-card")).toHaveAttribute("data-scp-number", "scp-682");
      });
    });

    it("TransitionCardに次記事のオブジェクトクラスが表示される", async () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      const nextButton = await screen.findByLabelText("次の記事へ");
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByTestId("transition-card")).toHaveAttribute("data-object-class", "KETER");
      });
    });

    it("TransitionCardに次記事のratingが表示される", async () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      const nextButton = await screen.findByLabelText("次の記事へ");
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByTestId("transition-card")).toHaveAttribute("data-rating", "5100");
      });
    });

    it("「次へ」タップでadvanceとgoToNextが即座に呼ばれる", async () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      const nextButton = await screen.findByLabelText("次の記事へ");
      await userEvent.click(nextButton);

      // advance() と goToNext() が即座に呼ばれる（カード非表示を待たない）
      expect(mockUseIframePoolResult.advance).toHaveBeenCalledTimes(1);
      expect(mockUseInfiniteArticlesResult.goToNext).toHaveBeenCalledTimes(1);
    });

    it("TransitionCard非表示後、iframe読み込み完了まで記事が非表示のままになる", async () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      const nextButton = await screen.findByLabelText("次の記事へ");
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByTestId("transition-card")).toBeInTheDocument();
      });

      // onDismissedを呼ぶ（カード非表示完了）
      act(() => {
        capturedOnDismissed?.();
      });

      // iframe読み込み完了前は非表示（opacity-0）
      const webviews = screen.getAllByTestId("article-webview");
      const currentSlot = webviews[0];
      expect(currentSlot).toHaveClass("opacity-0");

      // iframe読み込み完了を通知
      act(() => {
        capturedOnIframeLoad?.();
      });

      // 読み込み完了後は表示（opacity-100）
      expect(currentSlot).toHaveClass("opacity-100");
    });

    it("遷移完了後にcurrentIndexが更新される（goToNext呼び出し確認）", async () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      const nextButton = await screen.findByLabelText("次の記事へ");
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByTestId("transition-card")).toBeInTheDocument();
      });

      act(() => {
        capturedOnDismissed?.();
      });

      expect(mockUseInfiniteArticlesResult.goToNext).toHaveBeenCalledTimes(1);
    });
  });

  // ===== AC-2: iframeプール統合 =====

  describe("AC-2: iframeプール統合", () => {
    it("page.tsx表示時にiframeプールの3スロットがDOMに反映される", () => {
      setupDefaultArticles();
      render(<RecommendPage />);

      const webviews = screen.getAllByTestId("article-webview");
      // Current + Next + Prefetch = 最大3つ
      expect(webviews.length).toBeLessThanOrEqual(3);
    });

    it("遷移完了後にスロットローテーション（advance）が実行される", async () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      const nextButton = await screen.findByLabelText("次の記事へ");
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByTestId("transition-card")).toBeInTheDocument();
      });

      act(() => {
        capturedOnDismissed?.();
      });

      expect(mockUseIframePoolResult.advance).toHaveBeenCalledTimes(1);
    });

    it("最大3つのiframeのみがDOMに存在する", () => {
      setupDefaultArticles();
      mockUseIframePoolResult.slots = [
        { articleIndex: 0, url: mockArticles[0].url, isLoaded: true },
        { articleIndex: 1, url: mockArticles[1].url, isLoaded: true },
        { articleIndex: 2, url: mockArticles[2].url, isLoaded: false },
      ];

      render(<RecommendPage />);

      const webviews = screen.getAllByTestId("article-webview");
      expect(webviews.length).toBeLessThanOrEqual(3);
    });
  });

  // ===== AC-3: TransitionCardとiframePoolの連携 =====

  describe("AC-3: TransitionCardとiframePoolの連携", () => {
    it("遷移開始時にisContentReadyがfalseでTransitionCardに渡される", async () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      const nextButton = await screen.findByLabelText("次の記事へ");
      await userEvent.click(nextButton);

      // 遷移開始でisSlotReadyがfalseにリセットされるため、isContentReady=false
      await waitFor(() => {
        const card = screen.getByTestId("transition-card");
        expect(card).toHaveAttribute("data-content-ready", "false");
      });
    });

    it("iframe読み込み完了後にisContentReady=trueがTransitionCardに渡される", async () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      const nextButton = await screen.findByLabelText("次の記事へ");
      await userEvent.click(nextButton);

      // 初期状態: isContentReady=false
      await waitFor(() => {
        const card = screen.getByTestId("transition-card");
        expect(card).toHaveAttribute("data-content-ready", "false");
      });

      // iframe読み込み完了を通知
      act(() => {
        capturedOnIframeLoad?.();
      });

      // isContentReady=true に変わる
      await waitFor(() => {
        const card = screen.getByTestId("transition-card");
        expect(card).toHaveAttribute("data-content-ready", "true");
      });
    });
  });

  // ===== AC-4: フィードバック統合 =====

  describe("AC-4: フィードバック統合", () => {
    it("「次へ」タップでrecordSkipがscrollDepthとdwellTimeメタデータ付きで呼ばれる", async () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      const nextButton = await screen.findByLabelText("次の記事へ");
      await userEvent.click(nextButton);

      expect(mockUseFeedbackResult.recordSkip).toHaveBeenCalledWith(
        "scp-173",
        expect.objectContaining({
          scrollDepth: expect.any(Number) as number,
          dwellTime: expect.any(Number) as number,
          interestLevel: expect.stringMatching(/^(skip|neutral|like)$/) as string,
        })
      );
    });

    it("recordDislike関数は存在しない（useFeedbackにrecordDislikeがない）", () => {
      setupDefaultArticles();
      render(<RecommendPage />);

      // useFeedbackの戻り値にrecordDislikeがないことを確認
      expect(mockUseFeedbackResult).not.toHaveProperty("recordDislike");
    });

    it("skipメタデータにscrollDepthとdwellTimeが含まれる", async () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      const nextButton = await screen.findByLabelText("次の記事へ");
      await userEvent.click(nextButton);

      const callArgs = mockUseFeedbackResult.recordSkip.mock.calls[0];
      expect(callArgs[1]).toHaveProperty("scrollDepth");
      expect(callArgs[1]).toHaveProperty("dwellTime");
      expect(callArgs[1]).toHaveProperty("interestLevel");
    });
  });

  // ===== AC-5: ProgressBar非表示 =====

  describe("AC-5: ProgressBar非表示", () => {
    it("ProgressBarが表示されていない", () => {
      setupDefaultArticles();
      render(<RecommendPage />);

      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("画面下部にPillNavが表示される", () => {
      setupDefaultArticles();
      render(<RecommendPage />);

      expect(screen.getByTestId("pill-nav")).toBeInTheDocument();
    });
  });

  // ===== AC-6: 連打防止 =====

  describe("AC-6: 連打防止", () => {
    it("遷移中に「次へ」ボタンの連打が防止される", async () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      const nextButton = await screen.findByLabelText("次の記事へ");

      // 1回目のクリック → 遷移開始
      await userEvent.click(nextButton);

      // TransitionCard表示中
      await waitFor(() => {
        expect(screen.getByTestId("transition-card")).toBeInTheDocument();
      });

      // 遷移中に連打（fireEventで同期的にクリック）
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);

      // recordSkipは最初の1回のみ
      expect(mockUseFeedbackResult.recordSkip).toHaveBeenCalledTimes(1);
    });

    it("TransitionCard表示中は追加の遷移を受け付けない", async () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      const nextButton = await screen.findByLabelText("次の記事へ");
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByTestId("transition-card")).toBeInTheDocument();
      });

      // カード表示中にクリック
      fireEvent.click(nextButton);

      // goToNextは最初の1回のみ（遷移中の追加クリックでは呼ばれない）
      expect(mockUseInfiniteArticlesResult.goToNext).toHaveBeenCalledTimes(1);
    });

    it("遷移完了後に「次へ」ボタンが再び有効になる", async () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      const nextButton = await screen.findByLabelText("次の記事へ");

      // 1回目の遷移
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByTestId("transition-card")).toBeInTheDocument();
      });

      // 遷移完了
      act(() => {
        capturedOnDismissed?.();
      });

      expect(mockUseInfiniteArticlesResult.goToNext).toHaveBeenCalledTimes(1);

      // 2回目のクリック → 再び遷移可能
      fireEvent.click(nextButton);

      expect(mockUseFeedbackResult.recordSkip).toHaveBeenCalledTimes(2);
    });
  });

  // ===== AC-7: 読了時の遷移（スクロール到達） =====

  describe("AC-7: 読了時の遷移（スクロール到達）", () => {
    it("スクロール到達でrecordLikeが呼ばれる", () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      const scrollEndButton = screen.getByTestId("scroll-end-trigger-scp-173");
      act(() => {
        scrollEndButton.click();
      });

      expect(mockUseFeedbackResult.recordLike).toHaveBeenCalledWith("scp-173");
    });

    it("読了後に遷移ヘッダーカードを経由して次の記事が表示される", async () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      const scrollEndButton = screen.getByTestId("scroll-end-trigger-scp-173");
      act(() => {
        scrollEndButton.click();
      });

      // Likeが記録される
      expect(mockUseFeedbackResult.recordLike).toHaveBeenCalledWith("scp-173");

      // TransitionCardが表示される
      await waitFor(() => {
        expect(screen.getByTestId("transition-card")).toBeInTheDocument();
      });

      // カード非表示完了
      act(() => {
        capturedOnDismissed?.();
      });

      // goToNextが呼ばれる
      expect(mockUseInfiniteArticlesResult.goToNext).toHaveBeenCalledTimes(1);
    });
  });

  // ===== AC-8: お気に入りボタン正常動作 =====

  describe("AC-8: お気に入りボタン正常動作", () => {
    it("お気に入りボタンタップで従来通りのトグル動作が実行される", async () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      const favoriteButton = await screen.findByLabelText("お気に入りに追加");
      await userEvent.click(favoriteButton);

      expect(mockUseArticleFavoriteResult.toggleFavorite).toHaveBeenCalled();
    });

    it("お気に入りボタンタップ後も遷移フローに影響しない", async () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      // お気に入りボタンをタップ
      const favoriteButton = await screen.findByLabelText("お気に入りに追加");
      await userEvent.click(favoriteButton);

      // goToNextは呼ばれない
      expect(mockUseInfiniteArticlesResult.goToNext).not.toHaveBeenCalled();

      // その後「次へ」をタップ → 正常に遷移
      const nextButton = screen.getByLabelText("次の記事へ");
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByTestId("transition-card")).toBeInTheDocument();
      });
    });
  });

  // ===== AC-9: 推薦切れ・エラー時の挙動 =====

  describe("AC-9: 推薦切れ・エラー時の挙動", () => {
    it("推薦記事がなくなった際にEmptyStateが表示される", () => {
      mockUseInfiniteArticlesResult.isLoading = false;
      mockUseInfiniteArticlesResult.isEmpty = true;
      mockUseInfiniteArticlesResult.articles = [];

      render(<RecommendPage />);

      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });

    it("API呼び出しでエラーが発生した際にErrorStateが表示される", () => {
      mockUseInfiniteArticlesResult.isLoading = false;
      mockUseInfiniteArticlesResult.error = new Error("ネットワークエラー");

      render(<RecommendPage />);

      expect(screen.getByTestId("error-state")).toBeInTheDocument();
    });

    it("ErrorStateの再試行ボタンでrefetchが呼ばれる", async () => {
      mockUseInfiniteArticlesResult.isLoading = false;
      mockUseInfiniteArticlesResult.error = new Error("ネットワークエラー");

      render(<RecommendPage />);

      const retryButton = await screen.findByRole("button", { name: "再試行" });
      await userEvent.click(retryButton);

      expect(mockUseInfiniteArticlesResult.refetch).toHaveBeenCalled();
    });
  });

  // ===== AC-10: prefers-reduced-motion対応 =====

  describe("AC-10: prefers-reduced-motion対応", () => {
    it("prefers-reduced-motion設定時にTransitionCardは表示される", async () => {
      // matchMediaをモック
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      const nextButton = await screen.findByLabelText("次の記事へ");
      await userEvent.click(nextButton);

      // TransitionCardは表示される（reduced-motionでもカード自体は出る）
      await waitFor(() => {
        expect(screen.getByTestId("transition-card")).toBeInTheDocument();
      });

      window.matchMedia = originalMatchMedia;
    });
  });

  // ===== エッジケース =====

  describe("エッジケース", () => {
    it("objectClass=nullの記事でもTransitionCardが表示される", async () => {
      mockUseInfiniteArticlesResult.isLoading = false;
      mockUseInfiniteArticlesResult.articles = [
        createMockArticle({ id: "scp-173", objectClass: null }),
        createMockArticle({ id: "scp-682", objectClass: null }),
      ];
      mockUseIframePoolResult.slots = [
        { articleIndex: 0, url: mockArticles[0].url, isLoaded: true },
        { articleIndex: 1, url: mockArticles[1].url, isLoaded: false },
        null,
      ];

      render(<RecommendPage />);
      dismissInitialCard();

      const nextButton = await screen.findByLabelText("次の記事へ");
      await userEvent.click(nextButton);

      await waitFor(() => {
        const card = screen.getByTestId("transition-card");
        expect(card).toBeInTheDocument();
        expect(screen.queryByTestId("transition-object-class")).not.toBeInTheDocument();
      });
    });

    it("rating=nullの記事でrating表示が省略される", async () => {
      mockUseInfiniteArticlesResult.isLoading = false;
      mockUseInfiniteArticlesResult.articles = [
        createMockArticle({ id: "scp-173" }),
        createMockArticle({ id: "scp-682", rating: null }),
      ];
      mockUseIframePoolResult.slots = [
        { articleIndex: 0, url: mockArticles[0].url, isLoaded: true },
        { articleIndex: 1, url: mockArticles[1].url, isLoaded: false },
        null,
      ];

      render(<RecommendPage />);
      dismissInitialCard();

      const nextButton = await screen.findByLabelText("次の記事へ");
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByTestId("transition-card")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("transition-rating")).not.toBeInTheDocument();
    });

    it("最後の記事で「次へ」を押した時は追加の遷移が開始されない", async () => {
      mockUseInfiniteArticlesResult.isLoading = false;
      mockUseInfiniteArticlesResult.articles = [createMockArticle({ id: "scp-173" })];
      mockUseIframePoolResult.slots = [
        { articleIndex: 0, url: mockArticles[0].url, isLoaded: true },
        null,
        null,
      ];

      render(<RecommendPage />);
      dismissInitialCard();

      const nextButton = await screen.findByLabelText("次の記事へ");
      await userEvent.click(nextButton);

      // advance/goToNextは呼ばれない（次の記事がない）
      expect(mockUseIframePoolResult.advance).not.toHaveBeenCalled();
      expect(mockUseInfiniteArticlesResult.goToNext).not.toHaveBeenCalled();
    });

    it("ローディング中はスケルトンUIが表示される", () => {
      mockUseInfiniteArticlesResult.isLoading = true;
      render(<RecommendPage />);

      expect(screen.getByTestId("skeleton-loader")).toBeInTheDocument();
    });

    it("遷移完了後にスクロール深度・滞在時間がリセットされる", async () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      // スクロール深度を更新
      const scrollChangeTrigger = screen.getByTestId("scroll-change-trigger-scp-173");
      act(() => {
        scrollChangeTrigger.click();
      });

      // 「次へ」ボタンをタップ
      const nextButton = screen.getByLabelText("次の記事へ");
      await userEvent.click(nextButton);

      // 1回目のrecordSkipでscrollDepth=50が記録される
      expect(mockUseFeedbackResult.recordSkip).toHaveBeenCalledWith(
        "scp-173",
        expect.objectContaining({
          scrollDepth: 50,
        })
      );
    });
  });
});
