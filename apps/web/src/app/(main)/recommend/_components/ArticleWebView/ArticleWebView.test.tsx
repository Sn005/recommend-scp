import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ArticleWebView } from "./ArticleWebView";

// useArticleWebViewのモック
vi.mock("./useArticleWebView", () => ({
  useArticleWebView: vi.fn(),
}));

import { useArticleWebView } from "./useArticleWebView";
const mockUseArticleWebView = vi.mocked(useArticleWebView);

describe("ArticleWebView", () => {
  const createMockReturn = (overrides = {}) => ({
    iframeRef: { current: null },
    isLoading: true,
    error: null,
    scrollPercentage: 0,
    handleLoad: vi.fn(),
    handleError: vi.fn(),
    retry: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    mockUseArticleWebView.mockReturnValue(createMockReturn());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("AC-1: iframe表示", () => {
    it("有効なURLを渡した場合iframeが描画される", () => {
      render(<ArticleWebView url="https://scp-jp.wikidot.com/scp-173" />);

      const iframe = screen.getByTitle("SCP記事");
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute("src", "https://scp-jp.wikidot.com/scp-173");
    });

    it("iframeにsandbox属性が設定される", () => {
      render(<ArticleWebView url="https://example.com" />);

      const iframe = screen.getByTitle("SCP記事");
      expect(iframe).toHaveAttribute("sandbox");
      expect(iframe.getAttribute("sandbox")).toContain("allow-scripts");
      expect(iframe.getAttribute("sandbox")).toContain("allow-same-origin");
    });

    it("iframeにborder-0クラスが適用される", () => {
      render(<ArticleWebView url="https://example.com" />);

      const iframe = screen.getByTitle("SCP記事");
      expect(iframe).toHaveClass("border-0");
    });
  });

  describe("AC-2: スクロール可能", () => {
    it("iframeのsandbox属性にallow-scriptsが含まれる", () => {
      render(<ArticleWebView url="https://example.com" />);

      const iframe = screen.getByTitle("SCP記事");
      expect(iframe.getAttribute("sandbox")).toContain("allow-scripts");
    });

    it("iframeのsandbox属性にallow-same-originが含まれる", () => {
      render(<ArticleWebView url="https://example.com" />);

      const iframe = screen.getByTitle("SCP記事");
      expect(iframe.getAttribute("sandbox")).toContain("allow-same-origin");
    });

    it("iframeのsandbox属性にallow-popupsが含まれる", () => {
      render(<ArticleWebView url="https://example.com" />);

      const iframe = screen.getByTitle("SCP記事");
      expect(iframe.getAttribute("sandbox")).toContain("allow-popups");
    });
  });

  describe("AC-4: 記事切り替え", () => {
    it("URLが変更された際にiframeのsrcが更新される", () => {
      const { rerender } = render(<ArticleWebView url="https://example.com/article1" />);

      const iframe = screen.getByTitle("SCP記事");
      expect(iframe).toHaveAttribute("src", "https://example.com/article1");

      rerender(<ArticleWebView url="https://example.com/article2" />);

      expect(iframe).toHaveAttribute("src", "https://example.com/article2");
    });
  });

  describe("AC-5: ローディング状態", () => {
    it("ローディング中にローディングインジケータが表示される", () => {
      mockUseArticleWebView.mockReturnValue(createMockReturn({ isLoading: true, error: null }));
      render(<ArticleWebView url="https://example.com" />);

      expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();
    });

    it("読み込み完了後にローディングインジケータが非表示になる", () => {
      mockUseArticleWebView.mockReturnValue(createMockReturn({ isLoading: false, error: null }));
      render(<ArticleWebView url="https://example.com" />);

      expect(screen.queryByTestId("loading-indicator")).not.toBeInTheDocument();
    });
  });

  describe("AC-7: エラーハンドリング", () => {
    it("エラー時にエラーメッセージが表示される", () => {
      mockUseArticleWebView.mockReturnValue(
        createMockReturn({
          isLoading: false,
          error: new Error("読み込みに失敗しました"),
        })
      );
      render(<ArticleWebView url="https://example.com" />);

      expect(screen.getByText(/読み込みに失敗しました/)).toBeInTheDocument();
    });

    it("エラー時に再試行ボタンが表示される", () => {
      mockUseArticleWebView.mockReturnValue(
        createMockReturn({
          isLoading: false,
          error: new Error("読み込みに失敗しました"),
        })
      );
      render(<ArticleWebView url="https://example.com" />);

      expect(screen.getByRole("button", { name: "再試行" })).toBeInTheDocument();
    });

    it("再試行ボタンクリックでretry関数が呼び出される", () => {
      const retry = vi.fn();
      mockUseArticleWebView.mockReturnValue(
        createMockReturn({
          isLoading: false,
          error: new Error("読み込みに失敗しました"),
          retry,
        })
      );
      render(<ArticleWebView url="https://example.com" />);

      fireEvent.click(screen.getByRole("button", { name: "再試行" }));

      expect(retry).toHaveBeenCalledTimes(1);
    });

    it("エラー時にローディングインジケータが非表示になる", () => {
      mockUseArticleWebView.mockReturnValue(
        createMockReturn({
          isLoading: true,
          error: new Error("読み込みに失敗しました"),
        })
      );
      render(<ArticleWebView url="https://example.com" />);

      // error が truthy の場合は loading indicator が非表示
      expect(screen.queryByTestId("loading-indicator")).not.toBeInTheDocument();
    });
  });

  describe("エッジケース: className適用", () => {
    it("className propsが適切にルート要素に適用される", () => {
      const { container } = render(
        <ArticleWebView url="https://example.com" className="custom-class" />
      );

      const root = container.firstChild;
      expect(root).toHaveClass("custom-class");
    });
  });

  describe("エッジケース: フックへのパラメータ渡し", () => {
    it("urlがフックに渡される", () => {
      render(<ArticleWebView url="https://example.com" />);

      expect(mockUseArticleWebView).toHaveBeenCalledWith(
        expect.objectContaining({ url: "https://example.com" })
      );
    });

    it("onScrollEndがフックに渡される", () => {
      const onScrollEnd = vi.fn();
      render(<ArticleWebView url="https://example.com" onScrollEnd={onScrollEnd} />);

      expect(mockUseArticleWebView).toHaveBeenCalledWith(expect.objectContaining({ onScrollEnd }));
    });

    it("onScrollChangeがフックに渡される", () => {
      const onScrollChange = vi.fn();
      render(<ArticleWebView url="https://example.com" onScrollChange={onScrollChange} />);

      expect(mockUseArticleWebView).toHaveBeenCalledWith(
        expect.objectContaining({ onScrollChange })
      );
    });
  });

  describe("レイアウト", () => {
    it("コンテナがrelativeとw-fullクラスを持つ", () => {
      const { container } = render(<ArticleWebView url="https://example.com" />);

      const root = container.firstChild;
      expect(root).toHaveClass("relative");
      expect(root).toHaveClass("w-full");
    });

    it("iframeがw-fullとh-fullクラスを持つ", () => {
      render(<ArticleWebView url="https://example.com" />);

      const iframe = screen.getByTitle("SCP記事");
      expect(iframe).toHaveClass("w-full");
      expect(iframe).toHaveClass("h-full");
    });

    it("コンテナの高さがcalc(100vh-100px)である", () => {
      const { container } = render(<ArticleWebView url="https://example.com" />);

      const root = container.firstChild;
      expect(root).toHaveClass("h-[calc(100vh-100px)]");
    });
  });
});
