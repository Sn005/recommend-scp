/**
 * @file HistoryCard コンポーネントテスト
 * @description 履歴カードのUI表示テスト
 * @see specs/006-frontend/006-04-history/006-04-03.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HistoryCard } from "../index";
import type { HistoryEntry } from "../../../_types";

// formatRelativeTime のモック
vi.mock("@/shared/lib/date", () => ({
  formatRelativeTime: vi.fn(() => "2時間前"),
}));

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
    excerpt: "アイテム番号: SCP-173 オブジェクトクラス: Euclid 特別収容プロ",
    objectClass: "Euclid",
    viewedAt: "2024-01-15T10:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("SCP番号が表示される", () => {
    render(<HistoryCard entry={mockEntry} />);

    expect(screen.getByText("scp-173")).toBeInTheDocument();
  });

  it("タイトルが表示される", () => {
    render(<HistoryCard entry={mockEntry} />);

    expect(screen.getByText("彫刻 - オリジナル")).toBeInTheDocument();
  });

  it("excerptがタイトル下に表示される（AC-4）", () => {
    render(<HistoryCard entry={mockEntry} />);

    const excerptElement = screen.getByText(
      "アイテム番号: SCP-173 オブジェクトクラス: Euclid 特別収容プロ"
    );
    expect(excerptElement).toBeInTheDocument();
  });

  it("excerptがグレーのテキストカラーで表示される（AC-4）", () => {
    render(<HistoryCard entry={mockEntry} />);

    const excerptElement = screen.getByText(
      "アイテム番号: SCP-173 オブジェクトクラス: Euclid 特別収容プロ"
    );
    expect(excerptElement).toHaveClass("text-gray-400");
  });

  it("excerptが1行に収まるよう省略される（AC-4）", () => {
    render(<HistoryCard entry={mockEntry} />);

    const excerptElement = screen.getByText(
      "アイテム番号: SCP-173 オブジェクトクラス: Euclid 特別収容プロ"
    );
    expect(excerptElement).toHaveClass("truncate");
  });

  it("excerptが空の場合は表示しない（AC-5）", () => {
    const entryWithoutExcerpt: HistoryEntry = {
      ...mockEntry,
      excerpt: "",
    };

    render(<HistoryCard entry={entryWithoutExcerpt} />);

    // excerptの親要素（data-testid="excerpt"）が存在しないことを確認
    expect(screen.queryByTestId("excerpt")).not.toBeInTheDocument();
  });

  it("オブジェクトクラスバッジが表示される", () => {
    render(<HistoryCard entry={mockEntry} />);

    expect(screen.getByText("Euclid")).toBeInTheDocument();
  });

  it("オブジェクトクラスがない場合はバッジを表示しない", () => {
    const entryWithoutObjectClass: HistoryEntry = {
      scpNumber: "scp-173",
      title: "彫刻 - オリジナル",
      excerpt: "テスト",
      viewedAt: "2024-01-15T10:00:00.000Z",
    };

    render(<HistoryCard entry={entryWithoutObjectClass} />);

    // Euclidなどのオブジェクトクラステキストが存在しないことを確認
    expect(screen.queryByText("Euclid")).not.toBeInTheDocument();
    expect(screen.queryByText("Safe")).not.toBeInTheDocument();
    expect(screen.queryByText("Keter")).not.toBeInTheDocument();
  });

  it("閲覧時刻が相対時間で表示される", () => {
    render(<HistoryCard entry={mockEntry} />);

    expect(screen.getByText("2時間前")).toBeInTheDocument();
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
