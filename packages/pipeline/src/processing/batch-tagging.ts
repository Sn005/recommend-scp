/**
 * バッチタグ抽出処理
 * Subtask: 003-03-03
 *
 * タグ辞書マネージャーと連携した本番品質のタグ抽出を実行する。
 * ステータス管理、コスト見積もり、進捗表示、リトライ機能を実装。
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type OpenAI from "openai";
import type { TagDictionaryManager, TagCategory } from "@recommend-scp/shared/tagging";

/** 100万トークンあたりのコスト（gpt-4o-mini） */
export const COST_PER_MILLION_TOKENS_INPUT = 0.15;
export const COST_PER_MILLION_TOKENS_OUTPUT = 0.6;

/** 最大コンテンツ長（約8000トークン） */
const MAX_CONTENT_LENGTH = 30000;

/** デフォルトのバッチサイズ */
const DEFAULT_BATCH_SIZE = 5;

/** バッチ間の遅延（ミリ秒） */
const BATCH_DELAY_MS = 2000;

/** 最大リトライ回数 */
const MAX_RETRIES = 3;

/** リトライ基準遅延（ミリ秒） */
const BASE_RETRY_DELAY_MS = 1000;

/** 推定出力トークン数（JSON応答） */
const ESTIMATED_OUTPUT_TOKENS = 50;

/** DB記事型 */
export interface DbTaggingArticle {
  id: string; // UUID (サロゲートキー)
  article_id: string; // SCP記事ID (例: "SCP-173")
  title: string;
  content: string;
  content_hash: string;
  rating: number;
  lang: string;
  tagging_status: "pending" | "processing" | "completed" | "error";
  last_tagged_at: string | null;
}

/** バッチ処理オプション */
export interface BatchTaggingOptions {
  /** バッチサイズ（デフォルト: 5） */
  batchSize?: number;
  /** コスト上限（USD） */
  costLimit?: number;
  /** ドライランモード */
  dryRun?: boolean;
  /** 進捗コールバック */
  onProgress?: (progress: TaggingProgress) => void;
}

/** 進捗情報 */
export interface TaggingProgress {
  processed: number;
  total: number;
  succeeded: number;
  failed: number;
  currentInputTokens: number;
  currentOutputTokens: number;
  estimatedCost: number;
}

/** コスト見積もり結果 */
export interface TaggingCostEstimate {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCost: number;
}

/** 未知タグ情報 */
export interface UnknownTag {
  articleId: string;
  category: string;
  rawTag: string;
}

/** エラー情報 */
export interface TaggingError {
  articleId: string;
  error: string;
}

/** バッチ処理結果 */
export interface BatchTaggingResult {
  processed: number;
  succeeded: number;
  failed: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  actualCost: number;
  duration: number;
  unknownTags: UnknownTag[];
  errors: TaggingError[];
}

/** プロセッサ初期化オプション */
export interface TaggingProcessorOptions {
  supabaseClient: SupabaseClient;
  openaiClient: OpenAI;
  tagDictionaryManager: TagDictionaryManager;
}

/** LLMからの生タグ出力 */
interface RawTags {
  object_class?: string;
  genre?: string[];
  theme?: string[];
  format?: string;
}

/** 正規化されたタグ */
interface NormalizedTags {
  object_class: string | null;
  genre: string[];
  theme: string[];
  format: string | null;
}

/**
 * コンテンツを前処理する
 * - HTMLタグを除去
 * - 空白を正規化
 * - 最大長でトランケート
 */
function preprocessContent(content: string): string {
  const withoutTags = content.replace(/<[^>]*>/g, "");
  const normalized = withoutTags.replace(/\s+/g, " ").trim();
  return normalized.slice(0, MAX_CONTENT_LENGTH);
}

/**
 * トークン数を推定する（1トークン ≈ 4文字）
 */
function estimateTokens(content: string): number {
  const preprocessed = preprocessContent(content);
  return Math.ceil(preprocessed.length / 4);
}

/**
 * コストを計算する
 */
function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * COST_PER_MILLION_TOKENS_INPUT;
  const outputCost = (outputTokens / 1_000_000) * COST_PER_MILLION_TOKENS_OUTPUT;
  return inputCost + outputCost;
}

/**
 * 遅延ユーティリティ
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * レート制限エラーかどうかを判定
 */
function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const err = error as Error & { status?: number };
  return err.message.includes("rate limit") || err.message.includes("429") || err.status === 429;
}

/** LLMレスポンスのパース用型 */
interface ParsedTagResponse {
  object_class?: string;
  genre?: string | string[];
  theme?: string | string[];
  format?: string;
}

/**
 * LLMレスポンスをパースする
 */
function parseTagResponse(response: string | null): RawTags {
  if (!response) {
    throw new Error("LLMレスポンスが空です");
  }

  // Markdownコードブロックを除去
  let cleaned = response.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(cleaned) as ParsedTagResponse;

  // 配列を保証
  const genre = Array.isArray(parsed.genre) ? parsed.genre : parsed.genre ? [parsed.genre] : [];
  const theme = Array.isArray(parsed.theme) ? parsed.theme : parsed.theme ? [parsed.theme] : [];

  return {
    object_class: parsed.object_class ?? undefined,
    genre,
    theme,
    format: parsed.format ?? undefined,
  };
}

/**
 * バッチタグ抽出プロセッサ
 */
export class BatchTaggingProcessor {
  private supabase: SupabaseClient;
  private openai: OpenAI;
  private tagDictionaryManager: TagDictionaryManager;

  constructor(options: TaggingProcessorOptions) {
    this.supabase = options.supabaseClient;
    this.openai = options.openaiClient;
    this.tagDictionaryManager = options.tagDictionaryManager;
  }

  /**
   * 未処理記事を取得する
   */
  async getPendingArticles(limit = 10000): Promise<DbTaggingArticle[]> {
    const { data, error } = await this.supabase
      .from("scp_articles")
      .select("*")
      .eq("tagging_status", "pending")
      .limit(limit);

    if (error) {
      throw new Error(`未処理記事の取得に失敗しました: ${error.message}`);
    }

    return (data as DbTaggingArticle[] | null) ?? [];
  }

  /**
   * コスト見積もりを計算する
   */
  estimateCost(articles: DbTaggingArticle[]): TaggingCostEstimate {
    if (articles.length === 0) {
      return {
        estimatedInputTokens: 0,
        estimatedOutputTokens: 0,
        estimatedCost: 0,
      };
    }

    // プロンプトテンプレートのトークン数（約300トークン）
    const promptTemplateTokens = 300;

    const estimatedInputTokens = articles.reduce((sum, article) => {
      return sum + estimateTokens(article.content) + promptTemplateTokens;
    }, 0);

    const estimatedOutputTokens = articles.length * ESTIMATED_OUTPUT_TOKENS;
    const estimatedCost = calculateCost(estimatedInputTokens, estimatedOutputTokens);

    return {
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedCost,
    };
  }

  /**
   * プロンプトを生成する
   */
  private generatePrompt(content: string, promptChoices: string): string {
    const preprocessed = preprocessContent(content);

    return `あなたはSCP Foundationの専門家です。以下のSCP記事を分析し、構造化されたタグを抽出してください。

${promptChoices}

以下の構造でJSONオブジェクトを返してください:
{
  "object_class": "選択肢から1つ選択",
  "genre": ["選択肢から1-3個選択"],
  "theme": ["選択肢から1-5個選択"],
  "format": "選択肢から1つ選択"
}

ルール:
- object_class: 記事の収容手順やヘッダーから抽出。不明な場合は "Other"
- genre: 支配的なトーン/雰囲気を特定（最大3つ）
- theme: 核心的な異常特性を特定（最大5つ）
- format: 主要なドキュメント形式を特定

記事:
---
${preprocessed}
---

有効なJSONのみを返してください。説明は不要です。`;
  }

  /**
   * 単一タグを正規化するヘルパー
   */
  private async normalizeTag(
    category: TagCategory,
    rawTag: string,
    lang: string
  ): Promise<string | null> {
    return this.tagDictionaryManager.normalize(category, rawTag, lang);
  }

  /**
   * タグを正規化する
   */
  private async normalizeTags(
    articleId: string,
    rawTags: RawTags,
    lang: string
  ): Promise<{ normalized: NormalizedTags; unknownTags: UnknownTag[] }> {
    const normalized: NormalizedTags = {
      object_class: null,
      genre: [],
      theme: [],
      format: null,
    };
    const unknownTags: UnknownTag[] = [];

    // object_class
    if (rawTags.object_class) {
      const result = await this.normalizeTag("object_class", rawTags.object_class, lang);
      if (result) {
        normalized.object_class = result;
      } else {
        unknownTags.push({
          articleId,
          category: "object_class",
          rawTag: rawTags.object_class,
        });
      }
    }

    // genre
    for (const tag of rawTags.genre ?? []) {
      const result = await this.normalizeTag("genre", tag, lang);
      if (result) {
        normalized.genre.push(result);
      } else {
        unknownTags.push({ articleId, category: "genre", rawTag: tag });
      }
    }

    // theme
    for (const tag of rawTags.theme ?? []) {
      const result = await this.normalizeTag("theme", tag, lang);
      if (result) {
        normalized.theme.push(result);
      } else {
        unknownTags.push({ articleId, category: "theme", rawTag: tag });
      }
    }

    // format
    if (rawTags.format) {
      const result = await this.normalizeTag("format", rawTags.format, lang);
      if (result) {
        normalized.format = result;
      } else {
        unknownTags.push({ articleId, category: "format", rawTag: rawTags.format });
      }
    }

    return { normalized, unknownTags };
  }

  /**
   * LLMでタグを抽出する（リトライ付き）
   */
  private async extractTagsWithRetry(
    content: string,
    promptChoices: string
  ): Promise<{ rawTags: RawTags; inputTokens: number; outputTokens: number }> {
    const prompt = this.generatePrompt(content, promptChoices);
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_tokens: 200,
        });

        const responseText = response.choices[0]?.message?.content ?? null;
        const rawTags = parseTagResponse(responseText);

        return {
          rawTags,
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
        };
      } catch (error) {
        lastError = error as Error;

        if (isRateLimitError(error) && attempt < MAX_RETRIES - 1) {
          const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }

        if (attempt < MAX_RETRIES - 1) {
          const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }
      }
    }

    throw lastError ?? new Error("Unknown error");
  }

  /**
   * ステータスを更新する
   * @param id - UUID (プライマリキー)
   */
  private async updateStatus(
    id: string,
    status: DbTaggingArticle["tagging_status"],
    lastTaggedAt?: string
  ): Promise<void> {
    const updateData: Partial<DbTaggingArticle> = {
      tagging_status: status,
    };

    if (lastTaggedAt !== undefined) {
      updateData.last_tagged_at = lastTaggedAt;
    }

    // UUIDでマッチング（一意性を保証）
    await this.supabase.from("scp_articles").update(updateData).eq("id", id);
  }

  /**
   * リトライキューに追加する
   */
  private async addToRetryQueue(articleId: string, errorMessage: string): Promise<void> {
    await this.supabase.from("retry_queue").upsert(
      {
        article_id: articleId,
        operation: "tagging",
        last_error: errorMessage,
        retry_count: 1,
        created_at: new Date().toISOString(),
      },
      { onConflict: "article_id,operation" }
    );
  }

  /**
   * タグをDBに保存する
   */
  private async saveTags(articleId: string, normalized: NormalizedTags): Promise<void> {
    // 既存タグを削除
    await this.supabase.from("article_tags").delete().eq("article_id", articleId);

    // 新しいタグを挿入
    const tagRecords: { article_id: string; tag_id: number }[] = [];

    // object_class
    if (normalized.object_class) {
      const tagId = await this.getOrCreateTagId("object_class", normalized.object_class);
      if (tagId) tagRecords.push({ article_id: articleId, tag_id: tagId });
    }

    // genre
    for (const tag of normalized.genre) {
      const tagId = await this.getOrCreateTagId("genre", tag);
      if (tagId) tagRecords.push({ article_id: articleId, tag_id: tagId });
    }

    // theme
    for (const tag of normalized.theme) {
      const tagId = await this.getOrCreateTagId("theme", tag);
      if (tagId) tagRecords.push({ article_id: articleId, tag_id: tagId });
    }

    // format
    if (normalized.format) {
      const tagId = await this.getOrCreateTagId("format", normalized.format);
      if (tagId) tagRecords.push({ article_id: articleId, tag_id: tagId });
    }

    if (tagRecords.length > 0) {
      await this.supabase.from("article_tags").insert(tagRecords);
    }
  }

  /**
   * タグIDを取得または作成する
   */
  private async getOrCreateTagId(category: string, value: string): Promise<number | null> {
    // 既存タグを検索
    const { data: existing } = await this.supabase
      .from("tags")
      .select("id")
      .eq("category", category)
      .eq("value", value);

    const existingTags = existing as { id: number }[] | null;
    if (existingTags && existingTags.length > 0) {
      return existingTags[0].id;
    }

    // 新規作成
    const { data: created } = await this.supabase
      .from("tags")
      .upsert({ category, value }, { onConflict: "category,value" })
      .select("id");

    const createdTags = created as { id: number }[] | null;
    return createdTags?.[0]?.id ?? null;
  }

  /**
   * バッチ処理を実行する
   */
  async process(options: BatchTaggingOptions = {}): Promise<BatchTaggingResult> {
    const { batchSize = DEFAULT_BATCH_SIZE, costLimit, dryRun = false, onProgress } = options;

    const startTime = Date.now();
    const errors: TaggingError[] = [];
    const unknownTags: UnknownTag[] = [];
    let succeeded = 0;
    let failed = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // 1. 未処理記事を取得
    const articles = await this.getPendingArticles();
    const total = articles.length;

    if (total === 0) {
      return {
        processed: 0,
        succeeded: 0,
        failed: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        actualCost: 0,
        duration: Date.now() - startTime,
        unknownTags: [],
        errors: [],
      };
    }

    // 2. コスト見積もり
    const estimate = this.estimateCost(articles);

    // 3. コスト上限チェック
    if (costLimit !== undefined && estimate.estimatedCost > costLimit) {
      throw new Error(
        `コスト上限超過: $${estimate.estimatedCost.toFixed(4)} > $${String(costLimit)}`
      );
    }

    // 4. プロンプト選択肢を生成
    const promptChoices = await this.tagDictionaryManager.generatePromptChoices();

    // 5. ドライラン
    if (dryRun) {
      for (const article of articles) {
        const articleTokens = estimateTokens(article.content) + 300;
        totalInputTokens += articleTokens;
        totalOutputTokens += ESTIMATED_OUTPUT_TOKENS;
        succeeded++;

        onProgress?.({
          processed: succeeded,
          total,
          succeeded,
          failed: 0,
          currentInputTokens: totalInputTokens,
          currentOutputTokens: totalOutputTokens,
          estimatedCost: calculateCost(totalInputTokens, totalOutputTokens),
        });
      }

      return {
        processed: total,
        succeeded: total,
        failed: 0,
        totalInputTokens: estimate.estimatedInputTokens,
        totalOutputTokens: estimate.estimatedOutputTokens,
        actualCost: estimate.estimatedCost,
        duration: Date.now() - startTime,
        unknownTags: [],
        errors: [],
      };
    }

    // 6. バッチ処理実行
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);

      for (const article of batch) {
        try {
          // ステータスをprocessingに更新（UUIDで一意に特定）
          await this.updateStatus(article.id, "processing");

          // タグ抽出
          const { rawTags, inputTokens, outputTokens } = await this.extractTagsWithRetry(
            article.content,
            promptChoices
          );

          totalInputTokens += inputTokens;
          totalOutputTokens += outputTokens;

          // タグ正規化（article_idはログ・エラー報告用）
          const { normalized, unknownTags: articleUnknownTags } = await this.normalizeTags(
            article.article_id,
            rawTags,
            article.lang
          );

          unknownTags.push(...articleUnknownTags);

          // タグ保存（article_tagsテーブルはarticle_idで関連付け）
          await this.saveTags(article.article_id, normalized);

          // 成功時の更新
          await this.updateStatus(article.id, "completed", new Date().toISOString());

          succeeded++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push({ articleId: article.article_id, error: errorMessage });
          failed++;

          // エラー時の更新
          await this.updateStatus(article.id, "error");
          await this.addToRetryQueue(article.article_id, errorMessage);
        }

        // 進捗表示
        onProgress?.({
          processed: succeeded + failed,
          total,
          succeeded,
          failed,
          currentInputTokens: totalInputTokens,
          currentOutputTokens: totalOutputTokens,
          estimatedCost: calculateCost(totalInputTokens, totalOutputTokens),
        });
      }

      // バッチ間遅延（最後のバッチ以外）
      if (i + batchSize < articles.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    return {
      processed: succeeded + failed,
      succeeded,
      failed,
      totalInputTokens,
      totalOutputTokens,
      actualCost: calculateCost(totalInputTokens, totalOutputTokens),
      duration: Date.now() - startTime,
      unknownTags,
      errors,
    };
  }
}
