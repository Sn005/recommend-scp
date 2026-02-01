import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FloatingUI } from "./FloatingUI";

describe("FloatingUI", () => {
  const defaultProps = {
    progress: 30,
    isFavorited: false,
    onFavorite: vi.fn(),
    onNext: vi.fn(),
  };

  describe("AC-1: 通常時表示", () => {
    it("PillNavとProgressBarが表示される", () => {
      render(<FloatingUI {...defaultProps} />);

      // ProgressBarが存在
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toBeInTheDocument();

      // PillNavのボタンが存在
      const favoriteButton = screen.getByRole("button", {
        name: /お気に入り/,
      });
      const nextButton = screen.getByRole("button", { name: /次の記事/ });
      expect(favoriteButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();
    });

    it("表示位置は画面下部固定（fixed bottom-0）", () => {
      const { container } = render(<FloatingUI {...defaultProps} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("fixed", "bottom-0");
    });

    it("初期表示時はPillNavが表示される（opacity-100）", () => {
      const { container } = render(<FloatingUI {...defaultProps} scrollPercentage={0} />);

      // PillNavラッパーを取得
      const pillNavWrapper = container.querySelector("[data-testid='pillnav-wrapper']");
      expect(pillNavWrapper).toHaveClass("opacity-100");
      expect(pillNavWrapper).not.toHaveClass("opacity-0");
    });
  });

  describe("AC-2: ProgressBarの常時表示", () => {
    it("ProgressBarは常にpointer-events-autoで表示", () => {
      const { container } = render(<FloatingUI {...defaultProps} />);

      const progressBarWrapper = container.querySelector("[data-testid='progressbar-wrapper']");
      expect(progressBarWrapper).toHaveClass("pointer-events-auto");
    });

    it("progressプロパティが正しくProgressBarに渡される", () => {
      render(<FloatingUI {...defaultProps} progress={75} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "75");
    });
  });

  describe("PillNavへのprops伝達", () => {
    it("isFavoritedがPillNavに渡される", () => {
      render(<FloatingUI {...defaultProps} isFavorited={true} />);

      const favoriteButton = screen.getByRole("button", {
        name: /お気に入りから削除/,
      });
      expect(favoriteButton).toBeInTheDocument();
    });

    it("onFavoriteが呼び出される", () => {
      const onFavorite = vi.fn();
      render(<FloatingUI {...defaultProps} onFavorite={onFavorite} />);

      const favoriteButton = screen.getByRole("button", {
        name: /お気に入り/,
      });
      fireEvent.click(favoriteButton);

      expect(onFavorite).toHaveBeenCalledTimes(1);
    });

    it("onNextが呼び出される", () => {
      const onNext = vi.fn();
      render(<FloatingUI {...defaultProps} onNext={onNext} />);

      const nextButton = screen.getByRole("button", { name: /次の記事/ });
      fireEvent.click(nextButton);

      expect(onNext).toHaveBeenCalledTimes(1);
    });
  });

  describe("アクセシビリティ", () => {
    it("z-navクラスでナビゲーション用z-indexが適用される", () => {
      const { container } = render(<FloatingUI {...defaultProps} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("z-nav");
    });

    it("親要素にpointer-events-noneが設定される", () => {
      const { container } = render(<FloatingUI {...defaultProps} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("pointer-events-none");
    });
  });

  describe("アニメーション", () => {
    it("transition-opacityとduration-300が適用される", () => {
      const { container } = render(<FloatingUI {...defaultProps} />);

      const pillNavWrapper = container.querySelector("[data-testid='pillnav-wrapper']");
      expect(pillNavWrapper).toHaveClass("transition-opacity", "duration-300");
    });
  });
});
