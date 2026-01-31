import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./index";

describe("Button", () => {
  it("テキストが表示される", () => {
    render(<Button>クリック</Button>);
    expect(screen.getByRole("button", { name: "クリック" })).toBeInTheDocument();
  });

  it("クリックでonClickが呼ばれる", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>クリック</Button>);
    await user.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disabled時はクリックできない", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button onClick={onClick} disabled>
        クリック
      </Button>
    );
    await user.click(screen.getByRole("button"));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("variant='outline' でアウトラインスタイルが適用される", () => {
    render(<Button variant="outline">アウトライン</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("border");
    expect(button).toHaveClass("border-input");
  });

  it("size='sm' で小さいサイズが適用される", () => {
    render(<Button size="sm">小さいボタン</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-8");
    expect(button).toHaveClass("text-xs");
  });

  it("asChild=true でSlotとしてレンダリングされる", () => {
    render(
      <Button asChild>
        <a href="/test">リンク</a>
      </Button>
    );
    const link = screen.getByRole("link", { name: "リンク" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/test");
  });
});
