import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PillNav } from "./index";

describe("PillNav", () => {
  const defaultProps = {
    onFavorite: vi.fn(),
    onNext: vi.fn(),
    isFavorited: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AC-1: 表示位置・スタイル", () => {
    it("ナビゲーションコンポーネントが表示される", () => {
      render(<PillNav {...defaultProps} />);
      const nav = screen.getByRole("navigation");
      expect(nav).toBeInTheDocument();
    });

    it("Glassmorphism効果（backdrop-blur）が適用される", () => {
      render(<PillNav {...defaultProps} />);
      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("backdrop-blur-glass");
    });

    it("ピル型（角丸）の形状である", () => {
      render(<PillNav {...defaultProps} />);
      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("rounded-full");
    });

    it("カスタムclassNameを受け取れる", () => {
      render(<PillNav {...defaultProps} className="custom-class" />);
      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("custom-class");
    });
  });

  describe("AC-2: ボタン配置", () => {
    it("お気に入りボタンが表示される", () => {
      render(<PillNav {...defaultProps} />);
      const favoriteButton = screen.getByLabelText("お気に入りに追加");
      expect(favoriteButton).toBeInTheDocument();
    });

    it("次へボタンが表示される", () => {
      render(<PillNav {...defaultProps} />);
      const nextButton = screen.getByLabelText("次のSCPへ");
      expect(nextButton).toBeInTheDocument();
    });

    it("各ボタンが48x48px以上のタッチターゲットを持つ", () => {
      const { container } = render(<PillNav {...defaultProps} />);
      const buttons = container.querySelectorAll("button");
      buttons.forEach((button) => {
        expect(button).toHaveClass("min-w-[48px]");
        expect(button).toHaveClass("min-h-[48px]");
      });
    });
  });

  describe("AC-3: お気に入りボタン", () => {
    it("お気に入りボタンクリックでonFavoriteが呼び出される", async () => {
      const onFavorite = vi.fn();
      const user = userEvent.setup();

      render(<PillNav {...defaultProps} onFavorite={onFavorite} />);
      const favoriteButton = screen.getByLabelText("お気に入りに追加");
      await user.click(favoriteButton);

      expect(onFavorite).toHaveBeenCalledTimes(1);
    });

    it("isFavorited=false の場合、アウトラインハートが表示される", () => {
      render(<PillNav {...defaultProps} isFavorited={false} />);
      const favoriteButton = screen.getByLabelText("お気に入りに追加");
      expect(favoriteButton).toHaveClass("text-favorite-outline");
    });

    it("isFavorited=true の場合、塗りつぶしハートが表示される", () => {
      render(<PillNav {...defaultProps} isFavorited={true} />);
      const favoriteButton = screen.getByLabelText("お気に入りから削除");
      expect(favoriteButton).toHaveClass("text-favorite");
    });

    it("お気に入り登録時にポップアニメーションクラスが適用される", () => {
      render(<PillNav {...defaultProps} isFavorited={true} />);
      const favoriteButton = screen.getByLabelText("お気に入りから削除");
      expect(favoriteButton).toHaveClass("animate-heart-pop");
    });
  });

  describe("AC-4: 次へボタン", () => {
    it("次へボタンクリックでonNextが呼び出される", async () => {
      const onNext = vi.fn();
      const user = userEvent.setup();

      render(<PillNav {...defaultProps} onNext={onNext} />);
      const nextButton = screen.getByLabelText("次のSCPへ");
      await user.click(nextButton);

      expect(onNext).toHaveBeenCalledTimes(1);
    });
  });

  describe("AC-5: アクセシビリティ", () => {
    it("お気に入りボタンにaria-labelが設定されている", () => {
      render(<PillNav {...defaultProps} isFavorited={false} />);
      const favoriteButton = screen.getByLabelText("お気に入りに追加");
      expect(favoriteButton).toHaveAttribute("aria-label", "お気に入りに追加");
    });

    it("次へボタンにaria-labelが設定されている", () => {
      render(<PillNav {...defaultProps} />);
      const nextButton = screen.getByLabelText("次のSCPへ");
      expect(nextButton).toHaveAttribute("aria-label", "次のSCPへ");
    });

    it("お気に入りの状態変化がaria-labelに反映される", () => {
      const { rerender } = render(<PillNav {...defaultProps} isFavorited={false} />);
      expect(screen.getByLabelText("お気に入りに追加")).toBeInTheDocument();

      rerender(<PillNav {...defaultProps} isFavorited={true} />);
      expect(screen.getByLabelText("お気に入りから削除")).toBeInTheDocument();
    });

    it("キーボード操作でEnterキーでお気に入りボタンを操作できる", async () => {
      const onFavorite = vi.fn();
      const user = userEvent.setup();

      render(<PillNav {...defaultProps} onFavorite={onFavorite} />);
      const favoriteButton = screen.getByLabelText("お気に入りに追加");
      favoriteButton.focus();

      await user.keyboard("{Enter}");
      expect(onFavorite).toHaveBeenCalledTimes(1);
    });

    it("キーボード操作でSpaceキーで次へボタンを操作できる", async () => {
      const onNext = vi.fn();
      const user = userEvent.setup();

      render(<PillNav {...defaultProps} onNext={onNext} />);
      const nextButton = screen.getByLabelText("次のSCPへ");
      nextButton.focus();

      await user.keyboard(" ");
      expect(onNext).toHaveBeenCalledTimes(1);
    });
  });
});
