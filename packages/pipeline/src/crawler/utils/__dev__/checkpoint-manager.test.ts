/**
 * チェックポイント管理のテスト
 * Subtask: 003-02-02
 */

import { describe, it, expect, vi } from "vitest";
import { CheckpointManager } from "../checkpoint-manager";
import type { Checkpoint } from "../../types";

describe("CheckpointManager", () => {
  describe("shouldSaveCheckpoint", () => {
    it("100件ごとにtrueを返す", () => {
      const manager = new CheckpointManager({ interval: 100 });

      expect(manager.shouldSaveCheckpoint(99)).toBe(false);
      expect(manager.shouldSaveCheckpoint(100)).toBe(true);
      expect(manager.shouldSaveCheckpoint(101)).toBe(false);
      expect(manager.shouldSaveCheckpoint(200)).toBe(true);
      expect(manager.shouldSaveCheckpoint(300)).toBe(true);
    });

    it("インターバルをカスタマイズできる", () => {
      const manager = new CheckpointManager({ interval: 50 });

      expect(manager.shouldSaveCheckpoint(49)).toBe(false);
      expect(manager.shouldSaveCheckpoint(50)).toBe(true);
      expect(manager.shouldSaveCheckpoint(100)).toBe(true);
    });
  });

  describe("createCheckpoint", () => {
    it("チェックポイントを作成できる", () => {
      const manager = new CheckpointManager();
      const now = new Date("2025-01-15T12:00:00Z");
      vi.setSystemTime(now);

      const checkpoint = manager.createCheckpoint("SCP-200", 200);

      expect(checkpoint.lastProcessedId).toBe("SCP-200");
      expect(checkpoint.processedCount).toBe(200);
      expect(checkpoint.timestamp).toEqual(now);

      vi.useRealTimers();
    });

    it("currentSeriesを含めることができる", () => {
      const manager = new CheckpointManager();

      const checkpoint = manager.createCheckpoint("SCP-200", 200, "series-2");

      expect(checkpoint.currentSeries).toBe("series-2");
    });
  });

  describe("getResumeIndex", () => {
    it("チェックポイントから再開インデックスを取得できる", () => {
      const manager = new CheckpointManager();
      const items = ["SCP-100", "SCP-150", "SCP-200", "SCP-250"];
      const checkpoint: Checkpoint = {
        lastProcessedId: "SCP-150",
        processedCount: 150,
        timestamp: new Date(),
      };

      const index = manager.getResumeIndex(items, checkpoint);

      expect(index).toBe(2); // SCP-200のインデックス
    });

    it("チェックポイントがnullの場合、0を返す", () => {
      const manager = new CheckpointManager();
      const items = ["SCP-100", "SCP-150", "SCP-200"];

      const index = manager.getResumeIndex(items, null);

      expect(index).toBe(0);
    });

    it("lastProcessedIdが見つからない場合、0を返す", () => {
      const manager = new CheckpointManager();
      const items = ["SCP-100", "SCP-150", "SCP-200"];
      const checkpoint: Checkpoint = {
        lastProcessedId: "SCP-999",
        processedCount: 100,
        timestamp: new Date(),
      };

      const index = manager.getResumeIndex(items, checkpoint);

      expect(index).toBe(0);
    });

    it("lastProcessedIdが最後の要素の場合、配列長を返す", () => {
      const manager = new CheckpointManager();
      const items = ["SCP-100", "SCP-150", "SCP-200"];
      const checkpoint: Checkpoint = {
        lastProcessedId: "SCP-200",
        processedCount: 200,
        timestamp: new Date(),
      };

      const index = manager.getResumeIndex(items, checkpoint);

      expect(index).toBe(3); // 全て処理済み
    });
  });

  describe("onCheckpoint コールバック", () => {
    it("チェックポイント作成時にコールバックが呼ばれる", () => {
      const onCheckpoint = vi.fn();
      const manager = new CheckpointManager({ interval: 100, onCheckpoint });

      manager.maybeCreateCheckpoint("SCP-100", 100);

      expect(onCheckpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          lastProcessedId: "SCP-100",
          processedCount: 100,
        })
      );
    });

    it("インターバル未満ではコールバックが呼ばれない", () => {
      const onCheckpoint = vi.fn();
      const manager = new CheckpointManager({ interval: 100, onCheckpoint });

      manager.maybeCreateCheckpoint("SCP-99", 99);

      expect(onCheckpoint).not.toHaveBeenCalled();
    });
  });
});
