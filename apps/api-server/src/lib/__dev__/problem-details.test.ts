import { describe, it, expect } from "vitest";
import { createProblemDetails, ErrorTypes } from "../problem-details";

describe("ProblemDetails生成", () => {
  it("RFC 7807形式の全フィールドを含むJSONを生成できる", () => {
    const problem = createProblemDetails(
      "VALIDATION_ERROR",
      "Validation Error",
      400,
      "Invalid request body",
      "/api/visitors"
    );

    expect(problem).toEqual({
      type: "https://recommend-scp.dev/errors/validation-error",
      title: "Validation Error",
      status: 400,
      detail: "Invalid request body",
      instance: "/api/visitors",
    });
  });

  it("オプショナルフィールドがundefinedでも正しく生成できる", () => {
    const problem = createProblemDetails("INTERNAL_ERROR", "Internal Server Error", 500);

    expect(problem).toEqual({
      type: "https://recommend-scp.dev/errors/internal-error",
      title: "Internal Server Error",
      status: 500,
      detail: undefined,
      instance: undefined,
    });
  });

  it("全ErrorTypesで正しくURIが生成される", () => {
    const testCases: {
      key: keyof typeof ErrorTypes;
      expectedFragment: string;
    }[] = [
      { key: "VALIDATION_ERROR", expectedFragment: "validation-error" },
      { key: "NOT_FOUND", expectedFragment: "not-found" },
      { key: "ONBOARDING_REQUIRED", expectedFragment: "onboarding-required" },
      { key: "INTERNAL_ERROR", expectedFragment: "internal-error" },
    ];

    testCases.forEach(({ key, expectedFragment }) => {
      const problem = createProblemDetails(key, "Test", 400);
      expect(problem.type).toBe(`https://recommend-scp.dev/errors/${expectedFragment}`);
    });
  });

  it("detailが空文字列でも正しく含まれる", () => {
    const problem = createProblemDetails("VALIDATION_ERROR", "Validation Error", 400, "", "/test");

    expect(problem.detail).toBe("");
  });

  it("instanceがルートパスでも正しく含まれる", () => {
    const problem = createProblemDetails(
      "VALIDATION_ERROR",
      "Validation Error",
      400,
      undefined,
      "/"
    );

    expect(problem.instance).toBe("/");
  });
});

describe("ErrorTypes定数", () => {
  it("全ての必要なエラータイプが定義されている", () => {
    expect(ErrorTypes).toEqual({
      VALIDATION_ERROR: "validation-error",
      NOT_FOUND: "not-found",
      ONBOARDING_REQUIRED: "onboarding-required",
      INTERNAL_ERROR: "internal-error",
    });
  });
});
