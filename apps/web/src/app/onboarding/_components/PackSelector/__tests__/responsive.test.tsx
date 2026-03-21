/* eslint-disable @typescript-eslint/no-unsafe-return */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// api-clientをモック
const mockPacksGet = vi.fn<() => Promise<{ ok: boolean; json: () => Promise<unknown> }>>();
const mockSelectPost = vi.fn();

vi.mock("@/shared/lib/api-client", () => ({
  api: {
    onboarding: {
      packs: {
        $get: () => mockPacksGet(),
      },
      select: {
        $post: (params: unknown) => mockSelectPost(params),
      },
    },
  },
}));

vi.mock("@/shared/hooks/useVisitorId", () => ({
  useVisitorId: () => ({
    visitorId: "test-visitor-id",
    isLoading: false,
    isOnboarded: false,
    error: null,
    refresh: vi.fn(),
    markOnboarded: vi.fn(),
  }),
}));

import { PackSelector } from "../index";

const mockPacks = [
  {
    type: "horror" as const,
    displayName: "ホラー好き",
    description: "恐怖と不気味さを求めるあなたに",
    primaryTags: ["ホラー", "恐怖", "不気味"],
  },
  {
    type: "mystery" as const,
    displayName: "ミステリー派",
    description: "謎解きと陰謀論を追求",
    primaryTags: ["ミステリー", "陰謀", "謎"],
  },
  {
    type: "scifi" as const,
    displayName: "サイエンス派",
    description: "SF的・科学的な収容物に興味",
    primaryTags: ["科学", "テクノロジー", "実験"],
  },
  {
    type: "heartwarming" as const,
    displayName: "ほのぼの派",
    description: "心温まる収容物を求めて",
    primaryTags: ["ほのぼの", "癒し", "友好"],
  },
  {
    type: "classic" as const,
    displayName: "定番派",
    description: "定番・名作を楽しむ",
    primaryTags: ["定番", "名作", "人気"],
  },
];

describe("PackSelector レスポンシブ対応", () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockPacksGet.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ packs: mockPacks }),
    });
  });

  describe("AC-3: パックカード2列グリッド", () => {
    it("パックカードコンテナがmd:grid md:grid-cols-2 md:gap-4クラスを持つ", async () => {
      render(<PackSelector visitorId="test-visitor" onComplete={mockOnComplete} />);
      await waitFor(() => {
        expect(screen.getByTestId("pack-card-grid")).toBeInTheDocument();
      });
      const grid = screen.getByTestId("pack-card-grid");
      expect(grid.className).toContain("md:grid");
      expect(grid.className).toContain("md:grid-cols-2");
      expect(grid.className).toContain("md:gap-4");
    });

    it("パックカードコンテナがmd:space-y-0クラスを持つ（space-y-3との衝突解消）", async () => {
      render(<PackSelector visitorId="test-visitor" onComplete={mockOnComplete} />);
      await waitFor(() => {
        expect(screen.getByTestId("pack-card-grid")).toBeInTheDocument();
      });
      expect(screen.getByTestId("pack-card-grid").className).toContain("md:space-y-0");
    });

    it("グリッド化後もパックカードが全件表示される", async () => {
      render(<PackSelector visitorId="test-visitor" onComplete={mockOnComplete} />);
      await waitFor(() => {
        expect(screen.getByText("ホラー好き")).toBeInTheDocument();
      });
      expect(screen.getByText("ミステリー派")).toBeInTheDocument();
      expect(screen.getByText("サイエンス派")).toBeInTheDocument();
      expect(screen.getByText("ほのぼの派")).toBeInTheDocument();
      expect(screen.getByText("定番派")).toBeInTheDocument();
    });
  });

  describe("AC-5: 開始ボタン中央寄せ", () => {
    it("ボタンコンテナがmd:left-0 md:right-0 md:max-w-[768px] md:mx-autoクラスを持つ", async () => {
      render(<PackSelector visitorId="test-visitor" onComplete={mockOnComplete} />);
      await waitFor(() => {
        expect(screen.getByTestId("start-button-container")).toBeInTheDocument();
      });
      const container = screen.getByTestId("start-button-container");
      expect(container.className).toContain("md:left-0");
      expect(container.className).toContain("md:right-0");
      expect(container.className).toContain("md:max-w-[768px]");
      expect(container.className).toContain("md:mx-auto");
    });

    it("ボタンコンテナがfixed bottom-0を保持する（モバイル非破壊）", async () => {
      render(<PackSelector visitorId="test-visitor" onComplete={mockOnComplete} />);
      await waitFor(() => {
        expect(screen.getByTestId("start-button-container")).toBeInTheDocument();
      });
      const container = screen.getByTestId("start-button-container");
      expect(container.className).toContain("fixed");
      expect(container.className).toContain("bottom-0");
    });
  });
});
