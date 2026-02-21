/**
 * @file 記事閲覧ページのテスト
 * @description お気に入りからの個別記事表示ページのテスト
 * page.tsx はサーバーコンポーネント（generateMetadata付き）なので、
 * クライアント側のレンダリングテストは ArticlePageContent を対象とする
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArticlePageContent } from "../_components/ArticlePageContent";

// FloatingFavoriteButton のモック
vi.mock("../_components/FloatingFavoriteButton", () => ({
  FloatingFavoriteButton: ({ articleId }: { articleId: string }) => (
    <div data-testid="floating-favorite-button" data-article-id={articleId}>
      FloatingFavoriteButton Mock
    </div>
  ),
}));

describe("ArticlePageContent", () => {
  it("articleIdからwiki-proxyのURLを構築してiframeに設定する", () => {
    render(<ArticlePageContent articleId="scp-173" />);

    const iframe = screen.getByTitle("SCP記事");
    expect(iframe).toHaveAttribute("src", "/api/wiki-proxy/scp-173");
  });

  it("iframeがarticle-webviewコンテナ内に配置される", () => {
    render(<ArticlePageContent articleId="scp-173" />);

    const webView = screen.getByTestId("article-webview");
    const iframe = webView.querySelector("iframe");
    expect(iframe).toBeInTheDocument();
  });

  it("FloatingFavoriteButtonにarticleIdが渡される", () => {
    render(<ArticlePageContent articleId="scp-173" />);

    const fab = screen.getByTestId("floating-favorite-button");
    expect(fab).toHaveAttribute("data-article-id", "scp-173");
  });

  it("ヘッダーが表示されない（フルスクリーンレイアウト）", () => {
    render(<ArticlePageContent articleId="scp-173" />);

    expect(screen.queryByTestId("article-header")).not.toBeInTheDocument();
  });

  it("data-testid='article-page'が設定されている", () => {
    render(<ArticlePageContent articleId="scp-173" />);

    const page = screen.getByTestId("article-page");
    expect(page).toBeInTheDocument();
  });

  it("iframeにsandbox属性が設定されている", () => {
    render(<ArticlePageContent articleId="scp-173" />);

    const iframe = screen.getByTitle("SCP記事");
    expect(iframe).toHaveAttribute("sandbox", "allow-scripts allow-same-origin allow-popups");
  });
});
