"use client";

import { useCallback, useRef, useEffect, type RefObject } from "react";
import { useArticleContent, type ArticleContent } from "./useArticleContent";

/** iframe内画像の読み込みタイムアウト（個別画像ごと） */
const IMAGE_LOAD_TIMEOUT_MS = 10_000;

/**
 * iframe内の全画像が読み込み完了するまで待機
 *
 * wiki-proxy経由の同一オリジンiframeなので contentDocument にアクセス可能。
 * 各imgの .complete を確認し、未完了のものは load/error イベントで完了を待つ。
 * 個別画像のタイムアウト（10秒）を設け、永久待ちを防止する。
 */
function waitForIframeImages(iframe: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve) => {
    let doc: Document | null = null;
    try {
      doc = iframe.contentDocument;
    } catch {
      resolve();
      return;
    }
    if (!doc) {
      resolve();
      return;
    }

    const images = Array.from(doc.querySelectorAll("img"));
    const incompleteImages = images.filter((img) => !img.complete);

    if (incompleteImages.length === 0) {
      resolve();
      return;
    }

    let remaining = incompleteImages.length;
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];

    const onDone = () => {
      remaining--;
      if (remaining <= 0) {
        timeoutIds.forEach((id) => {
          clearTimeout(id);
        });
        resolve();
      }
    };

    incompleteImages.forEach((img) => {
      img.addEventListener("load", onDone, { once: true });
      img.addEventListener("error", onDone, { once: true });
      timeoutIds.push(setTimeout(onDone, IMAGE_LOAD_TIMEOUT_MS));
    });
  });
}

interface UseIframeLoadHandlerOptions {
  /** 現在のURL（変更時にcontentFetchedRefをリセット） */
  url: string;
  /** 記事ID */
  articleId?: string;
  /** iframeがロード中かどうか（useArticleWebViewから取得） */
  isIframeLoading: boolean;
  /** iframeのRef */
  iframeRef: RefObject<HTMLIFrameElement | null>;
  /** コンテナのRef（iOS reflow用） */
  containerRef: RefObject<HTMLDivElement | null>;
  /** useArticleWebViewのhandleLoad */
  handleLoad: () => void;
  /** コンテンツ取得完了時のコールバック */
  onContentLoaded?: (content: ArticleContent) => void;
  /** iframe読み込み完了時のコールバック（カスケード先読み用） */
  onIframeLoad?: () => void;
  /** 全サブリソース読み込み完了時のコールバック */
  onContentFullyReady?: () => void;
}

interface UseIframeLoadHandlerReturn {
  /** iframeのonLoadイベントハンドラー */
  handleIframeLoad: () => void;
}

/**
 * iframeロード後のコンテンツ取得ライフサイクルを管理するフック
 *
 * - iframe onLoad時: 親フックのhandleLoad呼び出し、iOS reflow、コンテンツ取得、画像待機
 * - プリロード昇格時: isIframeLoading=falseになったタイミングでのコンテンツ取得補完
 * - URL変更時: contentFetchedRefリセット
 */
export function useIframeLoadHandler(
  options: UseIframeLoadHandlerOptions
): UseIframeLoadHandlerReturn {
  const {
    url,
    articleId,
    isIframeLoading,
    iframeRef,
    containerRef,
    handleLoad,
    onContentLoaded,
    onIframeLoad,
    onContentFullyReady,
  } = options;

  const contentFetchedRef = useRef(false);

  // コンテンツ取得コールバック
  const handleContentLoaded = useCallback(
    (content: ArticleContent) => {
      onContentLoaded?.(content);
    },
    [onContentLoaded]
  );

  const { fetchContent } = useArticleContent({
    articleId: articleId ?? "",
    onContentLoaded: handleContentLoaded,
  });

  // URL変更時にcontentFetchedRefをリセット
  useEffect(() => {
    contentFetchedRef.current = false;
  }, [url]);

  // プリロード済みスロットがcurrentに昇格した際のコンテンツ取得
  useEffect(() => {
    if (!isIframeLoading && articleId && onContentLoaded && !contentFetchedRef.current) {
      contentFetchedRef.current = true;
      void fetchContent();
    }
  }, [isIframeLoading, articleId, onContentLoaded, fetchContent]);

  // iframeのonLoadイベントハンドラー
  const handleIframeLoad = useCallback(() => {
    handleLoad();
    onIframeLoad?.();

    const iframe = iframeRef.current;

    // iOS Safari iframe スクロール修正: heightトグル
    const container = containerRef.current;
    if (container) {
      container.style.height = "auto";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          container.style.height = "";
        });
      });
    }

    // コンテンツ取得（重複防止）
    if (articleId && onContentLoaded && !contentFetchedRef.current) {
      contentFetchedRef.current = true;
      void fetchContent();
    }

    // 画像含む全サブリソース読み込み完了を待ってから通知
    if (iframe && onContentFullyReady) {
      void waitForIframeImages(iframe).then(() => {
        onContentFullyReady();
      });
    }
  }, [
    handleLoad,
    onIframeLoad,
    onContentFullyReady,
    articleId,
    onContentLoaded,
    fetchContent,
    iframeRef,
    containerRef,
  ]);

  return { handleIframeLoad };
}
