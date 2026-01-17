/**
 * Tagging module - re-exports
 */

export {
  preprocessContent,
  parseTagResponse,
  calculateTaggingCost,
  extractTagsWithOpenAI,
  extractTags,
  extractTagsForArticles,
  generateTagReport,
  EXTRACTION_PROMPT,
  COST_PER_MILLION_TOKENS_INPUT,
  COST_PER_MILLION_TOKENS_OUTPUT,
  type TaggingResult,
  type TaggingError,
  type TaggingStats,
  type ScpArticle,
} from "./extract";

export {
  TagDictionaryManagerImpl,
  type TagDictionaryManager,
  type TagDictionary,
  type TagEntry,
  type TagCategory,
} from "./tag-dictionary-manager";
