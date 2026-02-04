/**
 * @file useFavorites フックのテスト
 * @description お気に入りAPI連携フックのテスト
 * @see specs/006-frontend/006-03-favorites/006-03-03.md
 */
import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// モックをテストの前に定義
vi.mock("@/shared/lib/api-client", () => ({
  api: {
    favorites: {
      $get: vi.fn(),
    },
  },
}));

vi.mock("@/shared/hooks/useVisitorId", () => ({
  useVisitorId: vi.fn(),
}));

// モックの後でインポート
import { useFavorites } from "../useFavorites";
import { api } from "@/shared/lib/api-client";
import { useVisitorId } from "@/shared/hooks/useVisitorId";
import type { Mock } from "vitest";

// 型アサーション
const mockUseVisitorId = vi.mocked(useVisitorId);
// apiオブジェクトの型をMockとしてキャスト
const mockFavoritesGet = api.favorites.$get as Mock;

// テスト用モックデータ
const mockFavoritesResponse = {
  favorites: [
    {
      id: "fav-1",
      articleId: "scp-173",
      title: "彫刻 - オリジナル",
      objectClass: "euclid",
      rating: 4102,
      favoritedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "fav-2",
      articleId: "scp-096",
      title: "シャイガイ",
      objectClass: "euclid",
      rating: 2000,
      favoritedAt: "2024-01-02T00:00:00Z",
    },
  ],
  total: 2,
};

describe("useFavorites", () => {
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
    vi.clearAllMocks();

    // デフォルトのAPI成功レスポンス
    mockFavoritesGet.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockFavoritesResponse),
    } as unknown as Response);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("AC-1: 一覧取得", () => {
    it("visitorId存在時にGET /favorites APIを呼び出す", async () => {
      renderHook(() => useFavorites());

      await waitFor(() => {
        expect(mockFavoritesGet).toHaveBeenCalledWith({
          query: { visitorId: "test-visitor-id" },
        });
      });
    });

    it("取得したデータがfavorites配列にセットされる", async () => {
      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.favorites).toHaveLength(2);
      expect(result.current.favorites[0].articleId).toBe("scp-173");
      expect(result.current.favorites[0].title).toBe("彫刻 - オリジナル");
    });

    it("visitorIdがnullの場合はAPI呼び出しをスキップする", async () => {
      mockUseVisitorId.mockReturnValue({
        visitorId: null,
        isLoading: false,
        isOnboarded: false,
        error: null,
        refresh: vi.fn(),
      });

      const { result } = renderHook(() => useFavorites());

      // ローディングが終わるまで待つ
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFavoritesGet).not.toHaveBeenCalled();
      expect(result.current.favorites).toEqual([]);
    });

    it("favorites配列が空の場合も正常に処理される", async () => {
      mockFavoritesGet.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ favorites: [], total: 0 }),
      } as unknown as Response);

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.favorites).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe("AC-2: ローディング状態", () => {
    it("API呼び出し中はisLoading=trueになる", () => {
      // APIを永久にpendingにする
      mockFavoritesGet.mockReturnValue(
        new Promise(() => {
          /* never resolves */
        })
      );

      const { result } = renderHook(() => useFavorites());

      expect(result.current.isLoading).toBe(true);
    });

    it("API完了後にisLoading=falseになる", async () => {
      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("AC-3: エラー状態", () => {
    it("API失敗時にerrorにErrorオブジェクトがセットされる", async () => {
      mockFavoritesGet.mockResolvedValue({
        ok: false,
        status: 500,
      } as unknown as Response);

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain("Failed to fetch favorites");
    });

    it("エラー時もfavoritesは空配列のまま維持される", async () => {
      mockFavoritesGet.mockResolvedValue({
        ok: false,
        status: 500,
      } as unknown as Response);

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.favorites).toEqual([]);
    });

    it("ネットワークエラー時にerrorが設定される", async () => {
      mockFavoritesGet.mockRejectedValue(new Error("Network Error"));

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe("AC-4, AC-5: お気に入り削除と楽観的更新", () => {
    // DELETE APIのモック
    let mockDeleteFn: Mock;

    // DELETE APIのモック設定
    const setupDeleteMock = (success = true) => {
      if (success) {
        mockDeleteFn = vi.fn().mockResolvedValue({
          ok: true,
          status: 204,
        });
      } else {
        // 失敗時はエラーをスロー（Hono RPCの実際の挙動）
        mockDeleteFn = vi.fn().mockRejectedValue(new Error("API Error"));
      }
      // モックのために動的プロパティを設定
      Object.defineProperty(api.favorites, ":articleId", {
        value: { $delete: mockDeleteFn },
        writable: true,
        configurable: true,
      });
    };

    it("removeFavorite(articleId)でDELETE APIを呼び出す", async () => {
      setupDeleteMock(true);

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.removeFavorite("scp-173");
      });

      expect(mockDeleteFn).toHaveBeenCalledWith({
        param: { articleId: "scp-173" },
        json: { visitorId: "test-visitor-id" },
      });
    });

    it("removeFavorite呼び出しで即座にUI上から削除される（楽観的更新）", async () => {
      setupDeleteMock(true);

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.favorites).toHaveLength(2);
      });

      // 削除実行（APIレスポンスを待たずに即座に削除される）
      act(() => {
        void result.current.removeFavorite("scp-173");
      });

      // 即座に1件になっている
      expect(result.current.favorites).toHaveLength(1);
      expect(result.current.favorites[0].articleId).toBe("scp-096");
    });

    it("削除API失敗時に元の状態にロールバックする", async () => {
      setupDeleteMock(false);

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.favorites).toHaveLength(2);
      });

      // 削除試行（失敗）
      await act(async () => {
        await result.current.removeFavorite("scp-173");
      });

      // ロールバックされている
      expect(result.current.favorites).toHaveLength(2);
      expect(result.current.favorites.find((f) => f.articleId === "scp-173")).toBeDefined();
    });

    it("articleIdが空の場合はAPI呼び出しをスキップする", async () => {
      setupDeleteMock(true);

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.removeFavorite("");
      });

      expect(mockDeleteFn).not.toHaveBeenCalled();
    });
  });

  describe("AC-6: リフレッシュ機能", () => {
    it("refresh()呼び出しで一覧を再取得する", async () => {
      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // API呼び出し回数をリセット
      mockFavoritesGet.mockClear();

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockFavoritesGet).toHaveBeenCalledTimes(1);
    });

    it("refresh()呼び出しでエラー状態がクリアされる", async () => {
      // 初回はエラー
      mockFavoritesGet.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as unknown as Response);

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.error).toBeInstanceOf(Error);
      });

      // 2回目は成功
      mockFavoritesGet.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ favorites: [], total: 0 }),
      } as unknown as Response);

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });

    it("refresh()呼び出し中もisLoading=trueになる", async () => {
      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // refresh中はローディング
      let refreshPromise: Promise<void>;
      mockFavoritesGet.mockReturnValueOnce(
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: vi.fn().mockResolvedValue({ favorites: [], total: 0 }),
            } as unknown as Response);
          }, 100);
        })
      );

      act(() => {
        refreshPromise = result.current.refresh();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await refreshPromise;
      });
    });
  });

  describe("初期状態", () => {
    it("初回レンダリング時にfavoritesが空配列である", () => {
      // APIを永久にpendingにする
      mockFavoritesGet.mockReturnValue(
        new Promise(() => {
          /* never resolves */
        })
      );

      const { result } = renderHook(() => useFavorites());

      expect(result.current.favorites).toEqual([]);
    });

    it("初回レンダリング時にerrorがnullである", () => {
      mockFavoritesGet.mockReturnValue(
        new Promise(() => {
          /* never resolves */
        })
      );

      const { result } = renderHook(() => useFavorites());

      expect(result.current.error).toBeNull();
    });
  });

  describe("型安全性", () => {
    it("FavoriteArticle型の全プロパティが正しくマッピングされる", async () => {
      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const favorite = result.current.favorites[0];
      expect(favorite).toMatchObject({
        id: "fav-1",
        articleId: "scp-173",
        title: "彫刻 - オリジナル",
        objectClass: "euclid",
        rating: 4102,
        favoritedAt: "2024-01-01T00:00:00Z",
      });
    });
  });
});
