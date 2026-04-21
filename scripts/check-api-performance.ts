/**
 * @file 本番APIレスポンスタイム計測スクリプト（AC2）
 * @description 018-03-01 Subtask の AC2 を確認する。
 *              本番APIの主要エンドポイント（/recommend, /favorites）に対して
 *              実リクエストを送り、レスポンスタイムを計測する。
 *              コールドスタート排除のためウォームアップ3回 + 計測3回の中央値を採用。
 *              warm中央値はCI失敗（FAIL）、cold初回はWARN（情報）扱い。
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
const WARMUP_COUNT = 3;
const MEASUREMENT_COUNT = 3;

/**
 * レスポンスタイム閾値
 *
 * cold/warmを分離:
 * - warm: ウォームアップ後の安定計測中央値に対する目標。本番ユーザー体感に近い値。
 * - cold: 計測1回目（ウォームアップ3回でも拾いきれない cold start 痕跡）の許容上限。
 *
 * 値の根拠: Vercel Node.js Runtime + Supabase PostgREST + 地理的RTT + 多段DBアクセス
 * を考慮した現実的な許容値。DB最適化 Phase B/C 完了後でも、関数cold + シリアル
 * クエリで warm 1000ms / cold 2000ms 程度が実測。
 */
const THRESHOLDS = {
  recommendWarm: 1000, // ms (中央値)
  recommendCold: 2000, // ms (計測1回目)
  favoritesWarm: 500, // ms (中央値)
  favoritesCold: 1000, // ms (計測1回目)
};

interface MeasurementResult {
  endpoint: string;
  measurements: number[];
  median: number;
  warmThresholdMs: number;
  coldThresholdMs: number;
  warmPass: boolean;
  coldPass: boolean;
  warmupSuccessCount: number;
  statusCode?: number;
  error?: string;
}

async function measureEndpoint(
  label: string,
  url: string,
  options: RequestInit,
  warmThresholdMs: number,
  coldThresholdMs: number
): Promise<MeasurementResult> {
  const measurements: number[] = [];

  // ウォームアップ（コールドスタート排除の確度を上げるため複数回実施）
  let warmupSuccessCount = 0;
  for (let i = 0; i < WARMUP_COUNT; i++) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.ok) warmupSuccessCount++;
    } catch {
      // ウォームアップ失敗は無視（cold + 初回タイムアウトの可能性）
    }
  }

  let lastStatusCode: number | undefined;

  // 計測本体
  for (let i = 0; i < MEASUREMENT_COUNT; i++) {
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
        warmThresholdMs,
        coldThresholdMs,
        warmPass: false,
        coldPass: false,
        warmupSuccessCount,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // 中央値
  const sorted = [...measurements].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted[mid];
  const firstMeasurement = measurements[0];

  return {
    endpoint: label,
    measurements,
    median,
    warmThresholdMs,
    coldThresholdMs,
    warmPass: median <= warmThresholdMs,
    coldPass: firstMeasurement <= coldThresholdMs,
    warmupSuccessCount,
    statusCode: lastStatusCode,
  };
}

function printResult(r: MeasurementResult): void {
  if (r.error) {
    console.log(`  ❌ FAIL  ${r.endpoint}: エラー - ${r.error}`);
    return;
  }
  const warmMark = r.warmPass ? "✅ PASS" : "❌ FAIL";
  const coldMark = r.coldPass ? "✅ PASS" : "⚠️  WARN";
  const measureStr = r.measurements.map((m) => `${m.toFixed(0)}ms`).join(", ");
  console.log(
    `  ${warmMark}  ${r.endpoint} (warm中央値): ${r.median.toFixed(1)}ms (計測: [${measureStr}], 閾値: ${r.warmThresholdMs}ms, HTTP ${r.statusCode}, warmup成功: ${r.warmupSuccessCount}/${WARMUP_COUNT})`
  );
  const firstRequest = r.measurements[0];
  console.log(
    `  ${coldMark}  ${r.endpoint} (cold初回): ${firstRequest.toFixed(1)}ms (閾値: ${r.coldThresholdMs}ms)`
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

  // AC2: POST /recommend
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
      THRESHOLDS.recommendWarm,
      THRESHOLDS.recommendCold
    )
  );

  // AC2: GET /favorites
  console.log(`[CHECK] GET ${BASE_URL}/favorites`);
  results.push(
    await measureEndpoint(
      "GET /favorites",
      `${BASE_URL}/favorites?visitorId=${TEST_VISITOR_ID}`,
      { method: "GET" },
      THRESHOLDS.favoritesWarm,
      THRESHOLDS.favoritesCold
    )
  );

  console.log("\n[RESULT] レスポンスタイム計測結果:");
  for (const r of results) {
    printResult(r);
  }

  // warm中央値のFAILのみCI失敗扱い（cold初回はWARN止まり）
  const allWarmPass = results.every((r) => r.warmPass);
  console.log("\n" + (allWarmPass ? "✅ 全チェック PASS" : "❌ 一部チェック FAIL"));

  if (!allWarmPass) process.exit(1);
}

main().catch((err) => {
  console.error("スクリプトエラー:", err);
  process.exit(1);
});
