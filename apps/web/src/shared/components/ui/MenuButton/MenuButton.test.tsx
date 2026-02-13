import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { MenuButton } from "./MenuButton";
import { DrawerProvider } from "../Drawer";
import { Drawer } from "../Drawer";

// テスト用ラッパー
const renderWithProvider = (ui: React.ReactNode) => {
  return render(<DrawerProvider>{ui}</DrawerProvider>);
};

describe("MenuButton", () => {
  describe("AC-1: 常時表示", () => {
    it("メニューボタンが表示される", () => {
      renderWithProvider(<MenuButton />);

      const button = screen.getByRole("button", { name: /メニューを開く/ });
      expect(button).toBeInTheDocument();
    });

    it("SVGハンバーガーアイコンが表示される", () => {
      renderWithProvider(<MenuButton />);

      const button = screen.getByRole("button", { name: /メニューを開く/ });
      const svg = button.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute("role", "img");
    });

    it("fixed配置で右上に固定される", () => {
      renderWithProvider(<MenuButton />);

      const button = screen.getByRole("button", { name: /メニューを開く/ });
      expect(button).toHaveClass("fixed");
      expect(button).toHaveClass("top-4");
      expect(button).toHaveClass("right-4");
    });

    it("z-indexがナビゲーションレベル（z-nav）に設定される", () => {
      renderWithProvider(<MenuButton />);

      const button = screen.getByRole("button", { name: /メニューを開く/ });
      expect(button).toHaveClass("z-nav");
    });
  });

  describe("AC-2: Glassmorphism効果", () => {
    it("すりガラス効果（backdrop-blur-md）が適用される", () => {
      renderWithProvider(<MenuButton />);

      const button = screen.getByRole("button", { name: /メニューを開く/ });
      expect(button).toHaveClass("backdrop-blur-md");
    });

    it("半透明の白背景（bg-white/80）が適用される", () => {
      renderWithProvider(<MenuButton />);

      const button = screen.getByRole("button", { name: /メニューを開く/ });
      expect(button).toHaveClass("bg-white/80");
    });

    it("完全な円形（rounded-full）で表示される", () => {
      renderWithProvider(<MenuButton />);

      const button = screen.getByRole("button", { name: /メニューを開く/ });
      expect(button).toHaveClass("rounded-full");
    });

    it("シャドウ（shadow-sm）が適用される", () => {
      renderWithProvider(<MenuButton />);

      const button = screen.getByRole("button", { name: /メニューを開く/ });
      expect(button).toHaveClass("shadow-sm");
    });

    it("サイズが40x40px（w-10 h-10）に設定される", () => {
      renderWithProvider(<MenuButton />);

      const button = screen.getByRole("button", { name: /メニューを開く/ });
      expect(button).toHaveClass("w-10");
      expect(button).toHaveClass("h-10");
    });
  });

  describe("AC-3: ドロワー連携", () => {
    it("クリック時にドロワーが開く", async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <>
          <MenuButton />
          <Drawer />
        </>
      );

      // ドロワーが閉じていることを確認
      expect(screen.queryByTestId("drawer")).not.toBeInTheDocument();

      // メニューボタンをクリック
      const button = screen.getByRole("button", { name: /メニューを開く/ });
      await user.click(button);

      // ドロワーが開いたことを確認
      expect(screen.getByTestId("drawer")).toBeInTheDocument();
    });

    it("再クリックでドロワーが閉じる", async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <>
          <MenuButton />
          <Drawer />
        </>
      );

      const button = screen.getByRole("button", { name: /メニューを開く/ });

      // 開く
      await user.click(button);
      expect(screen.getByTestId("drawer")).toBeInTheDocument();

      // 閉じる
      await user.click(button);
      expect(screen.queryByTestId("drawer")).not.toBeInTheDocument();
    });

    it("Enterキー押下でtoggle()が呼び出される", async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <>
          <MenuButton />
          <Drawer />
        </>
      );

      const button = screen.getByRole("button", { name: /メニューを開く/ });
      button.focus();
      await user.keyboard("{Enter}");

      expect(screen.getByTestId("drawer")).toBeInTheDocument();
    });

    it("Spaceキー押下でtoggle()が呼び出される", async () => {
      const user = userEvent.setup();
      renderWithProvider(
        <>
          <MenuButton />
          <Drawer />
        </>
      );

      const button = screen.getByRole("button", { name: /メニューを開く/ });
      button.focus();
      await user.keyboard(" ");

      expect(screen.getByTestId("drawer")).toBeInTheDocument();
    });
  });

  describe("AC-3: 異常系", () => {
    it("DrawerProvider外で使用時エラーをスローする", () => {
      // コンソールエラーを抑制
      const noop = () => undefined;
      const consoleError = vi.spyOn(console, "error").mockImplementation(noop);

      expect(() => {
        render(<MenuButton />);
      }).toThrow("useDrawer must be used within DrawerProvider");

      consoleError.mockRestore();
    });
  });

  describe("AC-4: タッチターゲット", () => {
    it("アクセシビリティ属性が適切に設定される", () => {
      renderWithProvider(<MenuButton />);

      const button = screen.getByRole("button", { name: /メニューを開く/ });
      expect(button).toHaveAttribute("aria-label", "メニューを開く");
      expect(button).toHaveAttribute("type", "button");
    });

    it("フォーカス可能である", () => {
      renderWithProvider(<MenuButton />);

      const button = screen.getByRole("button", { name: /メニューを開く/ });
      button.focus();
      expect(button).toHaveFocus();
    });

    it("アクティブ状態のフィードバック（active:scale-95）がある", () => {
      renderWithProvider(<MenuButton />);

      const button = screen.getByRole("button", { name: /メニューを開く/ });
      expect(button).toHaveClass("active:scale-95");
    });
  });

  describe("アクセシビリティ", () => {
    it("適切なaria-labelが設定される", () => {
      renderWithProvider(<MenuButton />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label", "メニューを開く");
    });

    it("キーボードナビゲーションに対応する", async () => {
      const user = userEvent.setup();
      renderWithProvider(<MenuButton />);

      // Tabキーでフォーカス
      await user.tab();
      const button = screen.getByRole("button", { name: /メニューを開く/ });
      expect(button).toHaveFocus();
    });
  });
});
