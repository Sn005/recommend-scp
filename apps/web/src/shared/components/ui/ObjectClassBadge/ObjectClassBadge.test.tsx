import { render, screen } from "@testing-library/react";
import { ObjectClassBadge } from "./ObjectClassBadge";

describe("ObjectClassBadge", () => {
  describe("AC-1: バリエーション", () => {
    it("Safeバッジが緑色で表示される", () => {
      render(<ObjectClassBadge variant="Safe" />);

      const badge = screen.getByText("Safe");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveStyle({ backgroundColor: "#10B981" });
    });

    it("Euclidバッジが黄色で表示される", () => {
      render(<ObjectClassBadge variant="Euclid" />);

      const badge = screen.getByText("Euclid");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveStyle({ backgroundColor: "#F59E0B" });
    });

    it("Keterバッジが赤色で表示される", () => {
      render(<ObjectClassBadge variant="Keter" />);

      const badge = screen.getByText("Keter");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveStyle({ backgroundColor: "#EF4444" });
    });

    it("Thaumielバッジが紫色で表示される", () => {
      render(<ObjectClassBadge variant="Thaumiel" />);

      const badge = screen.getByText("Thaumiel");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveStyle({ backgroundColor: "#8B5CF6" });
    });

    it("Neutralizedバッジが灰色で表示される", () => {
      render(<ObjectClassBadge variant="Neutralized" />);

      const badge = screen.getByText("Neutralized");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveStyle({ backgroundColor: "#6B7280" });
    });

    it("未定義クラスの場合、Unknown色のバッジが表示される", () => {
      render(<ObjectClassBadge variant="Apollyon" />);

      const badge = screen.getByText("Apollyon");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveStyle({ backgroundColor: "#9CA3AF" });
    });
  });

  describe("AC-2: スタイル", () => {
    it("コンパクトなピル型で表示される", () => {
      render(<ObjectClassBadge variant="Safe" />);

      const badge = screen.getByText("Safe");
      // px-2 = 8px, py-0.5 = 2px, rounded = 4px
      expect(badge).toHaveStyle({
        padding: "2px 8px",
        borderRadius: "4px",
      });
    });

    it("文字が読みやすいコントラストを持つ（白文字）", () => {
      render(<ObjectClassBadge variant="Safe" />);

      const badge = screen.getByText("Safe");
      expect(badge).toHaveStyle({ color: "rgb(255, 255, 255)" });
    });

    it("フォントサイズが12pxで中太", () => {
      render(<ObjectClassBadge variant="Safe" />);

      const badge = screen.getByText("Safe");
      expect(badge).toHaveStyle({
        fontSize: "12px",
        fontWeight: "500",
      });
    });
  });

  describe("AC-3: 型安全", () => {
    it("childrenが渡された場合はその内容が表示される", () => {
      render(<ObjectClassBadge variant="Safe">カスタムテキスト</ObjectClassBadge>);

      const badge = screen.getByText("カスタムテキスト");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveStyle({ backgroundColor: "#10B981" });
    });

    it("childrenが渡されない場合はvariant名が表示される", () => {
      render(<ObjectClassBadge variant="Euclid" />);

      const badge = screen.getByText("Euclid");
      expect(badge).toBeInTheDocument();
    });

    it("classNameでカスタムクラスを追加できる", () => {
      render(<ObjectClassBadge variant="Keter" className="custom-class" />);

      const badge = screen.getByText("Keter");
      expect(badge).toHaveClass("custom-class");
    });
  });

  describe("エッジケース", () => {
    it("空文字列のvariantでもUnknown色で表示される", () => {
      const { container } = render(<ObjectClassBadge variant="" />);

      // 空文字列の場合はspan要素自体は存在し、Unknown色で表示される
      const badge = container.querySelector("span");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveStyle({ backgroundColor: "#9CA3AF" });
    });

    it("大文字小文字が混在したvariantは未定義として扱う", () => {
      render(<ObjectClassBadge variant="safe" />);

      const badge = screen.getByText("safe");
      expect(badge).toHaveStyle({ backgroundColor: "#9CA3AF" });
    });
  });
});
