/**
 * Report Generator
 * Generates PoC validation report in Markdown format
 */

/** Cost per million tokens for text-embedding-3-small */
const EMBEDDING_COST_PER_MILLION_TOKENS = 0.02;

/** Cost per million tokens for tagging (OpenAI gpt-4o-mini) */
const TAGGING_COST_INPUT_PER_MILLION_TOKENS = 0.15;
const TAGGING_COST_OUTPUT_PER_MILLION_TOKENS = 0.6;

/** Total SCP articles for production estimate */
const TOTAL_SCP_ARTICLES = 10000;

/** Supabase estimated monthly cost */
const SUPABASE_MONTHLY_COST = 25; // Free tier + estimated overage

export interface ReportData {
  dataFetch: {
    success: boolean;
    articleCount: number;
    avgContentLength: number;
  };
  embedding: {
    success: boolean;
    tokenCount: number;
    cost: number;
    timeSeconds: number;
  };
  tagging: {
    success: boolean;
    tokenCount: number;
    cost: number;
  };
  search: {
    vectorSearchSuccess: boolean;
    hybridSearchSuccess: boolean;
    searchTimeMs: number;
  };
}

/**
 * Create mock ReportData for testing
 */
export function createMockReportData(): ReportData {
  return {
    dataFetch: {
      success: true,
      articleCount: 10,
      avgContentLength: 5000,
    },
    embedding: {
      success: true,
      tokenCount: 50000,
      cost: 0.001,
      timeSeconds: 30,
    },
    tagging: {
      success: true,
      tokenCount: 10000,
      cost: 0.0015,
    },
    search: {
      vectorSearchSuccess: true,
      hybridSearchSuccess: true,
      searchTimeMs: 150,
    },
  };
}

/**
 * Format date in ISO format (YYYY-MM-DD)
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Format cost with appropriate decimal places
 */
function formatCost(cost: number): string {
  if (cost >= 1) {
    return `$${cost.toFixed(2)}`;
  }
  return `$${cost.toFixed(4)}`;
}

/**
 * Get status emoji based on success
 */
function getStatusEmoji(success: boolean): string {
  return success ? "✅" : "❌";
}

/**
 * Determine Go/No-Go judgment based on all results
 */
function determineJudgment(data: ReportData): "Go" | "No-Go" | "条件付きGo" {
  const allSuccess =
    data.dataFetch.success &&
    data.embedding.success &&
    data.tagging.success &&
    data.search.vectorSearchSuccess &&
    data.search.hybridSearchSuccess;

  const allFailed =
    !data.dataFetch.success &&
    !data.embedding.success &&
    !data.tagging.success &&
    !data.search.vectorSearchSuccess &&
    !data.search.hybridSearchSuccess;

  if (allSuccess) {
    return "Go";
  } else if (allFailed) {
    return "No-Go";
  } else {
    return "条件付きGo";
  }
}

/**
 * Calculate production cost estimate
 */
function calculateProductionCost(
  data: ReportData
): { embeddingCost: number; taggingCost: number; monthlyOperation: number } {
  const articleCount = data.dataFetch.articleCount || 1;
  const scaleFactor = TOTAL_SCP_ARTICLES / articleCount;

  const embeddingCost = data.embedding.cost * scaleFactor;
  const taggingCost = data.tagging.cost * scaleFactor;
  const monthlyOperation = SUPABASE_MONTHLY_COST + embeddingCost * 0.1; // 10% monthly updates

  return { embeddingCost, taggingCost, monthlyOperation };
}

/**
 * Generate the overview section
 */
function generateOverviewSection(data: ReportData): string {
  const lines: string[] = [];

  lines.push("## 1. 概要");
  lines.push("");
  lines.push("### 目的");
  lines.push("");
  lines.push("SCP推薦システムの技術的実現可能性を検証する。");
  lines.push("");
  lines.push("### スコープ");
  lines.push("");
  lines.push("- データソース: SCP Data API (EN)");
  lines.push(`- 対象記事数: ${data.dataFetch.articleCount}件`);
  lines.push("- Embedding: OpenAI text-embedding-3-small");
  lines.push("- ベクトルDB: Supabase pgvector");
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate the summary section
 */
function generateSummarySection(data: ReportData): string {
  const lines: string[] = [];

  lines.push("## 2. 検証結果サマリー");
  lines.push("");
  lines.push("| 検証項目 | 結果 | 備考 |");
  lines.push("|----------|------|------|");
  lines.push(
    `| データ取得 | ${getStatusEmoji(data.dataFetch.success)} | ${data.dataFetch.articleCount}件取得 |`
  );
  lines.push(
    `| Embedding生成 | ${getStatusEmoji(data.embedding.success)} | ${data.embedding.tokenCount.toLocaleString()}トークン |`
  );
  lines.push(
    `| タグ抽出 | ${getStatusEmoji(data.tagging.success)} | ${data.tagging.tokenCount.toLocaleString()}トークン |`
  );
  lines.push(
    `| ベクトル検索 | ${getStatusEmoji(data.search.vectorSearchSuccess)} | ${data.search.searchTimeMs}ms |`
  );
  lines.push(
    `| ハイブリッド検索 | ${getStatusEmoji(data.search.hybridSearchSuccess)} | - |`
  );
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate the data fetch results section
 */
function generateDataFetchSection(data: ReportData): string {
  const lines: string[] = [];

  lines.push("## 3. データ取得結果");
  lines.push("");
  lines.push(`- 取得件数: ${data.dataFetch.articleCount}件`);
  lines.push(`- 平均コンテンツ長: ${data.dataFetch.avgContentLength}文字`);
  lines.push(`- ステータス: ${data.dataFetch.success ? "成功" : "失敗"}`);
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate the embedding results section
 */
function generateEmbeddingSection(data: ReportData): string {
  const lines: string[] = [];

  lines.push("## 4. Embedding生成結果");
  lines.push("");
  lines.push(`- 処理件数: ${data.dataFetch.articleCount}件`);
  lines.push(`- 総トークン数: ${data.embedding.tokenCount.toLocaleString()}`);
  lines.push(`- 費用: ${formatCost(data.embedding.cost)}`);
  lines.push(`- 処理時間: ${data.embedding.timeSeconds}秒`);
  lines.push(`- ステータス: ${data.embedding.success ? "成功" : "失敗"}`);
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate the tagging results section
 */
function generateTaggingSection(data: ReportData): string {
  const lines: string[] = [];

  lines.push("## 5. タグ抽出結果");
  lines.push("");
  lines.push(`- 処理件数: ${data.dataFetch.articleCount}件`);
  lines.push(`- 総トークン数: ${data.tagging.tokenCount.toLocaleString()}`);
  lines.push(`- 費用: ${formatCost(data.tagging.cost)}`);
  lines.push(`- ステータス: ${data.tagging.success ? "成功" : "失敗"}`);
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate the search results section
 */
function generateSearchSection(data: ReportData): string {
  const lines: string[] = [];

  lines.push("## 6. 検索結果");
  lines.push("");
  lines.push("### ベクトル検索 vs ハイブリッド検索");
  lines.push("");
  lines.push(
    `- ベクトル検索: ${data.search.vectorSearchSuccess ? "成功" : "失敗"}`
  );
  lines.push(
    `- ハイブリッド検索: ${data.search.hybridSearchSuccess ? "成功" : "失敗"}`
  );
  lines.push(`- 検索時間: ${data.search.searchTimeMs}ms`);
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate the performance section
 */
function generatePerformanceSection(data: ReportData): string {
  const lines: string[] = [];

  lines.push("## 7. パフォーマンス計測結果");
  lines.push("");
  lines.push(
    `- Embedding生成速度: ${data.dataFetch.articleCount > 0 ? (data.embedding.timeSeconds / data.dataFetch.articleCount).toFixed(2) : 0}秒/記事`
  );
  lines.push(`- 検索レイテンシ: ${data.search.searchTimeMs}ms`);
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate the cost estimation section
 */
function generateCostSection(data: ReportData): string {
  const lines: string[] = [];
  const production = calculateProductionCost(data);

  lines.push("## 8. コスト試算");
  lines.push("");
  lines.push("### PoC実績");
  lines.push("");
  lines.push("| 項目 | 数量 | 費用 |");
  lines.push("|------|------|------|");
  lines.push(
    `| Embedding生成 | ${data.embedding.tokenCount.toLocaleString()}トークン | ${formatCost(data.embedding.cost)} |`
  );
  lines.push(
    `| タグ抽出 | ${data.tagging.tokenCount.toLocaleString()}トークン | ${formatCost(data.tagging.cost)} |`
  );
  lines.push("");
  lines.push("### 本格実装時（10,000記事）");
  lines.push("");
  lines.push("| 項目 | 推定費用 |");
  lines.push("|------|----------|");
  lines.push(`| 初期Embedding生成 | ${formatCost(production.embeddingCost)} |`);
  lines.push(`| 初期タグ抽出 | ${formatCost(production.taggingCost)} |`);
  lines.push(`| Supabase利用料 | $${SUPABASE_MONTHLY_COST}/月 |`);
  lines.push(
    `| 月間運用（10%更新想定） | ${formatCost(production.monthlyOperation)}/月 |`
  );
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate the issues section
 */
function generateIssuesSection(data: ReportData): string {
  const lines: string[] = [];
  const issues: string[] = [];

  if (!data.dataFetch.success) {
    issues.push("データ取得に課題あり - API接続の安定性を確認");
  }
  if (!data.embedding.success) {
    issues.push("Embedding生成に課題あり - OpenAI APIのレート制限を確認");
  }
  if (!data.tagging.success) {
    issues.push("タグ抽出に課題あり - プロンプトの精度を改善");
  }
  if (!data.search.vectorSearchSuccess) {
    issues.push("ベクトル検索に課題あり - インデックス設定を確認");
  }
  if (!data.search.hybridSearchSuccess) {
    issues.push("ハイブリッド検索に課題あり - フィルタリング条件を調整");
  }

  lines.push("## 9. 発見した課題・リスク");
  lines.push("");

  if (issues.length === 0) {
    lines.push("- 特になし（全検証項目が成功）");
  } else {
    issues.forEach((issue, index) => {
      lines.push(`${index + 1}. ${issue}`);
    });
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate the recommendations section
 */
function generateRecommendationsSection(data: ReportData): string {
  const lines: string[] = [];
  const judgment = determineJudgment(data);

  lines.push("## 10. 本格実装に向けた推奨事項");
  lines.push("");
  lines.push("### Go / No-Go 判定");
  lines.push("");
  lines.push(`**${judgment}**`);
  lines.push("");

  if (judgment === "Go") {
    lines.push("全ての検証項目が成功しており、本格実装に進めることを推奨します。");
  } else if (judgment === "No-Go") {
    lines.push("複数の検証項目で失敗しており、課題解決後に再検証が必要です。");
  } else {
    lines.push(
      "一部の検証項目で課題がありますが、対策を講じた上で本格実装に進むことを推奨します。"
    );
  }
  lines.push("");

  lines.push("### 技術選定");
  lines.push("");
  if (judgment === "No-Go") {
    lines.push("- 技術選定の見直しを検討");
  } else {
    lines.push("- 現行の技術選定で問題なし");
    lines.push("- OpenAI text-embedding-3-small: コスト効率が良好");
    lines.push("- Supabase pgvector: 検索性能が十分");
  }
  lines.push("");

  lines.push("### 優先的に対処すべき課題");
  lines.push("");
  if (!data.search.hybridSearchSuccess && data.search.vectorSearchSuccess) {
    lines.push("1. ハイブリッド検索の改善");
    lines.push("2. タグベースフィルタリングの最適化");
  } else if (judgment === "No-Go") {
    lines.push("1. 失敗した検証項目の原因調査");
    lines.push("2. 修正後の再検証");
  } else {
    lines.push("1. 大規模データでのパフォーマンス検証");
    lines.push("2. エラーハンドリングの強化");
  }
  lines.push("");

  lines.push("### 次フェーズで検証すべき項目");
  lines.push("");
  lines.push("1. 10,000記事規模でのパフォーマンス");
  lines.push("2. ユーザー評価による推薦精度の検証");
  lines.push("3. 運用コストの実測");
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate PoC validation report in Markdown format
 */
export async function generateReport(data: ReportData): Promise<string> {
  const lines: string[] = [];
  const now = new Date();

  // Header
  lines.push("# SCP Recommend PoC 検証レポート");
  lines.push("");
  lines.push(`**生成日時**: ${formatDate(now)}`);
  lines.push("");

  // Sections
  lines.push(generateOverviewSection(data));
  lines.push(generateSummarySection(data));
  lines.push(generateDataFetchSection(data));
  lines.push(generateEmbeddingSection(data));
  lines.push(generateTaggingSection(data));
  lines.push(generateSearchSection(data));
  lines.push(generatePerformanceSection(data));
  lines.push(generateCostSection(data));
  lines.push(generateIssuesSection(data));
  lines.push(generateRecommendationsSection(data));

  return lines.join("\n");
}
