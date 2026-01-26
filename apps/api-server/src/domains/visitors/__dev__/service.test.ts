/**
 * @file VisitorsService テスト
 * @description visitorsドメインのビジネスロジック層テスト
 * @see specs/005-backend-api/005-03-visitors-api/005-03-01.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { VisitorsService } from "../service";
import type { VisitorsRepository } from "../repository";
import type { Visitor } from "../types";

describe("VisitorsService", () => {
  let service: VisitorsService;
  let mockRepository: {
    findByVisitorId: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    existsByVisitorId: ReturnType<typeof vi.fn>;
  };

  const mockExistingVisitor: Visitor = {
    id: "uuid-123",
    visitorId: "existing-visitor",
    createdAt: "2025-01-20T10:00:00Z",
    updatedAt: "2025-01-20T10:00:00Z",
  };

  const mockNewVisitor: Visitor = {
    id: "uuid-456",
    visitorId: "new-visitor",
    createdAt: "2025-01-20T11:00:00Z",
    updatedAt: "2025-01-20T11:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository = {
      findByVisitorId: vi.fn(),
      create: vi.fn(),
      existsByVisitorId: vi.fn(),
    };
    service = new VisitorsService(mockRepository as unknown as VisitorsRepository);
  });

  describe("registerVisitor", () => {
    it("新規visitorIdを登録し、isNew: trueを返す", async () => {
      mockRepository.findByVisitorId.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockNewVisitor);

      const result = await service.registerVisitor("new-visitor");

      expect(result.visitorId).toBe("new-visitor");
      expect(result.isNew).toBe(true);
      expect(result.createdAt).toBe("2025-01-20T11:00:00Z");
      expect(mockRepository.findByVisitorId).toHaveBeenCalledWith("new-visitor");
      expect(mockRepository.create).toHaveBeenCalledWith("new-visitor");
    });

    it("既存visitorIdを取得し、isNew: falseを返す", async () => {
      mockRepository.findByVisitorId.mockResolvedValue(mockExistingVisitor);

      const result = await service.registerVisitor("existing-visitor");

      expect(result.visitorId).toBe("existing-visitor");
      expect(result.isNew).toBe(false);
      expect(result.createdAt).toBe("2025-01-20T10:00:00Z");
      expect(mockRepository.findByVisitorId).toHaveBeenCalledWith("existing-visitor");
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it("Repositoryのfind成功時にcreateを呼ばない", async () => {
      mockRepository.findByVisitorId.mockResolvedValue(mockExistingVisitor);

      await service.registerVisitor("existing-visitor");

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it("Repositoryのfindがnullの場合にcreateを呼ぶ", async () => {
      mockRepository.findByVisitorId.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockNewVisitor);

      await service.registerVisitor("new-visitor");

      expect(mockRepository.findByVisitorId).toHaveBeenCalledWith("new-visitor");
      expect(mockRepository.create).toHaveBeenCalledWith("new-visitor");
    });

    it("Repositoryがエラーをスローした場合、エラーを伝播する", async () => {
      const dbError = new Error("DB connection failed");
      mockRepository.findByVisitorId.mockRejectedValue(dbError);

      await expect(service.registerVisitor("test")).rejects.toThrow("DB connection failed");
    });

    it("create時にUNIQUE制約違反が発生した場合、再度findを実行してvisitorを返す", async () => {
      // レースコンディション対策: findがnull → createがUNIQUE違反 → 再findで取得
      mockRepository.findByVisitorId
        .mockResolvedValueOnce(null) // 1回目: 見つからない
        .mockResolvedValueOnce(mockExistingVisitor); // 2回目: 見つかる

      const uniqueConstraintError = {
        code: "23505",
        message: "UNIQUE constraint violation",
      };
      mockRepository.create.mockRejectedValue(uniqueConstraintError);

      const result = await service.registerVisitor("existing-visitor");

      expect(result.visitorId).toBe("existing-visitor");
      expect(result.isNew).toBe(false);
      expect(mockRepository.findByVisitorId).toHaveBeenCalledTimes(2);
    });

    it("create時にUNIQUE制約違反後の再findでも見つからない場合、エラーをスローする", async () => {
      mockRepository.findByVisitorId.mockResolvedValue(null);

      const uniqueConstraintError = {
        code: "23505",
        message: "UNIQUE constraint violation",
      };
      mockRepository.create.mockRejectedValue(uniqueConstraintError);

      await expect(service.registerVisitor("ghost-visitor")).rejects.toThrow(
        "UNIQUE制約違反後にvisitorが見つかりません"
      );
    });
  });
});
