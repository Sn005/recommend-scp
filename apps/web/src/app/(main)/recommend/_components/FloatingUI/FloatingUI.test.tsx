import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FloatingUI } from "./FloatingUI";

describe("FloatingUI", () => {
  const defaultProps = {
    isFavorited: false,
    onFavorite: vi.fn(),
    onNext: vi.fn(),
  };

  describe("AC-1: ProgressBar非表示", () => {
    it("ProgressBarは表示されない", () => {
      render(<FloatingUI {...defaultProps} />);

      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      expect(screen.queryByTestId("progressbar-wrapper")).not.toBeInTheDocument();
    });
  });

  describe("AC-2: FloatingUIからprogress prop削除", () => {
    it("progress propなしでPillNavが正常に表示される", () => {
      render(<FloatingUI {...defaultProps} />);

      const favoriteButton = screen.getByRole("button", {
        name: /お気に入り/,
      });
      const nextButton = screen.getByRole("button", { name: /次の記事/ });
      expect(favoriteButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();
    });
  });

  describe("AC-4: PillNav正常動作", () => {
    it("表示位置は画面下部固定（fixed bottom-0）", () => {
      const { container } = render(<FloatingUI {...defaultProps} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("fixed", "bottom-0");
    });

    it("初期表示時はPillNavが表示される（opacity-100）", () => {
      const { container } = render(<FloatingUI {...defaultProps} scrollPercentage={0} />);

      const pillNavWrapper = container.querySelector("[data-testid='pill-nav']");
      expect(pillNavWrapper).toHaveClass("opacity-100");
      expect(pillNavWrapper).not.toHaveClass("opacity-0");
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

      const pillNavWrapper = container.querySelector("[data-testid='pill-nav']");
      expect(pillNavWrapper).toHaveClass("transition-opacity", "duration-300");
    });
  });
});
