/**
 * Starter Packs Tests
 * TDD: Red -> Green -> Refactor
 * @see specs/004-recommend/004-03-onboarding/004-03-01.md
 */

import { describe, it, expect } from "vitest";
import { getStarterPackList, getStarterPack, STARTER_PACK_TYPES } from "./starter-packs";
import type { StarterPackDefinition } from "./types";

describe("スターターパック", () => {
  describe("getStarterPackList", () => {
    it("5種類のパックを返す（JPは除外）", () => {
      const packs = getStarterPackList();

      // JP記事はDBに未登録のため一時的に除外
      expect(packs).toHaveLength(5);
    });

    it("各パックにdisplayName, description, primaryTags, seedArticlesが含まれる", () => {
      const packs = getStarterPackList();

      packs.forEach((pack: StarterPackDefinition) => {
        expect(pack).toHaveProperty("type");
        expect(pack).toHaveProperty("displayName");
        expect(pack).toHaveProperty("description");
        expect(pack).toHaveProperty("primaryTags");
        expect(pack).toHaveProperty("seedArticles");

        expect(typeof pack.displayName).toBe("string");
        expect(typeof pack.description).toBe("string");
        expect(Array.isArray(pack.primaryTags)).toBe(true);
        expect(Array.isArray(pack.seedArticles)).toBe(true);
        expect(pack.primaryTags.length).toBeGreaterThan(0);
        expect(pack.seedArticles.length).toBeGreaterThan(0);
      });
    });

    it("classic, horror, scifi, heartwarming, mysteryの5種類が含まれる（JPは除外）", () => {
      const packs = getStarterPackList();
      const types = packs.map((pack) => pack.type);

      expect(types).toContain("classic");
      expect(types).toContain("horror");
      expect(types).toContain("scifi");
      expect(types).toContain("heartwarming");
      expect(types).toContain("mystery");
      // JP記事はDBに未登録のため一時的に除外
      expect(types).not.toContain("jp");
    });
  });

  describe("getStarterPack", () => {
    it("存在するパックタイプでパック定義を返す", () => {
      const pack = getStarterPack("horror");

      expect(pack).not.toBeNull();
      expect(pack?.type).toBe("horror");
      expect(pack?.displayName).toBe("ホラー・恐怖");
    });

    it("customタイプでnullを返す", () => {
      const pack = getStarterPack("custom");

      expect(pack).toBeNull();
    });

    it("存在しないパックタイプでnullを返す", () => {
      // @ts-expect-error - 意図的に無効な値をテスト
      const pack = getStarterPack("invalid-type");

      expect(pack).toBeNull();
    });
  });

  describe("STARTER_PACK_TYPES", () => {
    it("6種類のパックタイプ + customが定義されている", () => {
      expect(STARTER_PACK_TYPES).toContain("classic");
      expect(STARTER_PACK_TYPES).toContain("horror");
      expect(STARTER_PACK_TYPES).toContain("scifi");
      expect(STARTER_PACK_TYPES).toContain("heartwarming");
      expect(STARTER_PACK_TYPES).toContain("mystery");
      expect(STARTER_PACK_TYPES).toContain("jp");
      expect(STARTER_PACK_TYPES).toContain("custom");
      expect(STARTER_PACK_TYPES).toHaveLength(7);
    });
  });
});
