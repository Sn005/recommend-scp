/**
 * 環境変数ローダー
 * Subtask: 001-01-05
 *
 * モノレポルートの .env を find-up で探索して読み込む。
 * CI 環境: secrets が既に process.env に設定済み → スキップ
 * ローカル: pnpm-workspace.yaml を目印にルートを探索
 */

import { config } from "dotenv";
import { findUpSync } from "find-up";
import { dirname, join } from "path";

/**
 * モノレポルートの .env を探索して読み込む
 * - CI 環境: secrets が既に process.env に設定済み → スキップ
 * - ローカル: pnpm-workspace.yaml を目印にルートを探索
 */
const loadEnv = (): void => {
  const workspaceFile = findUpSync("pnpm-workspace.yaml");
  if (workspaceFile) {
    const envPath = join(dirname(workspaceFile), ".env");
    // override: false で既存の環境変数（CI secrets）を優先
    config({ path: envPath, override: false });
  }
};

loadEnv();

/**
 * 環境変数アクセサ（検証付き）
 *
 * 使用例:
 * ```typescript
 * import { env } from "@recommend-scp/shared";
 * const url = env.SUPABASE_URL;
 * ```
 */
export const env = {
  get SUPABASE_URL(): string {
    const value = process.env.SUPABASE_URL;
    if (!value) throw new Error("SUPABASE_URL is not set");
    return value;
  },
  get SUPABASE_ANON_KEY(): string {
    const value = process.env.SUPABASE_ANON_KEY;
    if (!value) throw new Error("SUPABASE_ANON_KEY is not set");
    return value;
  },
  get SUPABASE_SERVICE_ROLE_KEY(): string {
    const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!value) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
    return value;
  },
  get OPENAI_API_KEY(): string {
    const value = process.env.OPENAI_API_KEY;
    if (!value) throw new Error("OPENAI_API_KEY is not set");
    return value;
  },
  /** オプション: デフォルト値あり */
  get TAGGING_LLM_PROVIDER(): string {
    return process.env.TAGGING_LLM_PROVIDER ?? "openai";
  },
  /** オプション: APIサーバーポート（デフォルト: 3001） */
  get API_PORT(): number {
    const value = process.env.API_PORT;
    if (!value) return 3001;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? 3001 : parsed;
  },
  /** オプション: 実行環境（デフォルト: development） */
  get NODE_ENV(): string {
    return process.env.NODE_ENV || "development";
  },
  /** オプション: ログレベル（デフォルト: info） */
  get LOG_LEVEL(): string {
    return process.env.LOG_LEVEL || "info";
  },
};

/**
 * 全ての必須環境変数を検証
 */
export function validateEnv(): void {
  // Access each required property to trigger validation
  void env.SUPABASE_URL;
  void env.SUPABASE_ANON_KEY;
  void env.SUPABASE_SERVICE_ROLE_KEY;
  void env.OPENAI_API_KEY;
}
