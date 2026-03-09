/**
 * @file ライセンスページのテスト
 * @description ライセンス情報表示ページの統合テスト
 * @see specs/014-scp-licensing/014-02-licensing-page/014-02-01.md
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import LicensingPage from "../page";

// モック
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));
vi.mock("@/shared/components/ui/Drawer", () => ({
  useDrawer: vi.fn(),
  DrawerProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { useRouter } from "next/navigation";
import { useDrawer } from "@/shared/components/ui/Drawer";

const mockUseRouter = vi.mocked(useRouter);
const mockUseDrawer = vi.mocked(useDrawer);

describe("014-02-01: ライセンスページUI実装", () => {
  const mockToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseRouter.mockReturnValue({
      push: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    } as ReturnType<typeof useRouter>);

    mockUseDrawer.mockReturnValue({
      isOpen: false,
      open: vi.fn(),
      close: vi.fn(),
      toggle: mockToggle,
    });
  });

  describe("AC-1: セクション表示", () => {
    it("ページが表示される", () => {
      render(<LicensingPage />);
      expect(screen.getByTestId("licensing-page")).toBeInTheDocument();
    });

    it("ページタイトル「ライセンス」が表示される", () => {
      render(<LicensingPage />);
      expect(screen.getByRole("heading", { level: 1, name: "ライセンス" })).toBeInTheDocument();
    });

    it("GPLv3ライセンス情報が表示される", () => {
      render(<LicensingPage />);
      const matches = screen.getAllByText(/GPLv3/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it("GPLv3セクションの説明文が表示される", () => {
      render(<LicensingPage />);
      expect(
        screen.getByText(/このアプリケーションは.*GPLv3.*ライセンスの下で提供されています/)
      ).toBeInTheDocument();
    });

    it("CC BY-SA 3.0ライセンス情報が表示される", () => {
      render(<LicensingPage />);
      const matches = screen.getAllByText(/CC BY-SA 3\.0/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it("CC BY-SA 3.0セクションの説明文が表示される", () => {
      render(<LicensingPage />);
      expect(
        screen.getByText(
          /SCP Foundationのコンテンツは.*CC BY-SA 3\.0.*ライセンスの下で提供されています/
        )
      ).toBeInTheDocument();
    });

    it("SCP Foundationクレジットが表示される", () => {
      render(<LicensingPage />);
      const matches = screen.getAllByText(/SCP Foundation/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it("SCP Data APIクレジットが表示される", () => {
      render(<LicensingPage />);
      const matches = screen.getAllByText(/tedivm\/scp-data/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("AC-2: 外部リンクの動作", () => {
    it("CC BY-SA 3.0ライセンス全文リンクのhrefが正しい", () => {
      render(<LicensingPage />);
      const links = screen.getAllByRole("link");
      const ccLink = links.find((l) => l.getAttribute("href")?.includes("creativecommons.org"));
      expect(ccLink).toHaveAttribute("href", "https://creativecommons.org/licenses/by-sa/3.0/");
    });

    it("GPLv3ライセンス全文リンクのhrefが正しい", () => {
      render(<LicensingPage />);
      const links = screen.getAllByRole("link");
      const gplLink = links.find((l) => l.getAttribute("href")?.includes("gnu.org"));
      expect(gplLink).toHaveAttribute("href", "https://www.gnu.org/licenses/gpl-3.0.html");
    });

    it("SCP Foundationリンクのhrefが正しい", () => {
      render(<LicensingPage />);
      const links = screen.getAllByRole("link");
      const scpLink = links.find((l) => l.getAttribute("href")?.includes("scp-wiki.wikidot.com"));
      expect(scpLink).toHaveAttribute("href", "https://scp-wiki.wikidot.com/");
    });

    it("SCP Data APIリンクのhrefが正しい", () => {
      render(<LicensingPage />);
      const links = screen.getAllByRole("link");
      const apiLink = links.find((l) => l.getAttribute("href")?.includes("tedivm/scp-data"));
      expect(apiLink).toHaveAttribute("href", "https://github.com/tedivm/scp-data");
    });

    it("全外部リンクにtarget=_blankが設定されている", () => {
      render(<LicensingPage />);
      const links = screen.getAllByRole("link");
      const externalLinks = links.filter((l) => l.getAttribute("href")?.startsWith("https://"));
      expect(externalLinks.length).toBeGreaterThan(0);
      for (const link of externalLinks) {
        expect(link).toHaveAttribute("target", "_blank");
      }
    });

    it('全外部リンクにrel="noopener noreferrer"が設定されている', () => {
      render(<LicensingPage />);
      const links = screen.getAllByRole("link");
      const externalLinks = links.filter((l) => l.getAttribute("href")?.startsWith("https://"));
      expect(externalLinks.length).toBeGreaterThan(0);
      for (const link of externalLinks) {
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
      }
    });
  });

  describe("AC-1: ShareAlike条項の説明（018-01-01要件）", () => {
    it("ShareAlike条項の説明テキストが表示される", () => {
      render(<LicensingPage />);
      expect(screen.getByText(/ShareAlike/)).toBeInTheDocument();
    });

    it("二次著作物への同一ライセンス適用要件が説明されている", () => {
      render(<LicensingPage />);
      expect(screen.getByText(/同じライセンス/)).toBeInTheDocument();
    });
  });

  // AC-3: MenuButton はMainLayoutの責務のため、layout.test.tsx でテスト済み

  describe("デザイン準拠チェック", () => {
    it("全体レイアウトにbg-gray-50が適用される", () => {
      render(<LicensingPage />);
      const page = screen.getByTestId("licensing-page");
      expect(page).toHaveClass("bg-gray-50");
    });

    it("ヘッダーのタイトルにtext-lg font-semibold text-gray-800が適用される", () => {
      render(<LicensingPage />);
      const title = screen.getByRole("heading", { level: 1 });
      expect(title).toHaveClass("text-lg", "font-semibold", "text-gray-800");
    });
  });
});
