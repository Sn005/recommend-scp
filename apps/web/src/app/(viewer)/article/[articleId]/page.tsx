/**
 * @file 記事閲覧ページ
 * @description お気に入り一覧からの個別記事表示
 * wiki-proxy経由のiframeで記事をprinter--friendlyモードで表示する
 */
"use client";

import { useParams } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import { FloatingFavoriteButton } from "./_components/FloatingFavoriteButton";

/**
 * 個別記事閲覧ページ
 *
 * - お気に入り一覧からの遷移先
 * - articleId（例: scp-173）からwiki-proxyのURLを直接構築
 * - wiki-proxyがprinter--friendlyモード + CSS注入 + URL書き換えを適用
 * - FloatingFavoriteButtonで右下にお気に入りトグルを配置
 * - レイアウトでMenuButton/Drawerを配置（他ページへの導線）
 */
export default function ArticlePage() {
  const { articleId } = useParams<{ articleId: string }>();
  const iframeSrc = `/api/wiki-proxy/${articleId}`;

  return (
    <div className="relative h-screen overflow-hidden" data-testid="article-page">
      <div data-testid="article-webview" className={cn("relative w-full h-screen")}>
        <iframe
          src={iframeSrc}
          className="w-full h-full border-0"
          title="SCP記事"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>
      <FloatingFavoriteButton articleId={articleId} />
    </div>
  );
}
