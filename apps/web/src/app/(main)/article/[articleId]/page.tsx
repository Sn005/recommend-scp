/**
 * @file 記事閲覧ページ
 * @description お気に入り一覧からの個別記事表示
 * wiki-proxy経由のiframeで記事を表示する
 */
"use client";

import { useParams } from "next/navigation";
import { ArticleWebView } from "@/app/(main)/recommend/_components/ArticleWebView";
import { ArticleHeader } from "./_components/ArticleHeader";

const SCP_JP_HTTP_ORIGIN = "http://scp-jp.wikidot.com";

/**
 * 個別記事閲覧ページ
 *
 * - お気に入り一覧からの遷移先
 * - articleId（例: scp-173）からSCP Wiki URLを構築
 * - ArticleWebView（iframe + wiki-proxy）で記事を表示
 * - ArticleHeaderで戻る・お気に入りトグルを提供
 */
export default function ArticlePage() {
  const { articleId } = useParams<{ articleId: string }>();
  const articleUrl = `${SCP_JP_HTTP_ORIGIN}/${articleId}`;

  return (
    <div className="relative h-screen overflow-hidden" data-testid="article-page">
      <ArticleHeader articleId={articleId} />
      <ArticleWebView url={articleUrl} articleId={articleId} />
    </div>
  );
}
