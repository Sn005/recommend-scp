/**
 * @file useArticleFavorite フックのテスト
 * @description 006-02-08: お気に入りボタンAPI連携
 * @see specs/006-frontend/006-02-article-reader/006-02-08.md
 */
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useArticleFavorite, favoriteCache } from "../useArticleFavorite";

// APIクライアントのモック
const mockFavoritesPost = vi.fn();
const mockFavoritesDelete = vi.fn();
const mockFavoritesGet = vi.fn();
vi.mock("@/shared/lib/api-client", () => ({
  api: {
    favorites: {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- テスト用モック
      $get: (...args: unknown[]) => mockFavoritesGet(...args),
      ":articleId": {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- テスト用モック
        $post: (...args: unknown[]) => mockFavoritesPost(...args),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- テスト用モック
        $delete: (...args: unknown[]) => mockFavoritesDelete(...args),
      },
    },
  },
}));

// useVisitorIdのモック（デフォルト: visitorIdあり）
let mockVisitorId: string | null = "test-visitor-id";
vi.mock("@/shared/hooks/useVisitorId", () => ({
  useVisitorId: () => ({
    visitorId: mockVisitorId,
    isLoading: false,
  }),
}));

describe("useArticleFavorite", () => {
  beforeEach(() => {
    // キャッシュをクリア
    favoriteCache.clear();
    // モックをリセット
    vi.clearAllMocks();
    // visitorIdをデフォルトに戻す
    mockVisitorId = "test-visitor-id";
    // 成功レスポンスをデフォルトに
    mockFavoritesPost.mockResolvedValue({ ok: true });
    mockFavoritesDelete.mockResolvedValue({ ok: true });
    // GET /favorites のデフォルト: 解決しないPromise（他テストへの干渉を防止）
    // APIフェッチテストでは個別にmockResolvedValueを設定する
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- 意図的に解決しないPromise
    mockFavoritesGet.mockReturnValue(new Promise(() => {}));
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("AC-1: 初期状態表示", () => {
    it("articleIdが指定されていない場合、isFavoritedはfalseになる", () => {
      // Arrange & Act
      const { result } = renderHook(() => useArticleFavorite({ articleId: undefined }));

      // Assert
      expect(result.current.isFavorited).toBe(false);
      expect(result.current.isProcessing).toBe(false);
    });

    it("initialFavorited=falseの場合、isFavoritedはfalseになる", () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: false })
      );

      // Assert
      expect(result.current.isFavorited).toBe(false);
    });

    it("initialFavorited=trueの場合、isFavoritedはtrueになる", () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: true })
      );

      // Assert
      expect(result.current.isFavorited).toBe(true);
    });

    it("キャッシュに状態がある場合、キャッシュの状態が優先される", () => {
      // Arrange
      favoriteCache.set("scp-173", true);

      // Act
      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: false })
      );

      // Assert
      expect(result.current.isFavorited).toBe(true);
    });

    it("キャッシュがundefinedの場合、initialFavoritedにフォールバックする", () => {
      // Arrange - キャッシュなし

      // Act
      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: true })
      );

      // Assert
      expect(result.current.isFavorited).toBe(true);
    });
  });

  describe("AC-1(008): お気に入り追加時にPOST APIを呼び出す", () => {
    it("TC-1: 追加時に POST /favorites/:articleId が呼ばれる", async () => {
      // Arrange
      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: false })
      );

      // Act
      await act(async () => {
        await result.current.addFavorite();
      });

      // Assert
      expect(mockFavoritesPost).toHaveBeenCalledWith({
        param: { articleId: "scp-173" },
        json: { visitorId: "test-visitor-id" },
      });
      expect(mockFavoritesPost).toHaveBeenCalledTimes(1);
    });

    it("TC-2: POST 成功時にお気に入り状態が true のまま維持される", async () => {
      // Arrange
      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: false })
      );

      // Act
      await act(async () => {
        await result.current.addFavorite();
      });

      // Assert
      expect(result.current.isFavorited).toBe(true);
      expect(favoriteCache.get("scp-173")).toBe(true);
    });

    it("addFavoriteは楽観的更新で即座にUIを反映する", async () => {
      // Arrange
      let resolvePromise: () => void;
      mockFavoritesPost.mockImplementation(
        () =>
          new Promise<{ ok: boolean }>((resolve) => {
            resolvePromise = () => {
              resolve({ ok: true });
            };
          })
      );

      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: false })
      );

      // Act: addFavoriteを開始（Promiseを返す）
      let promise: Promise<void>;
      act(() => {
        promise = result.current.addFavorite();
      });

      // Assert: 即座にUIが更新されている
      expect(result.current.isFavorited).toBe(true);
      expect(result.current.isProcessing).toBe(true);

      // Cleanup
      await act(async () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- テスト用Promise解決
        resolvePromise!();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- テスト用Promise待機
        await promise!;
      });
    });

    it("favoriteCacheにお気に入り状態が保存される", async () => {
      // Arrange
      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: false })
      );

      // Act
      await act(async () => {
        await result.current.addFavorite();
      });

      // Assert
      expect(favoriteCache.get("scp-173")).toBe(true);
    });

    it("articleIdがundefinedの場合、addFavoriteは何もしない", async () => {
      // Arrange
      const { result } = renderHook(() => useArticleFavorite({ articleId: undefined }));

      // Act
      await act(async () => {
        await result.current.addFavorite();
      });

      // Assert
      expect(mockFavoritesPost).not.toHaveBeenCalled();
    });

    it("既にisFavorited=trueの場合、addFavoriteは何もしない", async () => {
      // Arrange
      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: true })
      );

      // Act
      await act(async () => {
        await result.current.addFavorite();
      });

      // Assert
      expect(mockFavoritesPost).not.toHaveBeenCalled();
    });
  });

  describe("AC-2(008): POST失敗時にロールバックする", () => {
    it("TC-3: POST 失敗時にお気に入り状態が false にロールバックされる", async () => {
      // Arrange
      mockFavoritesPost.mockRejectedValue(new Error("Network Error"));

      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: false })
      );

      // Act
      await act(async () => {
        await result.current.addFavorite();
      });

      // Assert
      expect(result.current.isFavorited).toBe(false);
      expect(favoriteCache.get("scp-173")).toBe(false);
    });

    it("POST失敗後もisProcessingはfalseに戻る", async () => {
      // Arrange
      mockFavoritesPost.mockRejectedValue(new Error("API Error"));

      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: false })
      );

      // Act
      await act(async () => {
        await result.current.addFavorite();
      });

      // Assert
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe("AC-3(008): お気に入り解除時にDELETE APIを呼び出す", () => {
    it("TC-5: 解除時に DELETE /favorites/:articleId が呼ばれる", async () => {
      // Arrange
      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: true })
      );

      // Act
      await act(async () => {
        await result.current.removeFavorite();
      });

      // Assert
      expect(mockFavoritesDelete).toHaveBeenCalledWith({
        param: { articleId: "scp-173" },
        json: { visitorId: "test-visitor-id" },
      });
      expect(mockFavoritesDelete).toHaveBeenCalledTimes(1);
    });

    it("TC-6: DELETE 成功時にお気に入り状態が false のまま維持される", async () => {
      // Arrange
      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: true })
      );

      // Act
      await act(async () => {
        await result.current.removeFavorite();
      });

      // Assert
      expect(result.current.isFavorited).toBe(false);
      expect(favoriteCache.get("scp-173")).toBe(false);
    });

    it("favoriteCacheからお気に入り状態が削除される（falseに設定）", async () => {
      // Arrange
      favoriteCache.set("scp-173", true);
      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: true })
      );

      // Act
      await act(async () => {
        await result.current.removeFavorite();
      });

      // Assert
      expect(favoriteCache.get("scp-173")).toBe(false);
    });

    it("articleIdがundefinedの場合、removeFavoriteは何もしない", async () => {
      // Arrange
      const { result } = renderHook(() => useArticleFavorite({ articleId: undefined }));

      // Act
      await act(async () => {
        await result.current.removeFavorite();
      });

      // Assert
      expect(mockFavoritesDelete).not.toHaveBeenCalled();
    });

    it("既にisFavorited=falseの場合、removeFavoriteは何もしない", async () => {
      // Arrange
      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: false })
      );

      // Act
      await act(async () => {
        await result.current.removeFavorite();
      });

      // Assert
      expect(mockFavoritesDelete).not.toHaveBeenCalled();
    });
  });

  describe("AC-4(008): DELETE失敗時にロールバックする", () => {
    it("TC-7: DELETE 失敗時にお気に入り状態が true にロールバックされる", async () => {
      // Arrange
      mockFavoritesDelete.mockRejectedValue(new Error("Network Error"));

      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: true })
      );

      // Act
      await act(async () => {
        await result.current.removeFavorite();
      });

      // Assert
      expect(result.current.isFavorited).toBe(true);
      expect(favoriteCache.get("scp-173")).toBe(true);
    });

    it("DELETE失敗後もisProcessingはfalseに戻る", async () => {
      // Arrange
      mockFavoritesDelete.mockRejectedValue(new Error("API Error"));

      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: true })
      );

      // Act
      await act(async () => {
        await result.current.removeFavorite();
      });

      // Assert
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe("AC-5(008): API呼び出し時にvisitorIdを送信する", () => {
    it("TC-10: POST APIリクエストボディにvisitorIdが含まれる", async () => {
      // Arrange
      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: false })
      );

      // Act
      await act(async () => {
        await result.current.addFavorite();
      });

      // Assert
      expect(mockFavoritesPost).toHaveBeenCalledWith(
        expect.objectContaining({
          json: { visitorId: "test-visitor-id" },
        })
      );
    });

    it("TC-10: DELETE APIリクエストボディにvisitorIdが含まれる", async () => {
      // Arrange
      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: true })
      );

      // Act
      await act(async () => {
        await result.current.removeFavorite();
      });

      // Assert
      expect(mockFavoritesDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          json: { visitorId: "test-visitor-id" },
        })
      );
    });

    it("TC-4: visitorIdがnullの場合、POST APIはスキップされる", async () => {
      // Arrange
      mockVisitorId = null;

      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: false })
      );

      // Act
      await act(async () => {
        await result.current.addFavorite();
      });

      // Assert
      expect(mockFavoritesPost).not.toHaveBeenCalled();
      // ローカルキャッシュは更新される
      expect(result.current.isFavorited).toBe(true);
      expect(favoriteCache.get("scp-173")).toBe(true);
    });

    it("visitorIdがnullの場合、DELETE APIはスキップされる", async () => {
      // Arrange
      mockVisitorId = null;

      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: true })
      );

      // Act
      await act(async () => {
        await result.current.removeFavorite();
      });

      // Assert
      expect(mockFavoritesDelete).not.toHaveBeenCalled();
      // ローカルキャッシュは更新される
      expect(result.current.isFavorited).toBe(false);
      expect(favoriteCache.get("scp-173")).toBe(false);
    });
  });

  describe("AC-6(008): 連打防止・Optimistic UIを維持する", () => {
    it("TC-9: isProcessing=trueの間、addFavoriteは無視される", async () => {
      // Arrange
      let resolvePromise: () => void;
      mockFavoritesPost.mockImplementation(
        () =>
          new Promise<{ ok: boolean }>((resolve) => {
            resolvePromise = () => {
              resolve({ ok: true });
            };
          })
      );

      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: false })
      );

      // Act: 1回目のaddFavoriteを開始
      let promise1: Promise<void>;
      act(() => {
        promise1 = result.current.addFavorite();
      });

      expect(result.current.isProcessing).toBe(true);

      // Act: 2回目のaddFavorite（処理中）
      await act(async () => {
        await result.current.addFavorite();
      });

      // Assert: mockFavoritesPostは1回だけ呼ばれる
      expect(mockFavoritesPost).toHaveBeenCalledTimes(1);

      // Cleanup
      await act(async () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- テスト用Promise解決
        resolvePromise!();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- テスト用Promise待機
        await promise1!;
      });
    });

    it("isProcessing=trueの間、removeFavoriteは追加呼び出しを無視する", async () => {
      // Arrange
      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: true })
      );

      // Act: 連続でremoveFavoriteを呼び出し
      await act(async () => {
        const promises = [
          result.current.removeFavorite(),
          result.current.removeFavorite(),
          result.current.removeFavorite(),
        ];
        await Promise.all(promises);
      });

      // Assert: 状態は正しく変更されている
      expect(result.current.isFavorited).toBe(false);
      expect(result.current.isProcessing).toBe(false);
    });

    it("toggleFavorite連打でも重複APIコールが発生しない", async () => {
      // Arrange
      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: false })
      );

      // Act: 連続で呼び出し
      await act(async () => {
        const promises = [
          result.current.toggleFavorite(),
          result.current.toggleFavorite(),
          result.current.toggleFavorite(),
          result.current.toggleFavorite(),
          result.current.toggleFavorite(),
        ];
        await Promise.all(promises);
      });

      // Assert: POST APIは1回だけ呼ばれる
      expect(mockFavoritesPost).toHaveBeenCalledTimes(1);
    });
  });

  describe("TC-8: toggleFavoriteで追加→解除が正しく動作する", () => {
    it("未お気に入り状態でtoggleFavoriteを呼ぶとaddFavoriteが実行される", async () => {
      // Arrange
      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: false })
      );

      // Act
      await act(async () => {
        await result.current.toggleFavorite();
      });

      // Assert
      expect(result.current.isFavorited).toBe(true);
      expect(mockFavoritesPost).toHaveBeenCalled();
    });

    it("お気に入り状態でtoggleFavoriteを呼ぶとremoveFavoriteが実行される", async () => {
      // Arrange
      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: true })
      );

      // Act
      await act(async () => {
        await result.current.toggleFavorite();
      });

      // Assert
      expect(result.current.isFavorited).toBe(false);
      expect(mockFavoritesDelete).toHaveBeenCalled();
    });
  });

  describe("記事切り替え時の状態リセット", () => {
    it("articleIdが変更されると、新しい記事の状態に更新される", () => {
      // Arrange
      const { result, rerender } = renderHook(
        ({
          articleId,
          initialFavorited,
        }: {
          articleId: string | undefined;
          initialFavorited: boolean;
        }) => useArticleFavorite({ articleId, initialFavorited }),
        { initialProps: { articleId: "scp-173", initialFavorited: false } }
      );

      expect(result.current.isFavorited).toBe(false);

      // Act: 記事を切り替え
      rerender({ articleId: "scp-096", initialFavorited: true });

      // Assert
      expect(result.current.isFavorited).toBe(true);
    });

    it("新しい記事にキャッシュがある場合、キャッシュが優先される", () => {
      // Arrange
      favoriteCache.set("scp-096", true);

      const { result, rerender } = renderHook(
        ({
          articleId,
          initialFavorited,
        }: {
          articleId: string | undefined;
          initialFavorited: boolean;
        }) => useArticleFavorite({ articleId, initialFavorited }),
        { initialProps: { articleId: "scp-173", initialFavorited: false } }
      );

      // Act: キャッシュがある記事へ切り替え
      rerender({ articleId: "scp-096", initialFavorited: false });

      // Assert
      expect(result.current.isFavorited).toBe(true);
    });

    it("undefinedに切り替えると、状態がリセットされる", () => {
      // Arrange
      const { result, rerender } = renderHook(
        ({ articleId }: { articleId: string | undefined }) =>
          useArticleFavorite({ articleId, initialFavorited: true }),
        { initialProps: { articleId: "scp-173" as string | undefined } }
      );

      expect(result.current.isFavorited).toBe(true);

      // Act
      rerender({ articleId: undefined });

      // Assert
      expect(result.current.isFavorited).toBe(false);
    });

    it("同じ記事に戻った場合、キャッシュが正しく機能する（A→B→A）", async () => {
      // Arrange
      const { result, rerender } = renderHook(
        ({
          articleId,
          initialFavorited,
        }: {
          articleId: string | undefined;
          initialFavorited: boolean;
        }) => useArticleFavorite({ articleId, initialFavorited }),
        { initialProps: { articleId: "scp-173", initialFavorited: false } }
      );

      // Act: Aをお気に入りに追加
      await act(async () => {
        await result.current.addFavorite();
      });
      expect(result.current.isFavorited).toBe(true);

      // Act: Bに切り替え
      rerender({ articleId: "scp-096", initialFavorited: false });
      expect(result.current.isFavorited).toBe(false);

      // Act: Aに戻る
      rerender({ articleId: "scp-173", initialFavorited: false });

      // Assert: キャッシュからtrueが復元される
      expect(result.current.isFavorited).toBe(true);
    });
  });

  describe("APIからお気に入り状態を取得", () => {
    it("キャッシュが空の場合、GET /favoritesからお気に入り状態を取得する", async () => {
      // Arrange: APIレスポンスにscp-173が含まれる
      mockFavoritesGet.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            favorites: [{ articleId: "scp-173" }, { articleId: "scp-096" }],
            total: 2,
          }),
      });

      // Act
      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: false })
      );

      // Assert: API取得後にお気に入り状態がtrueに更新される
      await vi.waitFor(() => {
        expect(result.current.isFavorited).toBe(true);
      });
      expect(favoriteCache.get("scp-173")).toBe(true);
    });

    it("APIレスポンスに対象記事がない場合、isFavoritedはfalseのまま", async () => {
      // Arrange: APIレスポンスにscp-999は含まれない
      mockFavoritesGet.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            favorites: [{ articleId: "scp-173" }],
            total: 1,
          }),
      });

      // Act
      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-999", initialFavorited: false })
      );

      // Assert: APIフェッチ完了後にキャッシュが更新されるのを待つ
      await vi.waitFor(() => {
        expect(favoriteCache.has("scp-999")).toBe(true);
      });
      expect(result.current.isFavorited).toBe(false);
      expect(favoriteCache.get("scp-999")).toBe(false);
    });

    it("キャッシュに値がある場合、APIフェッチをスキップする", async () => {
      // Arrange
      favoriteCache.set("scp-173", true);

      // Act
      renderHook(() => useArticleFavorite({ articleId: "scp-173", initialFavorited: false }));

      // Assert: API呼び出しは行われない
      // 少し待ってからチェック
      await act(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 50);
        });
      });
      expect(mockFavoritesGet).not.toHaveBeenCalled();
    });

    it("visitorIdがnullの場合、APIフェッチをスキップする", async () => {
      // Arrange
      mockVisitorId = null;

      // Act
      renderHook(() => useArticleFavorite({ articleId: "scp-173", initialFavorited: false }));

      // Assert
      await act(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 50);
        });
      });
      expect(mockFavoritesGet).not.toHaveBeenCalled();
    });

    it("APIフェッチが失敗した場合、状態はフォールバック値のまま", async () => {
      // Arrange
      mockFavoritesGet.mockRejectedValue(new Error("Network Error"));

      // Act
      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: false })
      );

      // Assert
      await act(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 50);
        });
      });
      expect(result.current.isFavorited).toBe(false);
    });
  });

  describe("エッジケース", () => {
    it("isProcessingは処理完了後にfalseに戻る", async () => {
      // Arrange
      const { result } = renderHook(() =>
        useArticleFavorite({ articleId: "scp-173", initialFavorited: false })
      );

      // Act
      await act(async () => {
        await result.current.addFavorite();
      });

      // Assert
      expect(result.current.isProcessing).toBe(false);
    });
  });
});
