import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

describe("TESTING.md ドキュメント検証", () => {
  const docPath = resolve(__dirname, "../../TESTING.md");

  it("ドキュメントファイルが存在する", () => {
    expect(existsSync(docPath)).toBe(true);
  });

  it("kebab-caseの説明が含まれる", () => {
    const content = readFileSync(docPath, "utf-8");
    expect(content).toContain("kebab-case");
  });

  it("命名パターンが記載されている", () => {
    const content = readFileSync(docPath, "utf-8");
    expect(content).toContain("{component}-{element}");
  });

  it("使用例が3つ以上含まれる", () => {
    const content = readFileSync(docPath, "utf-8");
    const examples = content.match(/data-testid="[a-z][a-z0-9-]*"/g);
    expect(examples).toBeDefined();
    expect(examples?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("禁止パターンの説明が含まれる", () => {
    const content = readFileSync(docPath, "utf-8");
    expect(content).toContain("camelCase");
    expect(content).toContain("snake_case");
  });
});
