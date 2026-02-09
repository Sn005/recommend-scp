import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ArticleWebView } from "./ArticleWebView";

// useArticleWebViewのモック
vi.mock("./useArticleWebView", () => ({
  useArticleWebView: vi.fn(),
}));

// use404Detectionのモック
vi.mock("./use404Detection", () => ({
  use404Detection: vi.fn(),
}));

import { useArticleWebView } from "./useArticleWebView";
import { use404Detection } from "./use404Detection";
const mockUseArticleWebView = vi.mocked(useArticleWebView);
const mockUse404Detection = vi.mocked(use404Detection);

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
    // use404Detectionのデフォルトモック（存在するURLとして扱う）
    mockUse404Detection.mockReturnValue({
      isChecking: false,
      isNotFound: false,
    });
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

    it("HTTP URLがプロキシURLに変換される（mixed content回避）", () => {
      render(<ArticleWebView url="http://scp-jp.wikidot.com/scp-173" />);

      const iframe = screen.getByTitle("SCP記事");
      expect(iframe).toHaveAttribute("src", "/api/wiki-proxy/scp-173");
    });

    it("HTTPS URLはプロキシ変換されない", () => {
      render(<ArticleWebView url="https://scp-jp.wikidot.com/scp-173" />);

      const iframe = screen.getByTitle("SCP記事");
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

    it("コンテナの高さが100vhである", () => {
      const { container } = render(<ArticleWebView url="https://example.com" />);

      const root = container.firstChild;
      expect(root).toHaveClass("h-screen");
    });
  });

  describe("AC: 404検知・サジェスト画面", () => {
    it("404検知時にサジェスト画面が表示される", async () => {
      mockUseArticleWebView.mockReturnValue(createMockReturn({ isLoading: false }));

      // onNotFoundコールバックをキャプチャして後から呼び出す
      let capturedOnNotFound: (() => void | Promise<void>) | undefined;
      mockUse404Detection.mockImplementation(({ onNotFound }) => {
        capturedOnNotFound = onNotFound;
        return {
          isChecking: false,
          isNotFound: false,
        };
      });

      render(
        <ArticleWebView url="https://example.com" articleId="test-article" onSkip={vi.fn()} />
      );

      // コールバックをact内で呼び出す
      await act(async () => {
        await capturedOnNotFound?.();
      });

      expect(screen.getByTestId("translation-not-found")).toBeInTheDocument();
    });

    it("サジェスト画面でボタンクリック後にonSkipが呼ばれる", async () => {
      const onSkip = vi.fn();
      mockUseArticleWebView.mockReturnValue(createMockReturn({ isLoading: false }));

      let capturedOnNotFound: (() => void | Promise<void>) | undefined;
      mockUse404Detection.mockImplementation(({ onNotFound }) => {
        capturedOnNotFound = onNotFound;
        return {
          isChecking: false,
          isNotFound: false,
        };
      });

      render(<ArticleWebView url="https://example.com" articleId="test-article" onSkip={onSkip} />);

      // コールバックをact内で呼び出してサジェスト画面を表示
      await act(async () => {
        await capturedOnNotFound?.();
      });

      fireEvent.click(screen.getByRole("button", { name: "別の記事をおすすめ" }));

      expect(onSkip).toHaveBeenCalledTimes(1);
    });
  });
});
