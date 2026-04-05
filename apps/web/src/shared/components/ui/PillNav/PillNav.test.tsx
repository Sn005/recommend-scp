import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { PillNav } from "./PillNav";

describe("PillNav", () => {
  const defaultProps = {
    onFavorite: vi.fn(),
    onNext: vi.fn(),
    isFavorited: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AC-1: スタイル", () => {
    it("Glassmorphism効果が適用される", () => {
      render(<PillNav {...defaultProps} />);

      const nav = screen.getByRole("navigation");
      // 背景: rgba(255, 255, 255, 0.8) + blur(20px)
      expect(nav).toHaveClass("bg-white/80");
      expect(nav).toHaveClass("backdrop-blur-glass");
    });

    it("ピル型の角丸が適用される", () => {
      render(<PillNav {...defaultProps} />);

      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("rounded-[50px]");
    });

    it("シャドウが適用される", () => {
      render(<PillNav {...defaultProps} />);

      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("shadow-glass");
    });
  });

  describe("AC-2: ボタン配置", () => {
    it("お気に入りボタンと次へボタンが配置されている", () => {
      render(<PillNav {...defaultProps} />);

      const favoriteButton = screen.getByRole("button", {
        name: /お気に入りに追加/,
      });
      const nextButton = screen.getByRole("button", { name: /次の記事へ/ });

      expect(favoriteButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();
    });

    it("ボタン間にgap: 24pxが設定される", () => {
      render(<PillNav {...defaultProps} />);

      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("gap-6"); // 24px = 6 * 4px
    });
  });

  describe("AC-3: お気に入りボタン", () => {
    it("お気に入りボタンクリックで onFavorite が呼び出される", async () => {
      const user = userEvent.setup();
      const onFavorite = vi.fn();
      render(<PillNav {...defaultProps} onFavorite={onFavorite} />);

      const favoriteButton = screen.getByRole("button", {
        name: /お気に入りに追加/,
      });
      await user.click(favoriteButton);

      expect(onFavorite).toHaveBeenCalledTimes(1);
    });

    it("isFavorited=true でSVGハートが塗りつぶしで表示される", () => {
      render(<PillNav {...defaultProps} isFavorited={true} />);

      const favoriteButton = screen.getByRole("button", {
        name: /お気に入りから削除/,
      });
      const heartIcon = favoriteButton.querySelector("svg");
      expect(heartIcon).toBeInTheDocument();
      expect(heartIcon).toHaveClass("text-favorite");
    });

    it("isFavorited=false でSVGハートがアウトラインで表示される", () => {
      render(<PillNav {...defaultProps} isFavorited={false} />);

      const favoriteButton = screen.getByRole("button", {
        name: /お気に入りに追加/,
      });
      const heartIcon = favoriteButton.querySelector("svg");
      expect(heartIcon).toBeInTheDocument();
      expect(heartIcon).toHaveClass("text-favorite-outline");
    });

    it("お気に入り登録時にポップアニメーションが再生される", () => {
      const { rerender } = render(<PillNav {...defaultProps} isFavorited={false} />);

      // isFavorited=falseからtrueに変化させる
      rerender(<PillNav {...defaultProps} isFavorited={true} />);

      const favoriteButton = screen.getByRole("button", {
        name: /お気に入りから削除/,
      });
      const iconWrapper = favoriteButton.querySelector("span");
      expect(iconWrapper).toHaveClass("animate-heart-pop");
    });
  });

  describe("AC-4: 次へボタン", () => {
    it("次へボタンクリックで onNext が呼び出される", async () => {
      const user = userEvent.setup();
      const onNext = vi.fn();
      render(<PillNav {...defaultProps} onNext={onNext} />);

      const nextButton = screen.getByRole("button", { name: /次の記事へ/ });
      await user.click(nextButton);

      expect(onNext).toHaveBeenCalledTimes(1);
    });
  });

  describe("AC-5: アクセシビリティ", () => {
    it("aria-label が設定されている（お気に入りボタン - 未登録）", () => {
      render(<PillNav {...defaultProps} isFavorited={false} />);

      const favoriteButton = screen.getByRole("button", {
        name: "お気に入りに追加",
      });
      expect(favoriteButton).toHaveAttribute("aria-label", "お気に入りに追加");
    });

    it("aria-label が設定されている（お気に入りボタン - 登録済み）", () => {
      render(<PillNav {...defaultProps} isFavorited={true} />);

      const favoriteButton = screen.getByRole("button", {
        name: "お気に入りから削除",
      });
      expect(favoriteButton).toHaveAttribute("aria-label", "お気に入りから削除");
    });

    it("aria-label が設定されている（次へボタン）", () => {
      render(<PillNav {...defaultProps} />);

      const nextButton = screen.getByRole("button", { name: "次の記事へ" });
      expect(nextButton).toHaveAttribute("aria-label", "次の記事へ");
    });

    it("タッチターゲットサイズが48x48px以上", () => {
      render(<PillNav {...defaultProps} />);

      const favoriteButton = screen.getByRole("button", {
        name: /お気に入りに追加/,
      });
      const nextButton = screen.getByRole("button", { name: /次の記事へ/ });

      // w-12 h-12 = 48px x 48px
      expect(favoriteButton).toHaveClass("w-12");
      expect(favoriteButton).toHaveClass("h-12");
      expect(nextButton).toHaveClass("w-12");
      expect(nextButton).toHaveClass("h-12");
    });

    it("キーボードナビゲーションに対応する", async () => {
      const user = userEvent.setup();
      render(<PillNav {...defaultProps} />);

      await user.tab();
      const favoriteButton = screen.getByRole("button", {
        name: /お気に入りに追加/,
      });
      expect(favoriteButton).toHaveFocus();

      await user.tab();
      const nextButton = screen.getByRole("button", { name: /次の記事へ/ });
      expect(nextButton).toHaveFocus();
    });

    it("Enterキーでお気に入りボタンが動作する", async () => {
      const user = userEvent.setup();
      const onFavorite = vi.fn();
      render(<PillNav {...defaultProps} onFavorite={onFavorite} />);

      const favoriteButton = screen.getByRole("button", {
        name: /お気に入りに追加/,
      });
      favoriteButton.focus();
      await user.keyboard("{Enter}");

      expect(onFavorite).toHaveBeenCalledTimes(1);
    });

    it("Enterキーで次へボタンが動作する", async () => {
      const user = userEvent.setup();
      const onNext = vi.fn();
      render(<PillNav {...defaultProps} onNext={onNext} />);

      const nextButton = screen.getByRole("button", { name: /次の記事へ/ });
      nextButton.focus();
      await user.keyboard("{Enter}");

      expect(onNext).toHaveBeenCalledTimes(1);
    });
  });

  describe("スタイル仕様", () => {
    it("パディングが8px 20pxに設定される", () => {
      render(<PillNav {...defaultProps} />);

      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("py-2"); // 8px = 2 * 4px
      expect(nav).toHaveClass("px-5"); // 20px = 5 * 4px
    });

    it("SVGアイコンサイズが26pxに設定される", () => {
      render(<PillNav {...defaultProps} />);

      const favoriteButton = screen.getByRole("button", {
        name: /お気に入りに追加/,
      });
      const heartIcon = favoriteButton.querySelector("svg");
      expect(heartIcon).toHaveAttribute("width", "26");
      expect(heartIcon).toHaveAttribute("height", "26");
    });
  });
});
