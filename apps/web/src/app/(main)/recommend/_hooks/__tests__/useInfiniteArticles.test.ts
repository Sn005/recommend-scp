/**
 * @file useInfiniteArticles フックのテスト
 * @see specs/006-frontend/006-02-article-reader/006-02-04.md
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

describe("useInfiniteArticles", () => {
  beforeEach(() => {
    // useVisitorIdのデフォルトモック
    mockUseVisitorId.mockReturnValue({
      visitorId: "test-visitor-id",
      isLoading: false,
      isOnboarded: true,
      error: null,
      refresh: vi.fn(),
    });

    // APIモックをリセット
    mockApi.recommend.$post.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("初期状態", () => {
    it("初期状態でisLoadingがtrueになる", () => {
      // Arrange
      mockApi.recommend.$post.mockReturnValue(
        new Promise(() => {
          /* pending forever */
        })
      ); // 永久にpending

      // Act
      const { result } = renderHook(() => useInfiniteArticles());

      // Assert
      expect(result.current.isLoading).toBe(true);
    });

    it("初期状態でarticlesが空配列", () => {
      // Arrange
      mockApi.recommend.$post.mockReturnValue(
        new Promise(() => {
          /* pending forever */
        })
      );

      // Act
      const { result } = renderHook(() => useInfiniteArticles());

      // Assert
      expect(result.current.articles).toEqual([]);
    });

    it("初期状態でcurrentIndexが0", () => {
      // Arrange
      mockApi.recommend.$post.mockReturnValue(
        new Promise(() => {
          /* pending forever */
        })
      );

      // Act
      const { result } = renderHook(() => useInfiniteArticles());

      // Assert
      expect(result.current.currentIndex).toBe(0);
    });

    it("初期状態でhasMoreがtrue", () => {
      // Arrange
      mockApi.recommend.$post.mockReturnValue(
        new Promise(() => {
          /* pending forever */
        })
      );

      // Act
      const { result } = renderHook(() => useInfiniteArticles());

      // Assert
      expect(result.current.hasMore).toBe(true);
    });

    it("初期状態でisPausedがfalse", () => {
      // Arrange
      mockApi.recommend.$post.mockReturnValue(
        new Promise(() => {
          /* pending forever */
        })
      );

      // Act
      const { result } = renderHook(() => useInfiniteArticles());

      // Assert
      expect(result.current.isPaused).toBe(false);
    });
  });

  describe("AC-2: 初回読み込み", () => {
    it("初回読み込みでinitialCount件の記事が取得される", async () => {
      // Arrange
      const mockArticles = [
        createMockArticle("173"),
        createMockArticle("682"),
        createMockArticle("999"),
      ];
      mockApi.recommend.$post.mockResolvedValue(createSuccessResponse(mockArticles));

      // Act
      const { result } = renderHook(() => useInfiniteArticles({ initialCount: 3 }));

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.articles).toHaveLength(3);
    });

    it("POST /recommend APIが正しいパラメータで呼び出される", async () => {
      // Arrange
      mockApi.recommend.$post.mockResolvedValue(createSuccessResponse([]));

      // Act
      const { result } = renderHook(() => useInfiniteArticles({ initialCount: 5 }));

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(mockApi.recommend.$post).toHaveBeenCalledWith({
        json: { visitorId: "test-visitor-id", limit: 5 },
      });
    });

    it("記事取得完了後、articlesに記事が格納される", async () => {
      // Arrange
      const mockArticles = [createMockArticle("173", "SCP-173 - 彫刻")];
      mockApi.recommend.$post.mockResolvedValue(createSuccessResponse(mockArticles));

      // Act
      const { result } = renderHook(() => useInfiniteArticles());

      // Assert
      await waitFor(() => {
        expect(result.current.articles).toHaveLength(1);
      });
      expect(result.current.articles[0].id).toBe("173");
      expect(result.current.articles[0].title).toBe("SCP-173 - 彫刻");
    });

    it("読み込み完了後、isLoadingがfalseになる", async () => {
      // Arrange
      mockApi.recommend.$post.mockResolvedValue(createSuccessResponse([]));

      // Act
      const { result } = renderHook(() => useInfiniteArticles());

      // Assert
      expect(result.current.isLoading).toBe(true);
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("visitorIdがロード中の場合、API呼び出しを待機する", () => {
      // Arrange
      mockUseVisitorId.mockReturnValue({
        visitorId: null,
        isLoading: true,
        isOnboarded: false,
        error: null,
        refresh: vi.fn(),
      });

      // Act
      const { result } = renderHook(() => useInfiniteArticles());

      // Assert
      expect(mockApi.recommend.$post).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(true);
    });

    it("オプションを指定しない場合デフォルト値が使用される", async () => {
      // Arrange
      mockApi.recommend.$post.mockResolvedValue(createSuccessResponse([]));

      // Act
      const { result } = renderHook(() => useInfiniteArticles());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(mockApi.recommend.$post).toHaveBeenCalledWith({
        json: { visitorId: "test-visitor-id", limit: 3 }, // DEFAULT_INITIAL_COUNT
      });
    });
  });

  describe("AC-2: 追加読み込み (loadMore)", () => {
    it("loadMore呼び出しでPOST /recommendが実行される", async () => {
      // Arrange
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("173")]))
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("682")]));

      const { result } = renderHook(() => useInfiniteArticles({ initialCount: 1 }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act
      await act(async () => {
        await result.current.loadMore();
      });

      // Assert
      expect(mockApi.recommend.$post).toHaveBeenCalledTimes(2);
    });

    it("loadMore実行中にisLoadingMoreがtrueになる", async () => {
      // Arrange
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

      // Act
      let loadMorePromise: Promise<void>;
      act(() => {
        loadMorePromise = result.current.loadMore();
      });

      // Assert
      expect(result.current.isLoadingMore).toBe(true);

      await act(async () => {
        await loadMorePromise;
      });

      expect(result.current.isLoadingMore).toBe(false);
    });

    it("loadMoreCountオプションが反映される", async () => {
      // Arrange
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("173")]))
        .mockResolvedValueOnce(createSuccessResponse([]));

      const { result } = renderHook(() =>
        useInfiniteArticles({ initialCount: 1, loadMoreCount: 5 })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act
      await act(async () => {
        await result.current.loadMore();
      });

      // Assert
      expect(mockApi.recommend.$post).toHaveBeenLastCalledWith({
        json: { visitorId: "test-visitor-id", limit: 5 },
      });
    });
  });

  describe("AC-3: シームレス接続", () => {
    it("loadMore成功後、新しい記事が既存配列の末尾に追加される", async () => {
      // Arrange
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("173")]))
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("682")]));

      const { result } = renderHook(() => useInfiniteArticles({ initialCount: 1 }));

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(1);
      });

      // Act
      await act(async () => {
        await result.current.loadMore();
      });

      // Assert
      expect(result.current.articles).toHaveLength(2);
      expect(result.current.articles[0].id).toBe("173");
      expect(result.current.articles[1].id).toBe("682");
    });

    it("複数回loadMoreを実行しても記事が順序通り追加される", async () => {
      // Arrange
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("173")]))
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("682")]))
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("999")]));

      const { result } = renderHook(() => useInfiniteArticles({ initialCount: 1 }));

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(1);
      });

      // Act
      await act(async () => {
        await result.current.loadMore();
      });
      await act(async () => {
        await result.current.loadMore();
      });

      // Assert
      expect(result.current.articles).toHaveLength(3);
      expect(result.current.articles.map((a) => a.id)).toEqual(["173", "682", "999"]);
    });

    it("0件のarticlesが返された場合でもエラーにならない", async () => {
      // Arrange
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("173")]))
        .mockResolvedValueOnce(createSuccessResponse([], false));

      const { result } = renderHook(() => useInfiniteArticles({ initialCount: 1 }));

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(1);
      });

      // Act
      await act(async () => {
        await result.current.loadMore();
      });

      // Assert
      expect(result.current.articles).toHaveLength(1);
      expect(result.current.error).toBeNull();
    });

    it("currentIndexがloadMore後も変化しない（スクロール位置維持）", async () => {
      // Arrange
      mockApi.recommend.$post
        .mockResolvedValueOnce(
          createSuccessResponse([createMockArticle("173"), createMockArticle("682")])
        )
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("999")]));

      const { result } = renderHook(() => useInfiniteArticles({ initialCount: 2 }));

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(2);
      });

      // currentIndexを1に進める
      act(() => {
        result.current.goToNext();
      });
      expect(result.current.currentIndex).toBe(1);

      // Act
      await act(async () => {
        await result.current.loadMore();
      });

      // Assert
      expect(result.current.currentIndex).toBe(1); // 変化しない
    });
  });

  describe("AC-4: 重複取得防止", () => {
    it("loadMore実行中に再度loadMoreを呼んでも重複リクエストしない", async () => {
      // Arrange
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

      // Act - 並行して2回呼び出し
      await act(async () => {
        const promise1 = result.current.loadMore();
        const promise2 = result.current.loadMore();
        await Promise.all([promise1, promise2]);
      });

      // Assert - API呼び出しは初回 + loadMore 1回 = 2回のみ
      expect(mockApi.recommend.$post).toHaveBeenCalledTimes(2);
    });

    it("hasMoreがfalseの場合loadMoreは何もしない", async () => {
      // Arrange
      mockApi.recommend.$post.mockResolvedValueOnce(
        createSuccessResponse([createMockArticle("173")], false)
      );

      const { result } = renderHook(() => useInfiniteArticles({ initialCount: 1 }));

      await waitFor(() => {
        expect(result.current.hasMore).toBe(false);
      });

      const initialCallCount = mockApi.recommend.$post.mock.calls.length;

      // Act
      await act(async () => {
        await result.current.loadMore();
      });

      // Assert
      expect(mockApi.recommend.$post).toHaveBeenCalledTimes(initialCallCount);
    });

    it("isPausedがtrueの場合loadMoreは何もしない", async () => {
      // Arrange - autoLoadLimit=1で1回のloadMoreでisPausedがtrueになる
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("173")]))
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("682")]));

      const { result } = renderHook(() =>
        useInfiniteArticles({ initialCount: 1, autoLoadLimit: 1 })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 1回loadMoreでisPausedがtrue
      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.isPaused).toBe(true);

      const callCountAfterPause = mockApi.recommend.$post.mock.calls.length;

      // Act
      await act(async () => {
        await result.current.loadMore();
      });

      // Assert - 追加の呼び出しなし
      expect(mockApi.recommend.$post).toHaveBeenCalledTimes(callCountAfterPause);
    });

    it("3回以上連続でloadMoreを呼んでも重複しない", async () => {
      // Arrange
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("173")]))
        // eslint-disable-next-line @typescript-eslint/no-misused-promises -- 遅延レスポンスのモック
        .mockImplementation(() => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(createSuccessResponse([createMockArticle("new")]));
            }, 50);
          });
        });

      const { result } = renderHook(() =>
        useInfiniteArticles({ initialCount: 1, autoLoadLimit: 10 })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act - 3回並行して呼び出し
      await act(async () => {
        const promises = [
          result.current.loadMore(),
          result.current.loadMore(),
          result.current.loadMore(),
        ];
        await Promise.all(promises);
      });

      // Assert - 初回 + loadMore 1回 = 2回のみ
      expect(mockApi.recommend.$post).toHaveBeenCalledTimes(2);
    });
  });

  describe("AC-5: 取得上限", () => {
    it("autoLoadLimit回に達するとisPausedがtrueになる", async () => {
      // Arrange
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("173")]))
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("682")]))
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("999")]))
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("001")]));

      const { result } = renderHook(() =>
        useInfiniteArticles({ initialCount: 1, autoLoadLimit: 3 })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act - 3回loadMore
      await act(async () => {
        await result.current.loadMore();
      });
      expect(result.current.isPaused).toBe(false);

      await act(async () => {
        await result.current.loadMore();
      });
      expect(result.current.isPaused).toBe(false);

      await act(async () => {
        await result.current.loadMore();
      });

      // Assert
      expect(result.current.isPaused).toBe(true);
    });

    it("resumeAutoLoad呼び出しでisPausedがfalseになる", async () => {
      // Arrange
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("173")]))
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("682")]));

      const { result } = renderHook(() =>
        useInfiniteArticles({ initialCount: 1, autoLoadLimit: 1 })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.loadMore();
      });
      expect(result.current.isPaused).toBe(true);

      // Act
      act(() => {
        result.current.resumeAutoLoad();
      });

      // Assert
      expect(result.current.isPaused).toBe(false);
    });

    it("resumeAutoLoad呼び出しでautoLoadCountがリセットされる", async () => {
      // Arrange
      // 5回のAPI呼び出し: 初回 + loadMore x 2 + resume後loadMore x 2
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("173")]))
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("682")]))
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("999")]))
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("001")]))
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("002")]));

      const { result } = renderHook(() =>
        useInfiniteArticles({ initialCount: 1, autoLoadLimit: 2 })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 2回loadMoreでisPausedになる（別々のactで実行）
      await act(async () => {
        await result.current.loadMore();
      });
      await act(async () => {
        await result.current.loadMore();
      });
      expect(result.current.isPaused).toBe(true);

      // resumeAutoLoadでリセット
      act(() => {
        result.current.resumeAutoLoad();
      });

      // 再度2回loadMoreできることを確認
      await act(async () => {
        await result.current.loadMore();
      });
      expect(result.current.isPaused).toBe(false);

      await act(async () => {
        await result.current.loadMore();
      });
      expect(result.current.isPaused).toBe(true);
    });

    it("autoLoadLimit=1の場合、1回のloadMoreでisPausedがtrueになる", async () => {
      // Arrange
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("173")]))
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("682")]));

      const { result } = renderHook(() =>
        useInfiniteArticles({ initialCount: 1, autoLoadLimit: 1 })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act
      await act(async () => {
        await result.current.loadMore();
      });

      // Assert
      expect(result.current.isPaused).toBe(true);
    });
  });

  describe("AC-6: 次へボタンによる遷移 (goToNext)", () => {
    it("goToNext呼び出しでcurrentIndexがインクリメントされる", async () => {
      // Arrange
      mockApi.recommend.$post.mockResolvedValueOnce(
        createSuccessResponse([createMockArticle("173"), createMockArticle("682")])
      );

      const { result } = renderHook(() => useInfiniteArticles({ initialCount: 2 }));

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(2);
      });

      expect(result.current.currentIndex).toBe(0);

      // Act
      act(() => {
        result.current.goToNext();
      });

      // Assert
      expect(result.current.currentIndex).toBe(1);
    });

    it("最後の記事でgoToNext呼び出し時にloadMoreが実行される", async () => {
      // Arrange
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("173")]))
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("682")]));

      const { result } = renderHook(() => useInfiniteArticles({ initialCount: 1 }));

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(1);
      });

      // Act - 最後の記事（index 0）でgoToNext
      act(() => {
        result.current.goToNext();
      });

      // Assert
      await waitFor(() => {
        expect(result.current.articles).toHaveLength(2);
      });
    });

    it("最後の記事でhasMoreがfalseの場合、goToNextは何もしない", async () => {
      // Arrange
      mockApi.recommend.$post.mockResolvedValueOnce(
        createSuccessResponse([createMockArticle("173")], false)
      );

      const { result } = renderHook(() => useInfiniteArticles({ initialCount: 1 }));

      await waitFor(() => {
        expect(result.current.hasMore).toBe(false);
      });

      const initialCallCount = mockApi.recommend.$post.mock.calls.length;

      // Act
      act(() => {
        result.current.goToNext();
      });

      // Assert
      expect(mockApi.recommend.$post).toHaveBeenCalledTimes(initialCallCount);
      expect(result.current.currentIndex).toBe(0); // 変化しない
    });

    it("isPausedがtrueの場合、最後の記事でgoToNextしてもloadMoreされない", async () => {
      // Arrange
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("173")]))
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("682")]));

      const { result } = renderHook(() =>
        useInfiniteArticles({ initialCount: 1, autoLoadLimit: 1 })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // loadMoreでisPausedにする
      await act(async () => {
        await result.current.loadMore();
      });
      expect(result.current.isPaused).toBe(true);

      // 最後の記事に移動
      act(() => {
        result.current.goToNext();
      });
      expect(result.current.currentIndex).toBe(1);

      const callCountAfterPause = mockApi.recommend.$post.mock.calls.length;

      // Act - 最後の記事でgoToNext
      act(() => {
        result.current.goToNext();
      });

      // Assert - loadMoreされない
      expect(mockApi.recommend.$post).toHaveBeenCalledTimes(callCountAfterPause);
    });

    it("複数回goToNextを連続で呼んでも正しく動作する", async () => {
      // Arrange
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

      // Act
      act(() => {
        result.current.goToNext();
        result.current.goToNext();
        result.current.goToNext(); // 最後を超えた
      });

      // Assert - 最大は articles.length - 1
      expect(result.current.currentIndex).toBe(2);
    });
  });

  describe("AC-7: 初回読み込み失敗時の処理", () => {
    it("初回取得失敗時にerrorが設定される", async () => {
      // Arrange
      mockApi.recommend.$post.mockRejectedValue(new Error("Network Error"));

      // Act
      const { result } = renderHook(() => useInfiniteArticles());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.error).not.toBeNull();
      // 元のエラーメッセージがそのまま保持される
      expect(result.current.error?.message).toBe("Network Error");
    });

    it("API呼び出しがok=falseの場合、errorが設定される", async () => {
      // Arrange
      mockApi.recommend.$post.mockResolvedValue(createErrorResponse(500));

      // Act
      const { result } = renderHook(() => useInfiniteArticles());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.error).not.toBeNull();
    });

    it("初回取得失敗時にisEmptyがfalseになる（エラー状態は空ではない）", async () => {
      // Arrange
      mockApi.recommend.$post.mockRejectedValue(new Error("Error"));

      // Act
      const { result } = renderHook(() => useInfiniteArticles());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      // isEmptyは「!isLoading && !error && articles.length === 0」なので、
      // エラー時はisEmpty=falseが正しい
      expect(result.current.isEmpty).toBe(false);
      expect(result.current.error).not.toBeNull();
    });

    it("refetch呼び出しで再試行が成功する", async () => {
      // Arrange
      mockApi.recommend.$post
        .mockRejectedValueOnce(new Error("Network Error"))
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("173")]));

      const { result } = renderHook(() => useInfiniteArticles());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Act
      await act(async () => {
        await result.current.refetch();
      });

      // Assert
      expect(result.current.error).toBeNull();
      expect(result.current.articles).toHaveLength(1);
    });

    it("API呼び出し失敗後もisLoadingMoreがfalseになる", async () => {
      // Arrange
      mockApi.recommend.$post
        .mockResolvedValueOnce(createSuccessResponse([createMockArticle("173")]))
        .mockRejectedValueOnce(new Error("Network Error"));

      const { result } = renderHook(() => useInfiniteArticles({ initialCount: 1 }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act
      await act(async () => {
        await result.current.loadMore();
      });

      // Assert
      expect(result.current.isLoadingMore).toBe(false);
    });
  });

  describe("リセット", () => {
    it("reset呼び出しで全状態が初期化される", async () => {
      // Arrange
      mockApi.recommend.$post.mockResolvedValue(
        createSuccessResponse([createMockArticle("173"), createMockArticle("682")])
      );

      const { result } = renderHook(() => useInfiniteArticles({ initialCount: 2 }));

      await waitFor(() => {
        expect(result.current.articles).toHaveLength(2);
      });

      // 状態を変更
      act(() => {
        result.current.goToNext();
      });
      expect(result.current.currentIndex).toBe(1);

      // Act
      act(() => {
        result.current.reset();
      });

      // Assert
      expect(result.current.articles).toEqual([]);
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.error).toBeNull();
      expect(result.current.hasMore).toBe(true);
      expect(result.current.isPaused).toBe(false);
    });
  });

  describe("エッジケース: クリーンアップ", () => {
    it("コンポーネントアンマウント時に進行中のAPI呼び出しが安全に処理される", () => {
      // Arrange
      // eslint-disable-next-line @typescript-eslint/no-misused-promises -- 遅延レスポンスのモック
      mockApi.recommend.$post.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(createSuccessResponse([createMockArticle("173")]));
          }, 100);
        });
      });

      // Act
      const { unmount } = renderHook(() => useInfiniteArticles());

      // API呼び出し中にアンマウント
      unmount();

      // Assert - エラーが投げられなければOK
      expect(true).toBe(true);
    });
  });

  describe("エッジケース: APIレスポンスの異常", () => {
    it("hasMoreがundefinedの場合はfalseとして扱われる", async () => {
      // Arrange
      mockApi.recommend.$post.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          recommendations: [createMockArticle("173")],
          count: 1,
          // hasMore未定義
        }),
      });

      // Act
      const { result } = renderHook(() => useInfiniteArticles());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.hasMore).toBe(false);
    });
  });
});
