/**
 * タグ辞書マネージャー テスト
 * Subtask-003-03-02
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TagDictionaryManagerImpl, type TagCategory } from "./tag-dictionary-manager";

// モックSupabaseクライアント
const createMockSupabaseClient = () => {
  const mockEq = vi.fn();
  const mockSelect = vi.fn(() => ({
    eq: mockEq,
  }));
  const mockFrom = vi.fn(() => ({
    select: mockSelect,
  }));

  return {
    from: mockFrom,
    _mockSelect: mockSelect,
    _mockEq: mockEq,
    _mockFrom: mockFrom,
  };
};

// テストデータファクトリ
function createMockDbRow(
  category: TagCategory,
  canonicalValue: string,
  localizedValue: string,
  aliases: string[],
  id: number,
  isActive = true
) {
  return {
    id,
    category,
    canonical_value: canonicalValue,
    is_active: isActive,
    tag_localizations: [
      {
        lang: "en",
        localized_value: localizedValue,
        aliases,
      },
    ],
  };
}

function createFullDbData() {
  return [
    // object_class
    createMockDbRow("object_class", "SAFE", "Safe", ["safe", "Safe", "SAFE"], 1),
    createMockDbRow("object_class", "EUCLID", "Euclid", ["euclid", "Euclid", "EUCLID"], 2),
    createMockDbRow("object_class", "KETER", "Keter", ["keter", "Keter", "KETER"], 3),
    // genre
    createMockDbRow("genre", "HORROR", "Horror", ["horror", "Horror", "HORROR"], 10),
    createMockDbRow("genre", "SCI_FI", "Sci-Fi", ["sci-fi", "scifi", "SCI_FI"], 11),
    // theme
    createMockDbRow("theme", "COGNITION", "Cognition", ["cognition", "Cognition", "COGNITION"], 20),
    createMockDbRow(
      "theme",
      "MEMETIC",
      "Memetic",
      ["memetic", "Memetic", "MEMETIC", "infohazard"],
      21
    ),
    // format
    createMockDbRow("format", "STANDARD", "Standard", ["standard", "Standard", "STANDARD"], 30),
    createMockDbRow(
      "format",
      "INTERVIEW",
      "Interview",
      ["interview", "Interview", "INTERVIEW"],
      31
    ),
  ];
}

describe("TagDictionaryManager", () => {
  let mockClient: ReturnType<typeof createMockSupabaseClient>;
  let manager: TagDictionaryManagerImpl;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockClient = createMockSupabaseClient();
    manager = new TagDictionaryManagerImpl(mockClient as unknown as SupabaseClient);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getDictionary", () => {
    it("DBに辞書データが存在する場合、カテゴリごとにタグ一覧を取得する", async () => {
      // Arrange
      const dbData = createFullDbData();
      mockClient._mockEq.mockResolvedValue({ data: dbData, error: null });

      // Act
      const dictionary = await manager.getDictionary("en");

      // Assert
      expect(dictionary.object_class).toHaveLength(3);
      expect(dictionary.genre).toHaveLength(2);
      expect(dictionary.theme).toHaveLength(2);
      expect(dictionary.format).toHaveLength(2);
    });

    it("各タグにローカライズ値と同義語が含まれる", async () => {
      // Arrange
      const dbData = createFullDbData();
      mockClient._mockEq.mockResolvedValue({ data: dbData, error: null });

      // Act
      const dictionary = await manager.getDictionary("en");
      const safeTag = dictionary.object_class.find((t) => t.canonicalValue === "SAFE");

      // Assert
      expect(safeTag).toBeDefined();
      expect(safeTag?.localizedValue).toBe("Safe");
      expect(safeTag?.aliases).toContain("safe");
    });

    it("DBが空の場合、空の辞書を返す", async () => {
      // Arrange
      mockClient._mockEq.mockResolvedValue({ data: [], error: null });

      // Act
      const dictionary = await manager.getDictionary("en");

      // Assert
      expect(dictionary.object_class).toHaveLength(0);
      expect(dictionary.genre).toHaveLength(0);
      expect(dictionary.theme).toHaveLength(0);
      expect(dictionary.format).toHaveLength(0);
    });

    it("is_active=false のタグをフィルタリングする", async () => {
      // Arrange
      const dbData = [
        createMockDbRow("object_class", "SAFE", "Safe", [], 1, true),
        createMockDbRow("object_class", "DEPRECATED", "Deprecated", [], 2, false),
      ];
      mockClient._mockEq.mockResolvedValue({ data: dbData, error: null });

      // Act
      const dictionary = await manager.getDictionary("en");

      // Assert
      expect(dictionary.object_class).toHaveLength(1);
      expect(dictionary.object_class[0].canonicalValue).toBe("SAFE");
    });
  });

  describe("getDictionary - キャッシュ", () => {
    it("同一セッション内では再取得せずキャッシュを使用する", async () => {
      // Arrange
      const dbData = createFullDbData();
      mockClient._mockEq.mockResolvedValue({ data: dbData, error: null });

      // Act
      const dict1 = await manager.getDictionary("en");
      const dict2 = await manager.getDictionary("en");

      // Assert
      expect(mockClient._mockFrom).toHaveBeenCalledTimes(1); // 1回のみDB呼び出し
      expect(dict1).toBe(dict2); // 同一オブジェクト参照
    });

    it("キャッシュの有効期限は1時間である", async () => {
      // Arrange
      const dbData = createFullDbData();
      mockClient._mockEq.mockResolvedValue({ data: dbData, error: null });

      // Act
      const dict1 = await manager.getDictionary("en");

      // 59分経過（キャッシュ有効）
      vi.advanceTimersByTime(59 * 60 * 1000);
      const dict2 = await manager.getDictionary("en");

      // 追加2分経過（61分、キャッシュ無効）
      vi.advanceTimersByTime(2 * 60 * 1000);
      const dict3 = await manager.getDictionary("en");

      // Assert
      expect(mockClient._mockFrom).toHaveBeenCalledTimes(2); // 2回DB呼び出し
      expect(dict1).toBe(dict2); // 59分後は同一
      expect(dict1).not.toBe(dict3); // 61分後は異なる
    });

    it("clearCache()でキャッシュをクリアできる", async () => {
      // Arrange
      const dbData = createFullDbData();
      mockClient._mockEq.mockResolvedValue({ data: dbData, error: null });

      // Act
      await manager.getDictionary("en");
      manager.clearCache();
      await manager.getDictionary("en");

      // Assert
      expect(mockClient._mockFrom).toHaveBeenCalledTimes(2);
    });

    it("異なる言語で別々にキャッシュされる", async () => {
      // Arrange
      const dbData = createFullDbData();
      mockClient._mockEq.mockResolvedValue({ data: dbData, error: null });

      // Act
      await manager.getDictionary("en");
      await manager.getDictionary("ja");
      await manager.getDictionary("en"); // キャッシュヒット

      // Assert
      expect(mockClient._mockFrom).toHaveBeenCalledTimes(2); // en, ja の2回
    });
  });

  describe("normalize", () => {
    it("辞書の同義語にマッチする場合、正規値に変換される", async () => {
      // Arrange
      const dbData = createFullDbData();
      mockClient._mockEq.mockResolvedValue({ data: dbData, error: null });

      // Act
      const result = await manager.normalize("object_class", "safe", "en");

      // Assert
      expect(result).toBe("SAFE");
    });

    it("ローカライズ値でもマッチする", async () => {
      // Arrange
      const dbData = createFullDbData();
      mockClient._mockEq.mockResolvedValue({ data: dbData, error: null });

      // Act
      const result = await manager.normalize("object_class", "Safe", "en");

      // Assert
      expect(result).toBe("SAFE");
    });

    it("大文字小文字が異なる入力を正規化できる", async () => {
      // Arrange
      const dbData = createFullDbData();
      mockClient._mockEq.mockResolvedValue({ data: dbData, error: null });

      // Act
      const inputs = ["euclid", "Euclid", "EUCLID"];
      const results = await Promise.all(
        inputs.map((input) => manager.normalize("object_class", input, "en"))
      );

      // Assert
      results.forEach((result) => {
        expect(result).toBe("EUCLID");
      });
    });

    it("辞書にないタグはnullを返す", async () => {
      // Arrange
      const dbData = createFullDbData();
      mockClient._mockEq.mockResolvedValue({ data: dbData, error: null });

      // Act
      const result = await manager.normalize("object_class", "UnknownClass", "en");

      // Assert
      expect(result).toBeNull();
    });

    it("辞書にないタグで警告ログを出力する", async () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(vi.fn());
      const dbData = createFullDbData();
      mockClient._mockEq.mockResolvedValue({ data: dbData, error: null });

      // Act
      await manager.normalize("genre", "fantasy", "en");

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("未知のタグ"));

      consoleSpy.mockRestore();
    });

    it("前後の空白をトリムしてからマッチング", async () => {
      // Arrange
      const dbData = createFullDbData();
      mockClient._mockEq.mockResolvedValue({ data: dbData, error: null });

      // Act
      const result = await manager.normalize("object_class", "  safe  ", "en");

      // Assert
      expect(result).toBe("SAFE");
    });

    it("空値（空文字）でnullを返す", async () => {
      // Arrange
      const dbData = createFullDbData();
      mockClient._mockEq.mockResolvedValue({ data: dbData, error: null });

      // Act
      const result = await manager.normalize("object_class", "", "en");

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("generatePromptChoices", () => {
    it("各カテゴリのタグ選択肢を動的に生成する", async () => {
      // Arrange
      const dbData = createFullDbData();
      mockClient._mockEq.mockResolvedValue({ data: dbData, error: null });

      // Act
      const prompt = await manager.generatePromptChoices("en");

      // Assert
      expect(prompt).toContain("object_class");
      expect(prompt).toContain("Safe");
      expect(prompt).toContain("Euclid");
      expect(prompt).toContain("Keter");
      expect(prompt).toContain("genre");
      expect(prompt).toContain("Horror");
    });

    it("プロンプトがJSON形式のスキーマを含む", async () => {
      // Arrange
      const dbData = createFullDbData();
      mockClient._mockEq.mockResolvedValue({ data: dbData, error: null });

      // Act
      const prompt = await manager.generatePromptChoices("en");

      // Assert
      expect(prompt).toMatch(/object_class.*genre.*theme.*format/s);
    });

    it("英語を指定すると英語のローカライズ値を使用する", async () => {
      // Arrange
      const dbData = createFullDbData();
      mockClient._mockEq.mockResolvedValue({ data: dbData, error: null });

      // Act
      const prompt = await manager.generatePromptChoices("en");

      // Assert
      expect(prompt).toContain("Safe");
    });

    it("空の辞書でプロンプト生成、空の選択肢を返す", async () => {
      // Arrange
      mockClient._mockEq.mockResolvedValue({ data: [], error: null });

      // Act
      const prompt = await manager.generatePromptChoices("en");

      // Assert
      expect(prompt).toContain("object_class");
      expect(prompt).toContain("(no options)");
    });
  });

  describe("DB接続エラー", () => {
    it("DB接続失敗時にエラーをスロー", async () => {
      // Arrange
      mockClient._mockEq.mockResolvedValue({
        data: null,
        error: { message: "Connection failed" },
      });

      // Act & Assert
      await expect(manager.getDictionary("en")).rejects.toThrow("Connection failed");
    });
  });
});
