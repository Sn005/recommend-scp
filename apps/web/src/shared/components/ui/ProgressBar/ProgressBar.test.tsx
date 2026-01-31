import { render, screen } from "@testing-library/react";
import { ProgressBar } from "./index";

describe("ProgressBar", () => {
  describe("AC-1: 表示", () => {
    it("プログレスバーが表示される", () => {
      render(<ProgressBar value={50} />);
      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toBeInTheDocument();
    });

    it("現在の進捗が視覚的に分かる（widthスタイルが設定される）", () => {
      const { container } = render(<ProgressBar value={50} />);
      const bar = container.querySelector('[role="progressbar"] > div');
      expect(bar).toHaveStyle({ width: "50%" });
    });
  });

  describe("AC-2: 進捗表示", () => {
    it("value=0 で空のバーが表示される", () => {
      const { container } = render(<ProgressBar value={0} />);
      const bar = container.querySelector('[role="progressbar"] > div');
      expect(bar).toHaveStyle({ width: "0%" });
    });

    it("value=50 で半分塗りつぶされる", () => {
      const { container } = render(<ProgressBar value={50} />);
      const bar = container.querySelector('[role="progressbar"] > div');
      expect(bar).toHaveStyle({ width: "50%" });
    });

    it("value=100 で完全に塗りつぶされる", () => {
      const { container } = render(<ProgressBar value={100} />);
      const bar = container.querySelector('[role="progressbar"] > div');
      expect(bar).toHaveStyle({ width: "100%" });
    });

    it("負数が渡された場合、0%にクランプされる", () => {
      const { container } = render(<ProgressBar value={-10} />);
      const bar = container.querySelector('[role="progressbar"] > div');
      expect(bar).toHaveStyle({ width: "0%" });
    });

    it("100を超える値が渡された場合、100%にクランプされる", () => {
      const { container } = render(<ProgressBar value={150} />);
      const bar = container.querySelector('[role="progressbar"] > div');
      expect(bar).toHaveStyle({ width: "100%" });
    });
  });

  describe("AC-2: 境界値", () => {
    it("value=1 で1%塗りつぶされる", () => {
      const { container } = render(<ProgressBar value={1} />);
      const bar = container.querySelector('[role="progressbar"] > div');
      expect(bar).toHaveStyle({ width: "1%" });
    });

    it("value=99 で99%塗りつぶされる", () => {
      const { container } = render(<ProgressBar value={99} />);
      const bar = container.querySelector('[role="progressbar"] > div');
      expect(bar).toHaveStyle({ width: "99%" });
    });

    it("max=200, value=100 の場合、50%塗りつぶされる", () => {
      const { container } = render(<ProgressBar value={100} max={200} />);
      const bar = container.querySelector('[role="progressbar"] > div');
      expect(bar).toHaveStyle({ width: "50%" });
    });
  });

  describe("AC-3: アニメーション", () => {
    it("バーにトランジションクラスが適用されている", () => {
      const { container } = render(<ProgressBar value={50} />);
      const bar = container.querySelector('[role="progressbar"] > div');
      expect(bar).toHaveClass("transition-[width]");
      expect(bar).toHaveClass("duration-300");
    });
  });

  describe("AC-4: カラー", () => {
    it("バーがプライマリカラー（bg-primary）で塗りつぶされる", () => {
      const { container } = render(<ProgressBar value={50} />);
      const bar = container.querySelector('[role="progressbar"] > div');
      expect(bar).toHaveClass("bg-primary");
    });

    it("トラック（背景）がgray-200で表示される", () => {
      render(<ProgressBar value={50} />);
      const track = screen.getByRole("progressbar");
      expect(track).toHaveClass("bg-gray-200");
    });
  });

  describe("アクセシビリティ", () => {
    it("role='progressbar' が設定されている", () => {
      render(<ProgressBar value={50} />);
      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toBeInTheDocument();
    });

    it("aria-valuenow に現在の値が設定されている", () => {
      render(<ProgressBar value={50} />);
      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toHaveAttribute("aria-valuenow", "50");
    });

    it("aria-valuemin に最小値（0）が設定されている", () => {
      render(<ProgressBar value={50} />);
      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toHaveAttribute("aria-valuemin", "0");
    });

    it("aria-valuemax にmax値が設定されている（デフォルト: 100）", () => {
      render(<ProgressBar value={50} />);
      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toHaveAttribute("aria-valuemax", "100");
    });

    it("aria-valuemax にカスタムmax値が設定されている", () => {
      render(<ProgressBar value={50} max={200} />);
      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toHaveAttribute("aria-valuemax", "200");
    });
  });

  describe("スタイル", () => {
    it("トラックの高さが h-1 に設定されている", () => {
      render(<ProgressBar value={50} />);
      const track = screen.getByRole("progressbar");
      expect(track).toHaveClass("h-1");
    });

    it("トラックの幅が w-full に設定されている", () => {
      render(<ProgressBar value={50} />);
      const track = screen.getByRole("progressbar");
      expect(track).toHaveClass("w-full");
    });

    it("カスタムclassNameが適用される", () => {
      render(<ProgressBar value={50} className="my-custom-class" />);
      const track = screen.getByRole("progressbar");
      expect(track).toHaveClass("my-custom-class");
    });
  });
});
