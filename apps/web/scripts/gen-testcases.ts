import * as fs from "node:fs";
import { glob } from "glob";
import Anthropic from "@anthropic-ai/sdk";
import path from "node:path";

// --- Types ---

export interface Args {
  epic: string;
  story?: string;
  dryRun: boolean;
}

export interface RunOptions extends Args {
  outputDir: string;
}

export interface RunResult {
  generatedCount: number;
}

// --- Prompt Template ---

const PROMPT_TEMPLATE = `# E2Eテストケース生成プロンプト

## 入力

以下の仕様書からE2Eテストケースを生成してください。

### 仕様書

{spec_content}

## 出力形式

CSV形式で出力してください。ヘッダー行を含め、以下のスキーマに従ってください。

### スキーマ

- id: TC-{epic}-{story}-{連番} 形式
- name: テスト名（日本語、シナリオを表す）
- steps: StepAction型のJSON配列（CSV内はダブルクォートでエスケープ）
- expected: 期待結果（日本語）
- tags: critical（正常系）または edge（エッジケース）
- result: 空欄（実行時に記録）

## StepAction型

steps列で使用可能なアクション一覧:

- goto: {"action": "goto", "url": "/path"}
- click: {"action": "click", "testId": "element-id"}
- fill: {"action": "fill", "testId": "element-id", "value": "text"}
- waitFor: {"action": "waitFor", "testId": "element-id"}
- assertVisible: {"action": "assertVisible", "testId": "element-id"}
- assertText: {"action": "assertText", "testId": "element-id", "text": "expected"}
- assertUrl: {"action": "assertUrl", "pattern": "/path"}

### testId命名規則

- kebab-case で命名すること
- 既存コンポーネントの data-testid を参照し、実在する testId を優先して使用すること

## 生成ルール

1. 正常系フローを優先して生成する
2. 各ACに対して少なくとも1つのテストケースを生成する
3. シナリオベース（ユーザーフロー単位）で構成する
4. data-testid は kebab-case で命名する
5. 1テストケースあたりのステップ数は10以下を目安とする
6. tags は正常系なら critical、エッジケースなら edge を付与する

## 出力

以下のCSV形式で出力してください。ヘッダー行を必ず含めてください。

\`\`\`csv
id,name,steps,expected,tags,result
...
\`\`\``;

// --- Functions ---

export function parseArgs(args: string[]): Args {
  if (args.length === 0) {
    throw new Error("引数が必要です。使用法: --epic <id> [--story <id>] [--dry-run]");
  }

  let epic: string | undefined;
  let story: string | undefined;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--epic") {
      epic = args[i + 1];
      i++;
    } else if (arg === "--story") {
      story = args[i + 1];
      i++;
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }

  if (!epic) {
    throw new Error("--epic オプションは必須です");
  }

  return { epic, story, dryRun };
}

export async function findSpecFiles(epic: string, story?: string): Promise<string[]> {
  const pattern = story
    ? `specs/${epic}-*/${epic}-${story}-*/${epic}-${story}*.md`
    : `specs/${epic}-*/${epic}-*/${epic}-*.md`;

  const files = await glob(pattern);

  // subtask-list.md, story-list.md を除外
  return files.filter((f) => !f.endsWith("subtask-list.md") && !f.endsWith("story-list.md"));
}

export function buildPrompt(specContent: string): string {
  return PROMPT_TEMPLATE.replace("{spec_content}", specContent);
}

export function extractCsv(responseText: string): string {
  const csvBlockRegex = /```csv\n([\s\S]*?)```/;
  const match = csvBlockRegex.exec(responseText);

  if (!match) {
    throw new Error("レスポンスにCSVブロックが見つかりません");
  }

  return match[1].trim();
}

export function mergeCsv(existingCsv: string, newCsv: string): string {
  const existingLines = existingCsv.split("\n").filter((l) => l.trim());
  const newLines = newCsv.split("\n").filter((l) => l.trim());

  if (existingLines.length === 0) return newCsv;

  const header = existingLines[0];
  const existingRows = existingLines.slice(1);
  const newRows = newLines.slice(1);

  // IDベースでマージ（既存を優先）
  const merged = new Map<string, string>();
  for (const row of existingRows) {
    const id = row.split(",")[0];
    merged.set(id, row);
  }
  for (const row of newRows) {
    const id = row.split(",")[0];
    if (!merged.has(id)) {
      merged.set(id, row);
    }
  }

  const mergedRows = Array.from(merged.values());
  return [header, ...mergedRows].join("\n");
}

export function saveCsv(
  epic: string,
  story: string | undefined,
  csv: string,
  outputDir: string
): void {
  fs.mkdirSync(outputDir, { recursive: true });

  const filename = story ? `TC-${epic}-${story}.csv` : `TC-${epic}.csv`;
  const filePath = path.join(outputDir, filename);

  if (fs.existsSync(filePath)) {
    const existingCsv = fs.readFileSync(filePath, "utf-8");
    const merged = mergeCsv(existingCsv, csv);
    fs.writeFileSync(filePath, merged, "utf-8");
  } else {
    fs.writeFileSync(filePath, csv, "utf-8");
  }
}

function countDataRows(csv: string): number {
  return csv.split("\n").filter((l) => l.trim() && !l.startsWith("id,")).length;
}

export async function run(options: RunOptions): Promise<RunResult> {
  const { epic, story, dryRun, outputDir } = options;

  // 1. 仕様書を探索
  const specFiles = await findSpecFiles(epic, story);
  if (specFiles.length === 0) {
    throw new Error(`仕様書が見つかりません: epic=${epic}, story=${story ?? "全体"}`);
  }

  // 2. 仕様書を読み込む
  const specContent = specFiles.map((f) => fs.readFileSync(f, "utf-8")).join("\n\n---\n\n");

  // 3. dry-runチェック
  if (dryRun) {
    console.log("プレビューモード: API呼び出しをスキップします");
    console.log(`対象仕様書: ${String(specFiles.length)}件`);
    return { generatedCount: 0 };
  }

  // 4. プロンプト構築
  const prompt = buildPrompt(specContent);

  // 5. AI API呼び出し
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  // 6. CSV抽出
  const textContent = response.content.find((c) => c.type === "text");
  if (textContent?.type !== "text") {
    throw new Error("APIレスポンスにテキストが含まれていません");
  }
  const csv = extractCsv(textContent.text);

  // 7. 保存
  saveCsv(epic, story, csv, outputDir);

  // 8. 件数カウント
  const generatedCount = countDataRows(csv);

  return { generatedCount };
}

// --- Main (CLIエントリポイント) ---

// テスト時にはmain()が自動実行されないようにガード
const isDirectExecution =
  typeof process !== "undefined" &&
  process.argv[1] &&
  (process.argv[1].endsWith("gen-testcases.ts") || process.argv[1].endsWith("gen-testcases.js"));

if (isDirectExecution) {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = path.resolve(__dirname, "../e2e/testcases");
  run({ ...args, outputDir })
    .then((result) => {
      console.log(`${String(result.generatedCount)}件のテストケースを生成しました`);
    })
    .catch((err: unknown) => {
      console.error("エラー:", err);
      process.exit(1);
    });
}
