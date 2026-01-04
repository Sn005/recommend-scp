/**
 * Report Generator Tests
 * TDD tests for PoC validation report generation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateReport,
  createMockReportData,
  type ReportData,
} from "../generate-report";

describe("generateReport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-04T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("レポート生成", () => {
    it("完全なReportDataを渡すとMarkdownレポートが生成される", async () => {
      const mockData = createMockReportData();

      const report = await generateReport(mockData);

      expect(report).toBeTruthy();
      expect(report).toContain("# SCP Recommend PoC 検証レポート");
    });

    it("生成されたレポートに生成日時が含まれる", async () => {
      const mockData = createMockReportData();

      const report = await generateReport(mockData);

      expect(report).toMatch(/生成日時.*2026-01-04/);
    });
  });

  describe("レポートセクション", () => {
    it("必須の10セクションが全て含まれる", async () => {
      const mockData = createMockReportData();

      const report = await generateReport(mockData);

      expect(report).toContain("## 1. 概要");
      expect(report).toContain("## 2. 検証結果サマリー");
      expect(report).toContain("## 3. データ取得結果");
      expect(report).toContain("## 4. Embedding生成結果");
      expect(report).toContain("## 5. タグ抽出結果");
      expect(report).toContain("## 6. 検索結果");
      expect(report).toContain("## 7. パフォーマンス計測結果");
      expect(report).toContain("## 8. コスト試算");
      expect(report).toContain("## 9. 発見した課題・リスク");
      expect(report).toContain("## 10. 本格実装に向けた推奨事項");
    });

    it("概要セクションに目的とスコープが記載される", async () => {
      const mockData = createMockReportData();

      const report = await generateReport(mockData);

      expect(report).toContain("### 目的");
      expect(report).toContain("### スコープ");
    });

    it("スコープセクションに記事数が記載される", async () => {
      const mockData = createMockReportData();
      mockData.dataFetch.articleCount = 15;

      const report = await generateReport(mockData);

      expect(report).toContain("対象記事数: 15");
    });
  });

  describe("検証結果サマリー", () => {
    it("検証項目が表形式で表示される", async () => {
      const mockData = createMockReportData();

      const report = await generateReport(mockData);

      expect(report).toContain("| 検証項目 | 結果 | 備考 |");
      expect(report).toMatch(/\|[-\s]+\|[-\s]+\|[-\s]+\|/);
    });

    it("全検証項目が成功の場合に✅が表示される", async () => {
      const mockData: ReportData = {
        dataFetch: { success: true, articleCount: 10, avgContentLength: 5000 },
        embedding: {
          success: true,
          tokenCount: 50000,
          cost: 0.001,
          timeSeconds: 30,
        },
        tagging: { success: true, tokenCount: 10000, cost: 0.0015 },
        search: {
          vectorSearchSuccess: true,
          hybridSearchSuccess: true,
          searchTimeMs: 150,
        },
      };

      const report = await generateReport(mockData);

      expect(report).toContain("| データ取得 | ✅ |");
      expect(report).toContain("| Embedding生成 | ✅ |");
      expect(report).toContain("| タグ抽出 | ✅ |");
      expect(report).toContain("| ベクトル検索 | ✅ |");
      expect(report).toContain("| ハイブリッド検索 | ✅ |");
    });

    it("検証項目が失敗の場合に❌が表示される", async () => {
      const mockData: ReportData = {
        dataFetch: { success: false, articleCount: 0, avgContentLength: 0 },
        embedding: { success: false, tokenCount: 0, cost: 0, timeSeconds: 0 },
        tagging: { success: true, tokenCount: 10000, cost: 0.0015 },
        search: {
          vectorSearchSuccess: false,
          hybridSearchSuccess: false,
          searchTimeMs: 0,
        },
      };

      const report = await generateReport(mockData);

      expect(report).toContain("| データ取得 | ❌ |");
      expect(report).toContain("| Embedding生成 | ❌ |");
    });

    it("備考欄に追加情報が記載される", async () => {
      const mockData = createMockReportData();
      mockData.dataFetch.articleCount = 10;

      const report = await generateReport(mockData);

      expect(report).toMatch(/\| データ取得 \| ✅ \|.*10件/);
    });
  });

  describe("コスト試算", () => {
    it("PoC実績のコストが表示される", async () => {
      const mockData: ReportData = {
        dataFetch: { success: true, articleCount: 10, avgContentLength: 5000 },
        embedding: {
          success: true,
          tokenCount: 50000,
          cost: 0.001,
          timeSeconds: 30,
        },
        tagging: { success: true, tokenCount: 10000, cost: 0.0015 },
        search: {
          vectorSearchSuccess: true,
          hybridSearchSuccess: true,
          searchTimeMs: 150,
        },
      };

      const report = await generateReport(mockData);

      expect(report).toContain("### PoC実績");
      expect(report).toContain("$0.001");
      expect(report).toContain("$0.0015");
    });

    it("本格実装時の10,000記事のコスト推定が記載される", async () => {
      const mockData = createMockReportData();
      mockData.dataFetch.articleCount = 10;
      mockData.embedding.tokenCount = 50000;
      mockData.embedding.cost = 0.001;

      const report = await generateReport(mockData);

      expect(report).toContain("### 本格実装時（10,000記事）");
      // 10件 → 10,000件なので1000倍: $0.001 * 1000 = $1.00
      expect(report).toMatch(/初期Embedding生成.*\$1\.00/);
    });

    it("月間運用コスト概算が記載される", async () => {
      const mockData = createMockReportData();

      const report = await generateReport(mockData);

      expect(report).toContain("月間運用");
    });

    it("Supabase利用料が記載される", async () => {
      const mockData = createMockReportData();

      const report = await generateReport(mockData);

      expect(report).toContain("Supabase");
    });
  });

  describe("推奨事項", () => {
    it("Go/No-Go判定が明記される", async () => {
      const mockData = createMockReportData();

      const report = await generateReport(mockData);

      expect(report).toContain("### Go / No-Go 判定");
    });

    it("全検証成功時にGo判定が推奨される", async () => {
      const mockData: ReportData = {
        dataFetch: { success: true, articleCount: 10, avgContentLength: 5000 },
        embedding: {
          success: true,
          tokenCount: 50000,
          cost: 0.001,
          timeSeconds: 30,
        },
        tagging: { success: true, tokenCount: 10000, cost: 0.0015 },
        search: {
          vectorSearchSuccess: true,
          hybridSearchSuccess: true,
          searchTimeMs: 150,
        },
      };

      const report = await generateReport(mockData);

      expect(report).toContain("**Go**");
    });

    it("検証失敗項目がある場合にNo-Go判定が推奨される", async () => {
      const mockData: ReportData = {
        dataFetch: { success: false, articleCount: 0, avgContentLength: 0 },
        embedding: { success: false, tokenCount: 0, cost: 0, timeSeconds: 0 },
        tagging: { success: false, tokenCount: 0, cost: 0 },
        search: {
          vectorSearchSuccess: false,
          hybridSearchSuccess: false,
          searchTimeMs: 0,
        },
      };

      const report = await generateReport(mockData);

      expect(report).toContain("**No-Go**");
    });

    it("技術選定の変更が必要か記載される", async () => {
      const mockData = createMockReportData();

      const report = await generateReport(mockData);

      expect(report).toContain("技術選定");
    });

    it("優先的に対処すべき課題が記載される", async () => {
      const mockData = createMockReportData();

      const report = await generateReport(mockData);

      expect(report).toContain("課題");
    });

    it("次フェーズで検証すべき項目が記載される", async () => {
      const mockData = createMockReportData();

      const report = await generateReport(mockData);

      expect(report).toContain("次フェーズ");
    });
  });

  describe("エッジケース", () => {
    it("記事数0件でもレポートが生成される", async () => {
      const mockData: ReportData = {
        dataFetch: { success: true, articleCount: 0, avgContentLength: 0 },
        embedding: { success: true, tokenCount: 0, cost: 0, timeSeconds: 0 },
        tagging: { success: true, tokenCount: 0, cost: 0 },
        search: {
          vectorSearchSuccess: true,
          hybridSearchSuccess: true,
          searchTimeMs: 0,
        },
      };

      const report = await generateReport(mockData);

      expect(report).toContain("# SCP Recommend PoC 検証レポート");
      expect(report).toContain("0件");
    });

    it("部分成功時は条件付きGo判定となる", async () => {
      const mockData: ReportData = {
        dataFetch: { success: true, articleCount: 10, avgContentLength: 5000 },
        embedding: { success: true, tokenCount: 50000, cost: 0.001, timeSeconds: 30 },
        tagging: { success: true, tokenCount: 10000, cost: 0.0015 },
        search: {
          vectorSearchSuccess: true,
          hybridSearchSuccess: false, // Partial failure
          searchTimeMs: 150,
        },
      };

      const report = await generateReport(mockData);

      expect(report).toMatch(/条件付き.*Go|Go.*条件付き/);
    });
  });
});

describe("createMockReportData", () => {
  it("デフォルト値を持つモックを生成できる", () => {
    const mockData = createMockReportData();

    expect(mockData.dataFetch.success).toBe(true);
    expect(mockData.embedding.success).toBe(true);
    expect(mockData.tagging.success).toBe(true);
    expect(mockData.search.vectorSearchSuccess).toBe(true);
  });

  it("部分的に値を上書きできる", () => {
    const mockData = createMockReportData();
    mockData.dataFetch.articleCount = 20;

    expect(mockData.dataFetch.articleCount).toBe(20);
  });
});
