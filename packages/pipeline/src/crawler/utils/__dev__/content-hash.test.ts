/**
 * コンテンツハッシュ計算のテスト
 * Subtask: 003-02-03
 */

import { describe, it, expect } from "vitest";
import { computeContentHash } from "../content-hash";

describe("computeContentHash", () => {
  it("同じコンテンツは同じハッシュを生成する", () => {
    const content = "SCP-173は常に直接視線を向けていなければならない。";
    const hash1 = computeContentHash(content);
    const hash2 = computeContentHash(content);

    expect(hash1).toBe(hash2);
  });

  it("異なるコンテンツは異なるハッシュを生成する", () => {
    const content1 = "SCP-173は常に直接視線を向けていなければならない。";
    const content2 = "SCP-173は危険なオブジェクトである。";

    const hash1 = computeContentHash(content1);
    const hash2 = computeContentHash(content2);

    expect(hash1).not.toBe(hash2);
  });

  it("空文字列でもハッシュを生成できる", () => {
    const hash = computeContentHash("");

    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
  });

  it("大きなコンテンツでもハッシュを生成できる", () => {
    const largeContent = "SCP-".repeat(100000);
    const hash = computeContentHash(largeContent);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
  });

  it("空白の違いを検出できる", () => {
    const content1 = "SCP-173 is dangerous";
    const content2 = "SCP-173  is  dangerous";

    const hash1 = computeContentHash(content1);
    const hash2 = computeContentHash(content2);

    expect(hash1).not.toBe(hash2);
  });

  it("ハッシュはSHA-256形式（64文字の16進数）である", () => {
    const hash = computeContentHash("test content");

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
