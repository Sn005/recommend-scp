import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// usePathnameのモックをテストごとに制御
const mockUsePathname = vi.fn(() => "/recommend");
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => mockUsePathname(),
  useSearchParams: () => new URLSearchParams(),
}));

// DropdownMenuをモック
vi.mock("@/shared/components/ui/DropdownMenu", () => ({
  DropdownMenu: () => <div data-testid="dropdown-menu-mock">DropdownMenu</div>,
}));

// useVisitorIdをモック
vi.mock("@/shared/hooks/useVisitorId", () => ({
  useVisitorId: () => ({ visitorId: "test-visitor-id", isLoading: false, isOnboarded: true }),
}));

import { GlobalHeader } from "./GlobalHeader";

describe("GlobalHeaderコンポーネント", () => {
  describe("AC-1: ヘッダー表示制御", () => {
    it("hidden md:flex クラスが適用されている（768px以上で表示、未満で非表示）", () => {
      render(<GlobalHeader />);
      const header = screen.getByTestId("global-header");
      expect(header).toHaveClass("hidden");
      expect(header).toHaveClass("md:flex");
    });
  });

  describe("AC-2: ヘッダーレイアウト", () => {
    it("固定位置（fixed top-0）で画面上部に配置される", () => {
      render(<GlobalHeader />);
      const header = screen.getByTestId("global-header");
      expect(header).toHaveClass("fixed");
      expect(header).toHaveClass("top-0");
    });

    it("高さ56px（h-14）、幅100%（w-full）が適用されている", () => {
      render(<GlobalHeader />);
      const header = screen.getByTestId("global-header");
      expect(header).toHaveClass("h-14");
      expect(header).toHaveClass("w-full");
    });

    it("z-index: nav（z-nav）が適用されている", () => {
      render(<GlobalHeader />);
      const header = screen.getByTestId("global-header");
      expect(header).toHaveClass("z-nav");
    });

    it("背景白（bg-white）と下部ボーダーが適用されている", () => {
      render(<GlobalHeader />);
      const header = screen.getByTestId("global-header");
      expect(header).toHaveClass("bg-white");
      expect(header).toHaveClass("border-b");
      expect(header).toHaveClass("border-gray-200");
    });
  });

  describe("AC-3: ロゴ表示", () => {
    it("ロゴ「SCPicks」が表示される", () => {
      render(<GlobalHeader />);
      expect(screen.getByText("SCP")).toBeInTheDocument();
      expect(screen.getByText("icks")).toBeInTheDocument();
    });

    it("「SCP」部分がprimary色クラスを持つ", () => {
      render(<GlobalHeader />);
      const scp = screen.getByText("SCP");
      expect(scp).toHaveClass("text-primary");
    });

    it("「icks」部分がgray-800色クラスを持つ", () => {
      render(<GlobalHeader />);
      const icks = screen.getByText("icks");
      expect(icks).toHaveClass("text-gray-800");
    });

    it("フォントサイズ16px（text-base）、font-weight: 700（font-bold）が適用されている", () => {
      render(<GlobalHeader />);
      const scp = screen.getByText("SCP");
      const parent = scp.parentElement;
      expect(parent).toHaveClass("text-base");
      expect(parent).toHaveClass("font-bold");
    });
  });

  describe("AC-4: ナビリンク", () => {
    it("推薦・お気に入り・履歴の3リンクが表示される", () => {
      render(<GlobalHeader />);
      expect(screen.getByText("推薦")).toBeInTheDocument();
      expect(screen.getByText("お気に入り")).toBeInTheDocument();
      expect(screen.getByText("履歴")).toBeInTheDocument();
    });

    it("各リンクのhref先が正しい", () => {
      render(<GlobalHeader />);
      expect(screen.getByText("推薦").closest("a")).toHaveAttribute("href", "/recommend");
      expect(screen.getByText("お気に入り").closest("a")).toHaveAttribute("href", "/favorites");
      expect(screen.getByText("履歴").closest("a")).toHaveAttribute("href", "/history");
    });

    it("ナビリンクが中央配置（absolute left-1/2 -translate-x-1/2）されている", () => {
      render(<GlobalHeader />);
      const nav = screen.getByRole("navigation", { name: "メインナビゲーション" });
      expect(nav).toHaveClass("absolute");
      expect(nav).toHaveClass("left-1/2");
      expect(nav).toHaveClass("-translate-x-1/2");
    });

    it("各リンクにSVGアイコンが含まれる", () => {
      render(<GlobalHeader />);
      const links = screen
        .getByRole("navigation", { name: "メインナビゲーション" })
        .querySelectorAll("a");
      links.forEach((link) => {
        expect(link.querySelector("svg")).toBeInTheDocument();
      });
    });
  });

  describe("AC-5: ナビリンクアクティブ状態", () => {
    it("現在のパスに対応するナビリンクがアクティブスタイルになる", () => {
      mockUsePathname.mockReturnValue("/recommend");
      render(<GlobalHeader />);
      const recommendLink = screen.getByText("推薦").closest("a");
      expect(recommendLink).toHaveClass("bg-blue-50");
      expect(recommendLink).toHaveClass("text-primary");
    });

    it("非アクティブリンクの文字色はgray-500である", () => {
      mockUsePathname.mockReturnValue("/recommend");
      render(<GlobalHeader />);
      const favoritesLink = screen.getByText("お気に入り").closest("a");
      expect(favoritesLink).toHaveClass("text-gray-500");
    });

    it("アクティブリンクにaria-current=pageが付与される", () => {
      mockUsePathname.mockReturnValue("/favorites");
      render(<GlobalHeader />);
      const favoritesLink = screen.getByText("お気に入り").closest("a");
      expect(favoritesLink).toHaveAttribute("aria-current", "page");
    });

    it("非アクティブリンクにaria-currentが付与されない", () => {
      mockUsePathname.mockReturnValue("/recommend");
      render(<GlobalHeader />);
      const favoritesLink = screen.getByText("お気に入り").closest("a");
      expect(favoritesLink).not.toHaveAttribute("aria-current");
    });
  });

  describe("AC-6: 3点メニューボタン", () => {
    it("DropdownMenuコンポーネントが表示される", () => {
      render(<GlobalHeader />);
      expect(screen.getByTestId("dropdown-menu-mock")).toBeInTheDocument();
    });

    it("右端に配置される（ml-auto）", () => {
      render(<GlobalHeader />);
      const menuContainer = screen.getByTestId("dropdown-menu-mock").parentElement;
      expect(menuContainer).toHaveClass("ml-auto");
    });
  });
});
