/**
 * LLM Tag Extractor
 * Extracts structured tags from SCP articles using LLM (OpenAI or Claude)
 */

import OpenAI from "openai";
import type { ExtractedTags } from "../types";
import { env } from "../lib/env";

/** Cost per million tokens for OpenAI gpt-4o-mini */
export const COST_PER_MILLION_TOKENS_INPUT = {
  openai: 0.15, // gpt-4o-mini input
  claude: 0.25, // claude-3-haiku input
};

export const COST_PER_MILLION_TOKENS_OUTPUT = {
  openai: 0.6, // gpt-4o-mini output
  claude: 1.25, // claude-3-haiku output
};

/** Maximum content length (approximately 8000 tokens) */
const MAX_CONTENT_LENGTH = 30000;

/** Batch size for processing */
const BATCH_SIZE = 5;

/** Delay between batches in milliseconds */
const BATCH_DELAY_MS = 2000;

/** Maximum retry attempts */
const MAX_RETRIES = 3;

/** Base delay for exponential backoff in milliseconds */
const BASE_RETRY_DELAY_MS = 1000;

export const EXTRACTION_PROMPT = `You are an expert on the SCP Foundation wiki. Analyze the following SCP article and extract structured tags.

Return a JSON object with the following structure:
{
  "object_class": "Safe" | "Euclid" | "Keter" | "Thaumiel" | "Neutralized" | "Other",
  "genre": ["horror", "sci-fi", "fantasy", "comedy", "tragedy"],  // 1-3 items from this list
  "theme": ["cognition", "reality-bending", "extradimensional", "biological", "mechanical", "temporal", "memetic", "antimemetic"],  // 1-5 items from this list
  "format": "standard" | "exploration-log" | "interview" | "experiment-log" | "tale" | "other"
}

Rules:
- object_class: Extract from the article's containment procedures or header. Use "Other" if unclear.
- genre: Identify the dominant tone/atmosphere (can be multiple, max 3)
- theme: Identify the core anomalous properties (can be multiple, max 5)
- format: Identify the primary documentation style

Article:
---
{content}
---

Return only valid JSON, no explanation.`;

export interface TaggingResult {
  articleId: string;
  tags: ExtractedTags;
  inputTokens: number;
  outputTokens: number;
}

export interface TaggingError {
  articleId: string;
  error: string;
}

export interface TaggingStats {
  totalArticles: number;
  successCount: number;
  errorCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCost: number;
  uniqueTags: {
    object_class: string[];
    genre: string[];
    theme: string[];
    format: string[];
  };
  errors: TaggingError[];
}

export interface ScpArticle {
  id: string;
  content: string;
}

/**
 * Preprocess content for tag extraction
 * - Removes HTML tags
 * - Normalizes whitespace
 * - Truncates to max length
 */
export function preprocessContent(content: string): string {
  const withoutTags = content.replace(/<[^>]*>/g, "");
  const normalized = withoutTags.replace(/\s+/g, " ").trim();
  return normalized.slice(0, MAX_CONTENT_LENGTH);
}

/**
 * Parse LLM response into ExtractedTags
 * Handles various response formats including markdown code blocks
 */
export function parseTagResponse(response: string): ExtractedTags {
  // Remove markdown code blocks if present
  let cleaned = response.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(cleaned);

  // Ensure arrays for genre and theme (handle single string case)
  const genre = Array.isArray(parsed.genre)
    ? parsed.genre
    : parsed.genre
      ? [parsed.genre]
      : [];

  const theme = Array.isArray(parsed.theme)
    ? parsed.theme
    : parsed.theme
      ? [parsed.theme]
      : [];

  return {
    object_class: parsed.object_class || "Other",
    genre,
    theme,
    format: parsed.format || "standard",
  };
}

/**
 * Calculate tagging cost based on token counts and provider
 */
export function calculateTaggingCost(
  inputTokens: number,
  outputTokens: number,
  provider: "openai" | "claude"
): number {
  const inputCost =
    (inputTokens / 1_000_000) * COST_PER_MILLION_TOKENS_INPUT[provider];
  const outputCost =
    (outputTokens / 1_000_000) * COST_PER_MILLION_TOKENS_OUTPUT[provider];
  return inputCost + outputCost;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create OpenAI client
 */
function createOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
}

/**
 * Extract tags for a single article using OpenAI
 */
export async function extractTagsWithOpenAI(
  articleId: string,
  content: string,
  client?: OpenAI
): Promise<TaggingResult> {
  const openai = client ?? createOpenAIClient();
  const preprocessed = preprocessContent(content);
  const prompt = EXTRACTION_PROMPT.replace("{content}", preprocessed);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 200,
      });

      const responseText = response.choices[0]?.message?.content ?? "{}";
      const tags = parseTagResponse(responseText);

      return {
        articleId,
        tags,
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      };
    } catch (error) {
      lastError = error as Error;

      const isRateLimitError =
        error instanceof Error &&
        (error.message.includes("rate limit") ||
          error.message.includes("429") ||
          (error as { status?: number }).status === 429);

      if (isRateLimitError && attempt < MAX_RETRIES - 1) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        console.log(
          `Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

/**
 * Extract tags for a single article (main entry point)
 * Provider selection based on TAGGING_LLM_PROVIDER env var
 */
export async function extractTags(
  articleId: string,
  content: string
): Promise<ExtractedTags> {
  const provider = env.TAGGING_LLM_PROVIDER as "openai" | "claude";

  if (provider === "claude") {
    // Claude implementation would go here
    // For now, fall back to OpenAI
    console.warn("Claude provider not yet implemented, using OpenAI");
  }

  const result = await extractTagsWithOpenAI(articleId, content);
  return result.tags;
}

/**
 * Extract tags for multiple articles with batch processing
 */
export async function extractTagsForArticles(
  articles: ScpArticle[],
  options: {
    dryRun?: boolean;
    onProgress?: (current: number, total: number) => void;
  } = {}
): Promise<{ results: TaggingResult[]; stats: TaggingStats }> {
  const { dryRun = false, onProgress } = options;

  const results: TaggingResult[] = [];
  const errors: TaggingError[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const uniqueTags = {
    object_class: new Set<string>(),
    genre: new Set<string>(),
    theme: new Set<string>(),
    format: new Set<string>(),
  };

  const openai = dryRun ? undefined : createOpenAIClient();
  const provider = (env.TAGGING_LLM_PROVIDER || "openai") as
    | "openai"
    | "claude";

  // Process in batches
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);

    for (const article of batch) {
      try {
        if (dryRun) {
          // Estimate token count (rough approximation: 1 token per 4 chars)
          const preprocessed = preprocessContent(article.content);
          const estimatedInputTokens =
            Math.ceil(preprocessed.length / 4) +
            Math.ceil(EXTRACTION_PROMPT.length / 4);
          const estimatedOutputTokens = 50; // JSON response ~50 tokens

          totalInputTokens += estimatedInputTokens;
          totalOutputTokens += estimatedOutputTokens;

          results.push({
            articleId: article.id,
            tags: {
              object_class: "Unknown",
              genre: [],
              theme: [],
              format: "standard",
            },
            inputTokens: estimatedInputTokens,
            outputTokens: estimatedOutputTokens,
          });
        } else {
          const result = await extractTagsWithOpenAI(
            article.id,
            article.content,
            openai
          );

          totalInputTokens += result.inputTokens;
          totalOutputTokens += result.outputTokens;
          results.push(result);

          // Track unique tags
          uniqueTags.object_class.add(result.tags.object_class);
          result.tags.genre.forEach((g) => uniqueTags.genre.add(g));
          result.tags.theme.forEach((t) => uniqueTags.theme.add(t));
          uniqueTags.format.add(result.tags.format);
        }

        onProgress?.(results.length + errors.length, articles.length);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`Error processing ${article.id}: ${errorMessage}`);
        errors.push({
          articleId: article.id,
          error: errorMessage,
        });
        onProgress?.(results.length + errors.length, articles.length);
      }
    }

    // Add delay between batches (except for last batch)
    if (i + BATCH_SIZE < articles.length && !dryRun) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  const stats: TaggingStats = {
    totalArticles: articles.length,
    successCount: results.length,
    errorCount: errors.length,
    totalInputTokens,
    totalOutputTokens,
    estimatedCost: calculateTaggingCost(
      totalInputTokens,
      totalOutputTokens,
      provider
    ),
    uniqueTags: {
      object_class: Array.from(uniqueTags.object_class),
      genre: Array.from(uniqueTags.genre),
      theme: Array.from(uniqueTags.theme),
      format: Array.from(uniqueTags.format),
    },
    errors,
  };

  return { results, stats };
}

/**
 * Generate markdown report of tagging results
 */
export function generateTagReport(
  results: TaggingResult[],
  stats: TaggingStats
): string {
  const lines: string[] = [];

  lines.push("# SCP Tag Extraction Report");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total Articles: ${stats.totalArticles}`);
  lines.push(`- Success: ${stats.successCount}`);
  lines.push(`- Errors: ${stats.errorCount}`);
  lines.push(`- Total Input Tokens: ${stats.totalInputTokens.toLocaleString()}`);
  lines.push(
    `- Total Output Tokens: ${stats.totalOutputTokens.toLocaleString()}`
  );
  lines.push(`- Estimated Cost: $${stats.estimatedCost.toFixed(4)}`);
  lines.push("");

  lines.push("## Unique Tags Discovered");
  lines.push("");
  lines.push(
    `- Object Classes: ${stats.uniqueTags.object_class.join(", ") || "(none)"}`
  );
  lines.push(`- Genres: ${stats.uniqueTags.genre.join(", ") || "(none)"}`);
  lines.push(`- Themes: ${stats.uniqueTags.theme.join(", ") || "(none)"}`);
  lines.push(`- Formats: ${stats.uniqueTags.format.join(", ") || "(none)"}`);
  lines.push("");

  lines.push("## Article Tags");
  lines.push("");
  lines.push(
    "| Article | Object Class | Genre | Theme | Format |"
  );
  lines.push("|---------|--------------|-------|-------|--------|");

  for (const result of results) {
    lines.push(
      `| ${result.articleId} | ${result.tags.object_class} | ${result.tags.genre.join(", ")} | ${result.tags.theme.join(", ")} | ${result.tags.format} |`
    );
  }

  if (stats.errors.length > 0) {
    lines.push("");
    lines.push("## Errors");
    lines.push("");
    for (const error of stats.errors) {
      lines.push(`- ${error.articleId}: ${error.error}`);
    }
  }

  return lines.join("\n");
}
