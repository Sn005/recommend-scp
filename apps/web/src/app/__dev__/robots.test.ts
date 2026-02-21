import type { MetadataRoute } from "next";
import robots from "../robots";

interface RobotsRule {
  userAgent?: string | string[];
  allow?: string | string[];
  disallow?: string | string[];
  crawlDelay?: number;
}

/** rules を配列として取得するヘルパー */
function getRulesArray(rules: MetadataRoute.Robots["rules"]): RobotsRule[] {
  return Array.isArray(rules) ? rules : [rules];
}

function findRule(rules: RobotsRule[], agent: string): RobotsRule | undefined {
  return rules.find((rule) => !Array.isArray(rule.userAgent) && rule.userAgent === agent);
}

describe("robots.ts", () => {
  it("デフォルトのユーザーエージェントに / を許可している", () => {
    const result = robots();
    const rules = getRulesArray(result.rules);
    const defaultRule = findRule(rules, "*");
    expect(defaultRule).toBeDefined();
    expect(defaultRule?.allow).toContain("/");
  });

  it("/api/ をクロール対象外にしている", () => {
    const result = robots();
    const rules = getRulesArray(result.rules);
    const defaultRule = findRule(rules, "*");
    expect(defaultRule?.disallow).toContain("/api/");
  });

  it("/onboarding をクロール対象外にしている", () => {
    const result = robots();
    const rules = getRulesArray(result.rules);
    const defaultRule = findRule(rules, "*");
    expect(defaultRule?.disallow).toContain("/onboarding");
  });

  it("AI学習クローラー（GPTBot）をブロックしている", () => {
    const result = robots();
    const rules = getRulesArray(result.rules);
    const gptRule = findRule(rules, "GPTBot");
    expect(gptRule).toBeDefined();
    expect(gptRule?.disallow).toBe("/");
  });

  it("AI学習クローラー（CCBot）をブロックしている", () => {
    const result = robots();
    const rules = getRulesArray(result.rules);
    const ccRule = findRule(rules, "CCBot");
    expect(ccRule).toBeDefined();
    expect(ccRule?.disallow).toBe("/");
  });

  it("sitemap URLが含まれている", () => {
    const result = robots();
    expect(result.sitemap).toContain("/sitemap.xml");
  });
});
