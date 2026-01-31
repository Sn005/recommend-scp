/**
 * @file RecommendService テスト
 * @see specs/005-backend-api/005-05-recommend-api/005-05-01.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { RecommendService } from "../service";
import { NotFoundError, OnboardingRequiredError } from "../../../lib/errors";
import type { Visitor } from "../../visitors/types";
import type {
  RecommendedArticle,
  RecommendationEngine,
} from "@recommend-scp/shared/recommendation";
import type { PreferenceStorage } from "@recommend-scp/shared/storage/server";
import type { VisitorsRepository } from "../../visitors/repository";

/**
 * モック用インターフェース
 */
interface MockVisitorsRepository {
  findByVisitorId: ReturnType<typeof vi.fn>;
}

interface MockPreferenceStorage {
  getProfile: ReturnType<typeof vi.fn>;
}

interface MockRecommendationEngine {
  getRecommendations: ReturnType<typeof vi.fn>;
  recordRecommendation: ReturnType<typeof vi.fn>;
}

describe("RecommendService", () => {
  let mockVisitorsRepo: MockVisitorsRepository;
  let mockStorage: MockPreferenceStorage;
  let mockEngine: MockRecommendationEngine;
  let service: RecommendService;

  beforeEach(() => {
    mockVisitorsRepo = {
      findByVisitorId: vi.fn(),
    };

    mockStorage = {
      getProfile: vi.fn(),
    };

    mockEngine = {
      getRecommendations: vi.fn(),
      recordRecommendation: vi.fn(),
    };

    service = new RecommendService(
      mockVisitorsRepo as unknown as VisitorsRepository,
      mockStorage as unknown as PreferenceStorage,
      mockEngine as unknown as RecommendationEngine
    );
  });

  describe("インスタンス化", () => {
    it("RecommendServiceが正常にインスタンス化される", () => {
      expect(service).toBeDefined();
      expect(service.getRecommendations).toBeDefined();
      expect(service.recordRecommendation).toBeDefined();
    });
  });

  describe("getRecommendations", () => {
    describe("正常系", () => {
      const mockVisitor: Visitor = {
        id: "uuid-123",
        visitorId: "valid-visitor",
        createdAt: "2025-01-20T10:00:00Z",
        updatedAt: "2025-01-20T10:00:00Z",
      };

      const mockProfile = {
        visitorId: "valid-visitor",
        onboardingCompletedAt: "2025-01-20T10:00:00Z",
        preferenceEmbedding: [0.1, 0.2, 0.3],
      };

      const mockRecommendations: RecommendedArticle[] = [
        {
          id: "scp-173",
          title: "彫刻",
          similarityScore: 0.95,
          source: "preference",
          url: "http://scp-jp.wikidot.com/scp-173",
        },
        {
          id: "scp-096",
          title: "シャイガイ",
          similarityScore: 0.87,
          source: "preference",
          url: "http://scp-jp.wikidot.com/scp-096",
        },
      ];

      it("有効なvisitorIdで推薦記事を返す", async () => {
        mockVisitorsRepo.findByVisitorId.mockResolvedValue(mockVisitor);
        mockStorage.getProfile.mockResolvedValue(mockProfile);
        mockEngine.getRecommendations.mockResolvedValue(mockRecommendations);

        const result = await service.getRecommendations("valid-visitor");

        expect(result).toEqual(mockRecommendations);
        expect(mockVisitorsRepo.findByVisitorId).toHaveBeenCalledWith("valid-visitor");
        expect(mockStorage.getProfile).toHaveBeenCalledWith("valid-visitor");
        expect(mockEngine.getRecommendations).toHaveBeenCalledWith("valid-visitor", 10);
      });

      it("limitパラメータが正しく渡される", async () => {
        mockVisitorsRepo.findByVisitorId.mockResolvedValue(mockVisitor);
        mockStorage.getProfile.mockResolvedValue(mockProfile);
        mockEngine.getRecommendations.mockResolvedValue([]);

        await service.getRecommendations("valid-visitor", 5);

        expect(mockEngine.getRecommendations).toHaveBeenCalledWith("valid-visitor", 5);
      });

      it("デフォルトlimit=10で動作する", async () => {
        mockVisitorsRepo.findByVisitorId.mockResolvedValue(mockVisitor);
        mockStorage.getProfile.mockResolvedValue(mockProfile);
        mockEngine.getRecommendations.mockResolvedValue([]);

        await service.getRecommendations("valid-visitor");

        expect(mockEngine.getRecommendations).toHaveBeenCalledWith("valid-visitor", 10);
      });

      it("推薦結果が空配列の場合も正常に返す", async () => {
        mockVisitorsRepo.findByVisitorId.mockResolvedValue(mockVisitor);
        mockStorage.getProfile.mockResolvedValue(mockProfile);
        mockEngine.getRecommendations.mockResolvedValue([]);

        const result = await service.getRecommendations("valid-visitor");

        expect(result).toEqual([]);
      });
    });

    describe("異常系: 未登録visitorId", () => {
      it("未登録visitorIdの場合、NotFoundErrorをスローする", async () => {
        mockVisitorsRepo.findByVisitorId.mockResolvedValue(null);

        await expect(service.getRecommendations("unknown-visitor")).rejects.toThrow(NotFoundError);
        await expect(service.getRecommendations("unknown-visitor")).rejects.toThrow(
          "Resource Not Found"
        );
      });

      it("visitorIdが空文字列の場合、NotFoundErrorをスローする", async () => {
        mockVisitorsRepo.findByVisitorId.mockResolvedValue(null);

        await expect(service.getRecommendations("")).rejects.toThrow(NotFoundError);
      });
    });

    describe("異常系: オンボーディング未完了", () => {
      const mockVisitor: Visitor = {
        id: "uuid-123",
        visitorId: "not-onboarded-visitor",
        createdAt: "2025-01-20T10:00:00Z",
        updatedAt: "2025-01-20T10:00:00Z",
      };

      it("onboardingCompletedAt=nullの場合、OnboardingRequiredErrorをスローする", async () => {
        const profileWithoutOnboarding = {
          visitorId: "not-onboarded-visitor",
          onboardingCompletedAt: null,
        };

        mockVisitorsRepo.findByVisitorId.mockResolvedValue(mockVisitor);
        mockStorage.getProfile.mockResolvedValue(profileWithoutOnboarding);

        await expect(service.getRecommendations("not-onboarded-visitor")).rejects.toThrow(
          OnboardingRequiredError
        );
        await expect(service.getRecommendations("not-onboarded-visitor")).rejects.toThrow(
          "Onboarding Required"
        );
      });

      it("onboardingCompletedAt=undefinedの場合、OnboardingRequiredErrorをスローする", async () => {
        const profileWithoutOnboarding = {
          visitorId: "not-onboarded-visitor",
          onboardingCompletedAt: undefined,
        };

        mockVisitorsRepo.findByVisitorId.mockResolvedValue(mockVisitor);
        mockStorage.getProfile.mockResolvedValue(profileWithoutOnboarding);

        await expect(service.getRecommendations("not-onboarded-visitor")).rejects.toThrow(
          OnboardingRequiredError
        );
      });

      it("profileがnullの場合、OnboardingRequiredErrorをスローする", async () => {
        mockVisitorsRepo.findByVisitorId.mockResolvedValue(mockVisitor);
        mockStorage.getProfile.mockResolvedValue(null);

        await expect(service.getRecommendations("not-onboarded-visitor")).rejects.toThrow(
          OnboardingRequiredError
        );
      });
    });

    describe("依存関係エラー", () => {
      it("VisitorsRepositoryのエラーを伝播する", async () => {
        const dbError = new Error("Database connection failed");
        mockVisitorsRepo.findByVisitorId.mockRejectedValue(dbError);

        await expect(service.getRecommendations("visitor-123")).rejects.toThrow(
          "Database connection failed"
        );
      });

      it("RecommendationEngineのエラーを伝播する", async () => {
        const mockVisitor: Visitor = {
          id: "uuid-123",
          visitorId: "valid-visitor",
          createdAt: "2025-01-20T10:00:00Z",
          updatedAt: "2025-01-20T10:00:00Z",
        };
        const mockProfile = {
          visitorId: "valid-visitor",
          onboardingCompletedAt: "2025-01-20T10:00:00Z",
        };
        const engineError = new Error("Vector calculation failed");

        mockVisitorsRepo.findByVisitorId.mockResolvedValue(mockVisitor);
        mockStorage.getProfile.mockResolvedValue(mockProfile);
        mockEngine.getRecommendations.mockRejectedValue(engineError);

        await expect(service.getRecommendations("valid-visitor")).rejects.toThrow(
          "Vector calculation failed"
        );
      });
    });
  });

  describe("recordRecommendation", () => {
    it("推薦ログを記録する", async () => {
      mockEngine.recordRecommendation.mockResolvedValue(undefined);

      await service.recordRecommendation("visitor-123", "scp-173", "preference");

      expect(mockEngine.recordRecommendation).toHaveBeenCalledWith(
        "visitor-123",
        "scp-173",
        "preference"
      );
    });

    it("serendipityソースでも正しく記録する", async () => {
      mockEngine.recordRecommendation.mockResolvedValue(undefined);

      await service.recordRecommendation("visitor-123", "scp-682", "serendipity");

      expect(mockEngine.recordRecommendation).toHaveBeenCalledWith(
        "visitor-123",
        "scp-682",
        "serendipity"
      );
    });
  });
});
