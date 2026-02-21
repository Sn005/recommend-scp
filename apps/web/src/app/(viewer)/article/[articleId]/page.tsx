/**
 * @file 記事閲覧ページ（サーバーコンポーネント）
 * @description generateMetadataで記事ごとのOGP/Twitterカードを生成
 * ライセンス帰属表示はwiki-proxyが記事末尾に注入（iframe内でスクロール）
 */
import type { Metadata } from "next";
import { ArticlePageContent } from "./_components/ArticlePageContent";

interface ArticlePageProps {
  params: Promise<{ articleId: string }>;
}

/**
 * articleId（例: "scp-173"）を表示用タイトルに変換
 * "scp-173" → "SCP-173"
 */
function formatArticleTitle(articleId: string): string {
  return articleId.toUpperCase();
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { articleId } = await params;
  const title = formatArticleTitle(articleId);
  const description = `${title} - SCP Foundation日本語版の記事をSCPicksで閲覧`;

  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title: `${title} | SCPicks`,
      description,
      type: "article",
    },
    twitter: {
      card: "summary",
      title: `${title} | SCPicks`,
      description,
    },
    alternates: {
      canonical: `/article/${articleId}`,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { articleId } = await params;
  return <ArticlePageContent articleId={articleId} />;
}
