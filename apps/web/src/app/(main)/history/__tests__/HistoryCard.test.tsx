/**
 * @file HistoryCardコンポーネントのテスト
 * @see specs/010-ja-article-display/010-04-history-excerpt/010-04-01.md
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { HistoryCard } from "../_components/HistoryCard";
import type { HistoryEntry } from "../_types";

const mockEntry: HistoryEntry = {
  scpNumber: "SCP-173",
  title: "彫刻 - オリジナル",
  excerpt: "アイテム番号: SCP-173 オブジェクトクラス: Euclid 特別収容プロトコル",
  objectClass: "Euclid",
  viewedAt: new Date().toISOString(),
};

describe("HistoryCard", () => {
  describe("AC-4: UI表示", () => {
    it("タイトル下にexcerptが表示される", () => {
      render(<HistoryCard entry={mockEntry} />);

      expect(screen.getByText(mockEntry.scpNumber)).toBeInTheDocument();
      expect(screen.getByText(mockEntry.title)).toBeInTheDocument();
      expect(screen.getByText(mockEntry.excerpt)).toBeInTheDocument();
    });

    it("excerptはグレーのテキストカラーで表示される", () => {
      render(<HistoryCard entry={mockEntry} />);

      const excerptElement = screen.getByText(mockEntry.excerpt);
      expect(excerptElement).toHaveClass("text-gray-500");
    });

    it("excerptは1行に収まるよう省略される（truncateクラス）", () => {
      render(<HistoryCard entry={mockEntry} />);

      const excerptElement = screen.getByText(mockEntry.excerpt);
      expect(excerptElement).toHaveClass("truncate");
    });
  });

  describe("AC-5: 空のexcerpt", () => {
    it("excerptが空の場合はexcerpt行は表示しない", () => {
      const entryWithoutExcerpt: HistoryEntry = {
        ...mockEntry,
        excerpt: "",
      };

      render(<HistoryCard entry={entryWithoutExcerpt} />);

      // SCP番号とタイトルは表示される
      expect(screen.getByText(entryWithoutExcerpt.scpNumber)).toBeInTheDocument();
      expect(screen.getByText(entryWithoutExcerpt.title)).toBeInTheDocument();

      // excerpt行は表示されない（gray-500のテキストは時間表示のみ）
      const grayTexts = document.querySelectorAll(".text-gray-500");
      // 時間表示の1つのみ（excerptは表示されない）
      expect(grayTexts.length).toBe(1);
    });
  });

  describe("基本機能", () => {
    it("SCP番号が表示される", () => {
      render(<HistoryCard entry={mockEntry} />);
      expect(screen.getByText("SCP-173")).toBeInTheDocument();
    });

    it("タイトルが表示される", () => {
      render(<HistoryCard entry={mockEntry} />);
      expect(screen.getByText("彫刻 - オリジナル")).toBeInTheDocument();
    });

    it("オブジェクトクラスバッジが表示される", () => {
      render(<HistoryCard entry={mockEntry} />);
      expect(screen.getByText("Euclid")).toBeInTheDocument();
    });

    it("相対時間が表示される", () => {
      render(<HistoryCard entry={mockEntry} />);
      // "たった今" or "X分前" などが表示される
      expect(screen.getByText(/たった今|分前|時間前|日前/)).toBeInTheDocument();
    });

    it("クリックするとonClickが呼ばれる", () => {
      const onClick = vi.fn();
      render(<HistoryCard entry={mockEntry} onClick={onClick} />);

      const card = screen.getByRole("button");
      fireEvent.click(card);

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("相対時間フォーマット", () => {
    it("1分未満は「たった今」と表示される", () => {
      const recentEntry: HistoryEntry = {
        ...mockEntry,
        viewedAt: new Date().toISOString(),
      };

      render(<HistoryCard entry={recentEntry} />);
      expect(screen.getByText("たった今")).toBeInTheDocument();
    });

    it("1時間未満は「X分前」と表示される", () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const entry: HistoryEntry = {
        ...mockEntry,
        viewedAt: thirtyMinutesAgo.toISOString(),
      };

      render(<HistoryCard entry={entry} />);
      expect(screen.getByText("30分前")).toBeInTheDocument();
    });

    it("24時間未満は「X時間前」と表示される", () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const entry: HistoryEntry = {
        ...mockEntry,
        viewedAt: twoHoursAgo.toISOString(),
      };

      render(<HistoryCard entry={entry} />);
      expect(screen.getByText("2時間前")).toBeInTheDocument();
    });

    it("30日未満は「X日前」と表示される", () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const entry: HistoryEntry = {
        ...mockEntry,
        viewedAt: threeDaysAgo.toISOString(),
      };

      render(<HistoryCard entry={entry} />);
      expect(screen.getByText("3日前")).toBeInTheDocument();
    });
  });
});
