import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useScpNumberInput } from "../useScpNumberInput";

// api-clientのモック
const mockPostCustomSelection = vi.fn();
vi.mock("@/shared/lib/api-client", () => ({
  api: {
    onboarding: {
      select: {
        custom: {
          $post: (...args: unknown[]): unknown => mockPostCustomSelection(...args),
        },
      },
    },
  },
}));

describe("useScpNumberInput", () => {
  const visitorId = "test-visitor-id";

  beforeEach(() => {
    vi.resetAllMocks();
    // デフォルトのモック実装を設定
    mockPostCustomSelection.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, visitorId, articleCount: 3 }),
    });
  });

  describe("初期状態", () => {
    it("初期状態ではscpNumbersが空配列である", () => {
      const { result } = renderHook(() => useScpNumberInput(visitorId));

      expect(result.current.scpNumbers).toEqual([]);
      expect(result.current.inputValue).toBe("");
      expect(result.current.inputError).toBeNull();
      expect(result.current.isValid).toBe(false);
      expect(result.current.remainingCount).toBe(3);
      expect(result.current.isConfirming).toBe(false);
      expect(result.current.confirmError).toBeNull();
      expect(result.current.invalidNumbers).toEqual([]);
    });
  });

  describe("SCP番号追加（AC-2）", () => {
    it("数字のみの形式で追加できる（例: 173）", () => {
      const { result } = renderHook(() => useScpNumberInput(visitorId));

      act(() => {
        result.current.setInputValue("173");
      });

      act(() => {
        result.current.addNumber();
      });

      expect(result.current.scpNumbers).toContain("scp-173");
      expect(result.current.inputValue).toBe("");
    });

    it("SCP-XXX形式で追加できる（例: SCP-682）", () => {
      const { result } = renderHook(() => useScpNumberInput(visitorId));

      act(() => {
        result.current.setInputValue("SCP-682");
      });

      act(() => {
        result.current.addNumber();
      });

      expect(result.current.scpNumbers).toContain("scp-682");
    });

    it("小文字scp-xxx形式で追加できる（例: scp-999）", () => {
      const { result } = renderHook(() => useScpNumberInput(visitorId));

      act(() => {
        result.current.setInputValue("scp-999");
      });

      act(() => {
        result.current.addNumber();
      });

      expect(result.current.scpNumbers).toContain("scp-999");
    });

    it("SCP_XXX形式で追加できる（例: SCP_2000）", () => {
      const { result } = renderHook(() => useScpNumberInput(visitorId));

      act(() => {
        result.current.setInputValue("SCP_2000");
      });

      act(() => {
        result.current.addNumber();
      });

      expect(result.current.scpNumbers).toContain("scp-2000");
    });

    it("1桁の番号はゼロパディングされる（例: 1 → scp-001）", () => {
      const { result } = renderHook(() => useScpNumberInput(visitorId));

      act(() => {
        result.current.setInputValue("1");
      });

      act(() => {
        result.current.addNumber();
      });

      expect(result.current.scpNumbers).toContain("scp-001");
    });

    it("追加後に入力フィールドがクリアされる", () => {
      const { result } = renderHook(() => useScpNumberInput(visitorId));

      act(() => {
        result.current.setInputValue("173");
      });

      expect(result.current.inputValue).toBe("173");

      act(() => {
        result.current.addNumber();
      });

      expect(result.current.inputValue).toBe("");
    });
  });

  describe("入力形式バリデーション（AC-3）", () => {
    it("無効な形式でエラーメッセージが表示される", () => {
      const { result } = renderHook(() => useScpNumberInput(visitorId));

      act(() => {
        result.current.setInputValue("invalid");
      });

      act(() => {
        result.current.addNumber();
      });

      expect(result.current.inputError).not.toBeNull();
      expect(result.current.scpNumbers).toEqual([]);
    });

    it("空文字では追加されない", () => {
      const { result } = renderHook(() => useScpNumberInput(visitorId));

      act(() => {
        result.current.setInputValue("");
      });

      act(() => {
        result.current.addNumber();
      });

      expect(result.current.scpNumbers).toEqual([]);
    });

    it("5桁以上の番号はエラーになる", () => {
      const { result } = renderHook(() => useScpNumberInput(visitorId));

      act(() => {
        result.current.setInputValue("12345");
      });

      act(() => {
        result.current.addNumber();
      });

      expect(result.current.inputError).not.toBeNull();
      expect(result.current.scpNumbers).toEqual([]);
    });
  });

  describe("重複チェック（AC-4）", () => {
    it("既に追加済みの番号を入力すると重複エラーが表示される", () => {
      const { result } = renderHook(() => useScpNumberInput(visitorId));

      act(() => {
        result.current.setInputValue("173");
      });

      act(() => {
        result.current.addNumber();
      });

      act(() => {
        result.current.setInputValue("SCP-173");
      });

      act(() => {
        result.current.addNumber();
      });

      expect(result.current.inputError).toBe("既に追加済みです");
      expect(result.current.scpNumbers).toHaveLength(1);
    });
  });

  describe("SCP番号削除（AC-5）", () => {
    it("番号をリストから削除できる", () => {
      const { result } = renderHook(() => useScpNumberInput(visitorId));

      act(() => {
        result.current.setInputValue("173");
      });
      act(() => {
        result.current.addNumber();
      });
      act(() => {
        result.current.setInputValue("682");
      });
      act(() => {
        result.current.addNumber();
      });

      expect(result.current.scpNumbers).toHaveLength(2);

      act(() => {
        result.current.removeNumber("scp-173");
      });

      expect(result.current.scpNumbers).toHaveLength(1);
      expect(result.current.scpNumbers).not.toContain("scp-173");
      expect(result.current.scpNumbers).toContain("scp-682");
    });
  });

  describe("最低件数チェック（AC-6）", () => {
    it("3件未満ではisValidがfalseになる", () => {
      const { result } = renderHook(() => useScpNumberInput(visitorId));

      act(() => {
        result.current.setInputValue("173");
      });
      act(() => {
        result.current.addNumber();
      });
      act(() => {
        result.current.setInputValue("682");
      });
      act(() => {
        result.current.addNumber();
      });

      expect(result.current.scpNumbers).toHaveLength(2);
      expect(result.current.isValid).toBe(false);
    });

    it("3件以上でisValidがtrueになる", () => {
      const { result } = renderHook(() => useScpNumberInput(visitorId));

      act(() => {
        result.current.setInputValue("173");
      });
      act(() => {
        result.current.addNumber();
      });
      act(() => {
        result.current.setInputValue("682");
      });
      act(() => {
        result.current.addNumber();
      });
      act(() => {
        result.current.setInputValue("999");
      });
      act(() => {
        result.current.addNumber();
      });

      expect(result.current.scpNumbers).toHaveLength(3);
      expect(result.current.isValid).toBe(true);
    });

    it("残り件数が正しく計算される", () => {
      const { result } = renderHook(() => useScpNumberInput(visitorId));

      expect(result.current.remainingCount).toBe(3);

      act(() => {
        result.current.setInputValue("173");
      });
      act(() => {
        result.current.addNumber();
      });

      expect(result.current.remainingCount).toBe(2);

      act(() => {
        result.current.setInputValue("682");
      });
      act(() => {
        result.current.addNumber();
      });

      expect(result.current.remainingCount).toBe(1);

      act(() => {
        result.current.setInputValue("999");
      });
      act(() => {
        result.current.addNumber();
      });

      expect(result.current.remainingCount).toBe(0);
    });
  });

  describe("オンボーディング確定（AC-7）", () => {
    it("confirmSelectionでAPIが呼び出される", async () => {
      mockPostCustomSelection.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, visitorId, articleCount: 3 }),
      });

      const { result } = renderHook(() => useScpNumberInput(visitorId));

      // 3件追加
      act(() => {
        result.current.setInputValue("173");
      });
      act(() => {
        result.current.addNumber();
      });
      act(() => {
        result.current.setInputValue("682");
      });
      act(() => {
        result.current.addNumber();
      });
      act(() => {
        result.current.setInputValue("999");
      });
      act(() => {
        result.current.addNumber();
      });

      await act(async () => {
        await result.current.confirmSelection();
      });

      expect(mockPostCustomSelection).toHaveBeenCalledWith({
        json: {
          visitorId,
          articleIds: ["scp-173", "scp-682", "scp-999"],
        },
      });
    });

    it("確定中はisConfirmingがtrueになる", async () => {
      let resolvePromise!: (value: unknown) => void;
      mockPostCustomSelection.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { result } = renderHook(() => useScpNumberInput(visitorId));

      // 3件追加（各操作を別々のactで実行）
      act(() => {
        result.current.setInputValue("173");
      });
      act(() => {
        result.current.addNumber();
      });
      act(() => {
        result.current.setInputValue("682");
      });
      act(() => {
        result.current.addNumber();
      });
      act(() => {
        result.current.setInputValue("999");
      });
      act(() => {
        result.current.addNumber();
      });

      // 3件追加されていることを確認
      expect(result.current.scpNumbers).toHaveLength(3);
      expect(result.current.isValid).toBe(true);

      // confirmSelectionを開始（awaitしない）
      let confirmPromise: Promise<void>;
      act(() => {
        confirmPromise = result.current.confirmSelection();
      });

      // isConfirmingがtrueになることを確認
      expect(result.current.isConfirming).toBe(true);

      // Promiseを解決
      await act(async () => {
        resolvePromise({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
        await confirmPromise;
      });

      expect(result.current.isConfirming).toBe(false);
    });
  });

  describe("存在しないSCP番号エラー（AC-8）", () => {
    it("404エラー時にinvalidNumbersが設定される", async () => {
      mockPostCustomSelection.mockResolvedValue({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve({
            type: "https://recommend-scp.dev/errors/not-found",
            title: "Articles Not Found",
            status: 404,
            detail: "Some articles were not found",
            invalidIds: ["scp-9999"],
          }),
      });

      const { result } = renderHook(() => useScpNumberInput(visitorId));

      // 3件追加（1件は存在しない番号）
      act(() => {
        result.current.setInputValue("173");
      });
      act(() => {
        result.current.addNumber();
      });
      act(() => {
        result.current.setInputValue("682");
      });
      act(() => {
        result.current.addNumber();
      });
      act(() => {
        result.current.setInputValue("9999");
      });
      act(() => {
        result.current.addNumber();
      });

      await act(async () => {
        try {
          await result.current.confirmSelection();
        } catch {
          // エラーをキャッチ
        }
      });

      expect(result.current.confirmError).not.toBeNull();
      expect(result.current.invalidNumbers).toContain("scp-9999");
    });
  });

  describe("入力値の変更", () => {
    it("setInputValueで入力値を変更できる", () => {
      const { result } = renderHook(() => useScpNumberInput(visitorId));

      act(() => {
        result.current.setInputValue("173");
      });

      expect(result.current.inputValue).toBe("173");
    });

    it("入力値変更時にinputErrorがクリアされる", () => {
      const { result } = renderHook(() => useScpNumberInput(visitorId));

      // 無効な値を入力してエラーを発生させる
      act(() => {
        result.current.setInputValue("invalid");
      });
      act(() => {
        result.current.addNumber();
      });

      expect(result.current.inputError).not.toBeNull();

      // 新しい値を入力するとエラーがクリアされる
      act(() => {
        result.current.setInputValue("173");
      });

      expect(result.current.inputError).toBeNull();
    });
  });
});
