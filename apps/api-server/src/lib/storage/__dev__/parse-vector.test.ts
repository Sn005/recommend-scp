/**
 * @file parseVectorField テスト
 * @description pgvectorフィールドのパースユーティリティのテスト
 */

import { describe, it, expect } from "vitest";
import { parseVectorField } from "../parse-vector";

describe("parseVectorField", () => {
  describe("正常系", () => {
    it("number[]をそのまま返す", () => {
      const input = [0.1, 0.2, 0.3];
      const result = parseVectorField(input);
      expect(result).toEqual([0.1, 0.2, 0.3]);
    });

    it("pgvectorの文字列表現をパースしてnumber[]を返す", () => {
      const input = "[0.1,0.2,0.3]";
      const result = parseVectorField(input);
      expect(result).toEqual([0.1, 0.2, 0.3]);
    });

    it("負の値を含む文字列表現を正しくパースする", () => {
      const input = "[0.012,-0.034,0.056]";
      const result = parseVectorField(input);
      expect(result).toEqual([0.012, -0.034, 0.056]);
    });

    it("1536次元のベクトル文字列をパースできる", () => {
      const vector = Array.from({ length: 1536 }, (_, i) => i * 0.001);
      const input = JSON.stringify(vector);
      const result = parseVectorField(input);
      expect(result).toHaveLength(1536);
      expect(result?.[0]).toBeCloseTo(0);
      expect(result?.[1535]).toBeCloseTo(1.535);
    });
  });

  describe("null/undefined", () => {
    it("nullの場合はnullを返す", () => {
      expect(parseVectorField(null)).toBeNull();
    });

    it("undefinedの場合はnullを返す", () => {
      expect(parseVectorField(undefined)).toBeNull();
    });
  });

  describe("エッジケース", () => {
    it("空配列はそのまま返す", () => {
      expect(parseVectorField([])).toEqual([]);
    });

    it("空文字列の場合はnullを返す", () => {
      expect(parseVectorField("")).toBeNull();
    });

    it("不正なJSON文字列の場合はnullを返す", () => {
      expect(parseVectorField("not-json")).toBeNull();
    });

    it("JSON文字列だが配列でない場合はnullを返す", () => {
      expect(parseVectorField('{"key": "value"}')).toBeNull();
    });

    it("数値の場合はnullを返す", () => {
      expect(parseVectorField(42)).toBeNull();
    });
  });
});
