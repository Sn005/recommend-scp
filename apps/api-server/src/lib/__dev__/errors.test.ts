import { describe, it, expect } from "vitest";
import { AppError, NotFoundError, ValidationError, OnboardingRequiredError } from "../errors";

describe("AppError", () => {
  describe("基本機能", () => {
    it("Errorクラスを継承している", () => {
      const error = new AppError("test-type", "Test Title", 400, "detail", "/test");
      expect(error).toBeInstanceOf(Error);
    });

    it("type, title, status, detail, instanceプロパティを持つ", () => {
      const error = new AppError(
        "https://example.com/error",
        "Test Title",
        400,
        "Test detail",
        "/test"
      );

      expect(error.type).toBe("https://example.com/error");
      expect(error.title).toBe("Test Title");
      expect(error.status).toBe(400);
      expect(error.detail).toBe("Test detail");
      expect(error.instance).toBe("/test");
    });

    it("toProblemDetails()がProblemDetails形式に変換できる", () => {
      const error = new AppError(
        "https://example.com/error",
        "Test Title",
        400,
        "Test detail",
        "/test"
      );

      const problemDetails = error.toProblemDetails();

      expect(problemDetails).toEqual({
        type: "https://example.com/error",
        title: "Test Title",
        status: 400,
        detail: "Test detail",
        instance: "/test",
      });
    });

    it("nameプロパティがコンストラクタ名と一致する", () => {
      const error = new AppError("test-type", "Test", 400);
      expect(error.name).toBe("AppError");
    });

    it("messageプロパティがtitleと一致する", () => {
      const error = new AppError("test-type", "Custom Title", 400);
      expect(error.message).toBe("Custom Title");
    });
  });

  describe("エッジケース", () => {
    it("detailがundefinedの場合もtoProblemDetails()で正しく処理される", () => {
      const error = new AppError("test", "Test", 400);
      const problemDetails = error.toProblemDetails();

      expect(problemDetails.detail).toBeUndefined();
    });

    it("instanceがundefinedの場合もtoProblemDetails()で正しく処理される", () => {
      const error = new AppError("test", "Test", 400, "detail");
      const problemDetails = error.toProblemDetails();

      expect(problemDetails.instance).toBeUndefined();
    });

    it("detailに空文字列を渡した場合、空文字列が設定される", () => {
      const error = new AppError("test", "Test", 400, "");
      expect(error.detail).toBe("");
    });
  });
});

describe("NotFoundError", () => {
  describe("基本機能", () => {
    it("statusが404である", () => {
      const error = new NotFoundError("Visitor", "abc-123");
      expect(error.status).toBe(404);
    });

    it("typeが正しいURIである", () => {
      const error = new NotFoundError("Visitor", "abc-123");
      expect(error.type).toBe("https://recommend-scp.dev/errors/not-found");
    });

    it("titleが'Resource Not Found'である", () => {
      const error = new NotFoundError("Visitor", "abc-123");
      expect(error.title).toBe("Resource Not Found");
    });

    it("detailがresourceTypeとidを含む形式である", () => {
      const error = new NotFoundError("Visitor", "abc-123");
      expect(error.detail).toBe("Visitor with id 'abc-123' not found");
    });

    it("toProblemDetails()でRFC 7807形式に変換できる", () => {
      const error = new NotFoundError("Article", "xyz-789");
      const problemDetails = error.toProblemDetails();

      expect(problemDetails).toEqual({
        type: "https://recommend-scp.dev/errors/not-found",
        title: "Resource Not Found",
        status: 404,
        detail: "Article with id 'xyz-789' not found",
        instance: undefined,
      });
    });

    it("AppErrorを継承している", () => {
      const error = new NotFoundError("Visitor", "123");
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it("nameプロパティがNotFoundErrorである", () => {
      const error = new NotFoundError("Visitor", "123");
      expect(error.name).toBe("NotFoundError");
    });
  });

  describe("エッジケース", () => {
    it("resourceTypeに空文字列を渡した場合、detailに空文字列が含まれる", () => {
      const error = new NotFoundError("", "abc-123");
      expect(error.detail).toBe(" with id 'abc-123' not found");
    });

    it("idに空文字列を渡した場合、detailに空文字列が含まれる", () => {
      const error = new NotFoundError("Visitor", "");
      expect(error.detail).toBe("Visitor with id '' not found");
    });

    it("idにUUIDを渡した場合、正しくフォーマットされる", () => {
      const error = new NotFoundError("Visitor", "550e8400-e29b-41d4-a716-446655440000");
      expect(error.detail).toBe("Visitor with id '550e8400-e29b-41d4-a716-446655440000' not found");
    });

    it("resourceTypeに日本語を渡した場合、正しくフォーマットされる", () => {
      const error = new NotFoundError("訪問者", "abc-123");
      expect(error.detail).toBe("訪問者 with id 'abc-123' not found");
    });
  });
});

describe("ValidationError", () => {
  describe("基本機能", () => {
    it("statusが400である", () => {
      const error = new ValidationError("Invalid input");
      expect(error.status).toBe(400);
    });

    it("typeが正しいURIである", () => {
      const error = new ValidationError("Invalid input");
      expect(error.type).toBe("https://recommend-scp.dev/errors/validation-error");
    });

    it("titleが'Validation Error'である", () => {
      const error = new ValidationError("Invalid input");
      expect(error.title).toBe("Validation Error");
    });

    it("detailが渡されたmessageである", () => {
      const message = "At least 3 articles must be selected";
      const error = new ValidationError(message);
      expect(error.detail).toBe(message);
    });

    it("toProblemDetails()でRFC 7807形式に変換できる", () => {
      const error = new ValidationError("Email format is invalid");
      const problemDetails = error.toProblemDetails();

      expect(problemDetails).toEqual({
        type: "https://recommend-scp.dev/errors/validation-error",
        title: "Validation Error",
        status: 400,
        detail: "Email format is invalid",
        instance: undefined,
      });
    });

    it("AppErrorを継承している", () => {
      const error = new ValidationError("error");
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it("nameプロパティがValidationErrorである", () => {
      const error = new ValidationError("error");
      expect(error.name).toBe("ValidationError");
    });
  });

  describe("エッジケース", () => {
    it("messageに空文字列を渡した場合、detailが空文字列になる", () => {
      const error = new ValidationError("");
      expect(error.detail).toBe("");
    });

    it("messageに非常に長い文字列を渡した場合、そのまま設定される", () => {
      const longMessage = "a".repeat(1000);
      const error = new ValidationError(longMessage);
      expect(error.detail).toBe(longMessage);
      expect(error.detail?.length).toBe(1000);
    });

    it("messageに改行やタブを含む場合、そのまま設定される", () => {
      const message = "Line 1\nLine 2\tTabbed";
      const error = new ValidationError(message);
      expect(error.detail).toBe(message);
    });

    it("messageに日本語を渡した場合、正しく設定される", () => {
      const error = new ValidationError("少なくとも3つの記事を選択する必要があります");
      expect(error.detail).toBe("少なくとも3つの記事を選択する必要があります");
    });
  });
});

describe("OnboardingRequiredError", () => {
  describe("基本機能", () => {
    it("statusが403である", () => {
      const error = new OnboardingRequiredError("visitor-123");
      expect(error.status).toBe(403);
    });

    it("typeが正しいURIである", () => {
      const error = new OnboardingRequiredError("visitor-123");
      expect(error.type).toBe("https://recommend-scp.dev/errors/onboarding-required");
    });

    it("titleが'Onboarding Required'である", () => {
      const error = new OnboardingRequiredError("visitor-123");
      expect(error.title).toBe("Onboarding Required");
    });

    it("detailがvisitorIdを含む形式である", () => {
      const error = new OnboardingRequiredError("visitor-123");
      expect(error.detail).toBe("Visitor 'visitor-123' has not completed onboarding");
    });

    it("toProblemDetails()でRFC 7807形式に変換できる", () => {
      const error = new OnboardingRequiredError("abc-xyz-789");
      const problemDetails = error.toProblemDetails();

      expect(problemDetails).toEqual({
        type: "https://recommend-scp.dev/errors/onboarding-required",
        title: "Onboarding Required",
        status: 403,
        detail: "Visitor 'abc-xyz-789' has not completed onboarding",
        instance: undefined,
      });
    });

    it("AppErrorを継承している", () => {
      const error = new OnboardingRequiredError("visitor-123");
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it("nameプロパティがOnboardingRequiredErrorである", () => {
      const error = new OnboardingRequiredError("visitor-123");
      expect(error.name).toBe("OnboardingRequiredError");
    });
  });

  describe("エッジケース", () => {
    it("visitorIdに空文字列を渡した場合、detailに空文字列が含まれる", () => {
      const error = new OnboardingRequiredError("");
      expect(error.detail).toBe("Visitor '' has not completed onboarding");
    });

    it("visitorIdにUUIDを渡した場合、正しくフォーマットされる", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      const error = new OnboardingRequiredError(uuid);
      expect(error.detail).toBe(`Visitor '${uuid}' has not completed onboarding`);
    });

    it("visitorIdに日本語を含む場合、正しくフォーマットされる", () => {
      const error = new OnboardingRequiredError("訪問者123");
      expect(error.detail).toBe("Visitor '訪問者123' has not completed onboarding");
    });
  });
});
