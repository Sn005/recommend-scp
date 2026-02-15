import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("サンプルCSVファイル", () => {
  const csvPath = join(__dirname, "../testcases/sample.csv");

  it("サンプルCSVファイルが存在する", () => {
    const csvContent = readFileSync(csvPath, "utf-8");
    expect(csvContent).toBeTruthy();
  });

  it("CSVヘッダーがスキーマに従っている", () => {
    const csvContent = readFileSync(csvPath, "utf-8");
    const headerLine = csvContent.split("\n")[0].trim();
    expect(headerLine).toBe("id,name,steps,expected,tags,result");
  });

  it("各行のIDがTC-{epic}-{story}-{連番}形式である", () => {
    const csvContent = readFileSync(csvPath, "utf-8");
    const lines = csvContent.trim().split("\n").slice(1);
    const idPattern = /^TC-\d{3}-\d{2}-\d{3}$/;

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
});

/**
 * CSV行からsteps列（JSON）を抽出する
 * JSONにはカンマが含まれるため、ダブルクォート内を考慮してパースする
 */
function extractStepsJson(line: string): string {
  const columns: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // CSV内のエスケープされたダブルクォート（""→"）
        current += '"';
        i++;
      } else {
        // クォートフィールドの開始/終了
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      columns.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  columns.push(current);

  // steps は3番目のカラム（index 2）
  return columns[2];
}
