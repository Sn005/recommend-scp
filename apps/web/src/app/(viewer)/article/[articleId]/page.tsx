/**
 * @file 記事閲覧ページ
 * @description お気に入り一覧からの個別記事表示
 * wiki-proxy経由のiframeで記事をprinter--friendlyモードで表示する
 */
"use client";

import { useParams } from "next/navigation";
import { useRef, useCallback, useEffect, useState } from "react";
import { cn } from "@/shared/lib/utils";
import { FloatingFavoriteButton } from "./_components/FloatingFavoriteButton";
import { AttributionFooter } from "./_components/AttributionFooter";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [authorName, setAuthorName] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchAuthor = async () => {
      try {
        const res = await fetch(`/api/articles/${articleId}/content`);
        const data = (await res.json()) as { author?: string };
        setAuthorName(data.author ?? "");
      } catch {
        setAuthorName(undefined);
      }
    };
    void fetchAuthor();
  }, [articleId]);

  // iOS Safari iframe スクロール修正: 親divのheightを一瞬除去してリフローを強制。
  // iOS Safariではiframe親コンテナのスクロール領域が初回レンダリング時に正しく計算されない。
  // DevToolsでh-screenのチェックを外す→戻す操作で治ることから、
  // 2回のペイントサイクルを経てheightをトグルする必要がある（double rAF）。
  const handleIframeLoad = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      container.style.height = "auto";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          container.style.height = "";
        });
      });
    }
  }, []);

  return (
    <div className="relative flex flex-col h-screen overflow-hidden" data-testid="article-page">
      <div
        ref={containerRef}
        data-testid="article-webview"
        className={cn("relative w-full flex-1 min-h-0")}
      >
        <iframe
          src={iframeSrc}
          className="w-full h-full border-0"
          title="SCP記事"
          sandbox="allow-scripts allow-same-origin allow-popups"
          onLoad={handleIframeLoad}
        />
      </div>
      <AttributionFooter articleId={articleId} authorName={authorName} />
      <FloatingFavoriteButton articleId={articleId} />
    </div>
  );
}
