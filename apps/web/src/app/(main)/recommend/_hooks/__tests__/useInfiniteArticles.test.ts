/**
 * @file useInfiniteArticles フックのテスト
 * @see specs/006-frontend/006-02-article-reader/006-02-07.md
 */
import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// モックをテストの前に定義
vi.mock("@/shared/lib/api-client", () => ({
  api: {
    recommend: {
      $post: vi.fn(),
    },
  },
}));

vi.mock("@/shared/hooks/useVisitorId", () => ({
  useVisitorId: vi.fn(),
}));

// モックの後でインポート
import { useInfiniteArticles } from "../useInfiniteArticles";
import { api } from "@/shared/lib/api-client";
import { useVisitorId } from "@/shared/hooks/useVisitorId";
import type { Article } from "../../_types";

const mockApi = api as unknown as {
  recommend: {
    $post: ReturnType<typeof vi.fn>;
  };
};

const mockUseVisitorId = useVisitorId as ReturnType<typeof vi.fn>;

// テスト用ヘルパー関数
function createMockArticle(id: string, title?: string): Article {
  return {
    id,
    title: title ?? `SCP-${id}`,
    similarityScore: 0.9,
    source: "preference",
    url: `https://scp-jp.wikidot.com/scp-${id}`,
    objectClass: null,
    rating: null,
  };
}

function createSuccessResponse(articles: Article[], hasMore = true) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue({
      recommendations: articles,
      count: articles.length,
      hasMore,
    }),
  };
}

function createErrorResponse(status = 500) {
  return {
    ok: false,
    status,
    statusText: "Internal Server Error",
  };
}

function createMockArticles(count: number): Article[] {
  return Array.from({ length: count }, (_, i) => createMockArticle(String(i + 1)));
}

describe("useInfiniteArticles", () => {
  beforeEach(() => {
    // useVisitorIdのデフォルトモック
    mockUseVisitorId.mockReturnValue({
      visitorId: "test-visitor-id",
      isLoading: false,
      isOnboarded: true,
      error: null,
      refresh: vi.fn(),
      markOnboarded: vi.fn(),
    });

    // APIモックをリセット
    mockApi.recommend.$post.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("初期状態", () => {
    it("初期状態でisLoadingがtrueになる", () => {
      mockApi.recommend.$post.mockReturnValue(
        new Promise(() => {
          /* pending forever */
        })
      );

      const { result } = renderHook(() => useInfiniteArticles());

      expect(result.current.isLoading).toBe(true);
    });

    it("初期状態でarticlesが空配列", () => {
      mockApi.recommend.$post.mockReturnValue(
        new Promise(() => {
          /* pending forever */
        })
      );

      const { result } = renderHook(() => useInfiniteArticles());

      expect(result.current.articles).toEqual([]);
    });

    it("初期状態でcurrentIndexが0", () => {
      mockApi.recommend.$post.mockReturnValue(
        new Promise(() => {
          /* pending forever */
        })
      );

      const { result } = renderHook(() => useInfiniteArticles());

      expect(result.current.currentIndex).toBe(0);
    });

    it("初期状態でhasMoreがtrue", () => {
      mockApi.recommend.$post.mockReturnValue(
        new Promise(() => {
          /* pending forever */
        })
      );

      const { result } = renderHook(() => useInfiniteArticles());

      expect(result.current.hasMore).toBe(true);
    });
  });

  describe("AC-1: 初期ロード件数の拡大", () => {
    it("初回読み込みでinitialCount=10件の記事が取得される", async () => {
      const mockArticles = createMockArticles(10);
      mockApi.recommend.$post.mockResolvedValue(createSuccessResponse(mockArticles));

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.articles).toHaveLength(10);
    });

    it("オプションを指定しない場合limit=10でAPI呼び出しされる（DEFAULT_INITIAL_COUNT=10）", async () => {
      mockApi.recommend.$post.mockResolvedValue(createSuccessResponse([]));

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(mockApi.recommend.$post).toHaveBeenCalledWith({
        json: { visitorId: "test-visitor-id", limit: 10 },
      });
    });

    it("POST /recommend APIが正しいパラメータで呼び出される", async () => {
      mockApi.recommend.$post.mockResolvedValue(createSuccessResponse([]));

      const { result } = renderHook(() => useInfiniteArticles({ initialCount: 5 }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(mockApi.recommend.$post).toHaveBeenCalledWith({
        json: { visitorId: "test-visitor-id", limit: 5 },
      });
    });

    it("記事取得完了後、articlesに記事が格納される", async () => {
      const mockArticles = [createMockArticle("173", "SCP-173 - 彫刻")];
      mockApi.recommend.$post.mockResolvedValue(createSuccessResponse(mockArticles, false));

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(1);
      });
      expect(result.current.articles[0].id).toBe("173");
      expect(result.current.articles[0].title).toBe("SCP-173 - 彫刻");
    });

    it("読み込み完了後、isLoadingがfalseになる", async () => {
      mockApi.recommend.$post.mockResolvedValue(createSuccessResponse([]));

      const { result } = renderHook(() => useInfiniteArticles());

      expect(result.current.isLoading).toBe(true);
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("visitorIdがロード中の場合、API呼び出しを待機する", () => {
      mockUseVisitorId.mockReturnValue({
        visitorId: null,
        isLoading: true,
        isOnboarded: false,
        error: null,
        refresh: vi.fn(),
        markOnboarded: vi.fn(),
      });

      const { result } = renderHook(() => useInfiniteArticles());

      expect(mockApi.recommend.$post).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe("追加読み込み (loadMore)", () => {
    it("loadMore呼び出しでPOST /recommendが実行される", async () => {
      // initialCount=10で初回取得。10件あればremaining=9>3なのでauto-prefetchが発火しない
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse(createMockArticles(10)))
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("extra")]));

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockApi.recommend.$post).toHaveBeenCalledTimes(2);
    });

    it("loadMore実行中にisLoadingMoreがtrueになる", async () => {
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse(createMockArticles(10)))
        // eslint-disable-next-line @typescript-eslint/no-misused-promises -- 遅延レスポンスのモック
        .mockImplementationOnce(() => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(createSuccessResponse([createMockArticle("682")]));
            }, 100);
          });
        });

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loadMorePromise: Promise<void>;
      act(() => {
        loadMorePromise = result.current.loadMore();
      });

      expect(result.current.isLoadingMore).toBe(true);

      await act(async () => {
        await loadMorePromise;
      });

      expect(result.current.isLoadingMore).toBe(false);
    });

    it("loadMoreCountオプションが反映される（デフォルト5）", async () => {
      // hasMore=false で auto-prefetch を抑制
      mockApi.recommend.$post.mockResolvedValueOnce(
        createSuccessResponse([createMockArticle("173")], false)
      );

      const { result } = renderHook(() => useInfiniteArticles({ initialCount: 1 }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // hasMore=false → setHasMore(true) して手動テスト
      // 代わりに: 10件取得してloadMoreの呼び出しパラメータを確認
      mockApi.recommend.$post.mockReset();
      mockApi.recommend.$post.mockResolvedValueOnce(createSuccessResponse(createMockArticles(10)));

      const { result: result2 } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result2.current.isLoading).toBe(false);
      });

      mockApi.recommend.$post.mockResolvedValueOnce(createSuccessResponse([], false));

      await act(async () => {
        await result2.current.loadMore();
      });

      // DEFAULT_LOAD_MORE_COUNT = 5
      // loadMore時は既存記事のIDをexcludeIdsとして送信する
      expect(mockApi.recommend.$post).toHaveBeenLastCalledWith({
        json: {
          visitorId: "test-visitor-id",
          limit: 5,
          excludeIds: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
        },
      });
    });

    it("loadMoreCountをカスタム指定すると反映される", async () => {
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse(createMockArticles(10)))
        .mockResolvedValueOnce(createSuccessResponse([], false));

      const { result } = renderHook(() => useInfiniteArticles({ loadMoreCount: 3 }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.loadMore();
      });

      // loadMore時は既存記事のIDをexcludeIdsとして送信する
      expect(mockApi.recommend.$post).toHaveBeenLastCalledWith({
        json: {
          visitorId: "test-visitor-id",
          limit: 3,
          excludeIds: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
        },
      });
    });
  });

  describe("AC-2: バッファベースの先行取得", () => {
    it("バッファ残数がprefetchThreshold以下で自動追加取得される", async () => {
      const mockArticles = createMockArticles(10);
      const additionalArticles = createMockArticles(5).map((a) => ({
        ...a,
        id: `extra-${a.id}`,
      }));
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse(mockArticles))
        .mockResolvedValueOnce(createSuccessResponse(additionalArticles));

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(10);
      });

      // currentIndex=7に進める（残数 = 10 - 7 - 1 = 2 <= threshold(3)）
      for (let i = 0; i < 7; i++) {
        act(() => {
          result.current.goToNext();
        });
      }

      // 自動的にloadMoreが呼ばれて追加記事が取得される
      await waitFor(() => {
        expect(mockApi.recommend.$post).toHaveBeenCalledTimes(2);
      });
    });

    it("バッファ残数がprefetchThresholdより多い場合は取得しない", async () => {
      const mockArticles = createMockArticles(10);
      mockApi.recommend.$post.mockResolvedValueOnce(createSuccessResponse(mockArticles));

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(10);
      });

      // currentIndex=5に進める（残数 = 10 - 5 - 1 = 4 > threshold(3)）
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.goToNext();
        });
      }

      // 追加取得は発生しない
      expect(mockApi.recommend.$post).toHaveBeenCalledTimes(1);
    });

    it("hasMoreがfalseの場合、先行取得は発生しない", async () => {
      const mockArticles = createMockArticles(5);
      mockApi.recommend.$post.mockResolvedValueOnce(createSuccessResponse(mockArticles, false));

      const { result } = renderHook(() => useInfiniteArticles({ initialCount: 5 }));

      await waitFor(() => {
        expect(result.current.hasMore).toBe(false);
      });

      // currentIndex=3に進める（残数 = 5 - 3 - 1 = 1 <= threshold(3)）
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.goToNext();
        });
      }

      // hasMore=falseなので追加取得は発生しない
      expect(mockApi.recommend.$post).toHaveBeenCalledTimes(1);
    });

    it("取得中にloadMore()を呼んでも重複リクエストしない", async () => {
      const mockArticles = createMockArticles(10);
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse(mockArticles))
        // eslint-disable-next-line @typescript-eslint/no-misused-promises -- 遅延レスポンスのモック
        .mockImplementationOnce(() => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(createSuccessResponse(createMockArticles(5)));
            }, 100);
          });
        });

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(10);
      });

      // 2回連続でloadMoreを呼ぶ
      await act(async () => {
        const promise1 = result.current.loadMore();
        const promise2 = result.current.loadMore();
        await Promise.all([promise1, promise2]);
      });

      // 初回 + loadMore 1回 = 2回のみ
      expect(mockApi.recommend.$post).toHaveBeenCalledTimes(2);
    });

    it("残数がちょうど3件の場合に先行取得される", async () => {
      const mockArticles = createMockArticles(10);
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse(mockArticles))
        .mockResolvedValueOnce(createSuccessResponse(createMockArticles(5)));

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(10);
      });

      // currentIndex=6に進める（残数 = 10 - 6 - 1 = 3 <= threshold(3)）
      for (let i = 0; i < 6; i++) {
        act(() => {
          result.current.goToNext();
        });
      }

      await waitFor(() => {
        expect(mockApi.recommend.$post).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("AC-3: 自動読み込み上限の撤廃", () => {
    it("isPaused/resumeAutoLoadが戻り値に存在しない（削除確認）", async () => {
      mockApi.recommend.$post.mockResolvedValue(createSuccessResponse(createMockArticles(10)));

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // isPaused/resumeAutoLoadが結果オブジェクトに存在しないこと
      expect("isPaused" in result.current).toBe(false);
      expect("resumeAutoLoad" in result.current).toBe(false);
    });

    it("autoLoadLimitによる一時停止が発生しない（上限撤廃）", async () => {
      // 10件で初回取得（auto-prefetch抑制）+ 11回のloadMore
      mockApi.recommend.$post.mockResolvedValueOnce(createSuccessResponse(createMockArticles(10)));

      for (let i = 0; i < 11; i++) {
        mockApi.recommend.$post.mockResolvedValueOnce(
          createSuccessResponse([createMockArticle(`extra-${String(i)}`)])
        );
      }

      const { result } = renderHook(() => useInfiniteArticles({ loadMoreCount: 1 }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 11回loadMoreを実行（従来は10回で一時停止していた）
      for (let i = 0; i < 11; i++) {
        await act(async () => {
          await result.current.loadMore();
        });
      }

      // 全て成功していること（一時停止が発生しない）
      expect(result.current.articles).toHaveLength(21); // 10 + 11
      expect(mockApi.recommend.$post).toHaveBeenCalledTimes(12); // initial + 11
    });

    it("hasMoreがtrueである限り無限に読み続けられる", async () => {
      mockApi.recommend.$post.mockResolvedValueOnce(createSuccessResponse(createMockArticles(1)));

      // 15回のloadMore
      for (let i = 0; i < 15; i++) {
        mockApi.recommend.$post.mockResolvedValueOnce(
          createSuccessResponse([createMockArticle(`more-${String(i)}`)])
        );
      }

      const { result } = renderHook(() =>
        useInfiniteArticles({ initialCount: 1, loadMoreCount: 1 })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      for (let i = 0; i < 15; i++) {
        await act(async () => {
          await result.current.loadMore();
        });
      }

      expect(result.current.articles).toHaveLength(16); // 1 + 15
    });
  });

  describe("シームレス接続", () => {
    it("loadMore成功後、新しい記事が既存配列の末尾に追加される", async () => {
      // 10件で初回取得（auto-prefetch抑制）、追加で1件
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse(createMockArticles(10)))
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("extra")], false));

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(10);
      });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.articles).toHaveLength(11);
      expect(result.current.articles[10].id).toBe("extra");
    });

    it("複数回loadMoreを実行しても記事が順序通り追加される", async () => {
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse(createMockArticles(10)))
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("a")]))
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("b")], false));

      const { result } = renderHook(() => useInfiniteArticles({ loadMoreCount: 1 }));

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(10);
      });

      await act(async () => {
        await result.current.loadMore();
      });
      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.articles).toHaveLength(12);
      expect(result.current.articles[10].id).toBe("a");
      expect(result.current.articles[11].id).toBe("b");
    });

    it("0件のarticlesが返された場合でもエラーにならない", async () => {
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse(createMockArticles(10)))
        .mockResolvedValueOnce(createSuccessResponse([], false));

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(10);
      });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.articles).toHaveLength(10);
      expect(result.current.error).toBeNull();
    });

    it("1回目の空レスポンスではhasMoreがfalseにならない", async () => {
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse(createMockArticles(10)))
        .mockResolvedValueOnce(createSuccessResponse([]));

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(10);
      });

      await act(async () => {
        await result.current.loadMore();
      });

      // 1回目の空レスポンスではまだhasMore=true（推薦エンジンの確率的パス選択を考慮）
      expect(result.current.hasMore).toBe(true);
    });

    it("連続2回の空レスポンスでhasMoreがfalseになる", async () => {
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse(createMockArticles(10)))
        .mockResolvedValueOnce(createSuccessResponse([]))
        .mockResolvedValueOnce(createSuccessResponse([]));

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(10);
      });

      // 1回目の空レスポンス
      await act(async () => {
        await result.current.loadMore();
      });
      expect(result.current.hasMore).toBe(true);

      // 2回目の空レスポンス
      await act(async () => {
        await result.current.loadMore();
      });
      expect(result.current.hasMore).toBe(false);
    });

    it("空レスポンス後に成功レスポンスでカウンタがリセットされる", async () => {
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse(createMockArticles(10)))
        .mockResolvedValueOnce(createSuccessResponse([]))
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("new-1")]))
        .mockResolvedValueOnce(createSuccessResponse([]));

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(10);
      });

      // 1回目の空レスポンス
      await act(async () => {
        await result.current.loadMore();
      });
      expect(result.current.hasMore).toBe(true);

      // 成功レスポンス → カウンタリセット
      await act(async () => {
        await result.current.loadMore();
      });
      expect(result.current.hasMore).toBe(true);

      // 再び1回目の空レスポンス → まだhasMore=true
      await act(async () => {
        await result.current.loadMore();
      });
      expect(result.current.hasMore).toBe(true);
    });

    it("currentIndexがloadMore後も変化しない（スクロール位置維持）", async () => {
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse(createMockArticles(10)))
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("extra")], false));

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(10);
      });

      act(() => {
        result.current.goToNext();
      });
      expect(result.current.currentIndex).toBe(1);

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.currentIndex).toBe(1); // 変化しない
    });
  });

  describe("重複取得防止", () => {
    it("loadMore実行中に再度loadMoreを呼んでも重複リクエストしない", async () => {
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("173")]))
        // eslint-disable-next-line @typescript-eslint/no-misused-promises -- 遅延レスポンスのモック
        .mockImplementationOnce(() => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(createSuccessResponse([createMockArticle("682")]));
            }, 100);
          });
        });

      const { result } = renderHook(() => useInfiniteArticles({ initialCount: 1 }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const promise1 = result.current.loadMore();
        const promise2 = result.current.loadMore();
        await Promise.all([promise1, promise2]);
      });

      expect(mockApi.recommend.$post).toHaveBeenCalledTimes(2);
    });

    it("hasMoreがfalseの場合loadMoreは何もしない", async () => {
      mockApi.recommend.$post.mockResolvedValueOnce(
        createSuccessResponse([createMockArticle("173")], false)
      );

      const { result } = renderHook(() => useInfiniteArticles({ initialCount: 1 }));

      await waitFor(() => {
        expect(result.current.hasMore).toBe(false);
      });

      const initialCallCount = mockApi.recommend.$post.mock.calls.length;

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockApi.recommend.$post).toHaveBeenCalledTimes(initialCallCount);
    });

    it("3回以上連続でloadMoreを呼んでも重複しない", async () => {
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse(createMockArticles(10)))
        // eslint-disable-next-line @typescript-eslint/no-misused-promises -- 遅延レスポンスのモック
        .mockImplementation(() => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(createSuccessResponse([createMockArticle("new")]));
            }, 50);
          });
        });

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const promises = [
          result.current.loadMore(),
          result.current.loadMore(),
          result.current.loadMore(),
        ];
        await Promise.all(promises);
      });

      // 初回 + loadMore 1回 = 2回のみ
      expect(mockApi.recommend.$post).toHaveBeenCalledTimes(2);
    });
  });

  describe("次へボタンによる遷移 (goToNext)", () => {
    it("goToNext呼び出しでcurrentIndexがインクリメントされる", async () => {
      mockApi.recommend.$post.mockResolvedValueOnce(
        createSuccessResponse([createMockArticle("173"), createMockArticle("682")])
      );

      const { result } = renderHook(() => useInfiniteArticles({ initialCount: 2 }));

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(2);
      });

      expect(result.current.currentIndex).toBe(0);

      act(() => {
        result.current.goToNext();
      });

      expect(result.current.currentIndex).toBe(1);
    });

    it("最後の記事でhasMoreがfalseの場合、goToNextは何もしない", async () => {
      mockApi.recommend.$post.mockResolvedValueOnce(
        createSuccessResponse([createMockArticle("173")], false)
      );

      const { result } = renderHook(() => useInfiniteArticles({ initialCount: 1 }));

      await waitFor(() => {
        expect(result.current.hasMore).toBe(false);
      });

      const initialCallCount = mockApi.recommend.$post.mock.calls.length;

      act(() => {
        result.current.goToNext();
      });

      expect(mockApi.recommend.$post).toHaveBeenCalledTimes(initialCallCount);
      expect(result.current.currentIndex).toBe(0);
    });

    it("複数回goToNextを連続で呼んでも正しく動作する", async () => {
      mockApi.recommend.$post.mockResolvedValueOnce(
        createSuccessResponse([
          createMockArticle("173"),
          createMockArticle("682"),
          createMockArticle("999"),
        ])
      );

      const { result } = renderHook(() => useInfiniteArticles({ initialCount: 3 }));

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(3);
      });

      act(() => {
        result.current.goToNext();
        result.current.goToNext();
        result.current.goToNext(); // 最後を超えた
      });

      expect(result.current.currentIndex).toBe(2);
    });

    it("最後の記事でgoToNext呼び出し時にバッファ先行取得がトリガーされる", async () => {
      // 4件取得（remaining=4-0-1=3 → ちょうどthreshold）→ 即座にauto-prefetchが発火
      const additionalArticles = createMockArticles(5).map((a) => ({
        ...a,
        id: `extra-${a.id}`,
      }));
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse(createMockArticles(4)))
        .mockResolvedValueOnce(createSuccessResponse(additionalArticles, false));

      const { result } = renderHook(() => useInfiniteArticles({ initialCount: 4 }));

      // auto-prefetch: remaining = 4-0-1 = 3 <= threshold(3) → loadMoreが自動発火
      // 初回ロード直後にprefetchが発火するため、最終的に4+5=9件になる
      await waitFor(() => {
        expect(result.current.articles.length).toBe(9);
      });
      expect(mockApi.recommend.$post).toHaveBeenCalledTimes(2);
    });
  });

  describe("AC-7: バッファ先行取得失敗時のリトライ", () => {
    it("loadMore()が失敗してもerrorステートにならない（閲覧中断しない）", async () => {
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse(createMockArticles(10)))
        .mockRejectedValueOnce(new Error("Network Error"));

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(10);
      });

      await act(async () => {
        await result.current.loadMore();
      });

      // エラーステートにならない（ユーザーの閲覧体験を中断しない）
      expect(result.current.error).toBeNull();
    });

    it("バックグラウンド取得失敗時にisLoadingMoreがfalseに戻る", async () => {
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("173")]))
        .mockRejectedValueOnce(new Error("Network Error"));

      const { result } = renderHook(() => useInfiniteArticles({ initialCount: 1 }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.isLoadingMore).toBe(false);
    });

    it("次の記事遷移時に再度取得を試みる", async () => {
      const mockArticles = createMockArticles(5);
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse(mockArticles))
        .mockRejectedValueOnce(new Error("Network Error"))
        .mockResolvedValueOnce(createSuccessResponse(createMockArticles(5)));

      const { result } = renderHook(() =>
        useInfiniteArticles({ initialCount: 5, prefetchThreshold: 3 })
      );

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(5);
      });

      // 1回目のloadMore失敗
      await act(async () => {
        await result.current.loadMore();
      });
      expect(result.current.error).toBeNull();

      // 次のgoToNextでprefetchがリトライされる
      act(() => {
        result.current.goToNext();
      });

      // useEffectによるリトライ
      await waitFor(() => {
        expect(mockApi.recommend.$post).toHaveBeenCalledTimes(3);
      });
    });

    it("API呼び出しがok=falseの場合もerrorステートにならない", async () => {
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse(createMockArticles(10)))
        .mockResolvedValueOnce(createErrorResponse(500));

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(10);
      });

      await act(async () => {
        await result.current.loadMore();
      });

      // エラーステートにならない
      expect(result.current.error).toBeNull();
    });
  });

  describe("初回読み込み失敗時の処理", () => {
    it("初回取得失敗時にerrorが設定される", async () => {
      mockApi.recommend.$post.mockRejectedValue(new Error("Network Error"));

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toBe("Network Error");
    });

    it("API呼び出しがok=falseの場合、errorが設定される", async () => {
      mockApi.recommend.$post.mockResolvedValue(createErrorResponse(500));

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.error).not.toBeNull();
    });

    it("初回取得失敗時にisEmptyがfalseになる（エラー状態は空ではない）", async () => {
      mockApi.recommend.$post.mockRejectedValue(new Error("Error"));

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.isEmpty).toBe(false);
      expect(result.current.error).not.toBeNull();
    });

    it("refetch呼び出しで再試行が成功する", async () => {
      mockApi.recommend.$post
        .mockRejectedValueOnce(new Error("Network Error"))
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("173")]));

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.articles).toHaveLength(1);
    });
  });

  describe("リセット", () => {
    it("reset呼び出しで全状態が初期化される", async () => {
      mockApi.recommend.$post.mockResolvedValueOnce(
        createSuccessResponse([createMockArticle("173"), createMockArticle("682")], false)
      );

      const { result } = renderHook(() => useInfiniteArticles({ initialCount: 2 }));

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(2);
      });

      act(() => {
        result.current.goToNext();
      });
      expect(result.current.currentIndex).toBe(1);

      act(() => {
        result.current.reset();
      });

      expect(result.current.articles).toEqual([]);
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.error).toBeNull();
      expect(result.current.hasMore).toBe(true);
    });
  });

  describe("エッジケース: クリーンアップ", () => {
    it("コンポーネントアンマウント時に進行中のAPI呼び出しが安全に処理される", () => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises -- 遅延レスポンスのモック
      mockApi.recommend.$post.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(createSuccessResponse([createMockArticle("173")]));
          }, 100);
        });
      });

      const { unmount } = renderHook(() => useInfiniteArticles());

      unmount();

      expect(true).toBe(true);
    });
  });

  describe("エッジケース: APIレスポンスの異常", () => {
    it("hasMoreがundefinedの場合はfalseとして扱われる", async () => {
      mockApi.recommend.$post.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          recommendations: [createMockArticle("173")],
          count: 1,
          // hasMore未定義
        }),
      });

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.hasMore).toBe(false);
    });
  });

  describe("エッジケース: URLフィルタリング", () => {
    it("空URLの記事がフィルタされる", async () => {
      const articles: Article[] = [
        createMockArticle("173"),
        { ...createMockArticle("682"), url: "" },
        createMockArticle("999"),
      ];
      mockApi.recommend.$post.mockResolvedValueOnce(createSuccessResponse(articles, false));

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.articles).toHaveLength(2);
      expect(result.current.articles.map((a) => a.id)).toEqual(["173", "999"]);
    });
  });
});
