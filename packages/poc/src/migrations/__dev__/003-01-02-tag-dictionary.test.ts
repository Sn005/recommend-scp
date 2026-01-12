/**
 * Subtask-003-01-02: タグ辞書テーブル構築 - スキーマ検証テスト
 *
 * このテストはSupabase接続が必要な統合テストです。
 * ローカルSupabaseまたはテスト環境で実行してください。
 *
 * 実行方法:
 *   pnpm test src/migrations/__dev__/003-01-02-tag-dictionary.test.ts
 */

import { describe, it, expect, afterAll } from "vitest";
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

// タグ辞書の型定義
interface TagDictionary {
  id: number;
  category: string;
  canonical_value: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// タグローカライズの型定義
interface TagLocalization {
  tag_id: number;
  lang: string;
  localized_value: string;
  aliases: string[];
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

// テスト用データのクリーンアップ
afterAll(async () => {
  // テスト用に挿入したタグを削除
  await supabase.from("tag_dictionary").delete().eq("canonical_value", "TEST_CASCADE_DELETE");
});

describe("Subtask-003-01-02: タグ辞書テーブル構築", () => {
  // ===========================================
  // AC1: tag_dictionary テーブル作成
  // ===========================================
  describe("AC1: tag_dictionary テーブル作成", () => {
    it("テーブルが存在する", async () => {
      const { error } = await supabase.from("tag_dictionary").select("*").limit(0);

      expect(error).toBeNull();
    });

    it("id カラムが存在する（INTEGER型, PRIMARY KEY）", async () => {
      const columns = await getTableColumns("tag_dictionary");
      const column = columns.find((c) => c.column_name === "id");

      expect(column).toBeDefined();
      expect(column?.data_type).toBe("integer");
    });

    it("category カラムが存在する（TEXT型, NOT NULL）", async () => {
      const columns = await getTableColumns("tag_dictionary");
      const column = columns.find((c) => c.column_name === "category");

      expect(column).toBeDefined();
      expect(column?.data_type).toBe("text");
      expect(column?.is_nullable).toBe("NO");
    });

    it("canonical_value カラムが存在する（TEXT型, NOT NULL）", async () => {
      const columns = await getTableColumns("tag_dictionary");
      const column = columns.find((c) => c.column_name === "canonical_value");

      expect(column).toBeDefined();
      expect(column?.data_type).toBe("text");
      expect(column?.is_nullable).toBe("NO");
    });

    it("is_active カラムが存在する（BOOLEAN型, DEFAULT true）", async () => {
      const columns = await getTableColumns("tag_dictionary");
      const column = columns.find((c) => c.column_name === "is_active");

      expect(column).toBeDefined();
      expect(column?.data_type).toBe("boolean");
      expect(column?.column_default).toContain("true");
    });

    it("created_at カラムが存在する（TIMESTAMPTZ型）", async () => {
      const columns = await getTableColumns("tag_dictionary");
      const column = columns.find((c) => c.column_name === "created_at");

      expect(column).toBeDefined();
      expect(column?.data_type).toContain("timestamp");
    });

    it("updated_at カラムが存在する（TIMESTAMPTZ型）", async () => {
      const columns = await getTableColumns("tag_dictionary");
      const column = columns.find((c) => c.column_name === "updated_at");

      expect(column).toBeDefined();
      expect(column?.data_type).toContain("timestamp");
    });

    it("無効なカテゴリ値でINSERTするとエラーになる", async () => {
      const testData = {
        category: "invalid_category",
        canonical_value: "TEST",
      };

      const { error } = await supabase.from("tag_dictionary").insert(testData);

      expect(error).not.toBeNull();
    });

    it("重複する (category, canonical_value) でINSERTするとエラーになる", async () => {
      // SAFEは初期データで既に存在するため、エラーになるはず
      const testData = {
        category: "object_class",
        canonical_value: "SAFE",
      };

      const { error } = await supabase.from("tag_dictionary").insert(testData);

      expect(error).not.toBeNull();
      expect(error?.code).toBe("23505"); // unique_violation
    });
  });

  // ===========================================
  // AC2: tag_localizations テーブル作成
  // ===========================================
  describe("AC2: tag_localizations テーブル作成", () => {
    it("テーブルが存在する", async () => {
      const { error } = await supabase.from("tag_localizations").select("*").limit(0);

      expect(error).toBeNull();
    });

    it("tag_id カラムが存在する（INTEGER型）", async () => {
      const columns = await getTableColumns("tag_localizations");
      const column = columns.find((c) => c.column_name === "tag_id");

      expect(column).toBeDefined();
      expect(column?.data_type).toBe("integer");
      expect(column?.is_nullable).toBe("NO");
    });

    it("lang カラムが存在する（TEXT型）", async () => {
      const columns = await getTableColumns("tag_localizations");
      const column = columns.find((c) => c.column_name === "lang");

      expect(column).toBeDefined();
      expect(column?.data_type).toBe("text");
      expect(column?.is_nullable).toBe("NO");
    });

    it("localized_value カラムが存在する（TEXT型, NOT NULL）", async () => {
      const columns = await getTableColumns("tag_localizations");
      const column = columns.find((c) => c.column_name === "localized_value");

      expect(column).toBeDefined();
      expect(column?.data_type).toBe("text");
      expect(column?.is_nullable).toBe("NO");
    });

    it("aliases カラムが存在する（ARRAY型）", async () => {
      const columns = await getTableColumns("tag_localizations");
      const column = columns.find((c) => c.column_name === "aliases");

      expect(column).toBeDefined();
      expect(column?.data_type).toBe("ARRAY");
    });

    it("(tag_id, lang) の重複でINSERTするとエラーになる", async () => {
      const { data: tag } = await supabase
        .from("tag_dictionary")
        .select("id")
        .eq("canonical_value", "SAFE")
        .single();

      const tagData = tag as TagDictionary | null;
      if (!tagData) throw new Error("SAFE タグが見つかりません");

      // ENのローカライズは初期データで既に存在
      const testData = {
        tag_id: tagData.id,
        lang: "en",
        localized_value: "Duplicate Test",
        aliases: ["test"],
      };

      const { error } = await supabase.from("tag_localizations").insert(testData);

      expect(error).not.toBeNull();
      expect(error?.code).toBe("23505"); // unique_violation
    });

    it("存在しない tag_id を参照するとエラーになる", async () => {
      const testData = {
        tag_id: 99999, // 存在しないID
        lang: "en",
        localized_value: "Test",
      };

      const { error } = await supabase.from("tag_localizations").insert(testData);

      expect(error).not.toBeNull();
      expect(error?.code).toBe("23503"); // foreign_key_violation
    });

    it("存在しない lang を参照するとエラーになる", async () => {
      const { data: tag } = await supabase
        .from("tag_dictionary")
        .select("id")
        .eq("canonical_value", "SAFE")
        .single();

      const tagData = tag as TagDictionary | null;
      if (!tagData) throw new Error("SAFE タグが見つかりません");

      const testData = {
        tag_id: tagData.id,
        lang: "zz", // 存在しない言語コード
        localized_value: "Test",
      };

      const { error } = await supabase.from("tag_localizations").insert(testData);

      expect(error).not.toBeNull();
      expect(error?.code).toBe("23503"); // foreign_key_violation
    });

    it("tag_dictionary のタグ削除時に関連ローカライズもCASCADE削除される", async () => {
      // テスト用タグを挿入
      const insertResult = await supabase
        .from("tag_dictionary")
        .insert({
          category: "genre",
          canonical_value: "TEST_CASCADE_DELETE",
        })
        .select()
        .single();

      expect(insertResult.error).toBeNull();
      expect(insertResult.data).not.toBeNull();

      const newTagData = insertResult.data as TagDictionary;

      // ローカライズを挿入
      const { error: localizationError } = await supabase.from("tag_localizations").insert({
        tag_id: newTagData.id,
        lang: "en",
        localized_value: "Test Cascade",
      });

      expect(localizationError).toBeNull();

      // タグを削除
      await supabase.from("tag_dictionary").delete().eq("id", newTagData.id);

      // ローカライズも削除されているか確認
      const { data: deletedLocalization } = await supabase
        .from("tag_localizations")
        .select("*")
        .eq("tag_id", newTagData.id);

      expect(deletedLocalization).toEqual([]);
    });
  });

  // ===========================================
  // AC3: 初期データ投入
  // ===========================================
  describe("AC3: 初期データ投入", () => {
    it("object_class カテゴリに7件のタグが登録されている", async () => {
      const { data, error } = await supabase
        .from("tag_dictionary")
        .select("canonical_value")
        .eq("category", "object_class")
        .order("canonical_value");

      expect(error).toBeNull();
      expect(data).toHaveLength(7);
      const tags = data as Pick<TagDictionary, "canonical_value">[];
      const values = tags.map((d) => d.canonical_value);
      expect(values).toEqual([
        "APOLLYON",
        "ARCHON",
        "EUCLID",
        "KETER",
        "NEUTRALIZED",
        "SAFE",
        "THAUMIEL",
      ]);
    });

    it("genre カテゴリに7件のタグが登録されている", async () => {
      const { data, error } = await supabase
        .from("tag_dictionary")
        .select("canonical_value")
        .eq("category", "genre")
        .order("canonical_value");

      expect(error).toBeNull();
      expect(data).toHaveLength(7);
      const tags = data as Pick<TagDictionary, "canonical_value">[];
      const values = tags.map((d) => d.canonical_value);
      expect(values).toEqual([
        "ACTION",
        "COMEDY",
        "FANTASY",
        "HORROR",
        "MYSTERY",
        "SCI_FI",
        "TRAGEDY",
      ]);
    });

    it("theme カテゴリに8件のタグが登録されている", async () => {
      const { data, error } = await supabase
        .from("tag_dictionary")
        .select("canonical_value")
        .eq("category", "theme")
        .order("canonical_value");

      expect(error).toBeNull();
      expect(data).toHaveLength(8);
      const tags = data as Pick<TagDictionary, "canonical_value">[];
      const values = tags.map((d) => d.canonical_value);
      expect(values).toEqual([
        "ANTIMEMETIC",
        "BIOLOGICAL",
        "COGNITION",
        "EXTRADIMENSIONAL",
        "MECHANICAL",
        "MEMETIC",
        "REALITY_BENDING",
        "TEMPORAL",
      ]);
    });

    it("format カテゴリに5件のタグが登録されている", async () => {
      const { data, error } = await supabase
        .from("tag_dictionary")
        .select("canonical_value")
        .eq("category", "format")
        .order("canonical_value");

      expect(error).toBeNull();
      expect(data).toHaveLength(5);
      const tags = data as Pick<TagDictionary, "canonical_value">[];
      const values = tags.map((d) => d.canonical_value);
      expect(values).toEqual([
        "EXPERIMENT_LOG",
        "EXPLORATION_LOG",
        "INTERVIEW",
        "STANDARD",
        "TALE",
      ]);
    });

    it("全タグ合計27件が登録されている", async () => {
      const { data, error } = await supabase.from("tag_dictionary").select("id");

      expect(error).toBeNull();
      expect(data).toHaveLength(27);
    });

    it("全てのタグが is_active: true で登録されている", async () => {
      const { data, error } = await supabase
        .from("tag_dictionary")
        .select("canonical_value, is_active")
        .eq("is_active", false);

      expect(error).toBeNull();
      expect(data).toEqual([]); // is_active=falseのタグは存在しないはず
    });
  });

  // ===========================================
  // AC4: 英語ローカライズ投入
  // ===========================================
  describe("AC4: 英語ローカライズ投入", () => {
    it("全タグに英語ローカライズが設定されている", async () => {
      const { data: tags } = await supabase.from("tag_dictionary").select("id");
      const tagsData = tags as Pick<TagDictionary, "id">[] | null;
      const tagCount = tagsData?.length ?? 0;

      const { data: localizations, error } = await supabase
        .from("tag_localizations")
        .select("tag_id")
        .eq("lang", "en");

      expect(error).toBeNull();
      expect(localizations).toHaveLength(tagCount); // 全タグ分のローカライズが存在
    });

    it("SAFE タグに正しい英語ローカライズが設定されている", async () => {
      const tagResult = await supabase
        .from("tag_dictionary")
        .select("id")
        .eq("canonical_value", "SAFE")
        .single();

      const tagData = tagResult.data as Pick<TagDictionary, "id"> | null;
      if (!tagData) throw new Error("SAFE タグが見つかりません");

      const locResult = await supabase
        .from("tag_localizations")
        .select("*")
        .eq("tag_id", tagData.id)
        .eq("lang", "en")
        .single();

      expect(locResult.error).toBeNull();
      const locData = locResult.data as TagLocalization | null;
      expect(locData).toMatchObject({
        localized_value: "Safe",
      });
      expect(locData?.aliases).toContain("safe");
      expect(locData?.aliases).toContain("SAFE");
    });

    it("HORROR タグに正しい英語ローカライズが設定されている", async () => {
      const tagResult = await supabase
        .from("tag_dictionary")
        .select("id")
        .eq("canonical_value", "HORROR")
        .single();

      const tagData = tagResult.data as Pick<TagDictionary, "id"> | null;
      if (!tagData) throw new Error("HORROR タグが見つかりません");

      const locResult = await supabase
        .from("tag_localizations")
        .select("*")
        .eq("tag_id", tagData.id)
        .eq("lang", "en")
        .single();

      expect(locResult.error).toBeNull();
      const locData = locResult.data as TagLocalization | null;
      expect(locData).toMatchObject({
        localized_value: "Horror",
      });
      expect(locData?.aliases).toContain("horror");
      expect(locData?.aliases).toContain("HORROR");
    });

    it("SCI_FI タグの英語ローカライズが正しく設定されている", async () => {
      const tagResult = await supabase
        .from("tag_dictionary")
        .select("id")
        .eq("canonical_value", "SCI_FI")
        .single();

      const tagData = tagResult.data as Pick<TagDictionary, "id"> | null;
      if (!tagData) throw new Error("SCI_FI タグが見つかりません");

      const locResult = await supabase
        .from("tag_localizations")
        .select("*")
        .eq("tag_id", tagData.id)
        .eq("lang", "en")
        .single();

      expect(locResult.error).toBeNull();
      const locData = locResult.data as TagLocalization | null;
      expect(locData?.localized_value).toBe("Sci-Fi");
      expect(locData?.aliases).toContain("sci-fi");
      expect(locData?.aliases).toContain("scifi");
    });

    it("REALITY_BENDING タグの英語ローカライズが正しく設定されている", async () => {
      const tagResult = await supabase
        .from("tag_dictionary")
        .select("id")
        .eq("canonical_value", "REALITY_BENDING")
        .single();

      const tagData = tagResult.data as Pick<TagDictionary, "id"> | null;
      if (!tagData) throw new Error("REALITY_BENDING タグが見つかりません");

      const locResult = await supabase
        .from("tag_localizations")
        .select("*")
        .eq("tag_id", tagData.id)
        .eq("lang", "en")
        .single();

      expect(locResult.error).toBeNull();
      const locData = locResult.data as TagLocalization | null;
      expect(locData?.localized_value).toBe("Reality Bending");
      expect(locData?.aliases).toContain("reality bending");
      expect(locData?.aliases).toContain("reality-bending");
    });
  });

  // ===========================================
  // AC5: 同義語検索
  // ===========================================
  describe("AC5: 同義語検索", () => {
    it("同義語 'safe' で検索すると正規値 'SAFE' が取得できる", async () => {
      const result = await supabase.rpc("search_tag_by_alias", {
        p_alias: "safe",
        p_lang: "en",
      });

      expect(result.error).toBeNull();
      expect(result.data).toBe("SAFE");
    });

    it("同義語 'horror' で検索すると正規値 'HORROR' が取得できる", async () => {
      const result = await supabase.rpc("search_tag_by_alias", {
        p_alias: "horror",
        p_lang: "en",
      });

      expect(result.error).toBeNull();
      expect(result.data).toBe("HORROR");
    });

    it("localized_value 'Safe' で検索しても正規値が取得できる", async () => {
      const result = await supabase.rpc("search_tag_by_alias", {
        p_alias: "Safe",
        p_lang: "en",
      });

      expect(result.error).toBeNull();
      expect(result.data).toBe("SAFE");
    });

    it("大文字小文字を区別せずに検索できる（ILIKE）", async () => {
      const result = await supabase.rpc("search_tag_by_alias", {
        p_alias: "HoRrOr",
        p_lang: "en",
      });

      expect(result.error).toBeNull();
      expect(result.data).toBe("HORROR");
    });

    it("存在しない同義語で検索すると null が返る", async () => {
      const result = await supabase.rpc("search_tag_by_alias", {
        p_alias: "nonexistent",
        p_lang: "en",
      });

      expect(result.error).toBeNull();
      expect(result.data).toBeNull();
    });

    it("存在しない言語で検索すると null が返る", async () => {
      const result = await supabase.rpc("search_tag_by_alias", {
        p_alias: "safe",
        p_lang: "zz",
      });

      expect(result.error).toBeNull();
      expect(result.data).toBeNull();
    });

    it("'Sci-Fi' で検索すると 'SCI_FI' が取得できる", async () => {
      const result = await supabase.rpc("search_tag_by_alias", {
        p_alias: "Sci-Fi",
        p_lang: "en",
      });

      expect(result.error).toBeNull();
      expect(result.data).toBe("SCI_FI");
    });
  });

  // ===========================================
  // インデックス作成
  // ===========================================
  describe("インデックス作成", () => {
    it("tag_dictionary(category) にインデックスが作成されている", async () => {
      const indexes = await getTableIndexes("tag_dictionary");
      const categoryIndex = indexes.find(
        (idx) => idx.index_name.includes("category") || idx.index_definition.includes("(category)")
      );

      expect(categoryIndex).toBeDefined();
    });

    it("tag_localizations(aliases) にGINインデックスが作成されている", async () => {
      const indexes = await getTableIndexes("tag_localizations");
      const aliasesIndex = indexes.find(
        (idx) =>
          idx.index_name.includes("aliases") && idx.index_definition.toUpperCase().includes("GIN")
      );

      expect(aliasesIndex).toBeDefined();
    });
  });
});
