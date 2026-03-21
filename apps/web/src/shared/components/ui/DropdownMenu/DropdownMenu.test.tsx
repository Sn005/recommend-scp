import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/recommend",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/shared/hooks/useVisitorId", () => ({
  useVisitorId: () => ({ visitorId: "test-visitor-id", isLoading: false, isOnboarded: true }),
}));

vi.mock("@/shared/components/ui/ResetConfirmDialog", () => ({
  ResetConfirmDialog: ({
    onConfirm,
    onCancel,
  }: {
    visitorId: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) => (
    <div data-testid="reset-confirm-dialog">
      <button data-testid="mock-reset-confirm" onClick={onConfirm}>
        確認
      </button>
      <button data-testid="mock-reset-cancel" onClick={onCancel}>
        キャンセル
      </button>
    </div>
  ),
}));

import { DropdownMenu } from "./DropdownMenu";

describe("DropdownMenuコンポーネント", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AC-1: ドロップダウン表示", () => {
    it("3点メニュークリックでドロップダウンが表示される", async () => {
      const user = userEvent.setup();
      render(<DropdownMenu />);

      expect(screen.queryByTestId("dropdown-menu")).not.toBeInTheDocument();

      await user.click(screen.getByTestId("dropdown-trigger"));
      expect(screen.getByTestId("dropdown-menu")).toBeInTheDocument();
    });

    it("ドロップダウンにmin-width: 200px、border-radius: 12px（rounded-xl）が適用される", async () => {
      const user = userEvent.setup();
      render(<DropdownMenu />);
      await user.click(screen.getByTestId("dropdown-trigger"));

      const menu = screen.getByTestId("dropdown-menu");
      expect(menu).toHaveClass("min-w-[200px]");
      expect(menu).toHaveClass("rounded-xl");
    });

    it("背景白、ボーダーが適用される", async () => {
      const user = userEvent.setup();
      render(<DropdownMenu />);
      await user.click(screen.getByTestId("dropdown-trigger"));

      const menu = screen.getByTestId("dropdown-menu");
      expect(menu).toHaveClass("bg-white");
      expect(menu).toHaveClass("border");
      expect(menu).toHaveClass("border-gray-200");
    });
  });

  describe("AC-2: メニュー項目", () => {
    it("「ライセンス」と「推薦をリセット」が表示される", async () => {
      const user = userEvent.setup();
      render(<DropdownMenu />);
      await user.click(screen.getByTestId("dropdown-trigger"));

      expect(screen.getByText("ライセンス")).toBeInTheDocument();
      expect(screen.getByText("推薦をリセット")).toBeInTheDocument();
    });

    it("dividerが2項目間に表示される", async () => {
      const user = userEvent.setup();
      render(<DropdownMenu />);
      await user.click(screen.getByTestId("dropdown-trigger"));

      const menu = screen.getByTestId("dropdown-menu");
      const divider = menu.querySelector(".border-t");
      expect(divider).toBeInTheDocument();
    });

    it("各メニュー項目にSVGアイコンが含まれる", async () => {
      const user = userEvent.setup();
      render(<DropdownMenu />);
      await user.click(screen.getByTestId("dropdown-trigger"));

      const menuItems = screen.getAllByRole("menuitem");
      menuItems.forEach((item) => {
        expect(item.querySelector("svg")).toBeInTheDocument();
      });
    });
  });

  describe("AC-3: ドロップダウン閉じる", () => {
    it("メニュー外クリックでドロップダウンが閉じる", async () => {
      const user = userEvent.setup();
      render(<DropdownMenu />);
      await user.click(screen.getByTestId("dropdown-trigger"));
      expect(screen.getByTestId("dropdown-menu")).toBeInTheDocument();

      // メニュー外をクリック
      await user.click(document.body);
      expect(screen.queryByTestId("dropdown-menu")).not.toBeInTheDocument();
    });

    it("Escキーでドロップダウンが閉じる", async () => {
      const user = userEvent.setup();
      render(<DropdownMenu />);
      await user.click(screen.getByTestId("dropdown-trigger"));
      expect(screen.getByTestId("dropdown-menu")).toBeInTheDocument();

      await user.keyboard("{Escape}");
      expect(screen.queryByTestId("dropdown-menu")).not.toBeInTheDocument();
    });
  });

  describe("AC-4: アクセシビリティ（WAI-ARIA）", () => {
    it("トリガーボタンにaria-haspopup=trueが付与されている", () => {
      render(<DropdownMenu />);
      const trigger = screen.getByTestId("dropdown-trigger");
      expect(trigger).toHaveAttribute("aria-haspopup", "true");
    });

    it("ドロップダウン閉時にaria-expanded=falseが設定される", () => {
      render(<DropdownMenu />);
      const trigger = screen.getByTestId("dropdown-trigger");
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    it("ドロップダウン開時にaria-expanded=trueが設定される", async () => {
      const user = userEvent.setup();
      render(<DropdownMenu />);
      await user.click(screen.getByTestId("dropdown-trigger"));

      const trigger = screen.getByTestId("dropdown-trigger");
      expect(trigger).toHaveAttribute("aria-expanded", "true");
    });

    it("メニューにrole=menuが付与されている", async () => {
      const user = userEvent.setup();
      render(<DropdownMenu />);
      await user.click(screen.getByTestId("dropdown-trigger"));

      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("各メニュー項目にrole=menuitemが付与されている", async () => {
      const user = userEvent.setup();
      render(<DropdownMenu />);
      await user.click(screen.getByTestId("dropdown-trigger"));

      const menuItems = screen.getAllByRole("menuitem");
      expect(menuItems).toHaveLength(2);
    });
  });

  describe("AC-5: ライセンスリンク", () => {
    it("「ライセンス」クリックで /licensing に遷移する", async () => {
      const user = userEvent.setup();
      render(<DropdownMenu />);
      await user.click(screen.getByTestId("dropdown-trigger"));

      const licensingLink = screen.getByText("ライセンス").closest("a");
      expect(licensingLink).toHaveAttribute("href", "/licensing");
    });

    it("「ライセンス」クリックでドロップダウンが閉じる", async () => {
      const user = userEvent.setup();
      render(<DropdownMenu />);
      await user.click(screen.getByTestId("dropdown-trigger"));

      await user.click(screen.getByText("ライセンス"));
      expect(screen.queryByTestId("dropdown-menu")).not.toBeInTheDocument();
    });
  });

  describe("AC-6: 推薦リセット", () => {
    it("「推薦をリセット」クリックでResetConfirmDialogが表示される", async () => {
      const user = userEvent.setup();
      render(<DropdownMenu />);
      await user.click(screen.getByTestId("dropdown-trigger"));
      await user.click(screen.getByText("推薦をリセット"));

      expect(screen.getByTestId("reset-confirm-dialog")).toBeInTheDocument();
    });

    it("「推薦をリセット」クリックでドロップダウンが閉じる", async () => {
      const user = userEvent.setup();
      render(<DropdownMenu />);
      await user.click(screen.getByTestId("dropdown-trigger"));
      await user.click(screen.getByText("推薦をリセット"));

      expect(screen.queryByTestId("dropdown-menu")).not.toBeInTheDocument();
    });

    it("リセット確認後にオンボーディングに遷移する", async () => {
      const user = userEvent.setup();
      render(<DropdownMenu />);
      await user.click(screen.getByTestId("dropdown-trigger"));
      await user.click(screen.getByText("推薦をリセット"));
      await user.click(screen.getByTestId("mock-reset-confirm"));

      expect(mockPush).toHaveBeenCalledWith("/onboarding?reset=true");
    });
  });
});
