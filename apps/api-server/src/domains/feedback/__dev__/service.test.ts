/**
 * @file FeedbackService テスト
 * @description feedbackドメインのビジネスロジック層テスト
 * @see specs/005-backend-api/005-06-feedback-api/005-06-01.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FeedbackRepository } from "../repository";
import type { VisitorsRepository } from "../../visitors/repository";
import { FeedbackService } from "../service";
import { NotFoundError } from "../../../lib/errors";

describe("FeedbackService", () => {
  let service: FeedbackService;
  let mockFeedbackRepo: {
    save: ReturnType<typeof vi.fn>;
    getByVisitorId: ReturnType<typeof vi.fn>;
  };
  let mockVisitorsRepo: {
    findByVisitorId: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockFeedbackRepo = {
      save: vi.fn().mockResolvedValue({
        id: "uuid-123",
        visitorId: "visitor-1",
        articleId: "article-1",
        type: "like",
        createdAt: "2025-01-20T10:00:00Z",
      }),
      getByVisitorId: vi.fn().mockResolvedValue([]),
    };

    mockVisitorsRepo = {
      findByVisitorId: vi.fn().mockResolvedValue({
        id: "uuid-visitor",
        visitorId: "visitor-1",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      }),
    };

    service = new FeedbackService(
      mockFeedbackRepo as unknown as FeedbackRepository,
      mockVisitorsRepo as unknown as VisitorsRepository
    );
  });

  describe("recordFeedback", () => {
    it("Likeを記録できる", async () => {
      await service.recordFeedback("visitor-1", "article-1", "like");

      expect(mockVisitorsRepo.findByVisitorId).toHaveBeenCalledWith("visitor-1");
      expect(mockFeedbackRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          visitorId: "visitor-1",
          articleId: "article-1",
          type: "like",
        })
      );
    });

    it("Dislikeを記録できる", async () => {
      await service.recordFeedback("visitor-1", "article-1", "dislike");

      expect(mockVisitorsRepo.findByVisitorId).toHaveBeenCalledWith("visitor-1");
      expect(mockFeedbackRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          visitorId: "visitor-1",
          articleId: "article-1",
          type: "dislike",
        })
      );
    });

    it("未登録visitorIdでNotFoundErrorをスローする", async () => {
      mockVisitorsRepo.findByVisitorId.mockResolvedValue(null);

      await expect(service.recordFeedback("nonexistent", "article-1", "like")).rejects.toThrow(
        NotFoundError
      );

      expect(mockVisitorsRepo.findByVisitorId).toHaveBeenCalledWith("nonexistent");
      expect(mockFeedbackRepo.save).not.toHaveBeenCalled();
    });

    it("createdAtがISO 8601形式で設定される", async () => {
      const now = new Date("2025-01-20T10:00:00.000Z");
      vi.setSystemTime(now);

      await service.recordFeedback("visitor-1", "article-1", "like");

      expect(mockFeedbackRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: "2025-01-20T10:00:00.000Z",
        })
      );

      vi.useRealTimers();
    });
  });
});
