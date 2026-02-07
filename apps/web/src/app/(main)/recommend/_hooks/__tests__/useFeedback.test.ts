/**
 * @file useFeedback フックのテスト
 * @see specs/006-frontend/006-05-transition-ux/006-05-06.md
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
import { useFeedback, calculateInterestLevel } from "../useFeedback";
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

  describe("AC-1: Dislike記録の廃止", () => {
    it("recordDislikeメソッドが存在しない", () => {
      const { result } = renderHook(() => useFeedback());
      expect(result.current).not.toHaveProperty("recordDislike");
    });

    it("recordSkipメソッドが存在する", () => {
      const { result } = renderHook(() => useFeedback());
      expect(result.current).toHaveProperty("recordSkip");
      expect(typeof result.current.recordSkip).toBe("function");
    });
  });

  describe("AC-2: 暗黙的フィードバックの記録", () => {
    it("recordSkip()でtype=skipのフィードバックが送信される", async () => {
      const { result } = renderHook(() => useFeedback());
      const metadata = {
        scrollDepth: 30,
        dwellTime: 15,
        interestLevel: "neutral" as const,
      };

      await act(async () => {
        await result.current.recordSkip("scp-173", metadata);
      });

      expect(mockApi.feedback.$post).toHaveBeenCalledWith({
        json: {
          visitorId: "test-visitor-id",
          articleId: "scp-173",
          type: "skip",
          metadata: {
            scrollDepth: 30,
            dwellTime: 15,
            interestLevel: "neutral",
          },
        },
      });
    });

    it("メタデータが正しくAPI呼び出しに含まれる", async () => {
      const { result } = renderHook(() => useFeedback());
      const metadata = {
        scrollDepth: 70,
        dwellTime: 45,
        interestLevel: "like" as const,
      };

      await act(async () => {
        await result.current.recordSkip("scp-096", metadata);
      });

      expect(mockApi.feedback.$post).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          json: expect.objectContaining({
            metadata: {
              scrollDepth: 70,
              dwellTime: 45,
              interestLevel: "like",
            },
          }),
        })
      );
    });
  });

  describe("AC-3: 低興味判定（skip）", () => {
    it("scrollDepth=5%, dwellTime=3sでinterestLevel=skipが算出される", () => {
      expect(calculateInterestLevel(5, 3)).toBe("skip");
    });

    it("scrollDepth=9%, dwellTime=4sでinterestLevel=skipが算出される（境界値内）", () => {
      expect(calculateInterestLevel(9, 4)).toBe("skip");
    });

    it("scrollDepth=0%, dwellTime=0sでinterestLevel=skipが算出される", () => {
      expect(calculateInterestLevel(0, 0)).toBe("skip");
    });
  });

  describe("AC-4: 中興味判定（neutral）", () => {
    it("scrollDepth=30%, dwellTime=15sでinterestLevel=neutralが算出される", () => {
      expect(calculateInterestLevel(30, 15)).toBe("neutral");
    });

    it("境界値: scrollDepth=10%, dwellTime=5sでinterestLevel=neutralが算出される", () => {
      expect(calculateInterestLevel(10, 5)).toBe("neutral");
    });

    it("境界値: scrollDepth=50%, dwellTime=30sでinterestLevel=neutralが算出される", () => {
      expect(calculateInterestLevel(50, 30)).toBe("neutral");
    });

    it("scrollDepth=20%, dwellTime=3sでinterestLevel=neutralが算出される（スクロール条件のみ満たす）", () => {
      expect(calculateInterestLevel(20, 3)).toBe("neutral");
    });

    it("scrollDepth=5%, dwellTime=10sでinterestLevel=neutralが算出される（時間条件のみ満たす）", () => {
      expect(calculateInterestLevel(5, 10)).toBe("neutral");
    });
  });

  describe("AC-5: 高興味判定（like）", () => {
    it("scrollDepth=70%, dwellTime=45sでinterestLevel=likeが算出される", () => {
      expect(calculateInterestLevel(70, 45)).toBe("like");
    });

    it("境界値: scrollDepth=51%, dwellTime=31sでinterestLevel=likeが算出される", () => {
      expect(calculateInterestLevel(51, 31)).toBe("like");
    });

    it("scrollDepth=100%, dwellTime=60sでinterestLevel=likeが算出される", () => {
      expect(calculateInterestLevel(100, 60)).toBe("like");
    });
  });

  describe("AC-8: 既存Like/Favoriteとの優先度", () => {
    it("既にLike記録済みの記事でrecordSkip()がスキップされる", async () => {
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      await act(async () => {
        await result.current.recordLike(articleId);
      });

      mockApi.feedback.$post.mockClear();

      await act(async () => {
        await result.current.recordSkip(articleId, {
          scrollDepth: 30,
          dwellTime: 15,
          interestLevel: "neutral",
        });
      });

      expect(mockApi.feedback.$post).not.toHaveBeenCalled();
      expect(result.current.getFeedbackType(articleId)).toBe("like");
    });

    it("既にFavorite記録済みの記事でrecordSkip()がスキップされる", async () => {
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      await act(async () => {
        await result.current.recordFavorite(articleId);
      });

      mockApi.feedback.$post.mockClear();

      await act(async () => {
        await result.current.recordSkip(articleId, {
          scrollDepth: 30,
          dwellTime: 15,
          interestLevel: "neutral",
        });
      });

      expect(mockApi.feedback.$post).not.toHaveBeenCalled();
      expect(result.current.getFeedbackType(articleId)).toBe("favorite");
    });

    it("Skip記録後にLikeで上書きされる", async () => {
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      await act(async () => {
        await result.current.recordSkip(articleId, {
          scrollDepth: 5,
          dwellTime: 3,
          interestLevel: "skip",
        });
      });

      expect(result.current.getFeedbackType(articleId)).toBe("skip");

      await act(async () => {
        await result.current.recordLike(articleId);
      });

      expect(result.current.getFeedbackType(articleId)).toBe("like");
    });
  });

  describe("読了判定（暗黙的Like）", () => {
    it("recordLike()でtype=likeのフィードバックが送信される", async () => {
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      await act(async () => {
        await result.current.recordLike(articleId);
      });

      expect(mockApi.feedback.$post).toHaveBeenCalledWith({
        json: { visitorId: "test-visitor-id", articleId: "scp-173", type: "like" },
      });
      expect(result.current.hasRecorded(articleId)).toBe(true);
      expect(result.current.getFeedbackType(articleId)).toBe("like");
    });

    it("同じ記事で2回目の読了時はAPI呼び出しをスキップする", async () => {
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      await act(async () => {
        await result.current.recordLike(articleId);
      });

      mockApi.feedback.$post.mockClear();

      await act(async () => {
        await result.current.recordLike(articleId);
      });

      expect(mockApi.feedback.$post).not.toHaveBeenCalled();
    });
  });

  describe("オフライン対応", () => {
    it("API失敗時にフィードバックをローカルキューに追加する", async () => {
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      mockApi.feedback.$post.mockRejectedValueOnce(new Error("Network error"));

      await act(async () => {
        await result.current.recordLike(articleId);
      });

      expect(result.current.pendingCount).toBe(1);
      expect(result.current.hasRecorded(articleId)).toBe(true);
    });

    it("ネットワーク復帰時にキューのフィードバックを再送信する", async () => {
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      mockApi.feedback.$post
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ success: true }),
        });

      await act(async () => {
        await result.current.recordLike(articleId);
      });

      expect(result.current.pendingCount).toBe(1);

      act(() => {
        window.dispatchEvent(new Event("online"));
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.pendingCount).toBe(0);
      expect(mockApi.feedback.$post).toHaveBeenCalledTimes(2);
    });

    it("localStorageにキューが永続化される", async () => {
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      mockApi.feedback.$post.mockRejectedValueOnce(new Error("Network error"));

      await act(async () => {
        await result.current.recordLike(articleId);
      });

      const stored = localStorage.getItem("scp-feedback-pending");
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored ?? "[]") as { articleId: string; type: string }[];
      expect(parsed).toHaveLength(1);
      expect(parsed[0]?.articleId).toBe(articleId);
      expect(parsed[0]?.type).toBe("like");
    });
  });

  describe("エラーハンドリング", () => {
    it("API失敗時でもユーザー操作はブロックされない", async () => {
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      mockApi.feedback.$post.mockRejectedValueOnce(new Error("Server error"));

      const startTime = Date.now();
      await act(async () => {
        await result.current.recordLike(articleId);
      });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
      expect(result.current.hasRecorded(articleId)).toBe(true);
    });

    it("バックグラウンドで最大3回リトライする", async () => {
      vi.useRealTimers();
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      mockApi.feedback.$post
        .mockRejectedValueOnce(new Error("Error 1"))
        .mockRejectedValueOnce(new Error("Error 2"))
        .mockRejectedValueOnce(new Error("Error 3"))
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ success: true }),
        });

      await act(async () => {
        await result.current.recordLike(articleId);
      });

      expect(result.current.pendingCount).toBe(1);

      for (let i = 0; i < 3; i++) {
        await act(async () => {
          window.dispatchEvent(new Event("online"));
          await Promise.resolve();
        });
      }

      expect(result.current.pendingCount).toBe(0);
      expect(mockApi.feedback.$post).toHaveBeenCalledTimes(4);

      vi.useFakeTimers();
    });

    it("最大リトライ回数を超えるとキューから削除する", async () => {
      vi.useRealTimers();
      mockApi.feedback.$post.mockReset();
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      mockApi.feedback.$post.mockRejectedValue(new Error("Permanent error"));

      await act(async () => {
        await result.current.recordLike(articleId);
      });

      expect(result.current.pendingCount).toBe(1);

      for (let i = 0; i < 4; i++) {
        await act(async () => {
          window.dispatchEvent(new Event("online"));
          await Promise.resolve();
        });
      }

      expect(result.current.pendingCount).toBe(0);
      expect(mockApi.feedback.$post).toHaveBeenCalledTimes(5);

      vi.useFakeTimers();
    });
  });

  describe("フィードバック種別の優先度", () => {
    it("favorite > like > skip の優先度で上書きされる", async () => {
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      await act(async () => {
        await result.current.recordSkip(articleId, {
          scrollDepth: 5,
          dwellTime: 3,
          interestLevel: "skip",
        });
      });
      expect(result.current.getFeedbackType(articleId)).toBe("skip");

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
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      await act(async () => {
        await result.current.recordFavorite(articleId);
      });

      mockApi.feedback.$post.mockClear();

      await act(async () => {
        await result.current.recordLike(articleId);
      });

      expect(result.current.getFeedbackType(articleId)).toBe("favorite");
      expect(mockApi.feedback.$post).not.toHaveBeenCalled();
    });

    it("同じ優先度のフィードバックは重複記録されない", async () => {
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      await act(async () => {
        await result.current.recordLike(articleId);
      });

      mockApi.feedback.$post.mockClear();

      await act(async () => {
        await result.current.recordLike(articleId);
      });

      expect(mockApi.feedback.$post).not.toHaveBeenCalled();
    });
  });

  describe("recordFavorite", () => {
    it("recordFavorite()でローカル状態が更新される（APIは呼び出さない）", async () => {
      const { result } = renderHook(() => useFeedback());
      const articleId = "scp-173";

      await act(async () => {
        await result.current.recordFavorite(articleId);
      });

      expect(mockApi.feedback.$post).not.toHaveBeenCalled();
      expect(result.current.hasRecorded(articleId)).toBe(true);
      expect(result.current.getFeedbackType(articleId)).toBe("favorite");
    });
  });

  describe("pendingCount", () => {
    it("pendingCountで保留中の件数を取得できる", async () => {
      const { result } = renderHook(() => useFeedback());

      expect(result.current.pendingCount).toBe(0);

      mockApi.feedback.$post.mockRejectedValue(new Error("Network error"));

      await act(async () => {
        await result.current.recordLike("scp-173");
      });
      expect(result.current.pendingCount).toBe(1);

      await act(async () => {
        await result.current.recordSkip("scp-682", {
          scrollDepth: 30,
          dwellTime: 15,
          interestLevel: "neutral",
        });
      });
      expect(result.current.pendingCount).toBe(2);
    });
  });

  describe("recordSkip エッジケース", () => {
    it("scrollDepth=0%, dwellTime=0sでも正常に記録される", async () => {
      const { result } = renderHook(() => useFeedback());

      await act(async () => {
        await result.current.recordSkip("scp-173", {
          scrollDepth: 0,
          dwellTime: 0,
          interestLevel: "skip",
        });
      });

      expect(mockApi.feedback.$post).toHaveBeenCalled();
    });

    it("scrollDepth=100%, dwellTime=1000sの極端な値でも正常に記録される", async () => {
      const { result } = renderHook(() => useFeedback());

      await act(async () => {
        await result.current.recordSkip("scp-173", {
          scrollDepth: 100,
          dwellTime: 1000,
          interestLevel: "like",
        });
      });

      expect(mockApi.feedback.$post).toHaveBeenCalled();
    });

    it("visitorIdがない場合はAPI呼び出しをスキップする", async () => {
      mockUseVisitorId.mockReturnValue({
        visitorId: null,
        isLoading: true,
        isOnboarded: false,
        error: null,
        refresh: vi.fn(),
      });

      const { result } = renderHook(() => useFeedback());

      await act(async () => {
        await result.current.recordSkip("scp-173", {
          scrollDepth: 30,
          dwellTime: 15,
          interestLevel: "neutral",
        });
      });

      expect(mockApi.feedback.$post).not.toHaveBeenCalled();
    });

    it("空文字のarticleIdの場合はAPI呼び出しをスキップする", async () => {
      const { result } = renderHook(() => useFeedback());

      await act(async () => {
        await result.current.recordSkip("", {
          scrollDepth: 30,
          dwellTime: 15,
          interestLevel: "neutral",
        });
      });

      expect(mockApi.feedback.$post).not.toHaveBeenCalled();
    });

    it("API失敗時にキューに追加される", async () => {
      const { result } = renderHook(() => useFeedback());
      mockApi.feedback.$post.mockRejectedValueOnce(new Error("Network error"));

      await act(async () => {
        await result.current.recordSkip("scp-173", {
          scrollDepth: 30,
          dwellTime: 15,
          interestLevel: "neutral",
        });
      });

      expect(result.current.pendingCount).toBe(1);
    });
  });
});
