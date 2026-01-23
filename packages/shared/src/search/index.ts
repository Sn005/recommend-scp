/**
 * Search module - re-exports
 */

export {
  vectorSearch,
  type VectorSearchParams,
  type VectorSearchResult,
  type VectorSearchResponse,
} from "./vector-search";

export {
  hybridSearch,
  jaccardSimilarity,
  calculateTagScore,
  type HybridSearchResult,
  type HybridSearchParams,
} from "./hybrid-search";

export {
  type VectorSearchClient,
  type VectorSearchParams as VectorSearchClientParams,
  type VectorSearchResult as VectorSearchClientResult,
} from "./vector-search-client";
