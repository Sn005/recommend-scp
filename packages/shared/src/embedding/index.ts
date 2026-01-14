/**
 * Embedding module - re-exports
 */

export {
  preprocessContent,
  calculateCost,
  generateEmbedding,
  generateEmbeddingsForArticles,
  COST_PER_MILLION_TOKENS,
  type EmbeddingResult,
  type EmbeddingError,
  type EmbeddingStats,
  type ScpArticle,
} from "./generate";
