/**
 * @file HistoryCard コンポーネントテスト
 * @description 履歴カードのUI表示テスト
 * @see specs/006-frontend/006-04-history/006-04-03.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HistoryCard } from "../index";
import type { HistoryEntry } from "../../../_types";

// next/link のモック
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}));

describe("HistoryCard", () => {
  const mockEntry: HistoryEntry = {
    scpNumber: "scp-173",
    title: "彫刻 - オリジナル",
    excerpt: "",
    objectClass: "Euclid",
    rating: 4102,
    viewedAt: "2024-01-15T10:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("SCP番号が表示される", () => {
    render(<HistoryCard entry={mockEntry} />);

    expect(screen.getByText("scp-173")).toBeInTheDocument();
  });

  it("オブジェクトクラスバッジが表示される", () => {
    render(<HistoryCard entry={mockEntry} />);

    expect(screen.getByText("Euclid")).toBeInTheDocument();
  });

  it("オブジェクトクラスがない場合はバッジを表示しない", () => {
    const entryWithoutObjectClass: HistoryEntry = {
      scpNumber: "scp-173",
      title: "彫刻 - オリジナル",
      excerpt: "",
      viewedAt: "2024-01-15T10:00:00.000Z",
    };

    render(<HistoryCard entry={entryWithoutObjectClass} />);

    expect(screen.queryByText("Euclid")).not.toBeInTheDocument();
    expect(screen.queryByText("Safe")).not.toBeInTheDocument();
    expect(screen.queryByText("Keter")).not.toBeInTheDocument();
  });

  it("スター数がフォーマットされて表示される", () => {
    render(<HistoryCard entry={mockEntry} />);

    expect(screen.getByText("+4,102")).toBeInTheDocument();
  });

  it("スター数が負数の場合はマイナス符号付きで表示される", () => {
    const entryWithNegativeRating: HistoryEntry = {
      ...mockEntry,
      rating: -15,
    };

    render(<HistoryCard entry={entryWithNegativeRating} />);

    expect(screen.getByText("-15")).toBeInTheDocument();
  });

  it("スター数がnullの場合は表示しない", () => {
    const entryWithoutRating: HistoryEntry = {
      ...mockEntry,
      rating: null,
    };

    render(<HistoryCard entry={entryWithoutRating} />);

    // +4,102 が表示されていないことを確認
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it("スター数がundefinedの場合は表示しない", () => {
    const entryWithoutRating: HistoryEntry = {
      ...mockEntry,
      rating: undefined,
    };

    render(<HistoryCard entry={entryWithoutRating} />);

    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it("excerptは表示されない", () => {
    const entryWithExcerpt: HistoryEntry = {
      ...mockEntry,
      excerpt: "アイテム番号: SCP-173",
    };

    render(<HistoryCard entry={entryWithExcerpt} />);

    expect(screen.queryByText("アイテム番号: SCP-173")).not.toBeInTheDocument();
  });

  it("カードをクリックすると記事詳細画面に遷移する（AC-1）", () => {
    render(<HistoryCard entry={mockEntry} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/article/scp-173");
  });

  it("SCP番号が正しくエンコードされる", () => {
    const entryWithSpecialChars: HistoryEntry = {
      ...mockEntry,
      scpNumber: "SCP-173-JP",
    };

    render(<HistoryCard entry={entryWithSpecialChars} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/article/SCP-173-JP");
  });

  it("タップフィードバックのスタイルが適用されている（AC-2）", () => {
    render(<HistoryCard entry={mockEntry} />);

    const link = screen.getByRole("link");
    expect(link).toHaveClass("active:scale-[0.98]");
  });
});
