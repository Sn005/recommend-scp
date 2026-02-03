/**
 * @file useFeedback フックのテスト
 * @see specs/006-frontend/006-02-article-reader/006-02-05.md
 */
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// モックをテストの前に定義
vi.mock("@/shared/lib/api-client", () => ({
  api: {
    feedback: {
      $post: vi.fn(),
    },
  },
}));

vi.mock("@/shared/hooks/useVisitorId", () => ({
  useVisitorId: vi.fn(),
}));

// モックの後でインポート
import { useFeedback } from "../useFeedback";
import { api } from "@/shared/lib/api-client";
import { useVisitorId } from "@/shared/hooks/useVisitorId";

const mockApi = api as unknown as {
  feedback: {
    $post: ReturnType<typeof vi.fn>;
  };
};

const mockUseVisitorId = useVisitorId as ReturnType<typeof vi.fn>;

// localStorageモック
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- テスト用モック
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("useFeedback", () => {
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
    mockApi.feedback.$post.mockReset();
    mockApi.feedback.$post.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true }),
    });

    // localStorageクリア
    localStorageMock.clear();

    // タイマーを使用
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("AC-1: 読了判定（暗黙的Like）", () => {
    it("recordLike()でtype=likeのフィードバックが送信される", async () => {
      // Arrange
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      // Act
      await act(async () => {
        await result.current.recordLike(articleId);
      });

      // Assert
      expect(mockApi.feedback.$post).toHaveBeenCalledWith({
        json: { visitorId: "test-visitor-id", articleId: "scp-173", type: "like" },
      });
      expect(result.current.hasRecorded(articleId)).toBe(true);
      expect(result.current.getFeedbackType(articleId)).toBe("like");
    });

    it("同じ記事で2回目の読了時はAPI呼び出しをスキップする", async () => {
      // Arrange
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      // 1回目のLike
      await act(async () => {
        await result.current.recordLike(articleId);
      });

      mockApi.feedback.$post.mockClear();

      // Act: 2回目のLike
      await act(async () => {
        await result.current.recordLike(articleId);
      });

      // Assert: API呼び出しがスキップされる
      expect(mockApi.feedback.$post).not.toHaveBeenCalled();
    });
  });

  describe("AC-2: スキップ（Dislike）", () => {
    it("recordDislike()でtype=dislikeのフィードバックが送信される", async () => {
      // Arrange
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      // Act
      await act(async () => {
        await result.current.recordDislike(articleId);
      });

      // Assert
      expect(mockApi.feedback.$post).toHaveBeenCalledWith({
        json: { visitorId: "test-visitor-id", articleId: "scp-173", type: "dislike" },
      });
      expect(result.current.hasRecorded(articleId)).toBe(true);
      expect(result.current.getFeedbackType(articleId)).toBe("dislike");
    });

    it("Dislike記録後もユーザー操作はブロックされない", async () => {
      // Arrange
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      // Act: エラー時でもresolveする
      const startTime = Date.now();
      await act(async () => {
        await result.current.recordDislike(articleId);
      });
      const endTime = Date.now();

      // Assert: 即座に完了（ブロックされない）
      expect(endTime - startTime).toBeLessThan(100);
      expect(result.current.hasRecorded(articleId)).toBe(true);
    });
  });

  describe("AC-3: 重複記録防止", () => {
    it("同じ記事に既にフィードバックがある場合はAPI呼び出しをスキップする", async () => {
      // Arrange
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      // 1回目: Like記録
      await act(async () => {
        await result.current.recordLike(articleId);
      });

      expect(mockApi.feedback.$post).toHaveBeenCalledTimes(1);
      mockApi.feedback.$post.mockClear();

      // Act: 2回目: 同じ記事でDislike試行
      await act(async () => {
        await result.current.recordDislike(articleId);
      });

      // Assert: 優先度が低いのでスキップ（like > dislike）
      expect(mockApi.feedback.$post).not.toHaveBeenCalled();
      expect(result.current.getFeedbackType(articleId)).toBe("like");
    });

    it("hasRecorded()で記録済み状態を正確に確認できる", async () => {
      // Arrange
      const { result } = renderHook(() => useFeedback());

      // Assert: 初期状態
      expect(result.current.hasRecorded("scp-173")).toBe(false);
      expect(result.current.hasRecorded("scp-096")).toBe(false);

      // Act: Like記録
      await act(async () => {
        await result.current.recordLike("scp-173");
      });

      // Assert: 記録後
      expect(result.current.hasRecorded("scp-173")).toBe(true);
      expect(result.current.hasRecorded("scp-096")).toBe(false);
    });

    it("getFeedbackType()でフィードバック種別を取得できる", async () => {
      // Arrange
      const { result } = renderHook(() => useFeedback());

      // Assert: 初期状態
      expect(result.current.getFeedbackType("scp-173")).toBeNull();

      // Act: Like記録
      await act(async () => {
        await result.current.recordLike("scp-173");
      });

      // Assert: 記録後
      expect(result.current.getFeedbackType("scp-173")).toBe("like");
    });
  });

  describe("AC-4: オフライン対応", () => {
    it("API失敗時にフィードバックをローカルキューに追加する", async () => {
      // Arrange
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      // Mock: API失敗
      mockApi.feedback.$post.mockRejectedValueOnce(new Error("Network error"));

      // Act
      await act(async () => {
        await result.current.recordLike(articleId);
      });

      // Assert: キューに追加
      expect(result.current.pendingCount).toBe(1);
      expect(result.current.hasRecorded(articleId)).toBe(true); // 楽観的更新
    });

    it("ネットワーク復帰時にキューのフィードバックを再送信する", async () => {
      // Arrange
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      // Mock: 初回失敗、2回目成功
      mockApi.feedback.$post
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ success: true }),
        });

      // Act: オフライン時のLike記録
      await act(async () => {
        await result.current.recordLike(articleId);
      });

      expect(result.current.pendingCount).toBe(1);

      // Act: オンライン復帰イベント発火
      act(() => {
        window.dispatchEvent(new Event("online"));
      });

      // Assert: キューが処理される（Promiseを待つ）
      await act(async () => {
        // フック内の非同期処理を待機
        await Promise.resolve();
      });

      expect(result.current.pendingCount).toBe(0);
      expect(mockApi.feedback.$post).toHaveBeenCalledTimes(2);
    });

    it("localStorageにキューが永続化される", async () => {
      // Arrange
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      mockApi.feedback.$post.mockRejectedValueOnce(new Error("Network error"));

      // Act: オフライン時のLike記録
      await act(async () => {
        await result.current.recordLike(articleId);
      });

      // Assert: localStorageに保存
      const stored = localStorage.getItem("scp-feedback-pending");
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored ?? "[]") as { articleId: string; type: string }[];
      expect(parsed).toHaveLength(1);
      expect(parsed[0]?.articleId).toBe(articleId);
      expect(parsed[0]?.type).toBe("like");
    });
  });

  describe("AC-5: エラーハンドリング", () => {
    it("API失敗時でもユーザー操作はブロックされない", async () => {
      // Arrange
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      mockApi.feedback.$post.mockRejectedValueOnce(new Error("Server error"));

      // Act: エラー時でもresolveする
      const startTime = Date.now();
      await act(async () => {
        await result.current.recordLike(articleId);
      });
      const endTime = Date.now();

      // Assert: 即座に完了（ブロックされない）
      expect(endTime - startTime).toBeLessThan(100);
      expect(result.current.hasRecorded(articleId)).toBe(true);
    });

    it("バックグラウンドで最大3回リトライする", async () => {
      // Arrange
      vi.useRealTimers(); // このテストでは実際のタイマーを使用
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      // Mock: 3回失敗、4回目成功
      mockApi.feedback.$post
        .mockRejectedValueOnce(new Error("Error 1"))
        .mockRejectedValueOnce(new Error("Error 2"))
        .mockRejectedValueOnce(new Error("Error 3"))
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ success: true }),
        });

      // Act: 失敗してキューに追加
      await act(async () => {
        await result.current.recordLike(articleId);
      });

      expect(result.current.pendingCount).toBe(1);

      // 定期処理を手動でトリガー（onlineイベントを使用）
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          window.dispatchEvent(new Event("online"));
          await Promise.resolve();
        });
      }

      // Assert: 最終的に成功
      expect(result.current.pendingCount).toBe(0);
      expect(mockApi.feedback.$post).toHaveBeenCalledTimes(4);

      vi.useFakeTimers(); // 他のテストのために戻す
    });

    it("最大リトライ回数を超えるとキューから削除する", async () => {
      // Arrange
      vi.useRealTimers(); // このテストでは実際のタイマーを使用
      mockApi.feedback.$post.mockReset(); // モックをリセット
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      // Mock: 常に失敗
      mockApi.feedback.$post.mockRejectedValue(new Error("Permanent error"));

      // Act: 失敗してキューに追加（初回呼び出し）
      await act(async () => {
        await result.current.recordLike(articleId);
      });

      expect(result.current.pendingCount).toBe(1);

      // 定期処理を手動でトリガー（onlineイベントを使用）
      // MAX_RETRIES=3なので、retryCount: 0→1→2→3（4回目で削除）
      for (let i = 0; i < 4; i++) {
        await act(async () => {
          window.dispatchEvent(new Event("online"));
          await Promise.resolve();
        });
      }

      // Assert: キューから削除
      expect(result.current.pendingCount).toBe(0);
      // 初回API呼び出し + 4回のprocessQueue試行
      expect(mockApi.feedback.$post).toHaveBeenCalledTimes(5);

      vi.useFakeTimers(); // 他のテストのために戻す
    });
  });

  describe("AC-6: フィードバック種別の優先度", () => {
    it("favorite > like > dislike の優先度で上書きされる", async () => {
      // Arrange
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      // Act: dislike → like → favorite
      await act(async () => {
        await result.current.recordDislike(articleId);
      });
      expect(result.current.getFeedbackType(articleId)).toBe("dislike");

      await act(async () => {
        await result.current.recordLike(articleId);
      });
      expect(result.current.getFeedbackType(articleId)).toBe("like");

      await act(async () => {
        await result.current.recordFavorite(articleId);
      });
      expect(result.current.getFeedbackType(articleId)).toBe("favorite");
    });

    it("低優先度のフィードバックは高優先度を上書きしない", async () => {
      // Arrange
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      // Act: favorite → like試行
      await act(async () => {
        await result.current.recordFavorite(articleId);
      });

      mockApi.feedback.$post.mockClear();

      await act(async () => {
        await result.current.recordLike(articleId);
      });

      // Assert: favoriteのまま（likeは無視）
      expect(result.current.getFeedbackType(articleId)).toBe("favorite");
      expect(mockApi.feedback.$post).not.toHaveBeenCalled();
    });

    it("同じ優先度のフィードバックは重複記録されない", async () => {
      // Arrange
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      // Act: like → like
      await act(async () => {
        await result.current.recordLike(articleId);
      });

      mockApi.feedback.$post.mockClear();

      await act(async () => {
        await result.current.recordLike(articleId);
      });

      // Assert: 2回目は無視
      expect(mockApi.feedback.$post).not.toHaveBeenCalled();
    });

    it("dislikeはlike/favoriteで上書きされる", async () => {
      // Arrange
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      // dislikeを記録
      await act(async () => {
        await result.current.recordDislike(articleId);
      });
      expect(result.current.getFeedbackType(articleId)).toBe("dislike");

      // likeで上書き
      await act(async () => {
        await result.current.recordLike(articleId);
      });
      expect(result.current.getFeedbackType(articleId)).toBe("like");
    });

    it("likeはfavoriteで上書きされるがdislikeでは上書きされない", async () => {
      // Arrange
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      // likeを記録
      await act(async () => {
        await result.current.recordLike(articleId);
      });
      expect(result.current.getFeedbackType(articleId)).toBe("like");

      // dislikeでは上書きされない
      mockApi.feedback.$post.mockClear();
      await act(async () => {
        await result.current.recordDislike(articleId);
      });
      expect(result.current.getFeedbackType(articleId)).toBe("like");
      expect(mockApi.feedback.$post).not.toHaveBeenCalled();

      // favoriteで上書き
      await act(async () => {
        await result.current.recordFavorite(articleId);
      });
      expect(result.current.getFeedbackType(articleId)).toBe("favorite");
    });
  });

  describe("recordFavorite", () => {
    it("recordFavorite()でローカル状態が更新される（APIは呼び出さない）", async () => {
      // Arrange
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      // Act
      await act(async () => {
        await result.current.recordFavorite(articleId);
      });

      // Assert: favoriteはfeedback APIではなくfavorites APIで管理するため、ここでは呼び出さない
      // 006-02-06（お気に入りボタン）で別途実装される
      expect(mockApi.feedback.$post).not.toHaveBeenCalled();
      // ローカル状態は更新される（優先度管理のため）
      expect(result.current.hasRecorded(articleId)).toBe(true);
      expect(result.current.getFeedbackType(articleId)).toBe("favorite");
    });
  });

  describe("pendingCount", () => {
    it("pendingCountで保留中の件数を取得できる", async () => {
      // Arrange
      const { result } = renderHook(() => useFeedback());

      // Assert: 初期状態
      expect(result.current.pendingCount).toBe(0);

      // Mock: API失敗
      mockApi.feedback.$post.mockRejectedValue(new Error("Network error"));

      // Act: 複数のフィードバックを記録
      await act(async () => {
        await result.current.recordLike("scp-173");
      });
      expect(result.current.pendingCount).toBe(1);

      await act(async () => {
        await result.current.recordDislike("scp-682");
      });
      expect(result.current.pendingCount).toBe(2);
    });
  });

  describe("エッジケース", () => {
    it("visitorIdがない場合はAPI呼び出しをスキップする", async () => {
      // Arrange
      mockUseVisitorId.mockReturnValue({
        visitorId: null,
        isLoading: true,
        isOnboarded: false,
        error: null,
        refresh: vi.fn(),
      });

      const { result } = renderHook(() => useFeedback());

      // Act
      await act(async () => {
        await result.current.recordLike("scp-173");
      });

      // Assert: API呼び出しがスキップされる
      expect(mockApi.feedback.$post).not.toHaveBeenCalled();
    });

    it("空文字のarticleIdの場合はAPI呼び出しをスキップする", async () => {
      // Arrange
      const { result } = renderHook(() => useFeedback());

      // Act
      await act(async () => {
        await result.current.recordLike("");
      });

      // Assert: API呼び出しがスキップされる
      expect(mockApi.feedback.$post).not.toHaveBeenCalled();
    });
  });
});
