import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import OnboardingLayout from "../layout";

describe("OnboardingLayout レスポンシブ対応", () => {
  describe("AC-1: ロゴのみ中央ヘッダー", () => {
    it("PC版ヘッダーがhidden md:flex md:justify-centerクラスを持つ", () => {
      render(
        <OnboardingLayout>
          <div />
        </OnboardingLayout>
      );
      const pcHeader = screen.getByTestId("onboarding-pc-header");
      expect(pcHeader.className).toContain("hidden");
      expect(pcHeader.className).toContain("md:flex");
      expect(pcHeader.className).toContain("md:justify-center");
    });

    it("PC版ヘッダーにロゴテキスト「SCPicks」が含まれる", () => {
      render(
        <OnboardingLayout>
          <div />
        </OnboardingLayout>
      );
      const pcHeader = screen.getByTestId("onboarding-pc-header");
      expect(pcHeader).toHaveTextContent("SCPicks");
    });

    it("PC版ヘッダーにナビリンク（aタグ）が存在しない", () => {
      render(
        <OnboardingLayout>
          <div />
        </OnboardingLayout>
      );
      const pcHeader = screen.getByTestId("onboarding-pc-header");
      expect(pcHeader.querySelectorAll("a")).toHaveLength(0);
    });

    it("PC版ヘッダーがmd:items-center md:h-14クラスを持つ", () => {
      render(
        <OnboardingLayout>
          <div />
        </OnboardingLayout>
      );
      const pcHeader = screen.getByTestId("onboarding-pc-header");
      expect(pcHeader.className).toContain("md:items-center");
      expect(pcHeader.className).toContain("md:h-14");
    });

    it("PC版ヘッダーにborder-bottomがある", () => {
      render(
        <OnboardingLayout>
          <div />
        </OnboardingLayout>
      );
      const pcHeader = screen.getByTestId("onboarding-pc-header");
      expect(pcHeader.className).toContain("md:border-b");
    });
  });

  describe("AC-6: コンテンツ中央寄せ", () => {
    it("childrenがレイアウト内に描画される", () => {
      render(
        <OnboardingLayout>
          <div data-testid="inner-child" />
        </OnboardingLayout>
      );
      const layout = screen.getByTestId("onboarding-layout");
      expect(layout).toContainElement(screen.getByTestId("inner-child"));
    });
  });
});
