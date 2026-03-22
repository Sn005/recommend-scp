import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/shared/lib/api-client", () => ({
  api: {
    onboarding: {
      select: {
        custom: {
          $post: vi.fn(),
        },
      },
    },
  },
}));

vi.mock("@/shared/hooks/useVisitorId", () => ({
  useVisitorId: () => ({
    visitorId: "test-visitor-id",
    isLoading: false,
    isOnboarded: false,
    error: null,
    refresh: vi.fn(),
    markOnboarded: vi.fn(),
  }),
}));

import { ScpNumberInput } from "../index";

describe("ScpNumberInput レスポンシブ対応", () => {
  const mockOnComplete = vi.fn();

  describe("AC-4: 入力エリア3列グリッド", () => {
    it("入力フィールドコンテナがmd:grid md:grid-cols-3 md:gap-3クラスを持つ", () => {
      render(<ScpNumberInput visitorId="test-visitor" onComplete={mockOnComplete} />);
      const grid = screen.getByTestId("scp-input-grid");
      expect(grid.className).toContain("md:grid");
      expect(grid.className).toContain("md:grid-cols-3");
      expect(grid.className).toContain("md:gap-3");
    });

    it("入力フィールドコンテナがmd:space-y-0クラスを持つ（space-y-3との衝突解消）", () => {
      render(<ScpNumberInput visitorId="test-visitor" onComplete={mockOnComplete} />);
      const grid = screen.getByTestId("scp-input-grid");
      expect(grid.className).toContain("md:space-y-0");
    });

    it("5つの入力フィールドが全て表示される", () => {
      render(<ScpNumberInput visitorId="test-visitor" onComplete={mockOnComplete} />);
      const inputs = screen.getAllByRole("textbox");
      expect(inputs).toHaveLength(5);
    });
  });

  describe("AC-5: 開始ボタン中央寄せ", () => {
    it("ボタンコンテナがmd:left-0 md:right-0 md:max-w-[768px] md:mx-autoクラスを持つ", () => {
      render(<ScpNumberInput visitorId="test-visitor" onComplete={mockOnComplete} />);
      const container = screen.getByTestId("start-button-container");
      expect(container.className).toContain("md:left-0");
      expect(container.className).toContain("md:right-0");
      expect(container.className).toContain("md:max-w-[768px]");
      expect(container.className).toContain("md:mx-auto");
    });

    it("ボタンコンテナがfixed bottom-0を保持する（モバイル非破壊）", () => {
      render(<ScpNumberInput visitorId="test-visitor" onComplete={mockOnComplete} />);
      const container = screen.getByTestId("start-button-container");
      expect(container.className).toContain("fixed");
      expect(container.className).toContain("bottom-0");
    });
  });
});
