import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import type { TestCase, StepAction } from "./types";

/**
 * CSVファイルをパースしてTestCase配列を返す
 * @param filePath CSVファイルのパス
 * @returns TestCase[]
 * @throws Error CSVパースエラー、JSONパースエラー
 */
export function parseTestCaseCsv(filePath: string): TestCase[] {
  const content = readFileSync(filePath, "utf-8");
  const records: Record<string, string>[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
  });

  return records.map((row, index) => parseRow(row, index + 2));
}

function parseRow(row: Record<string, string>, lineNumber: number): TestCase {
  const steps = parseSteps(row.steps, lineNumber);
  const tags = parseTags(row.tags);
  const result = parseResult(row.result);

  return {
    id: row.id,
    name: row.name,
    steps,
    expected: row.expected,
    tags,
    result,
  };
}

function parseSteps(stepsStr: string, lineNumber: number): StepAction[] {
  try {
    return JSON.parse(stepsStr) as StepAction[];
  } catch {
    throw new Error(`行${String(lineNumber)}のsteps列のJSONパースに失敗しました: ${stepsStr}`);
  }
}

function parseTags(tagsStr: string): string[] {
  if (!tagsStr) return [];
  return tagsStr
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function parseResult(resultStr: string): "pass" | "fail" | "skip" | undefined {
  if (!resultStr) return undefined;
  return resultStr as "pass" | "fail" | "skip";
}
