/**
 * 009-01-02: マスターデータテーブルRLS設定テスト
 *
 * マスターデータテーブル（scp_articles, scp_embeddings, tags, tag_dictionary,
 * article_tags, tag_localizations, supported_languages, pipeline_runs, retry_queue）の
 * RLSマイグレーションが正しく定義されていることを検証する。
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { describe, it, expect, beforeAll } from "vitest";

const MIGRATION_DIR = resolve(__dirname, "../migrations");

const findMigrationFiles = (pattern: RegExp): string[] =>
  readdirSync(MIGRATION_DIR)
    .filter((f) => pattern.test(f))
    .map((f) => join(MIGRATION_DIR, f));

// マスターデータテーブル一覧
const MASTER_TABLES = [
  "scp_articles",
  "scp_embeddings",
  "tags",
  "tag_dictionary",
  "article_tags",
  "tag_localizations",
  "supported_languages",
  "pipeline_runs",
  "retry_queue",
] as const;

describe("009-01-02: マスターデータテーブルRLS設定", () => {
  let migrationContent: string;
  let migrationFilePath: string;

  beforeAll(() => {
    const files = findMigrationFiles(/master.*rls.*\.sql$/);
    expect(files.length).toBeGreaterThan(0);
    migrationFilePath = files[0];
    migrationContent = readFileSync(migrationFilePath, "utf-8");
  });

  describe("マイグレーションファイル", () => {
    it("supabase/migrations/ 配下にmaster RLSファイルが存在する", () => {
      const files = findMigrationFiles(/master.*rls.*\.sql$/);
      expect(files.length).toBe(1);
    });

    it("ファイル名がタイムスタンプ形式である", () => {
      const filename = migrationFilePath.split("/").pop()!;
      expect(filename).toMatch(/^\d{14}_.*\.sql$/);
    });

    it("article_translations に対するRLS設定が含まれていない", () => {
      expect(migrationContent).not.toContain(
        "ALTER TABLE article_translations ENABLE ROW LEVEL SECURITY",
      );
    });
  });

  describe("RLS有効化", () => {
    for (const table of MASTER_TABLES) {
      it(`${table} テーブルにRLSが有効化されている`, () => {
        expect(migrationContent).toContain(
          `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`,
        );
      });
    }
  });

  describe("SELECTポリシー（全ユーザー許可）", () => {
    for (const table of MASTER_TABLES) {
      it(`${table}_select ポリシーが USING (true) で定義されている`, () => {
        const selectPattern = new RegExp(
          `CREATE POLICY "${table}_select"\\s+ON ${table}\\s+FOR SELECT\\s+USING \\(true\\)`,
          "s",
        );
        expect(migrationContent).toMatch(selectPattern);
      });
    }
  });

  describe("INSERTポリシー（service_roleのみ）", () => {
    for (const table of MASTER_TABLES) {
      it(`${table}_insert ポリシーが service_role のみ許可している`, () => {
        const insertPattern = new RegExp(
          `CREATE POLICY "${table}_insert"\\s+ON ${table}\\s+FOR INSERT\\s+WITH CHECK \\(auth\\.role\\(\\) = 'service_role'\\)`,
          "s",
        );
        expect(migrationContent).toMatch(insertPattern);
      });
    }
  });

  describe("UPDATEポリシー（service_roleのみ）", () => {
    for (const table of MASTER_TABLES) {
      it(`${table}_update ポリシーが service_role のみ許可している`, () => {
        const updatePattern = new RegExp(
          `CREATE POLICY "${table}_update"\\s+ON ${table}\\s+FOR UPDATE\\s+USING \\(auth\\.role\\(\\) = 'service_role'\\)`,
          "s",
        );
        expect(migrationContent).toMatch(updatePattern);
      });
    }
  });

  describe("DELETEポリシー（service_roleのみ）", () => {
    for (const table of MASTER_TABLES) {
      it(`${table}_delete ポリシーが service_role のみ許可している`, () => {
        const deletePattern = new RegExp(
          `CREATE POLICY "${table}_delete"\\s+ON ${table}\\s+FOR DELETE\\s+USING \\(auth\\.role\\(\\) = 'service_role'\\)`,
          "s",
        );
        expect(migrationContent).toMatch(deletePattern);
      });
    }
  });

  describe("全テーブル網羅性", () => {
    it("9テーブル全てにRLS有効化が設定されている", () => {
      for (const table of MASTER_TABLES) {
        expect(migrationContent).toContain(
          `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`,
        );
      }
    });

    it("9テーブル × 4ポリシー = 36個のCREATE POLICYが存在する", () => {
      const policyCount = (
        migrationContent.match(/CREATE POLICY/g) || []
      ).length;
      expect(policyCount).toBe(36);
    });
  });
});
