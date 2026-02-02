import { render } from "@testing-library/react";
import { Icon } from "./Icon";
import type { IconName } from "./icons";

describe("Iconコンポーネント", () => {
  describe("AC-1: 基本機能", () => {
    it("name指定でアイコンを表示できる", () => {
      const { container } = render(<Icon name="menu" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("全必須アイコンが正常にレンダリングされる", () => {
      const requiredIcons: IconName[] = [
        "menu",
        "heart",
        "heart-filled",
        "chevron-right",
        "clock",
        "bookmark",
      ];

      requiredIcons.forEach((name) => {
        const { container } = render(<Icon name={name} />);
        const svg = container.querySelector("svg");
        expect(svg).toBeInTheDocument();
      });
    });

    it("各アイコンに対応するSVGパスが存在する", () => {
      const { container } = render(<Icon name="menu" />);
      const path = container.querySelector("path");
      expect(path).toBeInTheDocument();
    });
  });

  describe("AC-2: サイズカスタマイズ", () => {
    it("デフォルトサイズは24pxである", () => {
      const { container } = render(<Icon name="menu" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "24");
      expect(svg).toHaveAttribute("height", "24");
    });

    it("sizeプロパティでサイズを変更できる", () => {
      const { container } = render(<Icon name="menu" size={32} />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "32");
      expect(svg).toHaveAttribute("height", "32");
    });

    it("小さいサイズ（16px）を指定できる", () => {
      const { container } = render(<Icon name="heart" size={16} />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "16");
      expect(svg).toHaveAttribute("height", "16");
    });

    it("大きいサイズ（48px）を指定できる", () => {
      const { container } = render(<Icon name="bookmark" size={48} />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "48");
      expect(svg).toHaveAttribute("height", "48");
    });

    it("size={undefined}の場合はデフォルト24pxになる", () => {
      const { container } = render(<Icon name="clock" size={undefined} />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "24");
      expect(svg).toHaveAttribute("height", "24");
    });
  });

  describe("AC-3: カラーカスタマイズ", () => {
    it("classNameでTailwindのtext-*クラスを適用できる", () => {
      const { container } = render(<Icon name="heart" className="text-red-500" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("text-red-500");
    });

    it("デフォルトでcurrentColorを継承する", () => {
      const { container } = render(<Icon name="menu" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("stroke", "currentColor");
    });

    it("複数のclassNameを適用できる", () => {
      const { container } = render(
        <Icon name="clock" className="text-blue-500 hover:text-blue-700" />
      );
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("text-blue-500");
      expect(svg).toHaveClass("hover:text-blue-700");
    });

    it("塗りつぶしアイコン（heart-filled）でfillを使用する", () => {
      const { container } = render(<Icon name="heart-filled" />);
      const path = container.querySelector("path");
      expect(path).toHaveAttribute("fill", "currentColor");
    });

    it("className={undefined}の場合はデフォルトスタイルのみ適用", () => {
      const { container } = render(<Icon name="menu" className={undefined} />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("AC-4: 必須アイコン", () => {
    const requiredIcons = [
      { name: "menu" as const, description: "ハンバーガーメニュー（3本線）" },
      { name: "heart" as const, description: "ハートアウトライン" },
      { name: "heart-filled" as const, description: "ハート塗りつぶし" },
      { name: "chevron-right" as const, description: "右矢印" },
      { name: "clock" as const, description: "時計" },
      { name: "bookmark" as const, description: "お気に入り一覧用" },
    ];

    requiredIcons.forEach(({ name, description }) => {
      it(`${description}（${name}）が利用可能である`, () => {
        const { container } = render(<Icon name={name} />);
        const svg = container.querySelector("svg");
        expect(svg).toBeInTheDocument();
        expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
      });
    });

    it("全アイコンのSVGパスが定義されている", () => {
      const iconNames: IconName[] = [
        "menu",
        "heart",
        "heart-filled",
        "chevron-right",
        "clock",
        "bookmark",
      ];

      iconNames.forEach((name) => {
        const { container } = render(<Icon name={name} />);
        const path = container.querySelector("path");
        expect(path).toBeInTheDocument();
      });
    });
  });

  describe("AC-5: アクセシビリティ", () => {
    it("デフォルトでaria-hidden=trueが設定される", () => {
      const { container } = render(<Icon name="menu" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });

    it("aria-labelを指定した場合はaria-hiddenが設定されない", () => {
      const { container } = render(<Icon name="heart" aria-label="お気に入りに追加" />);
      const svg = container.querySelector("svg");
      expect(svg).not.toHaveAttribute("aria-hidden");
      expect(svg).toHaveAttribute("aria-label", "お気に入りに追加");
    });

    it("role=imgが設定される", () => {
      const { container } = render(<Icon name="clock" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("role", "img");
    });

    it("focusable=falseが設定される", () => {
      const { container } = render(<Icon name="bookmark" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("focusable", "false");
    });
  });

  describe("デザイン準拠", () => {
    it("viewBox=0 0 24 24が設定される", () => {
      const { container } = render(<Icon name="menu" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    });

    it("stroke-linecap=roundが設定される", () => {
      const { container } = render(<Icon name="chevron-right" />);
      const path = container.querySelector("path");
      expect(path).toHaveAttribute("stroke-linecap", "round");
    });

    it("stroke-linejoin=roundが設定される", () => {
      const { container } = render(<Icon name="clock" />);
      const path = container.querySelector("path");
      expect(path).toHaveAttribute("stroke-linejoin", "round");
    });

    it("stroke-width=2がデフォルトである", () => {
      const { container } = render(<Icon name="heart" />);
      const path = container.querySelector("path");
      expect(path).toHaveAttribute("stroke-width", "2");
    });
  });
});
