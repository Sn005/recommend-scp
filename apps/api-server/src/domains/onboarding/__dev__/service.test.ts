/**
 * @file OnboardingApiService 単体テスト
 * @see specs/005-backend-api/005-07-onboarding-api/005-07-01.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { OnboardingApiService } from "../service";
import type { OnboardingService } from "@recommend-scp/shared/onboarding";
import type { VisitorsRepository } from "../../visitors/repository";
import { NotFoundError, ValidationError } from "../../../lib/errors";
import type { StarterPackType } from "@recommend-scp/shared/storage";

// モック用の型
interface MockOnboardingService {
  completeWithStarterPack: ReturnType<typeof vi.fn>;
  completeWithCustomSelection: ReturnType<typeof vi.fn>;
}

interface MockVisitorsRepository {
  findByVisitorId: ReturnType<typeof vi.fn>;
}

describe("OnboardingApiService", () => {
  // ============================================
  // getStarterPacks テスト
  // ============================================

  describe("getStarterPacks", () => {
    it("5種類のスターターパックを返す", () => {
      const mockVisitorsRepo = {} as unknown as VisitorsRepository;
      const mockOnboardingService = {} as unknown as OnboardingService;

      const service = new OnboardingApiService(mockVisitorsRepo, mockOnboardingService);
      const packs = service.getStarterPacks();

      expect(packs).toHaveLength(5);
    });

    it("各パックにtype, displayName, description, primaryTagsが含まれる", () => {
      const mockVisitorsRepo = {} as unknown as VisitorsRepository;
      const mockOnboardingService = {} as unknown as OnboardingService;

      const service = new OnboardingApiService(mockVisitorsRepo, mockOnboardingService);
      const packs = service.getStarterPacks();

      for (const pack of packs) {
        expect(pack).toHaveProperty("type");
        expect(pack).toHaveProperty("displayName");
        expect(pack).toHaveProperty("description");
        expect(pack).toHaveProperty("primaryTags");
        expect(Array.isArray(pack.primaryTags)).toBe(true);
      }
    });

    it("customパックを含まない", () => {
      const mockVisitorsRepo = {} as unknown as VisitorsRepository;
      const mockOnboardingService = {} as unknown as OnboardingService;

      const service = new OnboardingApiService(mockVisitorsRepo, mockOnboardingService);
      const packs = service.getStarterPacks();

      const types = packs.map((p) => p.type);
      expect(types).not.toContain("custom");
    });

    it("重複したパック種別が含まれない", () => {
      const mockVisitorsRepo = {} as unknown as VisitorsRepository;
      const mockOnboardingService = {} as unknown as OnboardingService;

      const service = new OnboardingApiService(mockVisitorsRepo, mockOnboardingService);
      const packs = service.getStarterPacks();

      const types = packs.map((p) => p.type);
      const uniqueTypes = new Set(types);
      expect(uniqueTypes.size).toBe(types.length);
    });

    it("複数回呼び出しても同じ結果を返す（冪等性）", () => {
      const mockVisitorsRepo = {} as unknown as VisitorsRepository;
      const mockOnboardingService = {} as unknown as OnboardingService;

      const service = new OnboardingApiService(mockVisitorsRepo, mockOnboardingService);
      const packs1 = service.getStarterPacks();
      const packs2 = service.getStarterPacks();

      expect(packs1).toEqual(packs2);
    });
  });

  // ============================================
  // selectPack テスト
  // ============================================

  describe("selectPack", () => {
    let mockVisitorsRepo: MockVisitorsRepository;
    let mockOnboardingService: MockOnboardingService;

    beforeEach(() => {
      mockVisitorsRepo = {
        findByVisitorId: vi.fn(),
      };
      mockOnboardingService = {
        completeWithStarterPack: vi.fn(),
        completeWithCustomSelection: vi.fn(),
      };
    });

    it("有効なvisitorIdとpackTypeの場合、OnboardingService.completeWithStarterPackを呼び出す", async () => {
      const visitor = {
        id: "uuid-1",
        visitorId: "visitor-123",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      mockVisitorsRepo.findByVisitorId.mockResolvedValue(visitor);
      mockOnboardingService.completeWithStarterPack.mockResolvedValue({
        visitorId: "visitor-123",
        starterPack: "horror",
        onboardingCompletedAt: "2024-01-01T00:00:00Z",
      });

      const service = new OnboardingApiService(
        mockVisitorsRepo as unknown as VisitorsRepository,
        mockOnboardingService as unknown as OnboardingService
      );

      await service.selectPack("visitor-123", "horror");

      expect(mockVisitorsRepo.findByVisitorId).toHaveBeenCalledWith("visitor-123");
      expect(mockOnboardingService.completeWithStarterPack).toHaveBeenCalledWith(
        "visitor-123",
        "horror"
      );
    });

    it("全てのパック種別で正常に動作する", async () => {
      const packTypes: Exclude<StarterPackType, "custom">[] = [
        "horror",
        "surreal",
        "scientific",
        "heartwarming",
        "mystery",
      ];

      for (const packType of packTypes) {
        mockVisitorsRepo.findByVisitorId.mockResolvedValue({
          id: "uuid-1",
          visitorId: "visitor-123",
        });
        mockOnboardingService.completeWithStarterPack.mockResolvedValue({});

        const service = new OnboardingApiService(
          mockVisitorsRepo as unknown as VisitorsRepository,
          mockOnboardingService as unknown as OnboardingService
        );

        await service.selectPack("visitor-123", packType);

        expect(mockOnboardingService.completeWithStarterPack).toHaveBeenCalledWith(
          "visitor-123",
          packType
        );

        vi.clearAllMocks();
      }
    });

    it("未登録visitorIdの場合、NotFoundErrorをスローする", async () => {
      mockVisitorsRepo.findByVisitorId.mockResolvedValue(null);

      const service = new OnboardingApiService(
        mockVisitorsRepo as unknown as VisitorsRepository,
        mockOnboardingService as unknown as OnboardingService
      );

      await expect(service.selectPack("invalid-visitor", "horror")).rejects.toThrow(NotFoundError);
      await expect(service.selectPack("invalid-visitor", "horror")).rejects.toThrow(
        /Visitor.*invalid-visitor/
      );
    });

    it("VisitorsRepository.findByVisitorIdがエラーをスローした場合、そのままスローする", async () => {
      mockVisitorsRepo.findByVisitorId.mockRejectedValue(new Error("DB connection failed"));

      const service = new OnboardingApiService(
        mockVisitorsRepo as unknown as VisitorsRepository,
        mockOnboardingService as unknown as OnboardingService
      );

      await expect(service.selectPack("visitor-123", "horror")).rejects.toThrow(
        "DB connection failed"
      );
    });

    it("OnboardingService.completeWithStarterPackがエラーをスローした場合、そのままスローする", async () => {
      mockVisitorsRepo.findByVisitorId.mockResolvedValue({
        id: "uuid-1",
        visitorId: "visitor-123",
      });
      mockOnboardingService.completeWithStarterPack.mockRejectedValue(new Error("Storage error"));

      const service = new OnboardingApiService(
        mockVisitorsRepo as unknown as VisitorsRepository,
        mockOnboardingService as unknown as OnboardingService
      );

      await expect(service.selectPack("visitor-123", "horror")).rejects.toThrow("Storage error");
    });
  });

  // ============================================
  // selectCustom テスト
  // ============================================

  describe("selectCustom", () => {
    let mockVisitorsRepo: MockVisitorsRepository;
    let mockOnboardingService: MockOnboardingService;

    beforeEach(() => {
      mockVisitorsRepo = {
        findByVisitorId: vi.fn(),
      };
      mockOnboardingService = {
        completeWithStarterPack: vi.fn(),
        completeWithCustomSelection: vi.fn(),
      };
    });

    it("3件以上のarticleIdsの場合、OnboardingService.completeWithCustomSelectionを呼び出す", async () => {
      const visitor = {
        id: "uuid-1",
        visitorId: "visitor-123",
      };

      mockVisitorsRepo.findByVisitorId.mockResolvedValue(visitor);
      mockOnboardingService.completeWithCustomSelection.mockResolvedValue({
        visitorId: "visitor-123",
        starterPack: "custom",
        onboardingCompletedAt: "2024-01-01T00:00:00Z",
      });

      const service = new OnboardingApiService(
        mockVisitorsRepo as unknown as VisitorsRepository,
        mockOnboardingService as unknown as OnboardingService
      );

      const articleIds = ["scp-001", "scp-002", "scp-003"];
      await service.selectCustom("visitor-123", articleIds);

      expect(mockVisitorsRepo.findByVisitorId).toHaveBeenCalledWith("visitor-123");
      expect(mockOnboardingService.completeWithCustomSelection).toHaveBeenCalledWith(
        "visitor-123",
        articleIds
      );
    });

    it("ちょうど3件のarticleIdsで正常に動作する（境界値）", async () => {
      mockVisitorsRepo.findByVisitorId.mockResolvedValue({ visitorId: "visitor-123" });
      mockOnboardingService.completeWithCustomSelection.mockResolvedValue({});

      const service = new OnboardingApiService(
        mockVisitorsRepo as unknown as VisitorsRepository,
        mockOnboardingService as unknown as OnboardingService
      );

      await expect(service.selectCustom("visitor-123", ["a1", "a2", "a3"])).resolves.not.toThrow();
      expect(mockOnboardingService.completeWithCustomSelection).toHaveBeenCalled();
    });

    it("10件以上のarticleIdsでも正常に動作する", async () => {
      mockVisitorsRepo.findByVisitorId.mockResolvedValue({ visitorId: "visitor-123" });
      mockOnboardingService.completeWithCustomSelection.mockResolvedValue({});

      const service = new OnboardingApiService(
        mockVisitorsRepo as unknown as VisitorsRepository,
        mockOnboardingService as unknown as OnboardingService
      );

      const articleIds = Array.from({ length: 10 }, (_, i) => `article-${String(i)}`);
      await expect(service.selectCustom("visitor-123", articleIds)).resolves.not.toThrow();
    });

    it("3件未満のarticleIds（0件）の場合、ValidationErrorをスローする", async () => {
      const service = new OnboardingApiService(
        mockVisitorsRepo as unknown as VisitorsRepository,
        mockOnboardingService as unknown as OnboardingService
      );

      await expect(service.selectCustom("visitor-123", [])).rejects.toThrow(ValidationError);
    });

    it("3件未満のarticleIds（1件）の場合、ValidationErrorをスローする", async () => {
      const service = new OnboardingApiService(
        mockVisitorsRepo as unknown as VisitorsRepository,
        mockOnboardingService as unknown as OnboardingService
      );

      await expect(service.selectCustom("visitor-123", ["a1"])).rejects.toThrow(ValidationError);
    });

    it("3件未満のarticleIds（2件）の場合、ValidationErrorをスローする（境界値-1）", async () => {
      const service = new OnboardingApiService(
        mockVisitorsRepo as unknown as VisitorsRepository,
        mockOnboardingService as unknown as OnboardingService
      );

      await expect(service.selectCustom("visitor-123", ["a1", "a2"])).rejects.toThrow(
        ValidationError
      );
    });

    it("ValidationErrorのメッセージが適切", async () => {
      const service = new OnboardingApiService(
        mockVisitorsRepo as unknown as VisitorsRepository,
        mockOnboardingService as unknown as OnboardingService
      );

      await expect(service.selectCustom("visitor-123", [])).rejects.toThrow(/at least 3 articles/i);
    });

    it("未登録visitorIdの場合、NotFoundErrorをスローする", async () => {
      mockVisitorsRepo.findByVisitorId.mockResolvedValue(null);

      const service = new OnboardingApiService(
        mockVisitorsRepo as unknown as VisitorsRepository,
        mockOnboardingService as unknown as OnboardingService
      );

      await expect(service.selectCustom("invalid-visitor", ["a1", "a2", "a3"])).rejects.toThrow(
        NotFoundError
      );
    });

    it("ValidationErrorがNotFoundErrorより先にスローされる（バリデーション優先）", async () => {
      // visitorIdが未登録でも、バリデーションエラーが先
      mockVisitorsRepo.findByVisitorId.mockResolvedValue(null);

      const service = new OnboardingApiService(
        mockVisitorsRepo as unknown as VisitorsRepository,
        mockOnboardingService as unknown as OnboardingService
      );

      // 2件 → ValidationError (NotFoundErrorではない)
      await expect(service.selectCustom("invalid-visitor", ["a1", "a2"])).rejects.toThrow(
        ValidationError
      );
    });

    it("OnboardingService.completeWithCustomSelectionがエラーをスローした場合、そのままスローする", async () => {
      mockVisitorsRepo.findByVisitorId.mockResolvedValue({ visitorId: "visitor-123" });
      mockOnboardingService.completeWithCustomSelection.mockRejectedValue(
        new Error("Embedding error")
      );

      const service = new OnboardingApiService(
        mockVisitorsRepo as unknown as VisitorsRepository,
        mockOnboardingService as unknown as OnboardingService
      );

      await expect(service.selectCustom("visitor-123", ["a1", "a2", "a3"])).rejects.toThrow(
        "Embedding error"
      );
    });
  });
});
