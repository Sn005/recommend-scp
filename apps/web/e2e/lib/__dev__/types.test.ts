import { describe, it, expect } from "vitest";
import type { TestCase, StepAction } from "../types";

describe("TestCase型定義", () => {
  it("すべての必須カラムを含むTestCaseオブジェクトが作成できる", () => {
    const testCase: TestCase = {
      id: "TC-006-01-001",
      name: "オンボーディング完了フロー",
      steps: [
        { action: "goto", url: "/onboarding" },
        { action: "click", testId: "pack-horror" },
      ],
      expected: "推薦画面に遷移する",
      tags: ["critical"],
    };

    expect(testCase.id).toBe("TC-006-01-001");
    expect(testCase.name).toBe("オンボーディング完了フロー");
    expect(testCase.steps).toHaveLength(2);
    expect(testCase.expected).toBe("推薦画面に遷移する");
    expect(testCase.tags).toEqual(["critical"]);
  });

  it("オプションカラム（result）なしでもTestCaseオブジェクトが作成できる", () => {
    const testCase: TestCase = {
      id: "TC-006-01-001",
      name: "テスト",
      steps: [],
      expected: "成功",
      tags: [],
    };

    expect(testCase.result).toBeUndefined();
  });

  it("resultカラムにpass/fail/skipを設定できる", () => {
    const results: TestCase["result"][] = ["pass", "fail", "skip"];

    for (const result of results) {
      const testCase: TestCase = {
        id: "TC-006-01-001",
        name: "テスト",
        steps: [],
        expected: "成功",
        tags: [],
        result,
      };
      expect(testCase.result).toBe(result);
    }
  });
});

describe("テストケースID命名規則", () => {
  it("TC-{epic}-{story}-{連番}形式のIDが有効である", () => {
    const idPattern = /^TC-\d{3}-\d{2}-\d{3}$/;
    const validIds = ["TC-006-01-001", "TC-011-02-999", "TC-999-99-001"];

    for (const id of validIds) {
      expect(id).toMatch(idPattern);
    }
  });
});

describe("StepAction型定義", () => {
  it("gotoアクションが定義されている", () => {
    const action: StepAction = { action: "goto", url: "/onboarding" };
    expect(action.action).toBe("goto");
  });

  it("clickアクションが定義されている", () => {
    const action: StepAction = { action: "click", testId: "pack-horror" };
    expect(action.action).toBe("click");
  });

  it("fillアクションが定義されている", () => {
    const action: StepAction = {
      action: "fill",
      testId: "input-field",
      value: "テスト値",
    };
    expect(action.action).toBe("fill");
  });

  it("waitForアクションが定義されている", () => {
    const action: StepAction = {
      action: "waitFor",
      testId: "article-card",
      timeout: 5000,
    };
    expect(action.action).toBe("waitFor");
    expect(action.timeout).toBe(5000);
  });

  it("waitForアクションのtimeoutはオプションである", () => {
    const action: StepAction = {
      action: "waitFor",
      testId: "article-card",
    };
    expect(action.timeout).toBeUndefined();
  });

  it("assertVisibleアクションが定義されている", () => {
    const action: StepAction = {
      action: "assertVisible",
      testId: "success-message",
    };
    expect(action.action).toBe("assertVisible");
  });

  it("assertTextアクションが定義されている", () => {
    const action: StepAction = {
      action: "assertText",
      testId: "title",
      text: "期待されるテキスト",
    };
    expect(action.action).toBe("assertText");
  });

  it("assertUrlアクションが定義されている", () => {
    const action: StepAction = {
      action: "assertUrl",
      pattern: "/recommend",
    };
    expect(action.action).toBe("assertUrl");
  });

  it("複数の異なるStepActionが配列で混在できる", () => {
    const steps: StepAction[] = [
      { action: "goto", url: "/onboarding" },
      { action: "click", testId: "pack-horror" },
      { action: "fill", testId: "input", value: "test" },
      { action: "waitFor", testId: "result" },
      { action: "assertVisible", testId: "success" },
      { action: "assertText", testId: "title", text: "完了" },
      { action: "assertUrl", pattern: "/recommend" },
    ];
    expect(steps).toHaveLength(7);
  });
});

describe("型制約の検証（@ts-expect-error）", () => {
  it("必須カラム欠落はコンパイルエラーになる", () => {
    // @ts-expect-error id が必須のためエラー
    const noId: TestCase = {
      name: "テスト",
      steps: [],
      expected: "成功",
      tags: [],
    };
    expect(noId).toBeDefined();

    // @ts-expect-error steps が必須のためエラー
    const noSteps: TestCase = {
      id: "TC-006-01-001",
      name: "テスト",
      expected: "成功",
      tags: [],
    };
    expect(noSteps).toBeDefined();
  });

  it("不正なresult値はコンパイルエラーになる", () => {
    const invalidResult = "invalid" as const;
    // @ts-expect-error result は 'pass' | 'fail' | 'skip' のみ
    const testCase: TestCase = {
      id: "TC-006-01-001",
      name: "テスト",
      steps: [],
      expected: "成功",
      tags: [],
      result: invalidResult,
    };
    expect(testCase).toBeDefined();
  });

  it("未定義のactionはコンパイルエラーになる", () => {
    // @ts-expect-error actionは定義済みの値のみ
    const invalidAction: StepAction = { action: "unknown" };
    expect(invalidAction).toBeDefined();
  });

  it("gotoにはurlが必須である", () => {
    // @ts-expect-error gotoにはurlが必須
    const gotoNoUrl: StepAction = { action: "goto" };
    expect(gotoNoUrl).toBeDefined();
  });

  it("fillにはvalueが必須である", () => {
    // @ts-expect-error fillにはvalueが必須
    const fillNoValue: StepAction = {
      action: "fill",
      testId: "input",
    };
    expect(fillNoValue).toBeDefined();
  });
});
