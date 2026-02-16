import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, beforeAll } from "vitest";
import { parse } from "yaml";

interface WorkflowStep {
  name?: string;
  uses?: string;
  run?: string;
  if?: string;
  with?: Record<string, unknown>;
  "continue-on-error"?: boolean;
}

interface WorkflowJob {
  name: string;
  "runs-on": string;
  needs?: string;
  steps: WorkflowStep[];
}

interface WorkflowConfig {
  name: string;
  on: Record<string, unknown>;
  jobs: Record<string, WorkflowJob>;
}

function findStep(steps: WorkflowStep[], keyword: string): WorkflowStep | undefined {
  return steps.find((s) => s.name?.includes(keyword));
}

describe("GitHub Actions CI設定 - E2Eジョブ", () => {
  let config: WorkflowConfig;

  beforeAll(() => {
    const yamlPath = resolve(__dirname, "../../../../.github/workflows/ci.yml");
    const content = readFileSync(yamlPath, "utf-8");
    config = parse(content) as WorkflowConfig;
  });

  it("ci.ymlが有効なYAMLとしてパースできる", () => {
    expect(config).toBeDefined();
    expect(config.jobs).toBeDefined();
  });

  it("e2eジョブが定義されている", () => {
    expect(config.jobs.e2e).toBeDefined();
    expect(config.jobs.e2e.name).toBe("E2E Tests");
  });

  it("ユニットテスト完了後にE2Eが実行される", () => {
    expect(config.jobs.e2e.needs).toBe("ci");
  });

  it("Playwrightブラウザのインストールステップがある", () => {
    const installStep = findStep(config.jobs.e2e.steps, "Install Playwright");
    expect(installStep).toBeDefined();
    expect(installStep?.run).toContain("chromium");
  });

  it("正常系テスト（@critical）が分離実行される", () => {
    const criticalStep = findStep(config.jobs.e2e.steps, "Critical E2E");
    expect(criticalStep).toBeDefined();
    expect(criticalStep?.run).toContain("--grep @critical");
  });

  it("正常系テスト失敗はジョブ全体を失敗させる（continue-on-errorなし）", () => {
    const criticalStep = findStep(config.jobs.e2e.steps, "Critical E2E");
    expect(criticalStep?.["continue-on-error"]).toBeUndefined();
  });

  it("非正常系テスト（非critical）が分離実行される", () => {
    const nonCriticalStep = findStep(config.jobs.e2e.steps, "Non-Critical");
    expect(nonCriticalStep).toBeDefined();
    expect(nonCriticalStep?.run).toContain("--grep-invert @critical");
  });

  it("非正常系テスト失敗はジョブを失敗させない", () => {
    const nonCriticalStep = findStep(config.jobs.e2e.steps, "Non-Critical");
    expect(nonCriticalStep?.["continue-on-error"]).toBe(true);
  });

  it("テスト結果レポートがアーティファクトとして保存される", () => {
    const uploadStep = findStep(config.jobs.e2e.steps, "Upload");
    expect(uploadStep).toBeDefined();
    expect(uploadStep?.uses).toContain("actions/upload-artifact");
    expect(uploadStep?.with?.name).toBe("playwright-report");
  });

  it("テスト失敗時もレポートが保存される", () => {
    const uploadStep = findStep(config.jobs.e2e.steps, "Upload");
    expect(uploadStep?.if).toBe("always() && steps.e2e_target.outputs.skip != 'true'");
  });

  it("レポート保持期間が7日に設定されている", () => {
    const uploadStep = findStep(config.jobs.e2e.steps, "Upload");
    expect(uploadStep?.with?.["retention-days"]).toBe(7);
  });
});
