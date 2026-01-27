import { describe, it, expect } from "vitest";
import { NotFoundError, OnboardingRequiredError } from "../errors";

describe("NotFoundError", () => {
  it("正しいエラーメッセージを生成する", () => {
    const error = new NotFoundError("Visitor", "abc-123");

    expect(error.message).toBe("Visitor not found: abc-123");
    expect(error.name).toBe("NotFoundError");
    expect(error.resource).toBe("Visitor");
    expect(error.id).toBe("abc-123");
  });

  it("Errorを継承している", () => {
    const error = new NotFoundError("Article", "scp-173");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(NotFoundError);
  });
});

describe("OnboardingRequiredError", () => {
  it("正しいエラーメッセージを生成する", () => {
    const error = new OnboardingRequiredError("visitor-456");

    expect(error.message).toBe("Onboarding required for visitor: visitor-456");
    expect(error.name).toBe("OnboardingRequiredError");
    expect(error.visitorId).toBe("visitor-456");
  });

  it("Errorを継承している", () => {
    const error = new OnboardingRequiredError("visitor-789");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(OnboardingRequiredError);
  });
});
