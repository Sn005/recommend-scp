/** SCP記事の生データ */
export interface ScpArticleRaw {
  id: string;
  title: string;
  content: string;
  rating: number;
}

/** タグカテゴリ */
export type TagCategory = "object_class" | "genre" | "theme" | "format";

/** 抽出されたタグ */
export interface ExtractedTags {
  object_class: string;
  genre: string[];
  theme: string[];
  format: string;
}

/** 検索結果 */
export interface SearchResult {
  id: string;
  title: string;
  similarity_score: number;
  embedding_score: number;
  tag_score: number;
}

/** ハイブリッド検索パラメータ */
export interface HybridSearchParams {
  query_id: string;
  embedding_weight: number;
  tag_weight: number;
  limit: number;
}
