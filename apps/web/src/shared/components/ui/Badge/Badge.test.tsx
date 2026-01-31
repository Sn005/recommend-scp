import { render, screen } from "@testing-library/react";
import { Badge } from "./index";

describe("Badge", () => {
  describe("AC-1: 基本表示", () => {
    it("オブジェクトクラス名がテキストで表示される（Safe）", () => {
      render(<Badge variant="Safe" />);
      expect(screen.getByText("Safe")).toBeInTheDocument();
    });

    it("オブジェクトクラス名がテキストで表示される（Euclid）", () => {
      render(<Badge variant="Euclid" />);
      expect(screen.getByText("Euclid")).toBeInTheDocument();
    });

    it("オブジェクトクラス名がテキストで表示される（Keter）", () => {
      render(<Badge variant="Keter" />);
      expect(screen.getByText("Keter")).toBeInTheDocument();
    });

    it("childrenが渡された場合はその内容が表示される", () => {
      render(<Badge variant="Safe">カスタムテキスト</Badge>);
      expect(screen.getByText("カスタムテキスト")).toBeInTheDocument();
    });

    it("コンパクトなピル型スタイルで表示される", () => {
      const { container } = render(<Badge variant="Safe" />);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("rounded");
    });
  });

  describe("AC-2: カラー", () => {
    it("variant='Safe' の場合、緑色で表示される", () => {
      const { container } = render(<Badge variant="Safe" />);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("bg-scp-safe");
    });

    it("variant='Euclid' の場合、黄色で表示される", () => {
      const { container } = render(<Badge variant="Euclid" />);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("bg-scp-euclid");
    });

    it("variant='Keter' の場合、赤色で表示される", () => {
      const { container } = render(<Badge variant="Keter" />);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("bg-scp-keter");
    });

    it("variant='Thaumiel' の場合、紫色で表示される", () => {
      const { container } = render(<Badge variant="Thaumiel" />);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("bg-scp-thaumiel");
    });

    it("variant='Neutralized' の場合、灰色で表示される", () => {
      const { container } = render(<Badge variant="Neutralized" />);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("bg-scp-neutralized");
    });
  });

  describe("AC-3: 型安全", () => {
    it("有効なvariantは受け入れられる", () => {
      const variants = ["Safe", "Euclid", "Keter", "Thaumiel", "Neutralized"] as const;
      variants.forEach((variant) => {
        expect(() => render(<Badge variant={variant} />)).not.toThrow();
      });
    });
  });

  describe("スタイル", () => {
    it("白文字でテキストが表示される", () => {
      const { container } = render(<Badge variant="Safe" />);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("text-white");
    });

    it("カスタムclassNameが適用される", () => {
      const { container } = render(<Badge variant="Safe" className="custom-class" />);
      const badge = container.querySelector("span");
      expect(badge).toHaveClass("custom-class");
    });
  });
});
