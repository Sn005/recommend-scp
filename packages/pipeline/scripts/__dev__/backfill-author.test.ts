/**
 * 014-01-03: 既存データバックフィルスクリプト - テスト
 */

import { describe, it, expect, vi } from "vitest";
import { buildAuthorMap, runBackfill, type BackfillDb, type ScpIndex } from "../backfill-author";

/** テスト用インデックスアイテムファクトリ */
const createIndexItem = (overrides?: Record<string, unknown>) => ({
  link: "/scp-173",
  title: "The Sculpture",
  rating: 7500,
  content_file: "content_series-1.json",
  scp: "SCP-173",
  tags: ["euclid"],
  created_at: "2007-06-22T00:00:00Z",
  creator: "Anonymous",
  ...overrides,
});

/** テスト用モック DB */
const createMockDb = (nullArticles: { article_id: string }[] = []): BackfillDb => ({
  fetchNullAuthorArticles: vi.fn().mockResolvedValue(nullArticles),
  updateAuthors: vi.fn().mockResolvedValue(undefined),
});

describe("014-01-03: 既存データバックフィルスクリプト", () => {
  // ======================
  // buildAuthorMap
  // ======================
  describe("buildAuthorMap（純粋関数）", () => {
    it("インデックスにある article_id の creator を authorMap に格納する", () => {
      const articles = [{ article_id: "scp-173" }, { article_id: "scp-096" }];
      const index: ScpIndex = {
        "scp-173": createIndexItem({ scp: "SCP-173", creator: "Dr. Clef" }),
        "scp-096": createIndexItem({
          scp: "SCP-096",
          creator: "DrEverest",
        }),
      };

      const map = buildAuthorMap(articles, index);

      expect(map.get("scp-173")).toBe("Dr. Clef");
      expect(map.get("scp-096")).toBe("DrEverest");
    });

    it("インデックスに存在しない article_id はスキップする", () => {
      const articles = [{ article_id: "scp-173" }, { article_id: "scp-unknown" }];
      const index: ScpIndex = {
        "scp-173": createIndexItem({ scp: "SCP-173", creator: "Dr. Clef" }),
      };

      const map = buildAuthorMap(articles, index);

      expect(map.has("scp-173")).toBe(true);
      expect(map.has("scp-unknown")).toBe(false);
    });

    it("creator が空文字列のとき null を返す", () => {
      const articles = [{ article_id: "scp-173" }];
      const index: ScpIndex = {
        "scp-173": createIndexItem({ scp: "SCP-173", creator: "" }),
      };

      const map = buildAuthorMap(articles, index);

      expect(map.get("scp-173")).toBeNull();
    });

    it("creator が半角スペースのみの場合 null を返す", () => {
      const articles = [{ article_id: "scp-173" }];
      const index: ScpIndex = {
        "scp-173": createIndexItem({ scp: "SCP-173", creator: "   " }),
      };

      const map = buildAuthorMap(articles, index);

      expect(map.get("scp-173")).toBeNull();
    });

    it("article_id の大文字小文字が混在しても正しく突合する", () => {
      const articles = [{ article_id: "scp-173" }];
      const index: ScpIndex = {
        "SCP-173": createIndexItem({ scp: "SCP-173", creator: "Author" }),
      };

      const map = buildAuthorMap(articles, index);

      expect(map.get("scp-173")).toBe("Author");
    });
  });

  // ======================
  // runBackfill
  // ======================
  describe("runBackfill", () => {
    // --- AC1: 正常系 ---
    it("author NULL の全レコードを更新し updatedCount を返す", async () => {
      const db = createMockDb([{ article_id: "scp-173" }, { article_id: "scp-096" }]);
      const fetchIndex = vi.fn().mockResolvedValue({
        "scp-173": createIndexItem({ scp: "SCP-173", creator: "Dr. Clef" }),
        "scp-096": createIndexItem({
          scp: "SCP-096",
          creator: "DrEverest",
        }),
      } as ScpIndex);

      const result = await runBackfill({ db, fetchIndex });

      expect(result.updatedCount).toBe(2);
      expect(result.skippedCount).toBe(0);
    });

    it("author NULL のレコードが 0 件のとき updatedCount=0 を返す", async () => {
      const db = createMockDb([]);
      const fetchIndex = vi.fn().mockResolvedValue({} as ScpIndex);

      const result = await runBackfill({ db, fetchIndex });

      expect(result.updatedCount).toBe(0);
    });

    // --- AC2: スキップ ---
    it("インデックスにない article_id をスキップして処理を続行する", async () => {
      const db = createMockDb([{ article_id: "scp-173" }, { article_id: "scp-unknown" }]);
      const fetchIndex = vi.fn().mockResolvedValue({
        "scp-173": createIndexItem({ scp: "SCP-173", creator: "Dr. Clef" }),
      } as ScpIndex);

      const result = await runBackfill({ db, fetchIndex });

      expect(result.updatedCount).toBe(1);
      expect(result.skippedCount).toBe(1);
      expect(result.skippedIds).toContain("scp-unknown");
    });

    // --- AC3: ドライラン ---
    it("dryRun: true のとき updateAuthors を呼ばない", async () => {
      const db = createMockDb([{ article_id: "scp-173" }]);
      const fetchIndex = vi.fn().mockResolvedValue({
        "scp-173": createIndexItem({ scp: "SCP-173", creator: "Dr. Clef" }),
      } as ScpIndex);

      const result = await runBackfill({
        db,
        fetchIndex,
        dryRun: true,
      });

      expect(db.updateAuthors).not.toHaveBeenCalled();
      expect(result.updatedCount).toBe(0);
      expect(result.wouldUpdateCount).toBe(1);
    });

    // --- AC4: 空文字列 → null ---
    it("creator が空文字列の記事は author を null で更新する", async () => {
      const db = createMockDb([{ article_id: "scp-173" }]);
      const fetchIndex = vi.fn().mockResolvedValue({
        "scp-173": createIndexItem({ scp: "SCP-173", creator: "" }),
      } as ScpIndex);

      await runBackfill({ db, fetchIndex });

      expect(db.updateAuthors).toHaveBeenCalledWith([{ article_id: "scp-173", author: null }]);
    });

    // --- バッチ処理 ---
    it("batchSize=2 のとき 4 件を 2 バッチに分けて処理する", async () => {
      const db = createMockDb([
        { article_id: "scp-001" },
        { article_id: "scp-002" },
        { article_id: "scp-003" },
        { article_id: "scp-004" },
      ]);
      const fetchIndex = vi.fn().mockResolvedValue({
        "scp-001": createIndexItem({ scp: "SCP-001", creator: "A1" }),
        "scp-002": createIndexItem({ scp: "SCP-002", creator: "A2" }),
        "scp-003": createIndexItem({ scp: "SCP-003", creator: "A3" }),
        "scp-004": createIndexItem({ scp: "SCP-004", creator: "A4" }),
      } as ScpIndex);

      await runBackfill({ db, fetchIndex, batchSize: 2 });

      expect(db.updateAuthors).toHaveBeenCalledTimes(2);
    });
  });
});
