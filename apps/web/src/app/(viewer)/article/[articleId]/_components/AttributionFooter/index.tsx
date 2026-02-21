/**
 * @file AttributionFooter コンポーネント
 * @description CC BY-SA 3.0帰属表示フッター
 * @see specs/014-scp-licensing/014-03-article-attribution/014-03-02.md
 */

interface AttributionFooterProps {
  /** 記事ID（例: "scp-173"）。原文URLの構築に使用 */
  articleId: string;
  /** 著者名。undefined または空文字列の場合は著者名部分を省略 */
  authorName?: string;
}

const CC_BY_SA_URL = "https://creativecommons.org/licenses/by-sa/3.0/";

/**
 * CC BY-SA 3.0帰属表示フッター
 *
 * 記事ページのiframe下部に表示し、ライセンス・著者・原文リンクを提供する。
 * 著者名が不明（空文字列/undefined）の場合は著者名部分を省略する。
 */
export function AttributionFooter({ articleId, authorName }: AttributionFooterProps) {
  const hasAuthor = Boolean(authorName?.trim());
  const originalUrl = `https://scp-jp.wikidot.com/${articleId}`;

  return (
    <footer
      data-testid="attribution-footer"
      className="shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-2 text-center text-xs text-gray-500"
    >
      <p>
        {hasAuthor ? (
          <>
            Content by {authorName} &middot;{" "}
            <a
              href={CC_BY_SA_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="attribution-license-link"
              className="underline"
            >
              CC BY-SA 3.0
            </a>{" "}
            &middot; SCP Foundation
          </>
        ) : (
          <>
            Content licensed under{" "}
            <a
              href={CC_BY_SA_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="attribution-license-link"
              className="underline"
            >
              CC BY-SA 3.0
            </a>{" "}
            &middot; SCP Foundation
          </>
        )}
      </p>
      <a
        href={originalUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="attribution-original-link"
        className="text-blue-500 underline"
      >
        原文を見る
      </a>
    </footer>
  );
}
