import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { extractStepsJson } from "./csv-test-utils";

describe("history.csvファイル", () => {
  const csvPath = join(__dirname, "../testcases/history.csv");

  it("CSVファイルが存在する", () => {
    const csvContent = readFileSync(csvPath, "utf-8");
    expect(csvContent).toBeTruthy();
  });

  it("CSVヘッダーがスキーマに従っている", () => {
    const csvContent = readFileSync(csvPath, "utf-8");
    const headerLine = csvContent.split("\n")[0].trim();
    expect(headerLine).toBe("id,name,steps,expected,tags,result");
  });

  it("各行のIDがTC-006-04-{連番}形式である", () => {
    const csvContent = readFileSync(csvPath, "utf-8");
    const lines = csvContent.trim().split("\n").slice(1);
    const idPattern = /^TC-006-04-\d{3}$/;

    for (const line of lines) {
      if (!line.trim()) continue;
      const id = line.split(",")[0];
      expect(id).toMatch(idPattern);
    }
  });

  it("各行のsteps列が有効なJSON配列である", () => {
    const csvContent = readFileSync(csvPath, "utf-8");
    const lines = csvContent.trim().split("\n").slice(1);

    for (const line of lines) {
      if (!line.trim()) continue;
      const stepsJson = extractStepsJson(line);
      const parsed: unknown = JSON.parse(stepsJson);
      expect(Array.isArray(parsed)).toBe(true);
    }
  });

  it("必須のtestIdがカバーされている", () => {
    const requiredTestIds = ["history-card"];
    const csvContent = readFileSync(csvPath, "utf-8");

    for (const testId of requiredTestIds) {
      expect(csvContent).toContain(testId);
    }
  });

  it("3件のテストケースが含まれている", () => {
    const csvContent = readFileSync(csvPath, "utf-8");
    const lines = csvContent
      .trim()
      .split("\n")
      .slice(1)
      .filter((l) => l.trim().length > 0);
    expect(lines).toHaveLength(3);
  });
});
