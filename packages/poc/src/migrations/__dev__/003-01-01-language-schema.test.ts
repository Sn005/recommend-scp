/**
 * Subtask-003-01-01: 言語マスタ・記事テーブル拡張 - スキーマ検証テスト
 *
 * このテストはSupabase接続が必要な統合テストです。
 * ローカルSupabaseまたはテスト環境で実行してください。
 *
 * 実行方法:
 *   pnpm test src/migrations/__dev__/003-01-01-language-schema.test.ts
 */

import { describe, it, expect } from "vitest";
import { createSupabaseAdmin } from "../../lib/supabase";

// カラム情報の型定義
interface ColumnInfo {
  column_name: string;
  data_type: string;
  column_default: string | null;
  is_nullable: string;
}

// インデックス情報の型定義
interface IndexInfo {
  index_name: string;
  index_definition: string;
}

// テスト用Supabaseクライアント
const supabase = createSupabaseAdmin();

// カラム情報取得用のヘルパー関数
async function getTableColumns(tableName: string): Promise<ColumnInfo[]> {
  const result: { data: unknown; error: { message: string } | null } = await supabase.rpc(
    "get_table_columns",
    {
      p_table_name: tableName,
    }
  );
  if (result.error) throw new Error(`カラム情報取得失敗: ${result.error.message}`);
  return result.data as ColumnInfo[];
}

// インデックス情報取得用のヘルパー関数
async function getTableIndexes(tableName: string): Promise<IndexInfo[]> {
  const result: { data: unknown; error: { message: string } | null } = await supabase.rpc(
    "get_table_indexes",
    {
      p_table_name: tableName,
    }
  );
  if (result.error) throw new Error(`インデックス情報取得失敗: ${result.error.message}`);
  return result.data as IndexInfo[];
}

describe("Subtask-003-01-01: 言語マスタ・記事テーブル拡張", () => {
  // ===========================================
  // AC1: supported_languages テーブル作成
  // ===========================================
  describe("AC1: supported_languages テーブル作成", () => {
    it("テーブルが存在する", async () => {
      const { error } = await supabase.from("supported_languages").select("*").limit(0);

      expect(error).toBeNull();
    });

    it("code カラムが存在する（TEXT型, PRIMARY KEY）", async () => {
      const columns = await getTableColumns("supported_languages");
      const codeColumn = columns.find((c) => c.column_name === "code");

      expect(codeColumn).toBeDefined();
      expect(codeColumn?.data_type).toBe("text");
    });

    it("name カラムが存在する（TEXT型, NOT NULL）", async () => {
      const columns = await getTableColumns("supported_languages");
      const nameColumn = columns.find((c) => c.column_name === "name");

      expect(nameColumn).toBeDefined();
      expect(nameColumn?.data_type).toBe("text");
      expect(nameColumn?.is_nullable).toBe("NO");
    });

    it("wiki_url カラムが存在する（TEXT型）", async () => {
      const columns = await getTableColumns("supported_languages");
      const column = columns.find((c) => c.column_name === "wiki_url");

      expect(column).toBeDefined();
      expect(column?.data_type).toBe("text");
    });

    it("crawler_type カラムが存在する（TEXT型, NOT NULL）", async () => {
      const columns = await getTableColumns("supported_languages");
      const column = columns.find((c) => c.column_name === "crawler_type");

      expect(column).toBeDefined();
      expect(column?.data_type).toBe("text");
      expect(column?.is_nullable).toBe("NO");
    });

    it("is_active カラムが存在する（BOOLEAN型, DEFAULT false）", async () => {
      const columns = await getTableColumns("supported_languages");
      const column = columns.find((c) => c.column_name === "is_active");

      expect(column).toBeDefined();
      expect(column?.data_type).toBe("boolean");
      expect(column?.column_default).toContain("false");
    });

    it("priority カラムが存在する（INTEGER型, DEFAULT 0）", async () => {
      const columns = await getTableColumns("supported_languages");
      const column = columns.find((c) => c.column_name === "priority");

      expect(column).toBeDefined();
      expect(column?.data_type).toBe("integer");
      expect(column?.column_default).toContain("0");
    });

    it("crawler_type は 'api' または 'scraping' のみ許可される", async () => {
      const testData = {
        code: "test_invalid",
        name: "Test",
        crawler_type: "invalid_type",
      };

      const { error } = await supabase.from("supported_languages").insert(testData);

      expect(error).not.toBeNull();
      // クリーンアップ不要（エラーで挿入されない）
    });
  });

  // ===========================================
  // AC2: 言語マスタ初期データ投入
  // ===========================================
  describe("AC2: 言語マスタ初期データ投入", () => {
    it("EN レコードが is_active: true で登録されている", async () => {
      const result = await supabase
        .from("supported_languages")
        .select("*")
        .eq("code", "en")
        .single();

      expect(result.error).toBeNull();
      expect(result.data).toMatchObject({
        code: "en",
        name: "English",
        wiki_url: "https://scp-wiki.wikidot.com",
        crawler_type: "api",
        is_active: true,
        priority: 1,
      });
    });

    it("JA レコードが is_active: false で登録されている", async () => {
      const result = await supabase
        .from("supported_languages")
        .select("*")
        .eq("code", "ja")
        .single();

      expect(result.error).toBeNull();
      expect(result.data).toMatchObject({
        code: "ja",
        name: "日本語",
        wiki_url: "http://scp-jp.wikidot.com",
        crawler_type: "scraping",
        is_active: false,
        priority: 2,
      });
    });

    it("初期データは EN と JA の2件が投入されている", async () => {
      const { data, error } = await supabase.from("supported_languages").select("code");

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
      const codes = data?.map((d: { code: string }) => d.code).sort() ?? [];
      expect(codes).toEqual(["en", "ja"]);
    });
  });

  // ===========================================
  // AC3: scp_articles テーブル拡張
  // ===========================================
  describe("AC3: scp_articles テーブル拡張", () => {
    it("lang カラムが追加される（TEXT型, DEFAULT 'en'）", async () => {
      const columns = await getTableColumns("scp_articles");
      const column = columns.find((c) => c.column_name === "lang");

      expect(column).toBeDefined();
      expect(column?.data_type).toBe("text");
      expect(column?.column_default).toContain("en");
    });

    it("source_updated_at カラムが追加される（TIMESTAMPTZ型）", async () => {
      const columns = await getTableColumns("scp_articles");
      const column = columns.find((c) => c.column_name === "source_updated_at");

      expect(column).toBeDefined();
      expect(column?.data_type).toContain("timestamp");
    });

    it("is_deleted カラムが追加される（BOOLEAN型, DEFAULT false）", async () => {
      const columns = await getTableColumns("scp_articles");
      const column = columns.find((c) => c.column_name === "is_deleted");

      expect(column).toBeDefined();
      expect(column?.data_type).toBe("boolean");
      expect(column?.column_default).toContain("false");
    });

    it("embedding_status カラムが追加される（TEXT型, DEFAULT 'pending'）", async () => {
      const columns = await getTableColumns("scp_articles");
      const column = columns.find((c) => c.column_name === "embedding_status");

      expect(column).toBeDefined();
      expect(column?.data_type).toBe("text");
      expect(column?.column_default).toContain("pending");
    });

    it("tagging_status カラムが追加される（TEXT型, DEFAULT 'pending'）", async () => {
      const columns = await getTableColumns("scp_articles");
      const column = columns.find((c) => c.column_name === "tagging_status");

      expect(column).toBeDefined();
      expect(column?.data_type).toBe("text");
      expect(column?.column_default).toContain("pending");
    });

    it("last_processed_at カラムが追加される（TIMESTAMPTZ型）", async () => {
      const columns = await getTableColumns("scp_articles");
      const column = columns.find((c) => c.column_name === "last_processed_at");

      expect(column).toBeDefined();
      expect(column?.data_type).toContain("timestamp");
    });

    it("embedding_status は 'pending', 'processing', 'completed', 'error' のみ許可される", async () => {
      const testData = {
        id: "SCP-TEST-INVALID-STATUS",
        title: "Test",
        embedding_status: "invalid_status",
      };

      const { error } = await supabase.from("scp_articles").insert(testData);

      expect(error).not.toBeNull();
    });

    it("tagging_status は 'pending', 'processing', 'completed', 'error' のみ許可される", async () => {
      const testData = {
        id: "SCP-TEST-INVALID-TAG-STATUS",
        title: "Test",
        tagging_status: "invalid_status",
      };

      const { error } = await supabase.from("scp_articles").insert(testData);

      expect(error).not.toBeNull();
    });

    it("lang は supported_languages.code への外部キーである", async () => {
      const testData = {
        id: "SCP-TEST-INVALID-LANG",
        title: "Test",
        lang: "zz", // 存在しない言語コード
      };

      const { error } = await supabase.from("scp_articles").insert(testData);

      expect(error).not.toBeNull();
      expect(error?.code).toBe("23503"); // foreign_key_violation
    });
  });

  // ===========================================
  // AC4: 既存データのマイグレーション
  // ===========================================
  describe("AC4: 既存データのマイグレーション", () => {
    it("既存記事の lang が 'en' に設定されている", async () => {
      const { data: articles, error } = await supabase
        .from("scp_articles")
        .select("id, lang")
        .limit(10);

      expect(error).toBeNull();
      // 既存記事がある場合、全てlang='en'であること
      if (articles && articles.length > 0) {
        articles.forEach((article: { id: string; lang: string }) => {
          expect(article.lang).toBe("en");
        });
      }
    });

    it("embedding有の記事は embedding_status が 'completed' である", async () => {
      // scp_embeddings に存在する記事IDを取得
      const embeddingsResult = await supabase.from("scp_embeddings").select("id");
      const embeddingIds = embeddingsResult.data?.map((e: { id: string }) => e.id) ?? [];

      if (embeddingIds.length === 0) {
        // embeddingがない場合はスキップ
        return;
      }

      // scp_embeddings に存在する記事のステータスを確認
      const { data: embeddedArticles, error } = await supabase
        .from("scp_articles")
        .select("id, embedding_status")
        .in("id", embeddingIds);

      expect(error).toBeNull();
      if (embeddedArticles && embeddedArticles.length > 0) {
        embeddedArticles.forEach((article: { id: string; embedding_status: string }) => {
          expect(article.embedding_status).toBe("completed");
        });
      }
    });

    it("embedding無の記事は embedding_status が 'pending' である", async () => {
      // scp_embeddings に存在する記事IDを取得
      const embeddingsResult = await supabase.from("scp_embeddings").select("id");
      const embeddingIds = embeddingsResult.data?.map((e: { id: string }) => e.id) ?? [];

      // embedding無の記事を取得
      let query = supabase.from("scp_articles").select("id, embedding_status");

      if (embeddingIds.length > 0) {
        query = query.not("id", "in", `(${embeddingIds.map((id) => `'${id}'`).join(",")})`);
      }

      const { data: nonEmbeddedArticles, error } = await query;

      expect(error).toBeNull();
      if (nonEmbeddedArticles && nonEmbeddedArticles.length > 0) {
        nonEmbeddedArticles.forEach((article: { id: string; embedding_status: string }) => {
          expect(article.embedding_status).toBe("pending");
        });
      }
    });
  });

  // ===========================================
  // AC5: インデックス作成
  // ===========================================
  describe("AC5: インデックス作成", () => {
    it("scp_articles(lang) にインデックスが作成されている", async () => {
      const indexes = await getTableIndexes("scp_articles");
      const langIndex = indexes.find(
        (idx) => idx.index_name.includes("lang") || idx.index_definition.includes("(lang)")
      );

      expect(langIndex).toBeDefined();
    });

    it("scp_articles(embedding_status) にインデックスが作成されている", async () => {
      const indexes = await getTableIndexes("scp_articles");
      const statusIndex = indexes.find(
        (idx) =>
          idx.index_name.includes("embedding_status") ||
          idx.index_definition.includes("(embedding_status)")
      );

      expect(statusIndex).toBeDefined();
    });

    it("scp_articles(tagging_status) にインデックスが作成されている", async () => {
      const indexes = await getTableIndexes("scp_articles");
      const statusIndex = indexes.find(
        (idx) =>
          idx.index_name.includes("tagging_status") ||
          idx.index_definition.includes("(tagging_status)")
      );

      expect(statusIndex).toBeDefined();
    });

    it("scp_articles(is_deleted) に部分インデックスが作成されている", async () => {
      const indexes = await getTableIndexes("scp_articles");
      const deletedIndex = indexes.find(
        (idx) =>
          idx.index_name.includes("is_deleted") || idx.index_definition.includes("(is_deleted)")
      );

      expect(deletedIndex).toBeDefined();
      // 部分インデックス（WHERE句）の確認
      expect(deletedIndex?.index_definition.toLowerCase()).toContain("where");
    });
  });
});
