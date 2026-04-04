/**
 * @file 本番環境ヘルスチェック確認スクリプト（AC1）
 * @description 018-03-01 Subtask の AC1 を確認する。
 *              本番APIサーバー（scpicks.app）に実HTTP通信を行い、
 *              GET /health が HTTP 200 かつ status: "ok" を返すことを検証する。
 *
 * 使用方法:
 *   npx tsx scripts/check-production-health.ts
 *
 * オプション:
 *   API_BASE_URL  対象URLのベース（デフォルト: https://scpicks.app/api）
 */

const BASE_URL = process.env.API_BASE_URL ?? "https://scpicks.app/api";
const TIMEOUT_MS = 15_000;

interface HealthResponse {
  status: "ok" | "degraded";
  timestamp: string;
  version: string;
}

interface CheckResult {
  name: string;
  pass: boolean;
  message: string;
  elapsedMs?: number;
}

async function checkHealth(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const url = `${BASE_URL}/health`;

  console.log(`\n[CHECK] GET ${url}`);

  let res: Response;
  const start = performance.now();
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    return [
      {
        name: "接続確認",
        pass: false,
        message: `リクエスト失敗: ${err instanceof Error ? err.message : String(err)}`,
      },
    ];
  }
  const elapsed = performance.now() - start;

  // AC1: HTTP 200 を返す
  results.push({
    name: "HTTP 200 を返す",
    pass: res.status === 200,
    message: `HTTP ${res.status}`,
    elapsedMs: elapsed,
  });

  let body: HealthResponse;
  try {
    body = (await res.json()) as HealthResponse;
  } catch {
    results.push({
      name: "JSONレスポンスのパース",
      pass: false,
      message: "レスポンスボディのJSONパースに失敗",
    });
    return results;
  }

  // AC1: status が "ok" である
  results.push({
    name: 'status が "ok" である',
    pass: body.status === "ok",
    message: `status: "${body.status}"`,
  });

  // 補足: timestamp が ISO 8601 形式
  const isValidTimestamp = !isNaN(Date.parse(body.timestamp));
  results.push({
    name: "timestamp が ISO 8601 形式",
    pass: isValidTimestamp,
    message: `timestamp: "${body.timestamp}"`,
  });

  // 補足: version が存在する
  results.push({
    name: "version が存在する",
    pass: typeof body.version === "string" && body.version.length > 0,
    message: `version: "${body.version}"`,
  });

  return results;
}

function printResults(results: CheckResult[]): boolean {
  let allPass = true;
  for (const r of results) {
    const mark = r.pass ? "✅ PASS" : "❌ FAIL";
    const elapsed = r.elapsedMs !== undefined ? ` (${r.elapsedMs.toFixed(1)}ms)` : "";
    console.log(`  ${mark}  ${r.name}: ${r.message}${elapsed}`);
    if (!r.pass) allPass = false;
  }
  return allPass;
}

async function main(): Promise<void> {
  console.log("=== 本番環境ヘルスチェック確認 (018-03-01 AC1) ===");
  console.log(`対象: ${BASE_URL}`);

  const results = await checkHealth();
  const allPass = printResults(results);

  console.log("\n" + (allPass ? "✅ 全チェック PASS" : "❌ 一部チェック FAIL"));

  if (!allPass) process.exit(1);
}

main().catch((err) => {
  console.error("スクリプトエラー:", err);
  process.exit(1);
});
