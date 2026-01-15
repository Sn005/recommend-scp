/**
 * 結合テストランナー
 * テストケース定義に基づいて自律的にテストを実行し、結果を更新する
 *
 * 使用方法:
 *   pnpm --filter @recommend-scp/pipeline exec tsx scripts/run-integration-tests.ts [options]
 *
 * オプション:
 *   --suite <name>    特定のテストスイートのみ実行
 *   --test <id>       特定のテストのみ実行
 *   --list            テスト一覧を表示
 *   --dry-run         実行せずに対象テストを表示
 *   --update-spec     specファイルのテスト結果も更新
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { parseArgs } from "node:util";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 型定義
interface TestCase {
  id: string;
  name: string;
  command: string;
  expectedResult: string;
  status: "pending" | "passed" | "failed" | "skipped";
  result: string | null;
  executedAt: string | null;
}

interface TestSuite {
  id: string;
  name: string;
  description: string;
  prerequisite: string[];
  envRequired: string[];
  tests: TestCase[];
}

interface TestCasesConfig {
  version: string;
  description: string;
  testSuites: TestSuite[];
}

interface TestResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
  durationMs: number;
}

// コマンドライン引数
const { values } = parseArgs({
  options: {
    suite: { type: "string", short: "s" },
    test: { type: "string", short: "t" },
    list: { type: "boolean", short: "l" },
    "dry-run": { type: "boolean" },
    "update-spec": { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

// パス定義
const TEST_CASES_PATH = resolve(__dirname, "../tests/integration/test-cases.json");
const SPEC_PATH = resolve(
  __dirname,
  "../../../specs/003-data-pipeline/003-04-orchestration/003-04-00-integration-test.md"
);

// テストケース読み込み
function loadTestCases(): TestCasesConfig {
  const content = readFileSync(TEST_CASES_PATH, "utf-8");
  return JSON.parse(content) as TestCasesConfig;
}

// テストケース保存
function saveTestCases(config: TestCasesConfig): void {
  writeFileSync(TEST_CASES_PATH, JSON.stringify(config, null, 2) + "\n");
  console.log(`✅ test-cases.json を更新しました`);
}

// specファイルの結果テーブルを更新
function updateSpecFile(config: TestCasesConfig): void {
  let specContent = readFileSync(SPEC_PATH, "utf-8");

  // テスト結果記録セクションを更新
  const resultTableStart = "| テスト項目 | 結果 | 実施日 | 備考 |";
  const resultTableEnd = "\n\n## 注意事項";

  const startIndex = specContent.indexOf(resultTableStart);
  const endIndex = specContent.indexOf(resultTableEnd, startIndex);

  if (startIndex === -1 || endIndex === -1) {
    console.log("⚠️ specファイルの結果テーブルが見つかりません");
    return;
  }

  // 新しいテーブルを生成
  const rows: string[] = [
    "| テスト項目 | 結果 | 実施日 | 備考 |",
    "|-----------|------|--------|------|",
  ];

  for (const suite of config.testSuites) {
    for (const test of suite.tests) {
      const status =
        test.status === "passed"
          ? "✅ 成功"
          : test.status === "failed"
            ? "❌ 失敗"
            : test.status === "skipped"
              ? "⏭️ スキップ"
              : "-";
      const date = test.executedAt ? test.executedAt.split("T")[0] : "-";
      const note = test.result ?? "-";
      rows.push(`| ${test.name} | ${status} | ${date} | ${note} |`);
    }
  }

  const newTable = rows.join("\n");
  specContent = specContent.slice(0, startIndex) + newTable + specContent.slice(endIndex);

  writeFileSync(SPEC_PATH, specContent);
  console.log(`✅ spec ファイルを更新しました`);
}

// 環境変数チェック
function checkEnvVars(required: string[]): { ok: boolean; missing: string[] } {
  const missing = required.filter((v) => !process.env[v]);
  return { ok: missing.length === 0, missing };
}

// テスト実行
function runTest(test: TestCase): TestResult {
  console.log(`\n  🧪 ${test.name}...`);

  try {
    const output = execSync(test.command, {
      encoding: "utf-8",
      cwd: resolve(__dirname, ".."),
      timeout: 60000,
      env: { ...process.env },
    });

    // JSON形式の出力をパース
    const result = JSON.parse(output.trim()) as TestResult;
    return result;
  } catch (error) {
    const err = error as { message?: string; stderr?: string };
    return {
      success: false,
      message: "コマンド実行エラー",
      error: err.message ?? err.stderr ?? String(error),
      durationMs: 0,
    };
  }
}

// テスト一覧表示
function listTests(config: TestCasesConfig): void {
  console.log("\n📋 結合テスト一覧\n");

  for (const suite of config.testSuites) {
    console.log(`📁 ${suite.id}: ${suite.name}`);
    console.log(`   ${suite.description}`);
    console.log(`   前提: ${suite.prerequisite.join(", ") || "なし"}`);
    console.log(`   環境変数: ${suite.envRequired.join(", ") || "なし"}`);

    for (const test of suite.tests) {
      const statusIcon =
        test.status === "passed"
          ? "✅"
          : test.status === "failed"
            ? "❌"
            : test.status === "skipped"
              ? "⏭️"
              : "⏳";
      console.log(`   ${statusIcon} ${test.id}: ${test.name}`);
    }
    console.log();
  }
}

// メイン処理
async function main(): Promise<void> {
  if (values.help) {
    console.log(`
結合テストランナー

使用方法:
  tsx scripts/run-integration-tests.ts [options]

オプション:
  --suite, -s <name>  特定のテストスイートのみ実行
  --test, -t <id>     特定のテストのみ実行
  --list, -l          テスト一覧を表示
  --dry-run           実行せずに対象テストを表示
  --update-spec       specファイルのテスト結果も更新
  --help, -h          ヘルプを表示
    `);
    return;
  }

  const config = loadTestCases();

  if (values.list) {
    listTests(config);
    return;
  }

  console.log("🚀 結合テスト実行開始\n");

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let skippedTests = 0;

  for (const suite of config.testSuites) {
    // スイートフィルタ
    if (values.suite && suite.id !== values.suite) continue;

    console.log(`\n📁 ${suite.name}`);

    // 環境変数チェック
    const envCheck = checkEnvVars(suite.envRequired);
    if (!envCheck.ok) {
      console.log(`   ⚠️ 環境変数未設定: ${envCheck.missing.join(", ")}`);
      console.log(`   ⏭️ このスイートをスキップします`);

      for (const test of suite.tests) {
        test.status = "skipped";
        test.result = `環境変数未設定: ${envCheck.missing.join(", ")}`;
        test.executedAt = new Date().toISOString();
        skippedTests++;
        totalTests++;
      }
      continue;
    }

    for (const test of suite.tests) {
      // テストフィルタ
      if (values.test && test.id !== values.test) continue;

      totalTests++;

      if (values["dry-run"]) {
        console.log(`  🧪 [DRY-RUN] ${test.name}`);
        console.log(`     コマンド: ${test.command}`);
        continue;
      }

      const result = runTest(test);

      // 結果を更新
      test.status = result.success ? "passed" : "failed";
      test.result = result.message;
      test.executedAt = new Date().toISOString();

      if (result.success) {
        console.log(`     ✅ ${result.message} (${String(result.durationMs)}ms)`);
        passedTests++;
      } else {
        console.log(`     ❌ ${result.message}`);
        if (result.error) {
          console.log(`        エラー: ${result.error}`);
        }
        failedTests++;
      }
    }
  }

  if (!values["dry-run"]) {
    // 結果を保存
    saveTestCases(config);

    if (values["update-spec"]) {
      updateSpecFile(config);
    }

    // サマリー表示
    console.log("\n" + "=".repeat(50));
    console.log("📊 テスト結果サマリー");
    console.log("=".repeat(50));
    console.log(`   合計:     ${String(totalTests)}`);
    console.log(`   成功:     ${String(passedTests)} ✅`);
    console.log(`   失敗:     ${String(failedTests)} ❌`);
    console.log(`   スキップ: ${String(skippedTests)} ⏭️`);
    console.log("=".repeat(50));

    if (failedTests > 0) {
      process.exit(1);
    }
  }
}

main().catch((error: unknown) => {
  console.error("予期しないエラー:", error);
  process.exit(1);
});
