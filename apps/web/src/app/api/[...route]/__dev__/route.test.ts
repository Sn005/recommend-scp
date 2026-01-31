/**
 * @file API Route 統合テスト
 * @description Hono API統合のAC検証テスト
 *
 * AC1: API Routeファイル作成
 * AC2: Hono統合
 *
 * @see specs/007-infra/007-02-auto-preview/007-02-02.md
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/** package.jsonの型定義 */
interface PackageJson {
  dependencies?: Record<string, string>;
  exports?: Record<string, { types?: string; import?: string }>;
}

// route.tsのファイルパス
const routeFilePath = path.resolve(__dirname, "../route.ts");

describe("AC1: API Routeファイル作成", () => {
  it("route.tsファイルが存在する", () => {
    expect(fs.existsSync(routeFilePath)).toBe(true);
  });

  it("ファイル内容にRuntime設定が含まれている", () => {
    const content = fs.readFileSync(routeFilePath, "utf-8");
    // Node.js Runtime（api-serverの依存がNode.js固有のため）
    // Edge Runtime対応は別Subtaskで対応予定
    expect(content).toContain('export const runtime = "nodejs"');
  });

  it("GET ハンドラがエクスポートされている", () => {
    const content = fs.readFileSync(routeFilePath, "utf-8");
    expect(content).toContain("export const GET");
  });

  it("POST ハンドラがエクスポートされている", () => {
    const content = fs.readFileSync(routeFilePath, "utf-8");
    expect(content).toContain("export const POST");
  });

  it("PUT ハンドラがエクスポートされている", () => {
    const content = fs.readFileSync(routeFilePath, "utf-8");
    expect(content).toContain("export const PUT");
  });

  it("DELETE ハンドラがエクスポートされている", () => {
    const content = fs.readFileSync(routeFilePath, "utf-8");
    expect(content).toContain("export const DELETE");
  });

  it("PATCH ハンドラがエクスポートされている", () => {
    const content = fs.readFileSync(routeFilePath, "utf-8");
    expect(content).toContain("export const PATCH");
  });
});

describe("AC2: Hono統合", () => {
  it("hono/vercelからhandleをインポートしている", () => {
    const content = fs.readFileSync(routeFilePath, "utf-8");
    expect(content).toContain('import { handle } from "hono/vercel"');
  });

  it("handle()でHono appをラップしている", () => {
    const content = fs.readFileSync(routeFilePath, "utf-8");
    expect(content).toContain("handle(app)");
  });

  it("@recommend-scp/api-server/appからcreateAppをインポートしている", () => {
    const content = fs.readFileSync(routeFilePath, "utf-8");
    expect(content).toContain('import { createApp } from "@recommend-scp/api-server/app"');
  });

  it("Supabaseクライアントが初期化されている", () => {
    const content = fs.readFileSync(routeFilePath, "utf-8");
    expect(content).toContain("createClient");
    expect(content).toContain("SUPABASE_URL");
    expect(content).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});

describe("AC2: パッケージ依存関係", () => {
  it("@recommend-scp/api-serverがdependenciesに存在する", () => {
    const pkgJsonPath = path.resolve(__dirname, "../../../../../package.json");
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8")) as PackageJson;
    expect(pkgJson.dependencies).toHaveProperty("@recommend-scp/api-server");
  });

  it("@supabase/supabase-jsがdependenciesに存在する", () => {
    const pkgJsonPath = path.resolve(__dirname, "../../../../../package.json");
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8")) as PackageJson;
    expect(pkgJson.dependencies).toHaveProperty("@supabase/supabase-js");
  });
});

describe("api-server exports", () => {
  it("./appエクスポートが設定されている", () => {
    const pkgJsonPath = path.resolve(
      __dirname,
      "../../../../../../../apps/api-server/package.json"
    );
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8")) as PackageJson;
    expect(pkgJson.exports).toHaveProperty("./app");
    expect(pkgJson.exports?.["./app"]).toHaveProperty("types");
    expect(pkgJson.exports?.["./app"]).toHaveProperty("import");
  });
});
