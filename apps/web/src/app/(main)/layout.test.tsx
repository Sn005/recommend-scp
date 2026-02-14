import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

// api-clientのモック（useVisitorIdが依存）
vi.mock("@/shared/lib/api-client", () => ({
  api: {
    visitors: {
      $post: vi.fn(),
    },
  },
}));

// useVisitorIdのモック（OnboardingGuardが依存）
vi.mock("@/shared/hooks/useVisitorId", () => ({
  useVisitorId: () => ({
    visitorId: "test-visitor-id",
    isLoading: false,
    isOnboarded: true,
    error: null,
    refresh: vi.fn(),
    markOnboarded: vi.fn(),
  }),
}));

import MainLayout from "./layout";

describe("MainLayout", () => {
  describe("AC-2: MainLayout", () => {
    it("DrawerProviderでchildrenをラップする", () => {
      render(
        <MainLayout>
          <div data-testid="test-child">Test Content</div>
        </MainLayout>
      );

      expect(screen.getByTestId("drawer-provider")).toBeInTheDocument();
      expect(screen.getByTestId("test-child")).toBeInTheDocument();
    });

    it("childrenが正しくレンダリングされる", () => {
      const content = "Page Content";

      render(<MainLayout>{content}</MainLayout>);

      expect(screen.getByText(content)).toBeInTheDocument();
    });

    it("メニューボタンが表示される", () => {
      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      expect(screen.getByRole("button", { name: /メニューを開く/ })).toBeInTheDocument();
    });

    it("メニューボタンをクリックするとドロワーが開く", async () => {
      const user = userEvent.setup();

      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      // 初期状態ではドロワーが非表示
      expect(screen.queryByTestId("drawer")).not.toBeInTheDocument();

      // メニューボタンをクリック
      await user.click(screen.getByRole("button", { name: /メニューを開く/ }));

      // ドロワーが表示される
      expect(screen.getByTestId("drawer")).toBeInTheDocument();
      expect(screen.getByTestId("drawer-overlay")).toBeInTheDocument();
    });

    it("オーバーレイをクリックするとドロワーが閉じる", async () => {
      const user = userEvent.setup();

      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      // ドロワーを開く
      await user.click(screen.getByRole("button", { name: /メニューを開く/ }));
      expect(screen.getByTestId("drawer")).toBeInTheDocument();

      // オーバーレイをクリック
      await user.click(screen.getByTestId("drawer-overlay"));

      // ドロワーが閉じる
      expect(screen.queryByTestId("drawer")).not.toBeInTheDocument();
    });
  });

  describe("エッジケース", () => {
    it("childrenがnullの場合もエラーにならない", () => {
      expect(() => render(<MainLayout>{null}</MainLayout>)).not.toThrow();
    });

    it("childrenが複数要素の場合も正しく表示される", () => {
      render(
        <MainLayout>
          <div data-testid="child-1">First</div>
          <div data-testid="child-2">Second</div>
        </MainLayout>
      );

      expect(screen.getByTestId("child-1")).toBeInTheDocument();
      expect(screen.getByTestId("child-2")).toBeInTheDocument();
    });

    it("DrawerProviderの初期状態でドロワーが閉じている", () => {
      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      // ドロワーは初期状態では非表示
      expect(screen.queryByTestId("drawer")).not.toBeInTheDocument();
      expect(screen.queryByTestId("drawer-overlay")).not.toBeInTheDocument();
    });
  });
});
