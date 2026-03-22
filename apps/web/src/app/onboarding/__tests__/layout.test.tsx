import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import OnboardingLayout from "../layout";

describe("OnboardingLayout", () => {
  it("childrenがレイアウト内に描画される", () => {
    render(
      <OnboardingLayout>
        <div data-testid="inner-child" />
      </OnboardingLayout>
    );
    const layout = screen.getByTestId("onboarding-layout");
    expect(layout).toContainElement(screen.getByTestId("inner-child"));
  });

  it("レイアウトにmin-h-screen bg-gray-50が適用される", () => {
    render(
      <OnboardingLayout>
        <div />
      </OnboardingLayout>
    );
    const layout = screen.getByTestId("onboarding-layout");
    expect(layout.className).toContain("min-h-screen");
    expect(layout.className).toContain("bg-gray-50");
  });
});
