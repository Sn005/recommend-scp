/**
 * 005-02-01: DBスキーマ定義テスト
 *
 * visitors関連テーブル（visitors, view_history, feedback, recommendation_log, favorites）の
 * マイグレーションが正しく適用されることを検証する。
 *
 * 実行方法:
 * 1. supabase start
 * 2. supabase db reset
 * 3. pnpm test supabase/__tests__/visitor-tables.test.ts
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

// Supabase ローカル環境のデフォルト設定
const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

describe("005-02-01: visitors関連テーブルのDBスキーマ", () => {
  let supabase: SupabaseClient;

  beforeAll(() => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });

  afterAll(async () => {
    // テストデータのクリーンアップ（子→親の順序）
    await supabase.from("favorites").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase
      .from("recommendation_log")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("feedback").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("view_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("visitors").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  });

  // ============================================
  // AC1: visitorsテーブル作成
  // ============================================
  describe("visitorsテーブル", () => {
    it("visitorsテーブルが存在する", async () => {
      const { error } = await supabase.from("visitors").select("*").limit(1);
      expect(error).toBeNull();
    });

    it("visitor_idにUNIQUE制約がある（重複挿入でエラー）", async () => {
      const visitorId = `test-visitor-${Date.now()}`;

      // 1回目の挿入
      const { error: firstError } = await supabase.from("visitors").insert({
        visitor_id: visitorId,
      });
      expect(firstError).toBeNull();

      // 2回目の挿入（重複）
      const { error: secondError } = await supabase.from("visitors").insert({
        visitor_id: visitorId,
      });
      expect(secondError).not.toBeNull();
      expect(secondError?.code).toBe("23505"); // UNIQUE違反

      // クリーンアップ
      await supabase.from("visitors").delete().eq("visitor_id", visitorId);
    });

    it("visitor_idにNULLを挿入するとエラー", async () => {
      const { error } = await supabase.from("visitors").insert({
        visitor_id: null,
      });
      expect(error).not.toBeNull();
      expect(error?.code).toBe("23502"); // NOT NULL違反
    });

    it("starter_packに不正な値を挿入するとCHECK違反エラー", async () => {
      const visitorId = `test-visitor-check-${Date.now()}`;
      const { error } = await supabase.from("visitors").insert({
        visitor_id: visitorId,
        starter_pack: "invalid_pack",
      });
      expect(error).not.toBeNull();
      expect(error?.code).toBe("23514"); // CHECK違反
    });

    it("starter_packに有効な値を挿入できる", async () => {
      const validPacks = ["horror", "surreal", "scientific", "heartwarming", "mystery", "custom"];

      for (const pack of validPacks) {
        const visitorId = `test-visitor-pack-${pack}-${Date.now()}`;
        const { error } = await supabase.from("visitors").insert({
          visitor_id: visitorId,
          starter_pack: pack,
        });
        expect(error).toBeNull();

        // クリーンアップ
        await supabase.from("visitors").delete().eq("visitor_id", visitorId);
      }
    });

    it("preference_vectorにNULLを挿入できる", async () => {
      const visitorId = `test-visitor-vector-null-${Date.now()}`;
      const { error } = await supabase.from("visitors").insert({
        visitor_id: visitorId,
        preference_vector: null,
      });
      expect(error).toBeNull();

      // クリーンアップ
      await supabase.from("visitors").delete().eq("visitor_id", visitorId);
    });

    it("tag_weightsのデフォルト値が空オブジェクトである", async () => {
      const visitorId = `test-visitor-tag-default-${Date.now()}`;
      await supabase.from("visitors").insert({
        visitor_id: visitorId,
      });

      const { data } = await supabase
        .from("visitors")
        .select("tag_weights")
        .eq("visitor_id", visitorId)
        .single();

      expect(data?.tag_weights).toEqual({});

      // クリーンアップ
      await supabase.from("visitors").delete().eq("visitor_id", visitorId);
    });

    it("created_atとupdated_atが自動設定される", async () => {
      const visitorId = `test-visitor-timestamps-${Date.now()}`;
      await supabase.from("visitors").insert({
        visitor_id: visitorId,
      });

      const { data } = await supabase
        .from("visitors")
        .select("created_at, updated_at")
        .eq("visitor_id", visitorId)
        .single();

      expect(data?.created_at).not.toBeNull();
      expect(data?.updated_at).not.toBeNull();

      // クリーンアップ
      await supabase.from("visitors").delete().eq("visitor_id", visitorId);
    });
  });

  // ============================================
  // AC2: view_historyテーブル作成
  // ============================================
  describe("view_historyテーブル", () => {
    it("view_historyテーブルが存在する", async () => {
      const { error } = await supabase.from("view_history").select("*").limit(1);
      expect(error).toBeNull();
    });

    it("正常にレコードを挿入できる", async () => {
      const visitorId = `test-visitor-view-${Date.now()}`;

      // 親レコード作成
      await supabase.from("visitors").insert({ visitor_id: visitorId });

      // view_history挿入
      const { error } = await supabase.from("view_history").insert({
        visitor_id: visitorId,
        article_id: "scp-001",
        duration: 120,
      });
      expect(error).toBeNull();

      // クリーンアップ
      await supabase.from("view_history").delete().eq("visitor_id", visitorId);
      await supabase.from("visitors").delete().eq("visitor_id", visitorId);
    });

    it("durationにNULLを挿入できる", async () => {
      const visitorId = `test-visitor-duration-null-${Date.now()}`;

      await supabase.from("visitors").insert({ visitor_id: visitorId });

      const { error } = await supabase.from("view_history").insert({
        visitor_id: visitorId,
        article_id: "scp-002",
        duration: null,
      });
      expect(error).toBeNull();

      // クリーンアップ
      await supabase.from("view_history").delete().eq("visitor_id", visitorId);
      await supabase.from("visitors").delete().eq("visitor_id", visitorId);
    });
  });

  // ============================================
  // AC3: feedbackテーブル作成
  // ============================================
  describe("feedbackテーブル", () => {
    it("feedbackテーブルが存在する", async () => {
      const { error } = await supabase.from("feedback").select("*").limit(1);
      expect(error).toBeNull();
    });

    it("typeにlikeまたはdislikeを挿入できる", async () => {
      const visitorId = `test-visitor-feedback-${Date.now()}`;

      await supabase.from("visitors").insert({ visitor_id: visitorId });

      // like
      const { error: likeError } = await supabase.from("feedback").insert({
        visitor_id: visitorId,
        article_id: "scp-001",
        type: "like",
      });
      expect(likeError).toBeNull();

      // dislike（別の記事）
      const { error: dislikeError } = await supabase.from("feedback").insert({
        visitor_id: visitorId,
        article_id: "scp-002",
        type: "dislike",
      });
      expect(dislikeError).toBeNull();

      // クリーンアップ
      await supabase.from("feedback").delete().eq("visitor_id", visitorId);
      await supabase.from("visitors").delete().eq("visitor_id", visitorId);
    });

    it("typeに不正な値を挿入するとCHECK違反エラー", async () => {
      const visitorId = `test-visitor-feedback-invalid-${Date.now()}`;

      await supabase.from("visitors").insert({ visitor_id: visitorId });

      const { error } = await supabase.from("feedback").insert({
        visitor_id: visitorId,
        article_id: "scp-003",
        type: "neutral",
      });
      expect(error).not.toBeNull();
      expect(error?.code).toBe("23514"); // CHECK違反

      // クリーンアップ
      await supabase.from("visitors").delete().eq("visitor_id", visitorId);
    });

    it("同じvisitor_idとarticle_idの組み合わせは重複挿入できない", async () => {
      const visitorId = `test-visitor-feedback-unique-${Date.now()}`;

      await supabase.from("visitors").insert({ visitor_id: visitorId });

      // 1回目
      await supabase.from("feedback").insert({
        visitor_id: visitorId,
        article_id: "scp-001",
        type: "like",
      });

      // 2回目（重複）
      const { error } = await supabase.from("feedback").insert({
        visitor_id: visitorId,
        article_id: "scp-001",
        type: "dislike",
      });
      expect(error).not.toBeNull();
      expect(error?.code).toBe("23505"); // UNIQUE違反

      // クリーンアップ
      await supabase.from("feedback").delete().eq("visitor_id", visitorId);
      await supabase.from("visitors").delete().eq("visitor_id", visitorId);
    });
  });

  // ============================================
  // AC4: recommendation_logテーブル作成
  // ============================================
  describe("recommendation_logテーブル", () => {
    it("recommendation_logテーブルが存在する", async () => {
      const { error } = await supabase.from("recommendation_log").select("*").limit(1);
      expect(error).toBeNull();
    });

    it("sourceにpreferenceまたはserendipityを挿入できる", async () => {
      const visitorId = `test-visitor-rec-${Date.now()}`;

      await supabase.from("visitors").insert({ visitor_id: visitorId });

      // preference
      const { error: prefError } = await supabase.from("recommendation_log").insert({
        visitor_id: visitorId,
        article_id: "scp-001",
        source: "preference",
      });
      expect(prefError).toBeNull();

      // serendipity
      const { error: serendipityError } = await supabase.from("recommendation_log").insert({
        visitor_id: visitorId,
        article_id: "scp-002",
        source: "serendipity",
      });
      expect(serendipityError).toBeNull();

      // クリーンアップ
      await supabase.from("recommendation_log").delete().eq("visitor_id", visitorId);
      await supabase.from("visitors").delete().eq("visitor_id", visitorId);
    });

    it("sourceに不正な値を挿入するとCHECK違反エラー", async () => {
      const visitorId = `test-visitor-rec-invalid-${Date.now()}`;

      await supabase.from("visitors").insert({ visitor_id: visitorId });

      const { error } = await supabase.from("recommendation_log").insert({
        visitor_id: visitorId,
        article_id: "scp-003",
        source: "random",
      });
      expect(error).not.toBeNull();
      expect(error?.code).toBe("23514"); // CHECK違反

      // クリーンアップ
      await supabase.from("visitors").delete().eq("visitor_id", visitorId);
    });

    it("clickedのデフォルト値がfalseである", async () => {
      const visitorId = `test-visitor-rec-clicked-${Date.now()}`;

      await supabase.from("visitors").insert({ visitor_id: visitorId });

      await supabase.from("recommendation_log").insert({
        visitor_id: visitorId,
        article_id: "scp-001",
        source: "preference",
      });

      const { data } = await supabase
        .from("recommendation_log")
        .select("clicked")
        .eq("visitor_id", visitorId)
        .single();

      expect(data?.clicked).toBe(false);

      // クリーンアップ
      await supabase.from("recommendation_log").delete().eq("visitor_id", visitorId);
      await supabase.from("visitors").delete().eq("visitor_id", visitorId);
    });
  });

  // ============================================
  // AC5: favoritesテーブル作成
  // ============================================
  describe("favoritesテーブル", () => {
    it("favoritesテーブルが存在する", async () => {
      const { error } = await supabase.from("favorites").select("*").limit(1);
      expect(error).toBeNull();
    });

    it("正常にレコードを挿入できる", async () => {
      const visitorId = `test-visitor-fav-${Date.now()}`;

      await supabase.from("visitors").insert({ visitor_id: visitorId });

      const { error } = await supabase.from("favorites").insert({
        visitor_id: visitorId,
        article_id: "scp-001",
      });
      expect(error).toBeNull();

      // クリーンアップ
      await supabase.from("favorites").delete().eq("visitor_id", visitorId);
      await supabase.from("visitors").delete().eq("visitor_id", visitorId);
    });

    it("同じvisitor_idとarticle_idの組み合わせは重複挿入できない", async () => {
      const visitorId = `test-visitor-fav-unique-${Date.now()}`;

      await supabase.from("visitors").insert({ visitor_id: visitorId });

      // 1回目
      await supabase.from("favorites").insert({
        visitor_id: visitorId,
        article_id: "scp-001",
      });

      // 2回目（重複）
      const { error } = await supabase.from("favorites").insert({
        visitor_id: visitorId,
        article_id: "scp-001",
      });
      expect(error).not.toBeNull();
      expect(error?.code).toBe("23505"); // UNIQUE違反

      // クリーンアップ
      await supabase.from("favorites").delete().eq("visitor_id", visitorId);
      await supabase.from("visitors").delete().eq("visitor_id", visitorId);
    });
  });

  // ============================================
  // AC6: 外部キー制約
  // ============================================
  describe("外部キー制約", () => {
    it("存在しないvisitor_idでview_history挿入に失敗する", async () => {
      const { error } = await supabase.from("view_history").insert({
        visitor_id: "non-existent-visitor",
        article_id: "scp-001",
      });
      expect(error).not.toBeNull();
      expect(error?.code).toBe("23503"); // FK違反
    });

    it("存在しないvisitor_idでfeedback挿入に失敗する", async () => {
      const { error } = await supabase.from("feedback").insert({
        visitor_id: "non-existent-visitor",
        article_id: "scp-001",
        type: "like",
      });
      expect(error).not.toBeNull();
      expect(error?.code).toBe("23503"); // FK違反
    });

    it("存在しないvisitor_idでrecommendation_log挿入に失敗する", async () => {
      const { error } = await supabase.from("recommendation_log").insert({
        visitor_id: "non-existent-visitor",
        article_id: "scp-001",
        source: "preference",
      });
      expect(error).not.toBeNull();
      expect(error?.code).toBe("23503"); // FK違反
    });

    it("存在しないvisitor_idでfavorites挿入に失敗する", async () => {
      const { error } = await supabase.from("favorites").insert({
        visitor_id: "non-existent-visitor",
        article_id: "scp-001",
      });
      expect(error).not.toBeNull();
      expect(error?.code).toBe("23503"); // FK違反
    });
  });

  // ============================================
  // AC6: カスケード削除
  // ============================================
  describe("カスケード削除", () => {
    it("visitor削除時にview_historyがカスケード削除される", async () => {
      const visitorId = `test-cascade-view-${Date.now()}`;

      // 親レコード作成
      await supabase.from("visitors").insert({ visitor_id: visitorId });

      // 子レコード作成
      await supabase.from("view_history").insert({
        visitor_id: visitorId,
        article_id: "scp-001",
      });

      // 親レコード削除
      await supabase.from("visitors").delete().eq("visitor_id", visitorId);

      // 子レコードも削除されていることを確認
      const { data } = await supabase
        .from("view_history")
        .select("*")
        .eq("visitor_id", visitorId);

      expect(data).toEqual([]);
    });

    it("visitor削除時にfeedbackがカスケード削除される", async () => {
      const visitorId = `test-cascade-feedback-${Date.now()}`;

      await supabase.from("visitors").insert({ visitor_id: visitorId });

      await supabase.from("feedback").insert({
        visitor_id: visitorId,
        article_id: "scp-001",
        type: "like",
      });

      await supabase.from("visitors").delete().eq("visitor_id", visitorId);

      const { data } = await supabase.from("feedback").select("*").eq("visitor_id", visitorId);

      expect(data).toEqual([]);
    });

    it("visitor削除時にrecommendation_logがカスケード削除される", async () => {
      const visitorId = `test-cascade-rec-${Date.now()}`;

      await supabase.from("visitors").insert({ visitor_id: visitorId });

      await supabase.from("recommendation_log").insert({
        visitor_id: visitorId,
        article_id: "scp-001",
        source: "preference",
      });

      await supabase.from("visitors").delete().eq("visitor_id", visitorId);

      const { data } = await supabase
        .from("recommendation_log")
        .select("*")
        .eq("visitor_id", visitorId);

      expect(data).toEqual([]);
    });

    it("visitor削除時にfavoritesがカスケード削除される", async () => {
      const visitorId = `test-cascade-fav-${Date.now()}`;

      await supabase.from("visitors").insert({ visitor_id: visitorId });

      await supabase.from("favorites").insert({
        visitor_id: visitorId,
        article_id: "scp-001",
      });

      await supabase.from("visitors").delete().eq("visitor_id", visitorId);

      const { data } = await supabase.from("favorites").select("*").eq("visitor_id", visitorId);

      expect(data).toEqual([]);
    });

    it("visitor削除時に全ての関連レコードがカスケード削除される", async () => {
      const visitorId = `test-cascade-all-${Date.now()}`;

      // 親レコード作成
      await supabase.from("visitors").insert({ visitor_id: visitorId });

      // 全テーブルに子レコード作成
      await supabase.from("view_history").insert({
        visitor_id: visitorId,
        article_id: "scp-001",
      });
      await supabase.from("feedback").insert({
        visitor_id: visitorId,
        article_id: "scp-001",
        type: "like",
      });
      await supabase.from("recommendation_log").insert({
        visitor_id: visitorId,
        article_id: "scp-001",
        source: "preference",
      });
      await supabase.from("favorites").insert({
        visitor_id: visitorId,
        article_id: "scp-001",
      });

      // 親レコード削除
      await supabase.from("visitors").delete().eq("visitor_id", visitorId);

      // 全子レコードが削除されていることを確認
      const { data: viewData } = await supabase
        .from("view_history")
        .select("*")
        .eq("visitor_id", visitorId);
      const { data: feedbackData } = await supabase
        .from("feedback")
        .select("*")
        .eq("visitor_id", visitorId);
      const { data: recData } = await supabase
        .from("recommendation_log")
        .select("*")
        .eq("visitor_id", visitorId);
      const { data: favData } = await supabase
        .from("favorites")
        .select("*")
        .eq("visitor_id", visitorId);

      expect(viewData).toEqual([]);
      expect(feedbackData).toEqual([]);
      expect(recData).toEqual([]);
      expect(favData).toEqual([]);
    });
  });

  // ============================================
  // トリガーテスト
  // ============================================
  describe("updated_atトリガー", () => {
    it("visitorsテーブル更新時にupdated_atが自動更新される", async () => {
      const visitorId = `test-trigger-${Date.now()}`;

      // 挿入
      await supabase.from("visitors").insert({ visitor_id: visitorId });

      const { data: before } = await supabase
        .from("visitors")
        .select("updated_at")
        .eq("visitor_id", visitorId)
        .single();

      // 1秒待機
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // 更新
      await supabase
        .from("visitors")
        .update({ starter_pack: "horror" })
        .eq("visitor_id", visitorId);

      const { data: after } = await supabase
        .from("visitors")
        .select("updated_at")
        .eq("visitor_id", visitorId)
        .single();

      expect(new Date(after!.updated_at).getTime()).toBeGreaterThan(
        new Date(before!.updated_at).getTime()
      );

      // クリーンアップ
      await supabase.from("visitors").delete().eq("visitor_id", visitorId);
    });
  });
});
