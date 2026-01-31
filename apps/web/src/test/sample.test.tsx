import { render, screen } from "@testing-library/react";

describe("テスト環境", () => {
  it("Vitestが正しく動作する", () => {
    expect(1 + 1).toBe(2);
  });

  it("Reactコンポーネントがレンダリングできる", () => {
    function TestComponent() {
      return <div>Hello, Test!</div>;
    }

    render(<TestComponent />);
    expect(screen.getByText("Hello, Test!")).toBeInTheDocument();
  });

  it("describe/it/expectがグローバルで使用できる", () => {
    // このテスト自体がimportなしでdescribe/it/expectが使えることを証明
    expect(true).toBe(true);
  });
});
