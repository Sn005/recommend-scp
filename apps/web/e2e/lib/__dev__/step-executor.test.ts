import { describe, it, expect, vi } from "vitest";
import type { Page } from "@playwright/test";
import type { StepAction } from "../types";

// Playwrightのexpectをモック
const mockToBeVisible = vi.fn().mockResolvedValue(undefined);
const mockToHaveText = vi.fn().mockResolvedValue(undefined);
const mockToHaveURL = vi.fn().mockResolvedValue(undefined);

vi.mock("@playwright/test", () => ({
  expect: vi.fn().mockReturnValue({
    toBeVisible: mockToBeVisible,
    toHaveText: mockToHaveText,
    toHaveURL: mockToHaveURL,
  }),
}));

// モック後にインポート
const { executeSteps } = await import("../step-executor");
const { expect: playwrightExpect } = await import("@playwright/test");

/** Pageのモックを生成 */
function createMockPage() {
  const mockClick = vi.fn().mockResolvedValue(undefined);
  const mockFill = vi.fn().mockResolvedValue(undefined);
  const mockWaitFor = vi.fn().mockResolvedValue(undefined);
  const mockLocator = {
    click: mockClick,
    fill: mockFill,
    waitFor: mockWaitFor,
    first: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
  };
  const mockGetByTestId = vi.fn().mockReturnValue(mockLocator);
  const mockGoto = vi.fn().mockResolvedValue(undefined);

  const page = {
    goto: mockGoto,
    getByTestId: mockGetByTestId,
  } as unknown as Page;

  return { page, mockGoto, mockGetByTestId, mockClick, mockFill, mockWaitFor };
}

describe("executeSteps", () => {
  describe("gotoアクション", () => {
    it("gotoアクションでページ遷移する", async () => {
      const { page, mockGoto } = createMockPage();
      const steps: StepAction[] = [{ action: "goto", url: "/onboarding" }];

      await executeSteps(page, steps);

      expect(mockGoto).toHaveBeenCalledWith("/onboarding");
      expect(mockGoto).toHaveBeenCalledTimes(1);
    });
  });

  describe("clickアクション", () => {
    it("clickアクションでdata-testid要素をクリックする", async () => {
      const { page, mockGetByTestId, mockClick } = createMockPage();
      const steps: StepAction[] = [{ action: "click", testId: "pack-horror" }];

      await executeSteps(page, steps);

      expect(mockGetByTestId).toHaveBeenCalledWith("pack-horror");
      expect(mockClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("fillアクション", () => {
    it("fillアクションでテキスト入力する", async () => {
      const { page, mockGetByTestId, mockFill } = createMockPage();
      const steps: StepAction[] = [{ action: "fill", testId: "input-field", value: "テスト値" }];

      await executeSteps(page, steps);

      expect(mockGetByTestId).toHaveBeenCalledWith("input-field");
      expect(mockFill).toHaveBeenCalledWith("テスト値");
    });
  });

  describe("waitForアクション", () => {
    it("waitForアクションで要素の表示を待つ", async () => {
      const { page, mockGetByTestId, mockWaitFor } = createMockPage();
      const steps: StepAction[] = [{ action: "waitFor", testId: "article-card" }];

      await executeSteps(page, steps);

      expect(mockGetByTestId).toHaveBeenCalledWith("article-card");
      expect(mockWaitFor).toHaveBeenCalledTimes(1);
    });

    it("waitForアクションにtimeoutを渡せる", async () => {
      const { page, mockWaitFor } = createMockPage();
      const steps: StepAction[] = [{ action: "waitFor", testId: "article-card", timeout: 10000 }];

      await executeSteps(page, steps);

      expect(mockWaitFor).toHaveBeenCalledWith(expect.objectContaining({ timeout: 10000 }));
    });
  });

  describe("assertVisibleアクション", () => {
    it("assertVisibleアクションで要素の可視性を検証する", async () => {
      const { page, mockGetByTestId } = createMockPage();
      const steps: StepAction[] = [{ action: "assertVisible", testId: "success-message" }];

      await executeSteps(page, steps);

      expect(mockGetByTestId).toHaveBeenCalledWith("success-message");
      expect(playwrightExpect).toHaveBeenCalled();
      expect(mockToBeVisible).toHaveBeenCalledTimes(1);
    });
  });

  describe("assertTextアクション", () => {
    it("assertTextアクションでテキストを検証する", async () => {
      const { page, mockGetByTestId } = createMockPage();
      const steps: StepAction[] = [{ action: "assertText", testId: "title", text: "推薦結果" }];

      await executeSteps(page, steps);

      expect(mockGetByTestId).toHaveBeenCalledWith("title");
      expect(playwrightExpect).toHaveBeenCalled();
      expect(mockToHaveText).toHaveBeenCalledWith("推薦結果");
    });
  });

  describe("assertUrlアクション", () => {
    it("assertUrlアクションでURLを検証する", async () => {
      const { page } = createMockPage();
      const steps: StepAction[] = [{ action: "assertUrl", pattern: "/recommend" }];

      await executeSteps(page, steps);

      expect(playwrightExpect).toHaveBeenCalledWith(page);
      expect(mockToHaveURL).toHaveBeenCalled();
    });
  });

  describe("異常系", () => {
    it("不明なアクションでエラーがスローされる", async () => {
      const { page } = createMockPage();
      const steps = [{ action: "unknown" }] as unknown as StepAction[];

      await expect(executeSteps(page, steps)).rejects.toThrow(/Unknown action/);
    });
  });

  describe("エッジケース", () => {
    it("空配列のstepsは正常に完了する", async () => {
      const { page } = createMockPage();

      await expect(executeSteps(page, [])).resolves.toBeUndefined();
    });

    it("複数ステップが順次実行される", async () => {
      const { page, mockGoto, mockGetByTestId, mockClick } = createMockPage();
      const steps: StepAction[] = [
        { action: "goto", url: "/onboarding" },
        { action: "click", testId: "pack-horror" },
        { action: "click", testId: "complete-button" },
      ];

      await executeSteps(page, steps);

      expect(mockGoto).toHaveBeenCalledWith("/onboarding");
      expect(mockGetByTestId).toHaveBeenCalledWith("pack-horror");
      expect(mockGetByTestId).toHaveBeenCalledWith("complete-button");
      expect(mockClick).toHaveBeenCalledTimes(2);
    });
  });
});
