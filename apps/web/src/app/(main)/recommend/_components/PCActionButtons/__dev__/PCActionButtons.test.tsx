/**
 * @file PCアクションボタン単体テスト
 * @description 019-02-02: PCアクションボタン
 * @see specs/019-responsive/019-02-recommend-responsive/019-02-02.md
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PCActionButtons } from "../PCActionButtons";

const defaultProps = {
  isFavorited: false,
  onFavorite: vi.fn(),
  onNext: vi.fn(),
};

describe("019-02-02: PCアクションボタン", () => {
  describe("AC-2: PCアクションボタン表示", () => {
    it("ラッパーにhidden md:flexクラスが付与されている", () => {
      const { container } = render(<PCActionButtons {...defaultProps} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("hidden");
      expect(wrapper).toHaveClass("md:flex");
    });

    it("「お気に入り」と「次の記事へ」の2ボタンが表示される", () => {
      render(<PCActionButtons {...defaultProps} />);
      expect(screen.getByRole("button", { name: /お気に入り/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /次の記事/ })).toBeInTheDocument();
    });

    it("ラッパーにgap-3（12px）が適用される", () => {
      const { container } = render(<PCActionButtons {...defaultProps} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("gap-3");
    });

    it("ラッパーにjustify-centerが適用される", () => {
      const { container } = render(<PCActionButtons {...defaultProps} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("justify-center");
    });

    it("ラッパーにfixed配置クラスが適用される", () => {
      const { container } = render(<PCActionButtons {...defaultProps} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("fixed");
      expect(wrapper).toHaveClass("bottom-6");
    });

    it("ラッパーが中央寄せされる（left-1/2 -translate-x-1/2）", () => {
      const { container } = render(<PCActionButtons {...defaultProps} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("left-1/2");
      expect(wrapper).toHaveClass("-translate-x-1/2");
    });
  });

  describe("AC-3: お気に入りボタン（未登録状態）", () => {
    it("背景色がbg-whiteである", () => {
      render(<PCActionButtons {...defaultProps} isFavorited={false} />);
      const btn = screen.getByRole("button", { name: /お気に入り/ });
      expect(btn).toHaveClass("bg-white");
    });

    it("文字色がtext-gray-500である", () => {
      render(<PCActionButtons {...defaultProps} isFavorited={false} />);
      const btn = screen.getByRole("button", { name: /お気に入り/ });
      expect(btn).toHaveClass("text-gray-500");
    });

    it("ボーダーがborder border-gray-200である", () => {
      render(<PCActionButtons {...defaultProps} isFavorited={false} />);
      const btn = screen.getByRole("button", { name: /お気に入り/ });
      expect(btn).toHaveClass("border");
      expect(btn).toHaveClass("border-gray-200");
    });

    it("heartアイコン（アウトライン）が表示される", () => {
      render(<PCActionButtons {...defaultProps} isFavorited={false} />);
      const btn = screen.getByRole("button", { name: /お気に入り/ });
      const path = btn.querySelector("path");
      expect(path).toHaveAttribute("fill", "none");
    });
  });

  describe("AC-3: お気に入りボタン（登録済み状態）", () => {
    it("背景色がbg-red-50である", () => {
      render(<PCActionButtons {...defaultProps} isFavorited={true} />);
      const btn = screen.getByRole("button", { name: /お気に入り/ });
      expect(btn).toHaveClass("bg-red-50");
    });

    it("文字色がtext-red-500である", () => {
      render(<PCActionButtons {...defaultProps} isFavorited={true} />);
      const btn = screen.getByRole("button", { name: /お気に入り/ });
      expect(btn).toHaveClass("text-red-500");
    });

    it("ボーダーがborder-red-500である", () => {
      render(<PCActionButtons {...defaultProps} isFavorited={true} />);
      const btn = screen.getByRole("button", { name: /お気に入り/ });
      expect(btn).toHaveClass("border-red-500");
    });

    it("heart-filledアイコンが表示される", () => {
      render(<PCActionButtons {...defaultProps} isFavorited={true} />);
      const btn = screen.getByRole("button", { name: /お気に入り/ });
      const path = btn.querySelector("path");
      expect(path).toHaveAttribute("fill", "currentColor");
    });
  });

  describe("AC-4: 次の記事ボタンスタイル", () => {
    it("背景色がbg-blue-500である", () => {
      render(<PCActionButtons {...defaultProps} />);
      const btn = screen.getByRole("button", { name: /次の記事/ });
      expect(btn).toHaveClass("bg-blue-500");
    });

    it("文字色がtext-whiteである", () => {
      render(<PCActionButtons {...defaultProps} />);
      const btn = screen.getByRole("button", { name: /次の記事/ });
      expect(btn).toHaveClass("text-white");
    });
  });

  describe("AC-5: ボタン共通スタイル", () => {
    it("両ボタンにpx-7 py-3が適用される", () => {
      render(<PCActionButtons {...defaultProps} />);
      const buttons = screen.getAllByRole("button");
      for (const btn of buttons) {
        expect(btn).toHaveClass("px-7");
        expect(btn).toHaveClass("py-3");
      }
    });

    it("両ボタンにrounded-xlが適用される", () => {
      render(<PCActionButtons {...defaultProps} />);
      const buttons = screen.getAllByRole("button");
      for (const btn of buttons) {
        expect(btn).toHaveClass("rounded-xl");
      }
    });

    it("両ボタンにfont-mediumが適用される", () => {
      render(<PCActionButtons {...defaultProps} />);
      const buttons = screen.getAllByRole("button");
      for (const btn of buttons) {
        expect(btn).toHaveClass("font-medium");
      }
    });

    it("両ボタンにtext-[15px]が適用される", () => {
      render(<PCActionButtons {...defaultProps} />);
      const buttons = screen.getAllByRole("button");
      for (const btn of buttons) {
        expect(btn).toHaveClass("text-[15px]");
      }
    });

    it("両ボタン内のアイコンが20pxで表示される", () => {
      render(<PCActionButtons {...defaultProps} />);
      const buttons = screen.getAllByRole("button");
      for (const btn of buttons) {
        const svg = btn.querySelector("svg");
        expect(svg).toBeInTheDocument();
        expect(svg).toHaveAttribute("width", "20");
        expect(svg).toHaveAttribute("height", "20");
      }
    });

    it("両ボタン内にgap-2が適用される", () => {
      render(<PCActionButtons {...defaultProps} />);
      const buttons = screen.getAllByRole("button");
      for (const btn of buttons) {
        expect(btn).toHaveClass("gap-2");
      }
    });
  });

  describe("AC-6: ボタン機能", () => {
    it("お気に入りボタンクリックでonFavoriteが呼び出される", async () => {
      const user = userEvent.setup();
      const onFavorite = vi.fn();
      render(<PCActionButtons {...defaultProps} onFavorite={onFavorite} />);
      await user.click(screen.getByRole("button", { name: /お気に入り/ }));
      expect(onFavorite).toHaveBeenCalledTimes(1);
    });

    it("次の記事ボタンクリックでonNextが呼び出される", async () => {
      const user = userEvent.setup();
      const onNext = vi.fn();
      render(<PCActionButtons {...defaultProps} onNext={onNext} />);
      await user.click(screen.getByRole("button", { name: /次の記事/ }));
      expect(onNext).toHaveBeenCalledTimes(1);
    });

    it("登録済み状態でもお気に入りボタンクリックでonFavoriteが呼ばれる", async () => {
      const user = userEvent.setup();
      const onFavorite = vi.fn();
      render(<PCActionButtons {...defaultProps} isFavorited={true} onFavorite={onFavorite} />);
      await user.click(screen.getByRole("button", { name: /お気に入り/ }));
      expect(onFavorite).toHaveBeenCalledTimes(1);
    });
  });
});
