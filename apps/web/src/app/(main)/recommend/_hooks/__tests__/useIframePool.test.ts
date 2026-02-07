import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useIframePool } from "../useIframePool";
import type { Article } from "../../_types";

// --- ヘルパー ---

/** テスト用モック記事を生成 */
const createMockArticles = (count: number): Article[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `article-${String(i)}`,
    title: `SCP-${String(i).padStart(3, "0")}`,
    similarityScore: 0.9 - i * 0.1,
    source: "preference" as const,
    url: `http://scp-jp.wikidot.com/scp-${String(i).padStart(3, "0")}`,
  }));

/** 全スロットをカスケード読み込みで準備するヘルパー */
const loadAllSlots = async (result: { current: ReturnType<typeof useIframePool> }) => {
  // Current読み込み完了
  act(() => {
    result.current.handleIframeLoad(result.current.slots[0].articleIndex);
  });
  // Next作成待ち
  await waitFor(() => {
    expect(result.current.slots[1]).not.toBeNull();
  });
  // Next読み込み完了
  act(() => {
    const nextSlot = result.current.slots[1];
    if (nextSlot === null) throw new Error("Next slot should exist");
    result.current.handleIframeLoad(nextSlot.articleIndex);
  });
  // Prefetch作成待ち
  await waitFor(() => {
    expect(result.current.slots[2]).not.toBeNull();
  });
};

// --- テスト ---

describe("useIframePool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================
  // AC-1: 3スロットiframeプール
  // ============================
  describe("AC-1: 3スロットiframeプール", () => {
    it("初期状態でCurrentスロットのみが作成される", () => {
      const articles = createMockArticles(5);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      expect(result.current.slots[0]).toBeDefined();
      expect(result.current.slots[0].articleIndex).toBe(0);
      expect(result.current.slots[0].url).toBe(articles[0].url);
      expect(result.current.slots[1]).toBeNull();
      expect(result.current.slots[2]).toBeNull();
    });

    it("カスケード読み込み完了後、最大3つのスロットが管理される", async () => {
      const articles = createMockArticles(5);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      await loadAllSlots(result);

      expect(result.current.slots[0]).toBeDefined();
      expect(result.current.slots[1]).not.toBeNull();
      expect(result.current.slots[2]).not.toBeNull();
    });

    it("Current/Next/Prefetchの3段階でarticleIndexが管理される", async () => {
      const articles = createMockArticles(5);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      await loadAllSlots(result);

      expect(result.current.slots[0].articleIndex).toBe(0); // Current
      expect(result.current.slots[1]?.articleIndex).toBe(1); // Next
      expect(result.current.slots[2]?.articleIndex).toBe(2); // Prefetch
    });
  });

  // ============================
  // AC-2: 初回ロードの段階的読み込み
  // ============================
  describe("AC-2: 初回ロードの段階的読み込み", () => {
    it("初回表示時、Currentのiframeのみが作成される", () => {
      const articles = createMockArticles(3);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      expect(result.current.slots[0]).toBeDefined();
      expect(result.current.slots[1]).toBeNull();
      expect(result.current.slots[2]).toBeNull();
    });

    it("Current読み込み完了後にNextスロットが作成される", async () => {
      const articles = createMockArticles(3);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      // Nextはまだ作成されていない
      expect(result.current.slots[1]).toBeNull();

      // Current読み込み完了
      act(() => {
        result.current.handleIframeLoad(0);
      });

      await waitFor(() => {
        expect(result.current.slots[1]).not.toBeNull();
        expect(result.current.slots[1]?.articleIndex).toBe(1);
        expect(result.current.slots[1]?.isLoaded).toBe(false);
      });
    });

    it("Next読み込み完了後にPrefetchスロットが作成される", async () => {
      const articles = createMockArticles(3);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      // Current読み込み完了
      act(() => {
        result.current.handleIframeLoad(0);
      });
      await waitFor(() => {
        expect(result.current.slots[1]).not.toBeNull();
      });

      // Prefetchはまだ作成されていない
      expect(result.current.slots[2]).toBeNull();

      // Next読み込み完了
      act(() => {
        result.current.handleIframeLoad(1);
      });

      await waitFor(() => {
        expect(result.current.slots[2]).not.toBeNull();
        expect(result.current.slots[2]?.articleIndex).toBe(2);
        expect(result.current.slots[2]?.isLoaded).toBe(false);
      });
    });

    it("Cascade読み込みが順序通りに実行される（Current→Next→Prefetch）", async () => {
      const articles = createMockArticles(3);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      // 初期: Currentのみ
      expect(result.current.slots[0].articleIndex).toBe(0);
      expect(result.current.slots[1]).toBeNull();
      expect(result.current.slots[2]).toBeNull();

      // Current完了 → Next作成
      act(() => {
        result.current.handleIframeLoad(0);
      });
      await waitFor(() => {
        expect(result.current.slots[1]).not.toBeNull();
      });
      expect(result.current.slots[2]).toBeNull();

      // Next完了 → Prefetch作成
      act(() => {
        result.current.handleIframeLoad(1);
      });
      await waitFor(() => {
        expect(result.current.slots[2]).not.toBeNull();
      });
    });
  });

  // ============================
  // AC-3: 遷移時のスロットローテーション
  // ============================
  describe("AC-3: 遷移時のスロットローテーション", () => {
    it("advance()でNextがCurrentに昇格する", async () => {
      const articles = createMockArticles(5);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      await loadAllSlots(result);

      act(() => {
        result.current.advance();
      });

      expect(result.current.slots[0].articleIndex).toBe(1);
    });

    it("advance()でPrefetchがNextに昇格する", async () => {
      const articles = createMockArticles(5);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      await loadAllSlots(result);

      act(() => {
        result.current.advance();
      });

      expect(result.current.slots[1]?.articleIndex).toBe(2);
    });

    it("advance()後に新しいPrefetchスロットが作成される", async () => {
      const articles = createMockArticles(5);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      await loadAllSlots(result);

      act(() => {
        result.current.advance();
      });

      // 新Next(旧Prefetch)が読み込み完了すると新Prefetch作成
      act(() => {
        result.current.handleIframeLoad(2);
      });

      await waitFor(() => {
        expect(result.current.slots[2]).not.toBeNull();
        expect(result.current.slots[2]?.articleIndex).toBe(3);
      });
    });

    it("advance()でCurrentスロットが破棄される", async () => {
      const articles = createMockArticles(5);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      await loadAllSlots(result);

      const oldCurrentIndex = result.current.slots[0].articleIndex;

      act(() => {
        result.current.advance();
      });

      // 新しいスロットに古いCurrentのindexが含まれないことを確認
      const allIndices = result.current.slots
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .map((s) => s.articleIndex);
      expect(allIndices).not.toContain(oldCurrentIndex);
    });
  });

  // ============================
  // AC-4: iframe読み込み完了状態の追跡
  // ============================
  describe("AC-4: iframe読み込み完了状態の追跡", () => {
    it("handleIframeLoad()で対象スロットのisLoadedがtrueになる", () => {
      const articles = createMockArticles(3);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      expect(result.current.slots[0].isLoaded).toBe(false);

      act(() => {
        result.current.handleIframeLoad(0);
      });

      expect(result.current.slots[0].isLoaded).toBe(true);
    });

    it("存在しないarticleIndexでhandleIframeLoad()を呼んでも無視される", () => {
      const articles = createMockArticles(3);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      // 存在しないインデックスで呼んでもエラーにならない
      act(() => {
        result.current.handleIframeLoad(999);
      });

      expect(result.current.slots[0].isLoaded).toBe(false);
    });

    it("既に読み込み済みのスロットでhandleIframeLoad()を呼んでも冪等に動作する", () => {
      const articles = createMockArticles(3);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      act(() => {
        result.current.handleIframeLoad(0);
      });
      expect(result.current.slots[0].isLoaded).toBe(true);

      // 再度呼んでもエラーにならず、trueのまま
      act(() => {
        result.current.handleIframeLoad(0);
      });
      expect(result.current.slots[0].isLoaded).toBe(true);
    });
  });

  // ============================
  // AC-5: メモリ管理
  // ============================
  describe("AC-5: メモリ管理", () => {
    it("advance()後に古いスロットが削除される", async () => {
      const articles = createMockArticles(5);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      await loadAllSlots(result);

      const oldCurrentUrl = result.current.slots[0].url;

      act(() => {
        result.current.advance();
      });

      // 新しいスロットに古いURLが含まれないことを確認
      const allUrls = result.current.slots
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .map((s) => s.url);
      expect(allUrls).not.toContain(oldCurrentUrl);
    });

    it("連続advance()でスロット数が3を超えない", async () => {
      const articles = createMockArticles(10);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      await loadAllSlots(result);

      // 3回連続advance
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.advance();
        });

        const nonNullSlots = result.current.slots.filter((s) => s !== null).length;
        expect(nonNullSlots).toBeLessThanOrEqual(3);
      }
    });
  });

  // ============================
  // AC-6: 記事不足時のフォールバック
  // ============================
  describe("AC-6: 記事不足時のフォールバック", () => {
    it("記事が1つしかない場合、Next/Prefetchスロットが作成されない", async () => {
      const articles = createMockArticles(1);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      act(() => {
        result.current.handleIframeLoad(0);
      });

      // 少し待ってもNext/Prefetchは作成されない
      await waitFor(() => {
        expect(result.current.slots[0].isLoaded).toBe(true);
      });

      expect(result.current.slots[1]).toBeNull();
      expect(result.current.slots[2]).toBeNull();
    });

    it("記事が2つの場合、Prefetchスロットが作成されない", async () => {
      const articles = createMockArticles(2);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      // Current読み込み完了 → Next作成
      act(() => {
        result.current.handleIframeLoad(0);
      });
      await waitFor(() => {
        expect(result.current.slots[1]).not.toBeNull();
      });

      // Next読み込み完了 → Prefetchは作成されない
      act(() => {
        result.current.handleIframeLoad(1);
      });

      await waitFor(() => {
        expect(result.current.slots[1]?.isLoaded).toBe(true);
      });

      expect(result.current.slots[2]).toBeNull();
    });

    it("2件の記事でadvance()後もCurrentのみで正常動作する", async () => {
      const articles = createMockArticles(2);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      // Current読み込み完了 → Next作成
      act(() => {
        result.current.handleIframeLoad(0);
      });
      await waitFor(() => {
        expect(result.current.slots[1]).not.toBeNull();
      });

      act(() => {
        result.current.advance();
      });

      expect(result.current.slots[0].articleIndex).toBe(1);
      expect(result.current.slots[1]).toBeNull();
      expect(result.current.slots[2]).toBeNull();
    });

    it("最後の記事でadvance()を呼んでもエラーにならない", async () => {
      const articles = createMockArticles(2);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      // Current読み込み完了 → Next作成
      act(() => {
        result.current.handleIframeLoad(0);
      });
      await waitFor(() => {
        expect(result.current.slots[1]).not.toBeNull();
      });

      // 1番目の記事に進む
      act(() => {
        result.current.advance();
      });

      // 最後の記事でadvance() → エラーにならない
      expect(() => {
        act(() => {
          result.current.advance();
        });
      }).not.toThrow();
    });
  });

  // ============================
  // AC-7: 読み込み完了通知
  // ============================
  describe("AC-7: 読み込み完了通知", () => {
    it("isNextReadyがNextスロットの読み込み完了を反映する", async () => {
      const articles = createMockArticles(3);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      // 初期: isNextReady = false
      expect(result.current.isNextReady).toBe(false);

      // Current読み込み完了 → Next作成（まだ読み込み中）
      act(() => {
        result.current.handleIframeLoad(0);
      });
      await waitFor(() => {
        expect(result.current.slots[1]).not.toBeNull();
      });
      expect(result.current.isNextReady).toBe(false);

      // Next読み込み完了 → isNextReady = true
      act(() => {
        result.current.handleIframeLoad(1);
      });

      expect(result.current.isNextReady).toBe(true);
    });

    it("Nextスロットがnullの場合、isNextReady=falseである", () => {
      const articles = createMockArticles(1);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      expect(result.current.isNextReady).toBe(false);
    });

    it("advance()後にisNextReadyがリセットされる", async () => {
      const articles = createMockArticles(5);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      await loadAllSlots(result);

      // Prefetchが読み込み完了していなければ、advance後にisNextReadyはfalse
      // (旧PrefetchがNextに昇格するが、isLoadedはfalseのまま)
      expect(result.current.slots[2]?.isLoaded).toBe(false);

      act(() => {
        result.current.advance();
      });

      // 新Next(旧Prefetch)はまだ読み込み中なのでfalse
      expect(result.current.isNextReady).toBe(false);

      // 新Nextが読み込み完了
      act(() => {
        result.current.handleIframeLoad(2);
      });

      expect(result.current.isNextReady).toBe(true);
    });
  });
});
