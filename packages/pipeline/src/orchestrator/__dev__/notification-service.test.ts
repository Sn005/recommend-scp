/**
 * 通知サービステスト
 * Subtask: 003-04-03
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationService } from "../notification-service";
import type { PipelineSummary } from "../notification-service";
import type { Logger } from "../../crawler/utils/logger";

// モックロガー作成
const createMockLogger = (): Logger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

// モックメーラー作成
const createMockMailer = () => ({
  send: vi.fn().mockResolvedValue({ success: true }),
});

describe("NotificationService", () => {
  let mockLogger: Logger;
  let mockMailer: ReturnType<typeof createMockMailer>;
  let service: NotificationService;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockMailer = createMockMailer();

    service = new NotificationService({
      enabled: true,
      email: "admin@example.com",
      mailer: mockMailer,
      logger: mockLogger,
    });
  });

  describe("実行サマリー通知", () => {
    it("パイプライン完了時にメールを送信する", async () => {
      const summary: PipelineSummary = {
        runId: "run-123",
        mode: "full",
        status: "completed",
        stats: {
          totalCost: 0.8,
          duration: 60000,
          embedding: { processed: 100, succeeded: 100, failed: 0, cost: 0.5 },
          tagging: { processed: 100, succeeded: 100, failed: 0, cost: 0.3 },
        },
        errors: [],
      };

      await service.sendPipelineSummary(summary);

      expect(mockMailer.send).toHaveBeenCalledWith({
        to: "admin@example.com",
        subject: expect.stringContaining("[SCP Pipeline]"),
        body: expect.stringContaining("run-123"),
      });
    });

    it("メール本文に実行モードを含む", async () => {
      const summary: PipelineSummary = {
        runId: "run-123",
        mode: "diff",
        status: "completed",
        stats: { totalCost: 0.15, duration: 30000 },
        errors: [],
      };

      await service.sendPipelineSummary(summary);

      const call = mockMailer.send.mock.calls[0][0] as { body: string };
      expect(call.body).toContain("diff");
    });

    it("メール本文に処理件数を含む", async () => {
      const summary: PipelineSummary = {
        runId: "run-123",
        mode: "full",
        status: "completed",
        stats: {
          totalCost: 0.8,
          duration: 60000,
          embedding: { processed: 100, succeeded: 95, failed: 5, cost: 0.5 },
          tagging: { processed: 100, succeeded: 98, failed: 2, cost: 0.3 },
        },
        errors: [],
      };

      await service.sendPipelineSummary(summary);

      const call = mockMailer.send.mock.calls[0][0] as { body: string };
      expect(call.body).toContain("100");
      expect(call.body).toContain("95");
    });

    it("メール本文にコストを含む", async () => {
      const summary: PipelineSummary = {
        runId: "run-123",
        mode: "full",
        status: "completed",
        stats: { totalCost: 0.8, duration: 60000 },
        errors: [],
      };

      await service.sendPipelineSummary(summary);

      const call = mockMailer.send.mock.calls[0][0] as { body: string };
      expect(call.body).toContain("0.8");
    });

    it("メール本文に実行時間を含む", async () => {
      const summary: PipelineSummary = {
        runId: "run-123",
        mode: "full",
        status: "completed",
        stats: { totalCost: 0.8, duration: 60000 },
        errors: [],
      };

      await service.sendPipelineSummary(summary);

      const call = mockMailer.send.mock.calls[0][0] as { body: string };
      expect(call.body).toContain("60");
    });

    it("エラーがある場合はエラーサマリーを含む", async () => {
      const summary: PipelineSummary = {
        runId: "run-123",
        mode: "full",
        status: "completed",
        stats: {
          totalCost: 0.8,
          duration: 60000,
          embedding: { processed: 100, succeeded: 95, failed: 5, cost: 0.5 },
        },
        errors: [
          { article_id: "scp-001", task: "embedding", error: "Rate limit exceeded" },
          { article_id: "scp-002", task: "tagging", error: "API timeout" },
        ],
      };

      await service.sendPipelineSummary(summary);

      const call = mockMailer.send.mock.calls[0][0] as { body: string };
      expect(call.body).toContain("エラー");
      expect(call.body).toContain("scp-001");
      expect(call.body).toContain("Rate limit exceeded");
    });

    it("通知が無効な場合は送信しない", async () => {
      const disabledService = new NotificationService({
        enabled: false,
        email: "admin@example.com",
        mailer: mockMailer,
        logger: mockLogger,
      });

      const summary: PipelineSummary = {
        runId: "run-123",
        mode: "full",
        status: "completed",
        stats: { totalCost: 0.8, duration: 60000 },
        errors: [],
      };

      await disabledService.sendPipelineSummary(summary);

      expect(mockMailer.send).not.toHaveBeenCalled();
    });
  });

  describe("警告通知", () => {
    it("失敗率が10%を超えると警告通知を送信する", async () => {
      const summary: PipelineSummary = {
        runId: "run-123",
        mode: "full",
        status: "completed",
        stats: {
          totalCost: 0.8,
          duration: 60000,
          embedding: { processed: 100, succeeded: 85, failed: 15, cost: 0.5 }, // 15%失敗
        },
        errors: [],
      };

      await service.sendPipelineSummary(summary);

      const call = mockMailer.send.mock.calls[0][0] as { subject: string };
      expect(call.subject).toContain("[WARNING]");
    });

    it("失敗率が閾値以下の場合は通常通知を送信する", async () => {
      const summary: PipelineSummary = {
        runId: "run-123",
        mode: "full",
        status: "completed",
        stats: {
          totalCost: 0.8,
          duration: 60000,
          embedding: { processed: 100, succeeded: 95, failed: 5, cost: 0.5 }, // 5%失敗
        },
        errors: [],
      };

      await service.sendPipelineSummary(summary);

      const call = mockMailer.send.mock.calls[0][0] as { subject: string };
      expect(call.subject).not.toContain("[WARNING]");
    });

    it("失敗率がちょうど10%の場合は通常通知を送信する（境界値）", async () => {
      const summary: PipelineSummary = {
        runId: "run-123",
        mode: "full",
        status: "completed",
        stats: {
          totalCost: 0.5,
          duration: 60000,
          embedding: { processed: 100, succeeded: 90, failed: 10, cost: 0.5 }, // ちょうど10%
        },
        errors: [],
      };

      await service.sendPipelineSummary(summary);

      const call = mockMailer.send.mock.calls[0][0] as { subject: string };
      expect(call.subject).not.toContain("[WARNING]");
    });

    it("カスタム閾値が適用される", async () => {
      const customService = new NotificationService({
        enabled: true,
        email: "admin@example.com",
        warningThreshold: 5, // カスタム閾値: 5%
        mailer: mockMailer,
        logger: mockLogger,
      });

      const summary: PipelineSummary = {
        runId: "run-123",
        mode: "full",
        status: "completed",
        stats: {
          totalCost: 0.5,
          duration: 60000,
          embedding: { processed: 100, succeeded: 93, failed: 7, cost: 0.5 }, // 7%失敗
        },
        errors: [],
      };

      await customService.sendPipelineSummary(summary);

      const call = mockMailer.send.mock.calls[0][0] as { subject: string };
      expect(call.subject).toContain("[WARNING]"); // 7% > 5% なので警告
    });

    it("processed が 0 の場合はゼロ除算を回避する", async () => {
      const summary: PipelineSummary = {
        runId: "run-123",
        mode: "full",
        status: "completed",
        stats: {
          totalCost: 0,
          duration: 1000,
          embedding: { processed: 0, succeeded: 0, failed: 0, cost: 0 },
        },
        errors: [],
      };

      await service.sendPipelineSummary(summary);

      // エラーなく送信される
      expect(mockMailer.send).toHaveBeenCalled();
      const call = mockMailer.send.mock.calls[0][0] as { subject: string };
      expect(call.subject).not.toContain("[WARNING]");
    });
  });

  describe("メール送信エラー", () => {
    it("メール送信に失敗した場合はエラーをログに記録する", async () => {
      mockMailer.send.mockRejectedValue(new Error("SMTP connection failed"));

      const summary: PipelineSummary = {
        runId: "run-123",
        mode: "full",
        status: "completed",
        stats: { totalCost: 0.8, duration: 60000 },
        errors: [],
      };

      // エラーはスローされないが、ログに記録される
      await service.sendPipelineSummary(summary);

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("通知の送信に失敗"));
    });
  });

  describe("件名フォーマット", () => {
    it("成功時のステータスを含む", async () => {
      const summary: PipelineSummary = {
        runId: "run-123",
        mode: "full",
        status: "completed",
        stats: { totalCost: 0.8, duration: 60000 },
        errors: [],
      };

      await service.sendPipelineSummary(summary);

      const call = mockMailer.send.mock.calls[0][0] as { subject: string };
      expect(call.subject).toContain("Success");
    });

    it("失敗時のステータスを含む", async () => {
      const summary: PipelineSummary = {
        runId: "run-123",
        mode: "full",
        status: "failed",
        stats: { totalCost: 0.8, duration: 60000 },
        errors: [],
      };

      await service.sendPipelineSummary(summary);

      const call = mockMailer.send.mock.calls[0][0] as { subject: string };
      expect(call.subject).toContain("FAILED");
    });

    it("実行モードを含む", async () => {
      const summary: PipelineSummary = {
        runId: "run-123",
        mode: "diff",
        status: "completed",
        stats: { totalCost: 0.15, duration: 30000 },
        errors: [],
      };

      await service.sendPipelineSummary(summary);

      const call = mockMailer.send.mock.calls[0][0] as { subject: string };
      expect(call.subject).toContain("diff");
    });
  });
});
