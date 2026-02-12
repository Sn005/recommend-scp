/**
 * @file 記事閲覧ページのテスト
 * @description お気に入りからの個別記事表示ページのテスト
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ArticlePage from "../page";

// next/navigation のモック
let mockArticleId = "scp-173";
vi.mock("next/navigation", () => ({
  useParams: () => ({ articleId: mockArticleId }),
}));

// ArticleWebView のモック
vi.mock("@/app/(main)/recommend/_components/ArticleWebView", () => ({
  ArticleWebView: ({ url, articleId }: { url: string; articleId?: string; className?: string }) => (
    <div data-testid="article-webview" data-url={url} data-article-id={articleId}>
      ArticleWebView Mock
    </div>
  ),
}));

// FloatingFavoriteButton のモック
vi.mock("../_components/FloatingFavoriteButton", () => ({
  FloatingFavoriteButton: ({ articleId }: { articleId: string }) => (
    <div data-testid="floating-favorite-button" data-article-id={articleId}>
      FloatingFavoriteButton Mock
    </div>
  ),
}));

describe("ArticlePage", () => {
  beforeEach(() => {
    mockArticleId = "scp-173";
  });

  it("articleIdからSCP Wiki URLを構築してArticleWebViewに渡す", () => {
    render(<ArticlePage />);

    const webView = screen.getByTestId("article-webview");
    expect(webView).toHaveAttribute("data-url", "http://scp-jp.wikidot.com/scp-173");
    expect(webView).toHaveAttribute("data-article-id", "scp-173");
  });

  it("FloatingFavoriteButtonにarticleIdが渡される", () => {
    render(<ArticlePage />);

    const fab = screen.getByTestId("floating-favorite-button");
    expect(fab).toHaveAttribute("data-article-id", "scp-173");
  });

  it("ヘッダーが表示されない（フルスクリーンレイアウト）", () => {
    render(<ArticlePage />);

    expect(screen.queryByTestId("article-header")).not.toBeInTheDocument();
  });

  it("data-testid='article-page'が設定されている", () => {
    render(<ArticlePage />);

    const page = screen.getByTestId("article-page");
    expect(page).toBeInTheDocument();
  });
});
