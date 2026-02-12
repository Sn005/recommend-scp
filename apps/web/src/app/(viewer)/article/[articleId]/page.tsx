/**
 * @file 記事閲覧ページ
 * @description お気に入り一覧からの個別記事表示
 * wiki-proxy経由のiframeで記事をprinter--friendlyモードで表示する
 */
"use client";

import { useParams } from "next/navigation";
import { ArticleWebView } from "@/app/(main)/recommend/_components/ArticleWebView";
import { FloatingFavoriteButton } from "./_components/FloatingFavoriteButton";

const SCP_JP_HTTP_ORIGIN = "http://scp-jp.wikidot.com";

/**
 * 個別記事閲覧ページ
 *
 * - お気に入り一覧からの遷移先
 * - articleId（例: scp-173）からSCP Wiki URLを構築
 * - ArticleWebView（iframe + wiki-proxy）で記事をprinter--friendlyモードで表示
 * - FloatingFavoriteButtonで右下にお気に入りトグルを配置
 * - ヘッダーなし（推薦画面と同じフルスクリーンレイアウト）
 */
export default function ArticlePage() {
  const { articleId } = useParams<{ articleId: string }>();
  const articleUrl = `${SCP_JP_HTTP_ORIGIN}/${articleId}`;

  return (
    <div className="relative h-screen overflow-hidden" data-testid="article-page">
      <ArticleWebView url={articleUrl} articleId={articleId} />
      <FloatingFavoriteButton articleId={articleId} />
    </div>
  );
}
