/**
 * @file 履歴ストレージのテスト
 * @see specs/010-ja-article-display/010-04-history-excerpt/010-04-01.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

import { getHistory, addHistory, removeHistory, clearHistory } from "../_lib/historyStorage";
import type { HistoryEntry, ObjectClass } from "../_types";

// LocalStorageのモック
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      Reflect.deleteProperty(store, key);
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("historyStorage", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("AC-1: HistoryEntry に excerpt フィールドが存在する", () => {
    it("HistoryEntry型にexcerptフィールドが存在する", () => {
      const entry: HistoryEntry = {
        scpNumber: "SCP-173",
        title: "彫刻 - オリジナル",
        excerpt: "アイテム番号: SCP-173",
        objectClass: "Euclid",
        viewedAt: new Date().toISOString(),
      };

      expect(entry.excerpt).toBe("アイテム番号: SCP-173");
      expect(typeof entry.excerpt).toBe("string");
    });
  });

  describe("AC-2: addHistory で excerpt が保存される", () => {
    it("excerptが含まれるエントリを保存できる", () => {
      const entry = {
        scpNumber: "SCP-173",
        title: "彫刻 - オリジナル",
        excerpt: "アイテム番号: SCP-173",
        objectClass: "Euclid" as ObjectClass,
      };

      const result = addHistory(entry);

      expect(result.excerpt).toBe("アイテム番号: SCP-173");
      expect(localStorageMock.setItem).toHaveBeenCalled();

      const saved = getHistory();
      expect(saved[0].excerpt).toBe("アイテム番号: SCP-173");
    });
  });

  describe("AC-3: 後方互換性（excerptなしでもエラーにならない）", () => {
    it("既存データ（excerpt なし）でもエラーにならない", () => {
      // 古い形式のデータ（excerptなし）をLocalStorageにセット
      const oldData = [
        {
          scpNumber: "SCP-173",
          title: "彫刻 - オリジナル",
          objectClass: "Euclid",
          viewedAt: "2024-01-01T00:00:00.000Z",
        },
      ];
      localStorageMock.setItem("scp-history", JSON.stringify(oldData));

      const history = getHistory();

      expect(history.length).toBe(1);
      expect(history[0].excerpt).toBe(""); // デフォルト値として空文字列
      expect(history[0].scpNumber).toBe("SCP-173");
    });

    it("getHistoryでexcerptがundefinedのデータを読み込むと空文字列になる", () => {
      // 古い形式のデータ（excerptがundefined）をLocalStorageにセット
      const oldData = [
        {
          scpNumber: "SCP-999",
          title: "くすぐりモンスター",
          excerpt: undefined, // 明示的にundefined
          objectClass: "Safe",
          viewedAt: "2024-01-01T00:00:00.000Z",
        },
      ];
      localStorageMock.setItem("scp-history", JSON.stringify(oldData));

      const history = getHistory();

      expect(history.length).toBe(1);
      expect(history[0].excerpt).toBe(""); // デフォルト値として空文字列
    });
  });

  describe("getHistory", () => {
    it("履歴がない場合は空配列を返す", () => {
      const history = getHistory();
      expect(history).toEqual([]);
    });

    it("保存した履歴を取得できる", () => {
      const entry1 = {
        scpNumber: "SCP-173",
        title: "彫刻 - オリジナル",
        excerpt: "アイテム番号: SCP-173",
        objectClass: "Euclid" as ObjectClass,
      };
      const entry2 = {
        scpNumber: "SCP-999",
        title: "くすぐりモンスター",
        excerpt: "アイテム番号: SCP-999",
        objectClass: "Safe" as ObjectClass,
      };

      addHistory(entry1);
      addHistory(entry2);

      const history = getHistory();
      expect(history.length).toBe(2);
      // 新しい順
      expect(history[0].scpNumber).toBe("SCP-999");
      expect(history[1].scpNumber).toBe("SCP-173");
    });
  });

  describe("addHistory", () => {
    it("同じSCP番号の場合は古いエントリを削除する", () => {
      const entry1 = {
        scpNumber: "SCP-173",
        title: "彫刻 - オリジナル",
        excerpt: "古いexcerpt",
        objectClass: "Euclid" as ObjectClass,
      };
      const entry2 = {
        scpNumber: "SCP-173",
        title: "彫刻 - オリジナル（更新）",
        excerpt: "新しいexcerpt",
        objectClass: "Euclid" as ObjectClass,
      };

      addHistory(entry1);
      addHistory(entry2);

      const history = getHistory();
      expect(history.length).toBe(1);
      expect(history[0].title).toBe("彫刻 - オリジナル（更新）");
      expect(history[0].excerpt).toBe("新しいexcerpt");
    });

    it("viewedAtが自動設定される", () => {
      const entry = {
        scpNumber: "SCP-173",
        title: "彫刻 - オリジナル",
        excerpt: "アイテム番号: SCP-173",
        objectClass: "Euclid" as ObjectClass,
      };

      const result = addHistory(entry);

      expect(result.viewedAt).toBeDefined();
      expect(new Date(result.viewedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("removeHistory", () => {
    it("指定したSCP番号の履歴を削除できる", () => {
      const entry1 = {
        scpNumber: "SCP-173",
        title: "彫刻 - オリジナル",
        excerpt: "アイテム番号: SCP-173",
        objectClass: "Euclid" as ObjectClass,
      };
      const entry2 = {
        scpNumber: "SCP-999",
        title: "くすぐりモンスター",
        excerpt: "アイテム番号: SCP-999",
        objectClass: "Safe" as ObjectClass,
      };

      addHistory(entry1);
      addHistory(entry2);

      removeHistory("SCP-173");

      const history = getHistory();
      expect(history.length).toBe(1);
      expect(history[0].scpNumber).toBe("SCP-999");
    });
  });

  describe("clearHistory", () => {
    it("すべての履歴を削除できる", () => {
      const entry = {
        scpNumber: "SCP-173",
        title: "彫刻 - オリジナル",
        excerpt: "アイテム番号: SCP-173",
        objectClass: "Euclid" as ObjectClass,
      };

      addHistory(entry);
      clearHistory();

      const history = getHistory();
      expect(history).toEqual([]);
    });
  });
});
