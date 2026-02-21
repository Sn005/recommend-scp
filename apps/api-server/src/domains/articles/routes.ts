/**
 * @file GET /articles/search, PATCH /articles/:articleId/translation エンドポイント
 * @description ベクトル検索API・翻訳有無更新API
 * @see specs/005-backend-api/005-04-articles-api/005-04-02.md
 * @see specs/010-ja-article-display/010-02-api-extension/010-02-02.md
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { ZodError } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { searchArticlesSchema, updateTranslationSchema } from "./schema";
import { ArticlesService } from "./service";
import { ArticlesRepository } from "./repository";

/**
 * zValidatorのバリデーションエラー時にZodErrorをスロー
 *
 * これによりapp.onErrorでRFC 7807形式のエラーレスポンスを返す
 */
const throwOnValidationError = <T>(result: { success: boolean; error?: ZodError<T> }) => {
  if (!result.success && result.error) {
    throw result.error;
  }
};

/**
 * Articles routes ファクトリ
 *
 * Method chainingでルートを定義し、Hono RPC用の型推論を有効化
 *
 * @param supabase - SupabaseClient
 * @param serviceFactory - テスト用のサービスファクトリ（オプション）
 * @returns Hono router
 */
export const createArticlesRoutes = (
  supabase: SupabaseClient,
  serviceFactory?: (repo: ArticlesRepository) => ArticlesService
) => {
  const repository = new ArticlesRepository(supabase);
  const service = serviceFactory ? serviceFactory(repository) : new ArticlesService(repository);

  /**
   * GET /articles/search
   *
   * テキストクエリによるベクトル検索
   *
   * @param q - 検索クエリ（2文字以上）
   * @param limit - 取得件数上限（1〜50、デフォルト10）
   * @returns SearchArticlesResult
   *
   * Response:
   * - 200 OK: 検索成功
   * - 400 Bad Request: バリデーションエラー（クエリなし、1文字クエリ等）
   */
  return (
    new Hono()
      .get(
        "/search",
        zValidator("query", searchArticlesSchema, throwOnValidationError),
        async (c) => {
          const { q, limit } = c.req.valid("query");
          const result = await service.searchArticles(q, { limit });
          return c.json(result, 200);
        }
      )
      /**
       * PATCH /articles/:articleId/translation
       *
       * 翻訳有無を更新
       *
       * @param articleId - 記事ID（パスパラメータ）
       * @param lang - 言語コード（2〜5文字）
       * @param hasTranslation - 翻訳有無
       * @returns 更新結果
       *
       * Response:
       * - 200 OK: 更新成功
       * - 400 Bad Request: バリデーションエラー
       * - 404 Not Found: 翻訳レコードが存在しない
       */
      .patch(
        "/:articleId/translation",
        zValidator("json", updateTranslationSchema, throwOnValidationError),
        async (c) => {
          const articleId = c.req.param("articleId");
          const { lang, hasTranslation } = c.req.valid("json");
          const result = await service.updateTranslation(articleId, lang, hasTranslation);
          return c.json({ success: true, data: result }, 200);
        }
      )
      /**
       * GET /articles/:articleId/content
       *
       * 記事のタイトルと本文冒頭を取得
       *
       * @param articleId - 記事ID（パスパラメータ）
       * @returns { title: string, excerpt: string }
       *
       * Response:
       * - 200 OK: 取得成功（エラー時も空文字列を返す）
       */
      .get("/:articleId/content", async (c) => {
        const articleId = c.req.param("articleId");
        try {
          const result = await service.getContent(articleId);
          return c.json(result, 200);
        } catch {
          // エラー耐性: 失敗時も200で空レスポンス
          return c.json({ title: "", excerpt: "", author: "" }, 200);
        }
      })
  );
};
