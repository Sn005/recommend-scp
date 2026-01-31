import { render, screen } from "@testing-library/react";
import { ProgressBar } from "./index";

describe("ProgressBar", () => {
  it("value=0 で空のバーが表示される", () => {
    render(<ProgressBar value={0} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toBeInTheDocument();

    const bar = progressbar.querySelector("div");
    expect(bar).toHaveStyle({ width: "0%" });
  });

  it("value=50 で半分塗りつぶされる", () => {
    render(<ProgressBar value={50} />);
    const progressbar = screen.getByRole("progressbar");
    const bar = progressbar.querySelector("div");
    expect(bar).toHaveStyle({ width: "50%" });
  });

  it("value=100 で完全に塗りつぶされる", () => {
    render(<ProgressBar value={100} />);
    const progressbar = screen.getByRole("progressbar");
    const bar = progressbar.querySelector("div");
    expect(bar).toHaveStyle({ width: "100%" });
  });

  it("value が負数の場合 0 にクランプされる", () => {
    render(<ProgressBar value={-10} />);
    const progressbar = screen.getByRole("progressbar");
    const bar = progressbar.querySelector("div");
    expect(bar).toHaveStyle({ width: "0%" });
  });

  it("value が 100 を超える場合 100 にクランプされる", () => {
    render(<ProgressBar value={150} />);
    const progressbar = screen.getByRole("progressbar");
    const bar = progressbar.querySelector("div");
    expect(bar).toHaveStyle({ width: "100%" });
  });

  it("role='progressbar' が設定されている", () => {
    render(<ProgressBar value={50} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("aria-valuenow, aria-valuemin, aria-valuemax が設定されている", () => {
    render(<ProgressBar value={50} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "50");
    expect(progressbar).toHaveAttribute("aria-valuemin", "0");
    expect(progressbar).toHaveAttribute("aria-valuemax", "100");
  });

  it("max プロパティを指定すると aria-valuemax が変更される", () => {
    render(<ProgressBar value={25} max={50} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuemax", "50");
    // 25/50 = 50%
    const bar = progressbar.querySelector("div");
    expect(bar).toHaveStyle({ width: "50%" });
  });

  it("className を指定するとマージされる", () => {
    render(<ProgressBar value={50} className="custom-class" />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveClass("custom-class");
  });
});
