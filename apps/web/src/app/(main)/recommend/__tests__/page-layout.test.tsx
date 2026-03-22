/**
 * @file 推薦ページ レイアウトテスト
 * @description 019-02-01: サイドパネル＆コンテンツ中央寄せ
 * @see specs/019-responsive/019-02-recommend-responsive/019-02-01.md
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── モック戻り値 ───

const mockArticles = [
  {
    id: "SCP-173",
    title: "彫刻 - オリジナル",
    similarityScore: 0.95,
    source: "preference" as const,
    url: "https://scp-jp.wikidot.com/scp-173",
    objectClass: "Euclid",
    rating: 1200,
  },
  {
    id: "SCP-682",
    title: "不死身の爬虫類",
    similarityScore: 0.9,
    source: "preference" as const,
    url: "https://scp-jp.wikidot.com/scp-682",
    objectClass: "Keter",
    rating: 800,
  },
];

const mockUseInfiniteArticlesResult = {
  articles: mockArticles,
  currentIndex: 0,
  isLoading: false,
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
      isFullyLoaded: true,
    },
    {
      articleIndex: 1,
      url: "https://scp-jp.wikidot.com/scp-682",
      isLoaded: false,
      isFullyLoaded: false,
    },
    null,
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

vi.mock("../_components/TransitionCard", () => ({
  TransitionCard: () => null,
}));

vi.mock("../_components/ArticleWebView", () => ({
  ArticleWebView: ({ className }: { className?: string }) => (
    <div data-testid="article-webview" className={className} />
  ),
}));

vi.mock("../_components/FloatingUI", () => ({
  FloatingUI: () => <div data-testid="floating-ui" />,
}));

vi.mock("../_components/EmptyState", () => ({
  EmptyState: () => <div data-testid="empty-state" />,
}));

vi.mock("../_components/ErrorState", () => ({
  ErrorState: () => <div data-testid="error-state" />,
}));

vi.mock("@/shared/components/ui/SkeletonLoader", () => ({
  SkeletonLoader: () => <div data-testid="skeleton-loader" />,
}));

vi.mock("@/app/(main)/history/_hooks/useHistory", () => ({
  useHistory: () => ({
    add: vi.fn(),
    entries: [],
    clear: vi.fn(),
    remove: vi.fn(),
  }),
}));

// ─── テスト本体 ───

import RecommendPage from "../page";

describe("019-02-01: サイドパネル＆コンテンツ中央寄せ", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * ヘルパー: 3カラムラッパーを取得
   */
  function getLayoutWrapper() {
    const viewer = screen.getByTestId("article-viewer");
    // 3カラムラッパーはarticle-viewerの直接の子要素
    const wrapper = viewer.querySelector("[data-testid='three-column-layout']");
    return wrapper as HTMLElement;
  }

  function getSidePanels() {
    const left = screen.getByTestId("side-panel-left");
    const right = screen.getByTestId("side-panel-right");
    return { left, right };
  }

  function getCenterColumn() {
    return screen.getByTestId("center-column");
  }

  describe("AC-1: 3カラムレイアウト", () => {
    it("ラッパーdivにmd:flexクラスが付与されている", () => {
      render(<RecommendPage />);
      const wrapper = getLayoutWrapper();
      expect(wrapper).toHaveClass("md:flex");
    });

    it("中央カラムにmd:max-w-[768px]クラスが付与されている", () => {
      render(<RecommendPage />);
      const center = getCenterColumn();
      expect(center).toHaveClass("md:max-w-[768px]");
    });

    it("中央カラムにmd:shrink-0クラスが付与されている", () => {
      render(<RecommendPage />);
      const center = getCenterColumn();
      expect(center).toHaveClass("md:shrink-0");
    });

    it("左サイドパネルにflex-1クラスが付与されている", () => {
      render(<RecommendPage />);
      const { left } = getSidePanels();
      expect(left).toHaveClass("flex-1");
    });

    it("右サイドパネルにflex-1クラスが付与されている", () => {
      render(<RecommendPage />);
      const { right } = getSidePanels();
      expect(right).toHaveClass("flex-1");
    });
  });

  describe("AC-2: サイドパネルスタイル", () => {
    it("左サイドパネルの背景がbg-gray-100である", () => {
      render(<RecommendPage />);
      const { left } = getSidePanels();
      expect(left).toHaveClass("bg-gray-100");
    });

    it("右サイドパネルの背景がbg-gray-100である", () => {
      render(<RecommendPage />);
      const { right } = getSidePanels();
      expect(right).toHaveClass("bg-gray-100");
    });

    it("左パネルにinset box-shadowが適用されている", () => {
      render(<RecommendPage />);
      const { left } = getSidePanels();
      expect(left).toHaveStyle({
        boxShadow: "inset -1px 0 3px rgba(0,0,0,0.06)",
      });
    });

    it("右パネルにinset box-shadowが適用されている", () => {
      render(<RecommendPage />);
      const { right } = getSidePanels();
      expect(right).toHaveStyle({
        boxShadow: "inset 1px 0 3px rgba(0,0,0,0.06)",
      });
    });
  });

  describe("AC-3: モバイル非表示", () => {
    it("左サイドパネルにhidden md:blockクラスが付与されている", () => {
      render(<RecommendPage />);
      const { left } = getSidePanels();
      expect(left).toHaveClass("hidden");
      expect(left).toHaveClass("md:block");
    });

    it("右サイドパネルにhidden md:blockクラスが付与されている", () => {
      render(<RecommendPage />);
      const { right } = getSidePanels();
      expect(right).toHaveClass("hidden");
      expect(right).toHaveClass("md:block");
    });

    it("中央カラムにw-fullクラスが付与されている", () => {
      render(<RecommendPage />);
      const center = getCenterColumn();
      expect(center).toHaveClass("w-full");
    });

    it("中央カラムにhiddenクラスが付与されていない", () => {
      render(<RecommendPage />);
      const center = getCenterColumn();
      expect(center).not.toHaveClass("hidden");
    });
  });

  describe("AC-4: 最小高さ", () => {
    it("ラッパーdivにmd:min-h-[calc(100vh-56px)]クラスが付与されている", () => {
      render(<RecommendPage />);
      const wrapper = getLayoutWrapper();
      expect(wrapper).toHaveClass("md:min-h-[calc(100vh-56px)]");
    });
  });
});
