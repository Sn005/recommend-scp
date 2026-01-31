import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// モックをテストの前に定義
vi.mock("../lib/api-client", () => ({
  api: {
    visitors: {
      $post: vi.fn(),
    },
  },
}));

// useVisitorIdはモックの後でインポート
import { useVisitorId, VISITOR_ID_KEY, ONBOARDING_COMPLETED_KEY } from "./useVisitorId";
import { api } from "../lib/api-client";

const mockApi = api as unknown as {
  visitors: {
    $post: ReturnType<typeof vi.fn>;
  };
};

describe("useVisitorId", () => {
  let localStorageStore: Record<string, string>;

  beforeEach(() => {
    // localStorageのストアをリセット
    localStorageStore = {};

    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(window.localStorage.getItem).mockImplementation(
      (key) => localStorageStore[key] ?? null
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(window.localStorage.setItem).mockImplementation((key, value) => {
      localStorageStore[key] = value;
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(window.localStorage.removeItem).mockImplementation((key) => {
      localStorageStore[key] = undefined as unknown as string;
    });

    // APIモックをリセット
    mockApi.visitors.$post.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("AC-1: visitorId初期化", () => {
    it("localStorageが空の場合、新規UUIDが生成される", async () => {
      // Arrange
      mockApi.visitors.$post.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            visitorId: "test-uuid-1234-5678-9abc-def012345678",
            isNew: true,
            createdAt: "2024-01-01T00:00:00Z",
          }),
      });

      // Act
      const { result } = renderHook(() => useVisitorId());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.visitorId).toBe("test-uuid-1234-5678-9abc-def012345678");
    });

    it("生成されたUUIDがlocalStorageに保存される", async () => {
      // Arrange
      mockApi.visitors.$post.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            visitorId: "test-uuid-1234-5678-9abc-def012345678",
            isNew: true,
            createdAt: "2024-01-01T00:00:00Z",
          }),
      });

      // Act
      const { result } = renderHook(() => useVisitorId());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        VISITOR_ID_KEY,
        "test-uuid-1234-5678-9abc-def012345678"
      );
    });

    it("新規visitor登録時にPOST /visitors APIが呼び出される", async () => {
      // Arrange
      mockApi.visitors.$post.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            visitorId: "test-uuid-1234-5678-9abc-def012345678",
            isNew: true,
            createdAt: "2024-01-01T00:00:00Z",
          }),
      });

      // Act
      const { result } = renderHook(() => useVisitorId());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(mockApi.visitors.$post).toHaveBeenCalledWith({
        json: { visitorId: "test-uuid-1234-5678-9abc-def012345678" },
      });
    });
  });

  describe("AC-2: visitorId取得（既存）", () => {
    it("localStorageにvisitorIdが存在する場合、それを返す", async () => {
      // Arrange
      const existingId = "existing-uuid-1234-5678-9abc-def012345678";
      localStorageStore[VISITOR_ID_KEY] = existingId;

      // Act
      const { result } = renderHook(() => useVisitorId());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.visitorId).toBe(existingId);
    });

    it("既存visitorの場合、APIは呼び出されない", async () => {
      // Arrange
      const existingId = "existing-uuid-1234-5678-9abc-def012345678";
      localStorageStore[VISITOR_ID_KEY] = existingId;

      // Act
      const { result } = renderHook(() => useVisitorId());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(mockApi.visitors.$post).not.toHaveBeenCalled();
    });
  });

  describe("AC-3: ローディング状態", () => {
    it("初期化中はisLoadingがtrueになる", () => {
      // Arrange
      mockApi.visitors.$post.mockReturnValue(
        new Promise(() => {
          // 永久にpending - 意図的に解決しない
        })
      );

      // Act
      const { result } = renderHook(() => useVisitorId());

      // Assert
      expect(result.current.isLoading).toBe(true);
    });

    it("初期化完了後はisLoadingがfalseになる", async () => {
      // Arrange
      mockApi.visitors.$post.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            visitorId: "test-uuid-1234-5678-9abc-def012345678",
            isNew: true,
            createdAt: "2024-01-01T00:00:00Z",
          }),
      });

      // Act
      const { result } = renderHook(() => useVisitorId());

      // Assert
      expect(result.current.isLoading).toBe(true);
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("AC-4: エラーハンドリング", () => {
    it("POST /visitors APIがエラーを返した際、errorオブジェクトに詳細を格納する", async () => {
      // Arrange
      mockApi.visitors.$post.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      // Act
      const { result } = renderHook(() => useVisitorId());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain("Failed to register visitor");
    });

    it("APIエラー時、visitorIdはnullのまま", async () => {
      // Arrange
      mockApi.visitors.$post.mockResolvedValue({
        ok: false,
        status: 500,
      });

      // Act
      const { result } = renderHook(() => useVisitorId());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.visitorId).toBeNull();
    });

    it("ネットワークエラー時にerrorが設定される", async () => {
      // Arrange
      mockApi.visitors.$post.mockRejectedValue(new Error("Network Error"));

      // Act
      const { result } = renderHook(() => useVisitorId());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Network Error");
    });
  });

  describe("AC-5: オンボーディング状態確認", () => {
    it("オンボーディング完了済みの場合、isOnboardedがtrueになる", async () => {
      // Arrange
      const existingId = "existing-uuid-1234-5678-9abc-def012345678";
      localStorageStore[VISITOR_ID_KEY] = existingId;
      localStorageStore[ONBOARDING_COMPLETED_KEY] = "true";

      // Act
      const { result } = renderHook(() => useVisitorId());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.isOnboarded).toBe(true);
    });

    it("オンボーディング未完了の場合、isOnboardedがfalseになる", async () => {
      // Arrange
      const existingId = "existing-uuid-1234-5678-9abc-def012345678";
      localStorageStore[VISITOR_ID_KEY] = existingId;
      // ONBOARDING_COMPLETED_KEY は設定しない

      // Act
      const { result } = renderHook(() => useVisitorId());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.isOnboarded).toBe(false);
    });

    it("新規登録時にサーバーからonboardingCompletedAtが返された場合、isOnboardedがtrueになる", async () => {
      // Arrange
      mockApi.visitors.$post.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            visitorId: "test-uuid-1234-5678-9abc-def012345678",
            isNew: false,
            createdAt: "2024-01-01T00:00:00Z",
            onboardingCompletedAt: "2024-01-02T00:00:00Z",
          }),
      });

      // Act
      const { result } = renderHook(() => useVisitorId());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.isOnboarded).toBe(true);
    });
  });

  describe("AC-6: Server State Sync", () => {
    it("サーバーからonboardingCompletedAtが返された場合、localStorageに同期する", async () => {
      // Arrange
      mockApi.visitors.$post.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            visitorId: "test-uuid-1234-5678-9abc-def012345678",
            isNew: false,
            createdAt: "2024-01-01T00:00:00Z",
            onboardingCompletedAt: "2024-01-02T00:00:00Z",
          }),
      });

      // Act
      const { result } = renderHook(() => useVisitorId());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(window.localStorage.setItem).toHaveBeenCalledWith(ONBOARDING_COMPLETED_KEY, "true");
    });
  });

  describe("refresh関数", () => {
    it("refresh関数で再初期化できる", async () => {
      // Arrange
      const existingId = "existing-uuid-1234-5678-9abc-def012345678";
      localStorageStore[VISITOR_ID_KEY] = existingId;

      const { result } = renderHook(() => useVisitorId());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // localStorageをクリア（既存のvisitorIdを削除）
      localStorageStore = {};

      mockApi.visitors.$post.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            visitorId: "new-uuid-1234-5678-9abc-def012345678",
            isNew: true,
            createdAt: "2024-01-01T00:00:00Z",
          }),
      });

      // Act
      await act(async () => {
        await result.current.refresh();
      });

      // Assert - crypto.randomUUID()のモック値が使われる
      expect(result.current.visitorId).toBe("test-uuid-1234-5678-9abc-def012345678");
    });

    it("refresh中はisLoadingがtrueになる", async () => {
      // Arrange
      const existingId = "existing-uuid-1234-5678-9abc-def012345678";
      localStorageStore[VISITOR_ID_KEY] = existingId;

      const { result } = renderHook(() => useVisitorId());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // localStorageをクリア
      localStorageStore = {};

      let resolver: ((value: unknown) => void) | undefined;
      mockApi.visitors.$post.mockReturnValue(
        new Promise((resolve) => {
          resolver = resolve;
        })
      );

      // Act
      act(() => {
        void result.current.refresh();
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Cleanup - Promiseを解決してテストを終了
      await act(() => {
        if (resolver) {
          resolver({
            ok: true,
            json: () =>
              Promise.resolve({
                visitorId: "test-uuid",
                isNew: true,
              }),
          });
        }
        return Promise.resolve();
      });
    });
  });

  describe("エッジケース", () => {
    it("コンポーネントがアンマウントされた場合、状態更新が行われない", async () => {
      // Arrange
      let resolver: ((value: unknown) => void) | undefined;
      mockApi.visitors.$post.mockReturnValue(
        new Promise((resolve) => {
          resolver = resolve;
        })
      );

      // Act
      const { unmount } = renderHook(() => useVisitorId());
      unmount();

      // Promise解決後も警告が出ないことを確認
      await act(() => {
        if (resolver) {
          resolver({
            ok: true,
            json: () =>
              Promise.resolve({
                visitorId: "test-uuid",
                isNew: true,
              }),
          });
        }
        return Promise.resolve();
      });

      // No assertion needed - we're checking that no warning is thrown
    });

    it("localStorageアクセスでエラーが発生した場合、エラーハンドリングされる", async () => {
      // Arrange
      // eslint-disable-next-line @typescript-eslint/unbound-method
      vi.mocked(window.localStorage.getItem).mockImplementation(() => {
        throw new Error("localStorage access denied");
      });

      // Act
      const { result } = renderHook(() => useVisitorId());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("localStorage access denied");
    });
  });
});
