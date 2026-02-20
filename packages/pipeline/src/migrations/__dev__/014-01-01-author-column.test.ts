/**
 * Subtask-014-01-01: DBマイグレーション（authorカラム追加） - SQL静的検証テスト
 *
 * マイグレーションSQLファイルの内容を静的に検証する。
 * DB接続不要のユニットテスト。
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

// マイグレーションファイルを動的に検出
const migrationsDir = join(process.cwd(), "../../supabase/migrations");
const allFiles = readdirSync(migrationsDir);
const migrationFileName = allFiles.find((f) => f.includes("add_author_to_scp_articles")) ?? "";
const migrationFilePath = join(migrationsDir, migrationFileName);

describe("014-01-01: DBマイグレーション（authorカラム追加）", () => {
  describe("マイグレーションファイルの存在確認", () => {
    it("add_author_to_scp_articles マイグレーションファイルが存在する", () => {
      expect(migrationFileName).not.toBe("");
    });
  });

  describe("AC1: Up SQL（authorカラム追加）の検証", () => {
    it("ALTER TABLE scp_articles ADD COLUMN author TEXT が含まれる", () => {
      const sql = readFileSync(migrationFilePath, "utf-8");

      expect(sql).toMatch(/ALTER\s+TABLE\s+scp_articles\s+ADD\s+COLUMN\s+author\s+TEXT/i);
    });

    it("author カラムに NOT NULL 制約が付与されていない", () => {
      const sql = readFileSync(migrationFilePath, "utf-8");
      // ADD COLUMN author TEXT の後に NOT NULL が続かないこと
      expect(sql).not.toMatch(/ADD\s+COLUMN\s+author\s+TEXT\s+NOT\s+NULL/i);
    });
  });

  describe("AC2: Down SQL（ロールバック）の検証", () => {
    it("DROP COLUMN IF EXISTS author が含まれる", () => {
      const sql = readFileSync(migrationFilePath, "utf-8");

      expect(sql).toMatch(/DROP\s+COLUMN\s+IF\s+EXISTS\s+author/i);
    });

    it("IF EXISTS を使用した安全なロールバックである", () => {
      const sql = readFileSync(migrationFilePath, "utf-8");
      // "DROP COLUMN author" が IF EXISTS なしで書かれていないことを確認
      const lines = sql.split("\n");
      const dropLines = lines.filter((line) => /DROP\s+COLUMN/i.test(line) && /author/i.test(line));

      for (const line of dropLines) {
        expect(line).toMatch(/IF\s+EXISTS/i);
      }
    });
  });
});
