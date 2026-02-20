import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach } from "vitest";
import { Drawer } from "./Drawer";
import { DrawerProvider } from "./DrawerProvider";
import { useDrawer } from "./useDrawer";

// next/navigation のモックをオーバーライド
const mockPush = vi.fn();
let mockPathname = "/";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(),
}));

// useVisitorIdのモック
vi.mock("@/shared/hooks/useVisitorId", () => ({
  useVisitorId: () => ({
    visitorId: "test-visitor-id",
    isLoading: false,
  }),
}));

// APIクライアントのモック
const mockResetPost = vi.fn();
vi.mock("@/shared/lib/api-client", () => ({
  api: {
    visitors: {
      reset: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- テスト用モック
        $post: (...args: unknown[]) => mockResetPost(...args),
      },
    },
  },
}));

// ドロワーを開くためのヘルパーコンポーネント
const OpenDrawerButton = () => {
  const { open } = useDrawer();
  return (
    <button data-testid="open-drawer" onClick={open}>
      開く
    </button>
  );
};

// テスト用ラッパー
const renderWithProvider = (ui: React.ReactNode) => {
  return render(
    <DrawerProvider>
      <OpenDrawerButton />
      {ui}
    </DrawerProvider>
  );
};

describe("Drawer", () => {
  beforeEach(() => {
    mockPathname = "/";
    mockPush.mockClear();
    mockResetPost.mockClear();
    mockResetPost.mockResolvedValue({ ok: true });
  });

  describe("AC-1: ドロワー開閉", () => {
    it("ドロワーが初期状態で非表示である", () => {
      renderWithProvider(<Drawer />);
      expect(screen.queryByTestId("drawer")).not.toBeInTheDocument();
    });

    it("open()呼び出しでドロワーが表示される", async () => {
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));

      expect(screen.getByTestId("drawer")).toBeInTheDocument();
    });

    it("オーバーレイクリックでドロワーが閉じる", async () => {
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      // ドロワーを開く
      await user.click(screen.getByTestId("open-drawer"));
      expect(screen.getByTestId("drawer")).toBeInTheDocument();

      // オーバーレイをクリック
      await user.click(screen.getByTestId("drawer-overlay"));

      // ドロワーが閉じる
      expect(screen.queryByTestId("drawer")).not.toBeInTheDocument();
    });

    it("オーバーレイにrgba(0,0,0,0.3)の背景が適用される", async () => {
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));

      const overlay = screen.getByTestId("drawer-overlay");
      // bg-black/30 は rgba(0,0,0,0.3) に相当
      expect(overlay).toHaveClass("bg-black/30");
    });

    it("ドロワーにシャドウが適用される", async () => {
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));

      const drawer = screen.getByTestId("drawer");
      // shadow-drawer クラスでカスタムシャドウ
      expect(drawer).toHaveClass("shadow-drawer");
    });
  });

  describe("AC-2: メニュー項目", () => {
    it("4つのメニュー項目が表示される", async () => {
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));

      expect(screen.getByText("推薦を見る")).toBeInTheDocument();
      expect(screen.getByText("お気に入り一覧")).toBeInTheDocument();
      expect(screen.getByText("閲覧履歴")).toBeInTheDocument();
      expect(screen.getByText("ライセンス")).toBeInTheDocument();
    });

    it("メニュー項目にSVGアイコンが表示される", async () => {
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));

      // SVGアイコンが含まれているか確認（4つのメニュー項目 + 1つのリセットボタン）
      const drawer = screen.getByTestId("drawer");
      const svgIcons = drawer.querySelectorAll("svg");
      expect(svgIcons.length).toBe(5);
    });

    it("現在のページ（/recommend）がハイライトされる", async () => {
      mockPathname = "/recommend";
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));

      const recommendLink = screen.getByRole("link", { name: /推薦を見る/ });
      expect(recommendLink).toHaveAttribute("aria-current", "page");
    });

    it("現在のページ（/favorites）がハイライトされる", async () => {
      mockPathname = "/favorites";
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));

      const favoritesLink = screen.getByRole("link", { name: /お気に入り一覧/ });
      expect(favoritesLink).toHaveAttribute("aria-current", "page");
    });

    it("現在のページ（/history）がハイライトされる", async () => {
      mockPathname = "/history";
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));

      const historyLink = screen.getByRole("link", { name: /閲覧履歴/ });
      expect(historyLink).toHaveAttribute("aria-current", "page");
    });
  });

  describe("AC-3: ナビゲーション", () => {
    it("メニュー項目クリックで対応ページに遷移する", async () => {
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));

      const favoritesLink = screen.getByRole("link", { name: /お気に入り一覧/ });
      expect(favoritesLink).toHaveAttribute("href", "/favorites");
    });

    it("メニュー項目クリックでドロワーが自動的に閉じる", async () => {
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));
      expect(screen.getByTestId("drawer")).toBeInTheDocument();

      // メニュー項目をクリック
      await user.click(screen.getByRole("link", { name: /お気に入り一覧/ }));

      // ドロワーが閉じる
      expect(screen.queryByTestId("drawer")).not.toBeInTheDocument();
    });
  });

  describe("AC-1（013-01-03）: ドロワーメニュー リセットボタン", () => {
    it("ドロワーメニューに「推薦をリセット」が表示される", async () => {
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));

      expect(screen.getByText("推薦をリセット")).toBeInTheDocument();
    });

    it("「推薦をリセット」ボタンにrefresh-cwアイコンが表示される", async () => {
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));

      const resetButton = screen.getByTestId("reset-preference-button");
      const svg = resetButton.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("閲覧履歴の下に区切り線が表示される", async () => {
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));

      // 区切り線（border-t）がドロワー内に存在する
      const drawer = screen.getByTestId("drawer");
      const separator = drawer.querySelector(".border-t.border-gray-200");
      expect(separator).toBeInTheDocument();
    });

    it("「推薦をリセット」タップで確認ダイアログが開く", async () => {
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));
      await user.click(screen.getByTestId("reset-preference-button"));

      expect(screen.getByTestId("reset-dialog")).toBeInTheDocument();
    });

    it("確認ダイアログでキャンセルするとダイアログが閉じる", async () => {
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));
      await user.click(screen.getByTestId("reset-preference-button"));
      expect(screen.getByTestId("reset-dialog")).toBeInTheDocument();

      await user.click(screen.getByTestId("reset-cancel"));

      expect(screen.queryByTestId("reset-dialog")).not.toBeInTheDocument();
    });

    it("リセット成功後に/onboardingにリダイレクトされる", async () => {
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));
      await user.click(screen.getByTestId("reset-preference-button"));
      await user.click(screen.getByTestId("reset-confirm"));

      // API成功後にリダイレクト
      await vi.waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/onboarding?reset=true");
      });
    });
  });

  describe("AC-1（014-02-02）: ライセンス項目の表示", () => {
    it("「ライセンス」項目が区切り線の後に配置される", async () => {
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));

      const drawer = screen.getByTestId("drawer");
      const separator = drawer.querySelector(".border-t.border-gray-200");
      const licenseLink = screen.getByRole("link", { name: /ライセンス/ });

      expect(separator).toBeInTheDocument();

      if (separator === null) throw new Error("separator not found");
      expect(
        separator.compareDocumentPosition(licenseLink) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });

    it("「ライセンス」項目がリセットボタンの前に配置される", async () => {
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));

      const licenseLink = screen.getByRole("link", { name: /ライセンス/ });
      const resetButton = screen.getByTestId("reset-preference-button");

      expect(
        licenseLink.compareDocumentPosition(resetButton) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });

    it("「ライセンス」項目にfile-textアイコン（SVG）が表示される", async () => {
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));

      const licenseLink = screen.getByRole("link", { name: /ライセンス/ });
      const svg = licenseLink.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("AC-2（014-02-02）: ライセンス項目のナビゲーション", () => {
    it("「ライセンス」項目のhrefが/licensingである", async () => {
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));

      const licenseLink = screen.getByRole("link", { name: /ライセンス/ });
      expect(licenseLink).toHaveAttribute("href", "/licensing");
    });

    it("「ライセンス」項目タップでドロワーが閉じる", async () => {
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));
      expect(screen.getByTestId("drawer")).toBeInTheDocument();

      await user.click(screen.getByRole("link", { name: /ライセンス/ }));

      expect(screen.queryByTestId("drawer")).not.toBeInTheDocument();
    });
  });

  describe("AC-3（014-02-02）: ライセンス項目のアクティブ状態", () => {
    it("現在のページ（/licensing）がハイライトされる", async () => {
      mockPathname = "/licensing";
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));

      const licenseLink = screen.getByRole("link", { name: /ライセンス/ });
      expect(licenseLink).toHaveAttribute("aria-current", "page");
    });

    it("/licensing以外のページではライセンス項目がアクティブでない", async () => {
      mockPathname = "/recommend";
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));

      const licenseLink = screen.getByRole("link", { name: /ライセンス/ });
      expect(licenseLink).not.toHaveAttribute("aria-current", "page");
    });
  });

  describe("アクセシビリティ", () => {
    it("ドロワーにaria-label属性がある", async () => {
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));

      const drawer = screen.getByTestId("drawer");
      expect(drawer).toHaveAttribute("aria-label", "メインナビゲーション");
    });

    it("オーバーレイにaria-label属性がある", async () => {
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));

      const overlay = screen.getByTestId("drawer-overlay");
      expect(overlay).toHaveAttribute("aria-label", "ドロワーを閉じる");
    });

    it("Escapeキーでドロワーが閉じる", async () => {
      const user = userEvent.setup();
      renderWithProvider(<Drawer />);

      await user.click(screen.getByTestId("open-drawer"));
      expect(screen.getByTestId("drawer")).toBeInTheDocument();

      // Escapeキーを押す
      await user.keyboard("{Escape}");

      expect(screen.queryByTestId("drawer")).not.toBeInTheDocument();
    });
  });
});
