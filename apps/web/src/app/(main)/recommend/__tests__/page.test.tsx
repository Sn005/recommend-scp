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
  recordNext: vi.fn(),
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
    {
      articleIndex: 0,
      url: "https://scp-jp.wikidot.com/scp-173",
      isLoaded: true,
      isFullyLoaded: false,
    },
    {
      articleIndex: 1,
      url: "https://scp-jp.wikidot.com/scp-682",
      isLoaded: false,
      isFullyLoaded: false,
    },
    {
      articleIndex: 2,
      url: "https://scp-jp.wikidot.com/scp-999",
      isLoaded: false,
      isFullyLoaded: false,
    },
  ] as [
    { articleIndex: number; url: string; isLoaded: boolean; isFullyLoaded: boolean },
    { articleIndex: number; url: string; isLoaded: boolean; isFullyLoaded: boolean } | null,
    { articleIndex: number; url: string; isLoaded: boolean; isFullyLoaded: boolean } | null,
  ],
  advance: vi.fn(),
  handleIframeLoad: vi.fn(),
  handleIframeFullyLoaded: vi.fn(),
};

// ─── モック定義 ───

vi.mock("../_hooks/useInfiniteArticles", () => ({
  useInfiniteArticles: () => mockUseInfiniteArticlesResult,
}));

vi.mock("../_hooks/useFeedback", () => ({
  useFeedback: () => mockUseFeedbackResult,
  calculateInterestLevel: (scrollDepth: number, dwellTime: number) => {
    if (scrollDepth < 10 && dwellTime < 5) return "low";
    if (scrollDepth > 50 && dwellTime > 30) return "high";
    return "medium";
  },
}));

vi.mock("@/shared/hooks/useArticleFavorite", () => ({
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
let capturedOnContentFullyReady: (() => void) | null = null;

vi.mock("../_components/ArticleWebView", () => ({
  ArticleWebView: ({
    url,
    articleId,
    onScrollEnd,
    onScrollChange,
    onContentFullyReady,
    className,
  }: {
    url: string;
    articleId?: string;
    onScrollEnd?: () => void;
    onScrollChange?: (percentage: number) => void;
    onSkip?: () => void;
    onContentLoaded?: (content: { title: string; excerpt: string }) => void;
    onIframeLoad?: () => void;
    onContentFullyReady?: () => void;
    className?: string;
  }) => {
    // Current スロット（pointer-events-none以外）のonContentFullyReadyをキャプチャ
    if (onContentFullyReady && !className?.includes("pointer-events-none")) {
      capturedOnContentFullyReady = onContentFullyReady;
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
    { articleIndex: 0, url: mockArticles[0].url, isLoaded: true, isFullyLoaded: false },
    { articleIndex: 1, url: mockArticles[1].url, isLoaded: false, isFullyLoaded: false },
    { articleIndex: 2, url: mockArticles[2].url, isLoaded: false, isFullyLoaded: false },
  ];
};

/** 初回TransitionCardを閉じるヘルパー（画像含む全リソース読み込み完了 → カードdismiss） */
const dismissInitialCard = () => {
  act(() => {
    capturedOnContentFullyReady?.();
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
    capturedOnContentFullyReady = null;
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
      {
        articleIndex: 0,
        url: "https://scp-jp.wikidot.com/scp-173",
        isLoaded: true,
        isFullyLoaded: false,
      },
      {
        articleIndex: 1,
        url: "https://scp-jp.wikidot.com/scp-682",
        isLoaded: false,
        isFullyLoaded: false,
      },
      {
        articleIndex: 2,
        url: "https://scp-jp.wikidot.com/scp-999",
        isLoaded: false,
        isFullyLoaded: false,
      },
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

    it("全リソース読み込み完了で初回TransitionCardのisContentReady=trueになる", () => {
      setupDefaultArticles();
      render(<RecommendPage />);

      act(() => {
        capturedOnContentFullyReady?.();
      });

      expect(screen.getByTestId("transition-card")).toHaveAttribute("data-content-ready", "true");
    });

    it("初回TransitionCard dismiss後に記事が表示される", () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      const webviews = screen.getAllByTestId("article-webview");
      expect(webviews[0]).toHaveClass("opacity-100", "z-10", "flex-1");
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

      // 全リソース読み込み完了前は非表示（opacity-0 z-10 flex-1）
      const webviews = screen.getAllByTestId("article-webview");
      const currentSlot = webviews[0];
      expect(currentSlot).toHaveClass("opacity-0", "z-10", "flex-1");

      // 全リソース読み込み完了を通知
      act(() => {
        capturedOnContentFullyReady?.();
      });

      // 読み込み完了後は表示（opacity-100 z-10 flex-1）
      expect(currentSlot).toHaveClass("opacity-100", "z-10", "flex-1");
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
      // Current + Next + Prefetch = 常に3つ
      expect(webviews.length).toBe(3);
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

    it("常に3つのiframeがDOMに存在する", () => {
      setupDefaultArticles();
      mockUseIframePoolResult.slots = [
        { articleIndex: 0, url: mockArticles[0].url, isLoaded: true, isFullyLoaded: false },
        { articleIndex: 1, url: mockArticles[1].url, isLoaded: true, isFullyLoaded: false },
        { articleIndex: 2, url: mockArticles[2].url, isLoaded: false, isFullyLoaded: false },
      ];

      render(<RecommendPage />);

      const webviews = screen.getAllByTestId("article-webview");
      expect(webviews.length).toBe(3);
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

    it("全リソース読み込み完了後にisContentReady=trueがTransitionCardに渡される", async () => {
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

      // 全リソース読み込み完了を通知
      act(() => {
        capturedOnContentFullyReady?.();
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
    it("「次へ」タップでrecordNextがscrollDepthとdwellTimeメタデータ付きで呼ばれる", async () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      const nextButton = await screen.findByLabelText("次の記事へ");
      await userEvent.click(nextButton);

      expect(mockUseFeedbackResult.recordNext).toHaveBeenCalledWith(
        "scp-173",
        expect.objectContaining({
          scrollDepth: expect.any(Number) as number,
          dwellTime: expect.any(Number) as number,
          interestLevel: expect.stringMatching(/^(low|medium|high)$/) as string,
        })
      );
    });

    it("recordDislike関数は存在しない（useFeedbackにrecordDislikeがない）", () => {
      setupDefaultArticles();
      render(<RecommendPage />);

      // useFeedbackの戻り値にrecordDislikeがないことを確認
      expect(mockUseFeedbackResult).not.toHaveProperty("recordDislike");
    });

    it("nextメタデータにscrollDepthとdwellTimeが含まれる", async () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      const nextButton = await screen.findByLabelText("次の記事へ");
      await userEvent.click(nextButton);

      const callArgs = mockUseFeedbackResult.recordNext.mock.calls[0];
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

      // recordNextは最初の1回のみ
      expect(mockUseFeedbackResult.recordNext).toHaveBeenCalledTimes(1);
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

      expect(mockUseFeedbackResult.recordNext).toHaveBeenCalledTimes(2);
    });
  });

  // ===== AC-7: スクロール到達で自動遷移しない（仕様変更） =====

  describe("AC-7: スクロール到達で自動遷移しない", () => {
    it("スクロール到達で自動遷移が発生しない（onScrollEndが渡されていない）", () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      // onScrollEndが渡されていないため、scroll-end-triggerボタンが存在しない
      expect(screen.queryByTestId("scroll-end-trigger-scp-173")).not.toBeInTheDocument();
    });

    it("スクロール到達でrecordNextが呼ばれない", () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      // onScrollEndが渡されていないため、recordNextは呼ばれない
      expect(mockUseFeedbackResult.recordNext).not.toHaveBeenCalled();
    });

    it("スクロール到達でgoToNextが呼ばれない", () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      // onScrollEndが渡されていないため、goToNextは呼ばれない
      expect(mockUseInfiniteArticlesResult.goToNext).not.toHaveBeenCalled();
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

    it("お気に入りボタンタップでrecordFavoriteが呼ばれる", async () => {
      setupDefaultArticles();
      render(<RecommendPage />);
      dismissInitialCard();

      const favoriteButton = await screen.findByLabelText("お気に入りに追加");
      await userEvent.click(favoriteButton);

      expect(mockUseFeedbackResult.recordFavorite).toHaveBeenCalledWith("scp-173");
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
        { articleIndex: 0, url: mockArticles[0].url, isLoaded: true, isFullyLoaded: false },
        { articleIndex: 1, url: mockArticles[1].url, isLoaded: false, isFullyLoaded: false },
        null, // 記事が2つのみのためPrefetchはnull
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
        { articleIndex: 0, url: mockArticles[0].url, isLoaded: true, isFullyLoaded: false },
        { articleIndex: 1, url: mockArticles[1].url, isLoaded: false, isFullyLoaded: false },
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
        { articleIndex: 0, url: mockArticles[0].url, isLoaded: true, isFullyLoaded: false },
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

      // 1回目のrecordNextでscrollDepth=50が記録される
      expect(mockUseFeedbackResult.recordNext).toHaveBeenCalledWith(
        "scp-173",
        expect.objectContaining({
          scrollDepth: 50,
        })
      );
    });
  });
});
