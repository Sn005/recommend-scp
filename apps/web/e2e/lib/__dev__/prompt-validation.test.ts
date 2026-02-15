import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";

describe("gen-testcases.md プロンプト検証", () => {
  let promptContent: string;
  const promptPath = path.resolve(__dirname, "../../../../../.ai/prompts/gen-testcases.md");

  beforeAll(async () => {
    promptContent = await fs.readFile(promptPath, "utf-8");
  });

  describe("AC1: CSV形式のテストケース出力", () => {
    it("CSV形式での出力指示が含まれている", () => {
      expect(promptContent).toMatch(/CSV形式で出力/);
    });

    it("CSVスキーマが定義されている", () => {
      expect(promptContent).toMatch(/id,name,steps,expected,tags,result/);
    });

    it("CSV出力例が含まれている", () => {
      expect(promptContent).toMatch(/```csv/);
    });
  });

  describe("AC2: AC（EARS記法）からのテストケース生成", () => {
    it("EARS記法の解釈ルールが含まれている", () => {
      expect(promptContent).toMatch(/WHEN/);
      expect(promptContent).toMatch(/GIVEN/);
      expect(promptContent).toMatch(/THEN/);
    });

    it("各ACに対するテストケース生成ルールが明記されている", () => {
      expect(promptContent).toMatch(/各ACに対して.*少なくとも1つ/);
    });

    it("入出力例にACからテストケースへの変換が含まれている", () => {
      expect(promptContent).toMatch(/受け入れ条件/);
    });
  });

  describe("AC3: シナリオベースでのユーザーフロー網羅", () => {
    it("シナリオベースの生成ルールが含まれている", () => {
      expect(promptContent).toMatch(/シナリオベース|ユーザーフロー/);
    });

    it("正常系フロー優先が明記されている", () => {
      expect(promptContent).toMatch(/正常系.*優先/);
    });

    it("data-testid命名規則が含まれている", () => {
      expect(promptContent).toMatch(/kebab-case/);
    });
  });

  describe("AC4: StepAction型準拠のJSON配列出力", () => {
    const requiredActions = [
      "goto",
      "click",
      "fill",
      "waitFor",
      "assertVisible",
      "assertText",
      "assertUrl",
    ];

    for (const action of requiredActions) {
      it(`${action}アクションの定義が含まれている`, () => {
        expect(promptContent).toMatch(new RegExp(`"action":\\s*"${action}"`));
      });
    }

    it("JSON配列形式のサンプルがある", () => {
      expect(promptContent).toMatch(/\[[\s\S]*\{[\s\S]*"action"[\s\S]*\}[\s\S]*\]/);
    });
  });

  describe("エッジケース対応", () => {
    it("ID生成ルールが記載されている", () => {
      expect(promptContent).toMatch(/TC-\{epic\}-\{story\}-\{連番\}/);
    });

    it("タグ付けルール（critical/edge）が明記されている", () => {
      expect(promptContent).toMatch(/critical/);
      expect(promptContent).toMatch(/edge/);
    });
  });

  describe("メタ検証", () => {
    it("プロンプトファイルが存在する", async () => {
      await expect(fs.access(promptPath)).resolves.toBeUndefined();
    });

    it("入出力例セクションが存在する", () => {
      expect(promptContent).toMatch(/入出力例/);
    });

    it("生成ルールセクションが存在する", () => {
      expect(promptContent).toMatch(/生成ルール/);
    });

    it("出力形式セクションが存在する", () => {
      expect(promptContent).toMatch(/出力形式/);
    });

    it("StepAction型定義セクションが存在する", () => {
      expect(promptContent).toMatch(/StepAction/);
    });
  });
});
