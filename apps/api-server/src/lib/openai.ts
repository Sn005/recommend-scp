/**
 * @file OpenAI Embedding ユーティリティ
 * @description テキストクエリをEmbeddingベクトルに変換する
 * @see specs/005-backend-api/005-04-articles-api/005-04-01.md
 */

import OpenAI from "openai";
import { env } from "@recommend-scp/shared/lib/env";

/** OpenAIクライアント（シングルトン） */
let openaiClient: OpenAI | null = null;

/**
 * OpenAIクライアントを取得（遅延初期化）
 */
const getOpenAIClient = (): OpenAI => {
  openaiClient ??= new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return openaiClient;
};

/**
 * テキストをEmbeddingベクトルに変換
 *
 * @param text - 変換対象のテキスト（日本語・英語対応）
 * @returns 1536次元のEmbeddingベクトル
 * @throws OpenAI APIエラー（認証エラー、レート制限等）
 */
export const createEmbedding = async (text: string): Promise<number[]> => {
  const openai = getOpenAIClient();

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
};
