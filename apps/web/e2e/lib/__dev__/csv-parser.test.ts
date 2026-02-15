import { describe, it, expect, afterEach } from "vitest";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
import { parseTestCaseCsv } from "../csv-parser";

const tempFiles: string[] = [];

function createTempCsv(name: string, content: string): string {
  const filePath = join(__dirname, `temp-${name}.csv`);
  writeFileSync(filePath, content, "utf-8");
  tempFiles.push(filePath);
  return filePath;
}

afterEach(() => {
  for (const file of tempFiles) {
    if (existsSync(file)) unlinkSync(file);
  }
  tempFiles.length = 0;
});

describe("parseTestCaseCsv", () => {
  describe("正常系", () => {
    it("有効なCSVをパースしてTestCase[]が返る", () => {
      const csv = createTempCsv(
        "valid",
        `id,name,steps,expected,tags,result
TC-006-01-001,オンボーディング完了フロー,"[{""action"":""goto"",""url"":""/onboarding""}]",推薦画面に遷移する,critical,`
      );

      const result = parseTestCaseCsv(csv);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("TC-006-01-001");
      expect(result[0].name).toBe("オンボーディング完了フロー");
      expect(result[0].expected).toBe("推薦画面に遷移する");
    });

    it("複数行のCSVを正しくパースする", () => {
      const csv = createTempCsv(
        "multi",
        `id,name,steps,expected,tags,result
TC-006-01-001,テスト1,"[]",結果1,critical,
TC-006-02-001,テスト2,"[]",結果2,edge,`
      );

      const result = parseTestCaseCsv(csv);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("TC-006-01-001");
      expect(result[1].id).toBe("TC-006-02-001");
    });

    it("ヘッダーのみのCSVは空配列を返す", () => {
      const csv = createTempCsv("header-only", `id,name,steps,expected,tags,result\n`);

      const result = parseTestCaseCsv(csv);

      expect(result).toEqual([]);
    });
  });

  describe("steps列のパース", () => {
    it("steps列のJSONが正しくパースされる", () => {
      const csv = createTempCsv(
        "steps",
        `id,name,steps,expected,tags,result
TC-006-01-001,テスト,"[{""action"":""goto"",""url"":""/onboarding""},{""action"":""click"",""testId"":""btn""}]",結果,critical,`
      );

      const result = parseTestCaseCsv(csv);

      expect(result[0].steps).toHaveLength(2);
      expect(result[0].steps[0]).toEqual({
        action: "goto",
        url: "/onboarding",
      });
      expect(result[0].steps[1]).toEqual({ action: "click", testId: "btn" });
    });

    it("空のsteps配列を正しくパースする", () => {
      const csv = createTempCsv(
        "empty-steps",
        `id,name,steps,expected,tags,result
TC-006-01-001,テスト,"[]",結果,critical,`
      );

      const result = parseTestCaseCsv(csv);

      expect(result[0].steps).toEqual([]);
    });
  });

  describe("tags列のパース", () => {
    it("tags列がstring[]に変換される", () => {
      const csv = createTempCsv(
        "tags",
        `id,name,steps,expected,tags,result
TC-006-01-001,テスト,"[]",結果,"critical,edge",`
      );

      const result = parseTestCaseCsv(csv);

      expect(result[0].tags).toEqual(["critical", "edge"]);
    });

    it("空のtags列が空配列になる", () => {
      const csv = createTempCsv(
        "empty-tags",
        `id,name,steps,expected,tags,result
TC-006-01-001,テスト,"[]",結果,,`
      );

      const result = parseTestCaseCsv(csv);

      expect(result[0].tags).toEqual([]);
    });

    it("タグの前後の空白がトリムされる", () => {
      const csv = createTempCsv(
        "tags-trim",
        `id,name,steps,expected,tags,result
TC-006-01-001,テスト,"[]",結果," critical , edge ",`
      );

      const result = parseTestCaseCsv(csv);

      expect(result[0].tags).toEqual(["critical", "edge"]);
    });
  });

  describe("エラーハンドリング", () => {
    it("不正なJSONでエラーがスローされる", () => {
      const csv = createTempCsv(
        "invalid-json",
        `id,name,steps,expected,tags,result
TC-006-01-001,テスト,"{broken json}",結果,critical,`
      );

      expect(() => parseTestCaseCsv(csv)).toThrow();
    });

    it("存在しないファイルでエラーがスローされる", () => {
      expect(() => parseTestCaseCsv("/nonexistent/path/file.csv")).toThrow();
    });

    it("エラーメッセージに行情報が含まれる", () => {
      const csv = createTempCsv(
        "error-msg",
        `id,name,steps,expected,tags,result
TC-006-01-001,テスト正常,"[]",結果,critical,
TC-006-01-002,テスト不正,"{invalid}",結果,edge,`
      );

      expect(() => parseTestCaseCsv(csv)).toThrow(/行.*3|row.*3|TC-006-01-002/i);
    });
  });

  describe("result列", () => {
    it("result列にpass/fail/skipが設定できる", () => {
      const csv = createTempCsv(
        "result",
        `id,name,steps,expected,tags,result
TC-006-01-001,テスト1,"[]",結果1,critical,pass
TC-006-01-002,テスト2,"[]",結果2,edge,fail
TC-006-01-003,テスト3,"[]",結果3,,skip`
      );

      const result = parseTestCaseCsv(csv);

      expect(result[0].result).toBe("pass");
      expect(result[1].result).toBe("fail");
      expect(result[2].result).toBe("skip");
    });

    it("空のresult列はundefinedになる", () => {
      const csv = createTempCsv(
        "empty-result",
        `id,name,steps,expected,tags,result
TC-006-01-001,テスト,"[]",結果,critical,`
      );

      const result = parseTestCaseCsv(csv);

      expect(result[0].result).toBeUndefined();
    });
  });
});
