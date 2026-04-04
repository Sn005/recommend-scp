/**
 * @file 本番APIレスポンスタイム計測スクリプト（AC2）
 * @description 018-03-01 Subtask の AC2 を確認する。
 *              本番APIの主要エンドポイント（/recommend, /favorites）に対して
 *              実リクエストを送り、レスポンスタイムを計測する。
 *              コールドスタート排除のためウォームアップ1回 + 計測3回の中央値を採用。
 *
 * 使用方法:
 *   TEST_VISITOR_ID=<uuid> npx tsx scripts/check-api-performance.ts
 *
 * 必須環境変数:
 *   TEST_VISITOR_ID  本番環境でオンボーディング完了済みのvisitor_id（UUID）
 *
 * オプション環境変数:
 *   API_BASE_URL     対象URLのベース（デフォルト: https://scpicks.app/api）
 */

const BASE_URL = process.env.API_BASE_URL ?? "https://scpicks.app/api";
const TEST_VISITOR_ID = process.env.TEST_VISITOR_ID;
const TIMEOUT_MS = 15_000;

/** パフォーマンス目標（docs/operations/slow-query-optimization.md 準拠） */
const THRESHOLDS = {
  recommend: 200, // ms
  favorites: 200, // ms
  coldStart: 500, // ms (コールドスタート許容上限)
};

interface MeasurementResult {
  endpoint: string;
  measurements: number[];
  median: number;
  thresholdMs: number;
  pass: boolean;
  statusCode?: number;
  error?: string;
}

async function measureEndpoint(
  label: string,
  url: string,
  options: RequestInit,
  thresholdMs: number
): Promise<MeasurementResult> {
  const measurements: number[] = [];

  // ウォームアップ1回（コールドスタート排除）
  try {
    await fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    // ウォームアップ失敗は無視
  }

  let lastStatusCode: number | undefined;

  // 3回計測
  for (let i = 0; i < 3; i++) {
    const start = performance.now();
    try {
      const res = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const elapsed = performance.now() - start;
      measurements.push(elapsed);
      lastStatusCode = res.status;
    } catch (err) {
      return {
        endpoint: label,
        measurements: [],
        median: Infinity,
        thresholdMs,
        pass: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // 中央値
  const sorted = [...measurements].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted[mid];

  return {
    endpoint: label,
    measurements,
    median,
    thresholdMs,
    pass: median <= thresholdMs,
    statusCode: lastStatusCode,
  };
}

function printResult(r: MeasurementResult): void {
  const mark = r.pass ? "✅ PASS" : "❌ FAIL";
  if (r.error) {
    console.log(`  ❌ FAIL  ${r.endpoint}: エラー - ${r.error}`);
    return;
  }
  const measureStr = r.measurements.map((m) => `${m.toFixed(0)}ms`).join(", ");
  console.log(
    `  ${mark}  ${r.endpoint}: 中央値 ${r.median.toFixed(1)}ms (計測: [${measureStr}], 閾値: ${r.thresholdMs}ms, HTTP ${r.statusCode})`
  );
}

async function main(): Promise<void> {
  console.log("=== 本番APIレスポンスタイム計測 (018-03-01 AC2) ===");
  console.log(`対象: ${BASE_URL}`);

  if (!TEST_VISITOR_ID) {
    console.error("❌ 環境変数 TEST_VISITOR_ID が設定されていません。");
    console.error("   本番環境でオンボーディング完了済みのvisitor_id（UUID）を設定してください。");
    console.error(
      "   例: TEST_VISITOR_ID=550e8400-e29b-41d4-a716-446655440000 npx tsx scripts/check-api-performance.ts"
    );
    process.exit(1);
  }

  const results: MeasurementResult[] = [];

  // AC2: POST /recommend - 200ms以内
  console.log(`\n[CHECK] POST ${BASE_URL}/recommend`);
  results.push(
    await measureEndpoint(
      "POST /recommend",
      `${BASE_URL}/recommend`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: TEST_VISITOR_ID, limit: 10 }),
      },
      THRESHOLDS.recommend
    )
  );

  // AC2: GET /favorites - 200ms以内
  console.log(`[CHECK] GET ${BASE_URL}/favorites`);
  results.push(
    await measureEndpoint(
      "GET /favorites",
      `${BASE_URL}/favorites?visitorId=${TEST_VISITOR_ID}`,
      { method: "GET" },
      THRESHOLDS.favorites
    )
  );

  // コールドスタート確認（初回計測値）
  console.log("\n[RESULT] レスポンスタイム計測結果:");
  for (const r of results) {
    printResult(r);
    // コールドスタート後の初回計測
    if (r.measurements.length > 0) {
      const firstRequest = r.measurements[0];
      const coldStartPass = firstRequest <= THRESHOLDS.coldStart;
      const coldMark = coldStartPass ? "✅ PASS" : "⚠️  WARN";
      console.log(
        `  ${coldMark}  ${r.endpoint} (初回): ${firstRequest.toFixed(1)}ms (コールドスタート許容上限: ${THRESHOLDS.coldStart}ms)`
      );
    }
  }

  const allPass = results.every((r) => r.pass);
  console.log("\n" + (allPass ? "✅ 全チェック PASS" : "❌ 一部チェック FAIL"));

  if (!allPass) process.exit(1);
}

main().catch((err) => {
  console.error("スクリプトエラー:", err);
  process.exit(1);
});
