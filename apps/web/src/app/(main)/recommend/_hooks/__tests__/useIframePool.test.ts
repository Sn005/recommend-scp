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
    objectClass: null,
    rating: null,
  }));

// --- テスト ---

describe("useIframePool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================
  // AC-1: 3スロットiframeプール
  // ============================
  describe("AC-1: 3スロットiframeプール", () => {
    it("初期状態で3つのスロットが即座に作成される", () => {
      const articles = createMockArticles(5);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      expect(result.current.slots[0]).toBeDefined();
      expect(result.current.slots[0].articleIndex).toBe(0);
      expect(result.current.slots[0].url).toBe(articles[0].url);
      expect(result.current.slots[1]).not.toBeNull();
      expect(result.current.slots[1]?.articleIndex).toBe(1);
      expect(result.current.slots[2]).not.toBeNull();
      expect(result.current.slots[2]?.articleIndex).toBe(2);
    });

    it("初期状態で全スロットのisLoadedがfalseである", () => {
      const articles = createMockArticles(5);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      expect(result.current.slots[0].isLoaded).toBe(false);
      expect(result.current.slots[1]?.isLoaded).toBe(false);
      expect(result.current.slots[2]?.isLoaded).toBe(false);
    });

    it("Current/Next/Prefetchの3段階でarticleIndexが管理される", () => {
      const articles = createMockArticles(5);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      expect(result.current.slots[0].articleIndex).toBe(0); // Current
      expect(result.current.slots[1]?.articleIndex).toBe(1); // Next
      expect(result.current.slots[2]?.articleIndex).toBe(2); // Prefetch
    });
  });

  // ============================
  // AC-2: 即時スロット作成（Cascade制約なし）
  // ============================
  describe("AC-2: 即時スロット作成", () => {
    it("記事が3つ以上あれば初期化時に全スロットが作成される", () => {
      const articles = createMockArticles(3);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      expect(result.current.slots[0]).toBeDefined();
      expect(result.current.slots[0].articleIndex).toBe(0);
      expect(result.current.slots[1]).not.toBeNull();
      expect(result.current.slots[1]?.articleIndex).toBe(1);
      expect(result.current.slots[2]).not.toBeNull();
      expect(result.current.slots[2]?.articleIndex).toBe(2);
    });

    it("handleIframeLoad()はisLoadedを更新するだけでスロット作成しない", () => {
      const articles = createMockArticles(5);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      // 全スロットが既に存在することを確認
      expect(result.current.slots[1]).not.toBeNull();
      expect(result.current.slots[2]).not.toBeNull();

      // Current読み込み完了
      act(() => {
        result.current.handleIframeLoad(0);
      });

      // スロットが変わらない（既に存在している）
      expect(result.current.slots[0].isLoaded).toBe(true);
      expect(result.current.slots[1]?.articleIndex).toBe(1);
      expect(result.current.slots[2]?.articleIndex).toBe(2);
    });

    it("全スロットが同時に読み込み可能（Cascade制約なし）", () => {
      const articles = createMockArticles(5);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      // 全スロットが同時に存在
      expect(result.current.slots[0]).toBeDefined();
      expect(result.current.slots[1]).not.toBeNull();
      expect(result.current.slots[2]).not.toBeNull();

      // 任意の順序でisLoadedを更新可能
      act(() => {
        result.current.handleIframeLoad(2); // Prefetch先に完了
      });
      expect(result.current.slots[2]?.isLoaded).toBe(true);

      act(() => {
        result.current.handleIframeLoad(0); // Current完了
      });
      expect(result.current.slots[0].isLoaded).toBe(true);

      act(() => {
        result.current.handleIframeLoad(1); // Next完了
      });
      expect(result.current.slots[1]?.isLoaded).toBe(true);
    });
  });

  // ============================
  // AC-3: 遷移時のスロットローテーション
  // ============================
  describe("AC-3: 遷移時のスロットローテーション", () => {
    it("advance()でNextがCurrentに昇格する", () => {
      const articles = createMockArticles(5);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      act(() => {
        result.current.advance();
      });

      expect(result.current.slots[0].articleIndex).toBe(1);
    });

    it("advance()でPrefetchがNextに昇格する", () => {
      const articles = createMockArticles(5);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      act(() => {
        result.current.advance();
      });

      expect(result.current.slots[1]?.articleIndex).toBe(2);
    });

    it("advance()後に新しいPrefetchスロットが即座に作成される", () => {
      const articles = createMockArticles(5);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      act(() => {
        result.current.advance();
      });

      // 即座に新Prefetchが作成される（Cascade待ち不要）
      expect(result.current.slots[2]).not.toBeNull();
      expect(result.current.slots[2]?.articleIndex).toBe(3);
    });

    it("advance()でCurrentスロットが破棄される", () => {
      const articles = createMockArticles(5);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

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

    it("連続advance()で常に3スロットが維持される", () => {
      const articles = createMockArticles(10);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      // 3回連続advance
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.advance();
        });

        const nonNullSlots = result.current.slots.filter((s) => s !== null).length;
        expect(nonNullSlots).toBe(3);
      }
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

    it("初期状態でisFullyLoadedがfalseである", () => {
      const articles = createMockArticles(3);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      expect(result.current.slots[0].isFullyLoaded).toBe(false);
    });

    it("handleIframeFullyLoaded()で対象スロットのisFullyLoadedがtrueになる", () => {
      const articles = createMockArticles(3);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      expect(result.current.slots[0].isFullyLoaded).toBe(false);

      act(() => {
        result.current.handleIframeFullyLoaded(0);
      });

      expect(result.current.slots[0].isFullyLoaded).toBe(true);
    });

    it("handleIframeFullyLoaded()はNextスロットにも適用される", () => {
      const articles = createMockArticles(3);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      // Nextスロットは即座に存在
      expect(result.current.slots[1]).not.toBeNull();

      act(() => {
        result.current.handleIframeFullyLoaded(1);
      });

      expect(result.current.slots[1]?.isFullyLoaded).toBe(true);
    });

    it("存在しないarticleIndexでhandleIframeFullyLoaded()を呼んでも無視される", () => {
      const articles = createMockArticles(3);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      act(() => {
        result.current.handleIframeFullyLoaded(999);
      });

      expect(result.current.slots[0].isFullyLoaded).toBe(false);
    });

    it("handleIframeFullyLoaded()は冪等に動作する", () => {
      const articles = createMockArticles(3);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      act(() => {
        result.current.handleIframeFullyLoaded(0);
      });
      expect(result.current.slots[0].isFullyLoaded).toBe(true);

      act(() => {
        result.current.handleIframeFullyLoaded(0);
      });
      expect(result.current.slots[0].isFullyLoaded).toBe(true);
    });

    it("isFullyLoadedはadvance()後のスロットローテーションで引き継がれる", () => {
      const articles = createMockArticles(5);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      // Nextスロットを完全読み込み完了に設定
      act(() => {
        result.current.handleIframeFullyLoaded(1);
      });
      expect(result.current.slots[1]?.isFullyLoaded).toBe(true);

      // advance() → 旧Nextが新Currentに昇格
      act(() => {
        result.current.advance();
      });

      // 新CurrentのisFullyLoadedが引き継がれている
      expect(result.current.slots[0].isFullyLoaded).toBe(true);
    });
  });

  // ============================
  // AC-5: メモリ管理
  // ============================
  describe("AC-5: メモリ管理", () => {
    it("advance()後に古いスロットが削除される", () => {
      const articles = createMockArticles(5);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

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

    it("連続advance()でスロット数が3を超えない", () => {
      const articles = createMockArticles(10);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

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
    it("記事が1つしかない場合、Next/Prefetchスロットがnullになる", () => {
      const articles = createMockArticles(1);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      expect(result.current.slots[0]).toBeDefined();
      expect(result.current.slots[0].articleIndex).toBe(0);
      expect(result.current.slots[1]).toBeNull();
      expect(result.current.slots[2]).toBeNull();
    });

    it("記事が2つの場合、Prefetchスロットがnullになる", () => {
      const articles = createMockArticles(2);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      expect(result.current.slots[0]).toBeDefined();
      expect(result.current.slots[1]).not.toBeNull();
      expect(result.current.slots[1]?.articleIndex).toBe(1);
      expect(result.current.slots[2]).toBeNull();
    });

    it("2件の記事でadvance()後もCurrentのみで正常動作する", () => {
      const articles = createMockArticles(2);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      act(() => {
        result.current.advance();
      });

      expect(result.current.slots[0].articleIndex).toBe(1);
      expect(result.current.slots[1]).toBeNull();
      expect(result.current.slots[2]).toBeNull();
    });

    it("最後の記事でadvance()を呼んでもエラーにならない", () => {
      const articles = createMockArticles(2);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

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
    it("isNextReadyがNextスロットの読み込み完了を反映する", () => {
      const articles = createMockArticles(3);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      // 初期: Nextは存在するがisLoaded=false → isNextReady = false
      expect(result.current.slots[1]).not.toBeNull();
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

    it("advance()後にisNextReadyがリセットされる", () => {
      const articles = createMockArticles(5);
      const { result } = renderHook(() => useIframePool({ articles, currentIndex: 0 }));

      // Next(index=1)を読み込み完了
      act(() => {
        result.current.handleIframeLoad(1);
      });
      expect(result.current.isNextReady).toBe(true);

      // advance() → 旧Prefetch(index=2)がNextに昇格（isLoaded=false）
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

  // ============================
  // AC-8: loadMore による記事追加時のスロット補填
  // ============================
  describe("AC-8: loadMore による記事追加時のスロット補填", () => {
    it("articles配列が拡張された時にnullのNextスロットが即座に埋められる", async () => {
      const initialArticles = createMockArticles(3);
      const { result, rerender } = renderHook(
        ({ articles, currentIndex }: { articles: Article[]; currentIndex: number }) =>
          useIframePool({ articles, currentIndex }),
        { initialProps: { articles: initialArticles, currentIndex: 0 } }
      );

      // 全スロットが最初から存在
      expect(result.current.slots[0].articleIndex).toBe(0);
      expect(result.current.slots[1]?.articleIndex).toBe(1);
      expect(result.current.slots[2]?.articleIndex).toBe(2);

      // 2回advance: [0,1,2] → [1,2,null] → [2,null,null]
      act(() => {
        result.current.advance();
      });
      act(() => {
        result.current.advance();
      });

      expect(result.current.slots[0].articleIndex).toBe(2);
      expect(result.current.slots[1]).toBeNull();
      expect(result.current.slots[2]).toBeNull();

      // loadMore完了をシミュレート: 6記事に拡張
      const extendedArticles = createMockArticles(6);
      rerender({ articles: extendedArticles, currentIndex: 2 });

      // effectによりnullスロットが即座に埋まる
      await waitFor(() => {
        expect(result.current.slots[1]).not.toBeNull();
        expect(result.current.slots[1]?.articleIndex).toBe(3);
      });
    });

    it("articles配列拡張時にCurrent未読み込みでもスロットが即座に埋められる", async () => {
      const initialArticles = createMockArticles(1);
      const { result, rerender } = renderHook(
        ({ articles, currentIndex }: { articles: Article[]; currentIndex: number }) =>
          useIframePool({ articles, currentIndex }),
        { initialProps: { articles: initialArticles, currentIndex: 0 } }
      );

      // Currentは読み込み完了していない
      expect(result.current.slots[0].isLoaded).toBe(false);
      expect(result.current.slots[1]).toBeNull();

      // articles拡張
      const extendedArticles = createMockArticles(3);
      rerender({ articles: extendedArticles, currentIndex: 0 });

      // Current未読み込みでもNextが即座に作成される（Cascade制約なし）
      await waitFor(() => {
        expect(result.current.slots[1]).not.toBeNull();
        expect(result.current.slots[1]?.articleIndex).toBe(1);
      });
    });

    it("articles配列拡張時にPrefetchも即座に埋められる", async () => {
      const initialArticles = createMockArticles(2);
      const { result, rerender } = renderHook(
        ({ articles, currentIndex }: { articles: Article[]; currentIndex: number }) =>
          useIframePool({ articles, currentIndex }),
        { initialProps: { articles: initialArticles, currentIndex: 0 } }
      );

      // 初期: 2記事 → Prefetchはnull
      expect(result.current.slots[0].articleIndex).toBe(0);
      expect(result.current.slots[1]?.articleIndex).toBe(1);
      expect(result.current.slots[2]).toBeNull();

      // articles拡張
      const extendedArticles = createMockArticles(5);
      rerender({ articles: extendedArticles, currentIndex: 0 });

      // Prefetchも即座に作成される
      await waitFor(() => {
        expect(result.current.slots[2]).not.toBeNull();
        expect(result.current.slots[2]?.articleIndex).toBe(2);
      });
    });

    it("articles配列が拡張されても既存の非nullスロットは上書きされない", () => {
      const initialArticles = createMockArticles(5);
      const { result, rerender } = renderHook(
        ({ articles, currentIndex }: { articles: Article[]; currentIndex: number }) =>
          useIframePool({ articles, currentIndex }),
        { initialProps: { articles: initialArticles, currentIndex: 0 } }
      );

      // 全スロットが初期化済み
      expect(result.current.slots[0].articleIndex).toBe(0);
      expect(result.current.slots[1]?.articleIndex).toBe(1);
      expect(result.current.slots[2]?.articleIndex).toBe(2);

      const extendedArticles = createMockArticles(10);
      rerender({ articles: extendedArticles, currentIndex: 0 });

      // 既存スロットが維持されている
      expect(result.current.slots[0].articleIndex).toBe(0);
      expect(result.current.slots[1]?.articleIndex).toBe(1);
      expect(result.current.slots[2]?.articleIndex).toBe(2);
    });
  });
});
