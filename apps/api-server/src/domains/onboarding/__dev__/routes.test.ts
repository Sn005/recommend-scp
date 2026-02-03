/**
 * @file Onboarding API エンドポイントテスト
 * @description ACに基づくroutes.tsの統合テスト
 * @see specs/005-backend-api/005-07-onboarding-api/005-07-02.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createOnboardingRoutes } from "../routes";
import { createErrorHandler } from "../../../middleware/error-handler";
import { NotFoundError } from "../../../lib/errors";
import type { OnboardingApiService, StarterPackInfo } from "../service";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * モックサービスの型
 */
interface MockService {
  getStarterPacks: ReturnType<typeof vi.fn>;
  selectPacks: ReturnType<typeof vi.fn>;
  selectCustom: ReturnType<typeof vi.fn>;
}

/**
 * モックロガーを作成
 */
const createMockLogger = () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
});

/**
 * テスト用スターターパックデータ
 */
const mockStarterPacks: StarterPackInfo[] = [
  {
    type: "classic",
    displayName: "定番・名作",
    description: "財団世界観の基礎となる必読作品",
    primaryTags: ["popular", "classic", "foundation"],
  },
  {
    type: "horror",
    displayName: "ホラー・恐怖",
    description: "背筋が凍るような恐怖体験を求めるあなたへ",
    primaryTags: ["horror", "creepy", "keter", "euclid"],
  },
  {
    type: "scifi",
    displayName: "SF・テクノロジー",
    description: "科学的な考察やSF要素を楽しみたいあなたへ",
    primaryTags: ["scientific", "technological", "extraterrestrial"],
  },
  {
    type: "heartwarming",
    displayName: "感動・ハートフル",
    description: "心温まる優しい異常存在を探しているあなたへ",
    primaryTags: ["heartwarming", "safe", "friendly"],
  },
  {
    type: "mystery",
    displayName: "ミステリー・考察",
    description: "複雑な謎や考察を楽しみたいあなたへ",
    primaryTags: ["mystery", "puzzle", "meta"],
  },
  {
    type: "jp",
    displayName: "日本支部オリジナル",
    description: "日本支部のオリジナル作品を楽しむ",
    primaryTags: ["jp", "japan-branch"],
  },
];

/**
 * テストアプリを作成
 */
const createTestApp = (mockService: MockService) => {
  const app = new Hono();
  const mockSupabase = {} as SupabaseClient;
  const mockLogger = createMockLogger();

  // RFC 7807 Problem Details形式のエラーハンドリング
  app.onError(createErrorHandler(mockLogger));

  // OnboardingApiServiceをモック注入するためのファクトリ
  const serviceFactory = () => mockService as unknown as OnboardingApiService;

  app.route("/onboarding", createOnboardingRoutes(mockSupabase, serviceFactory));
  return app;
};

/**
 * 有効なUUID
 */
const VALID_VISITOR_ID = "550e8400-e29b-41d4-a716-446655440000";

// ============================================
// GET /onboarding/packs テスト
// ============================================

describe("GET /onboarding/packs - 正常系", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getStarterPacks: vi.fn().mockReturnValue(mockStarterPacks),
      selectPacks: vi.fn(),
      selectCustom: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("200 OKを返す", async () => {
    const res = await app.request("/onboarding/packs", {
      method: "GET",
    });

    expect(res.status).toBe(200);
  });

  it("6種類のスターターパックを返す", async () => {
    const res = await app.request("/onboarding/packs", {
      method: "GET",
    });
    const json = (await res.json()) as { packs: StarterPackInfo[] };

    expect(json.packs).toHaveLength(6);
  });

  it("各パックにtype, displayName, description, primaryTagsが含まれる", async () => {
    const res = await app.request("/onboarding/packs", {
      method: "GET",
    });
    const json = (await res.json()) as { packs: StarterPackInfo[] };

    for (const pack of json.packs) {
      expect(pack).toHaveProperty("type");
      expect(pack).toHaveProperty("displayName");
      expect(pack).toHaveProperty("description");
      expect(pack).toHaveProperty("primaryTags");
      expect(Array.isArray(pack.primaryTags)).toBe(true);
    }
  });

  it("customパックを含まない", async () => {
    const res = await app.request("/onboarding/packs", {
      method: "GET",
    });
    const json = (await res.json()) as { packs: StarterPackInfo[] };

    const types = json.packs.map((p) => p.type);
    expect(types).not.toContain("custom");
  });

  it("重複したパック種別が含まれない", async () => {
    const res = await app.request("/onboarding/packs", {
      method: "GET",
    });
    const json = (await res.json()) as { packs: StarterPackInfo[] };

    const types = json.packs.map((p) => p.type);
    const uniqueTypes = new Set(types);
    expect(uniqueTypes.size).toBe(types.length);
  });
});

describe("GET /onboarding/packs - キャッシュヘッダー", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getStarterPacks: vi.fn().mockReturnValue(mockStarterPacks),
      selectPacks: vi.fn(),
      selectCustom: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("Cache-Controlヘッダーが含まれる", async () => {
    const res = await app.request("/onboarding/packs", {
      method: "GET",
    });

    expect(res.headers.get("Cache-Control")).not.toBeNull();
  });

  it("Cache-Controlの値がpublic, max-age=3600である", async () => {
    const res = await app.request("/onboarding/packs", {
      method: "GET",
    });

    expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600");
  });
});

describe("GET /onboarding/packs - 冪等性", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getStarterPacks: vi.fn().mockReturnValue(mockStarterPacks),
      selectPacks: vi.fn(),
      selectCustom: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("複数回呼び出しても同じ結果を返す", async () => {
    const res1 = await app.request("/onboarding/packs", {
      method: "GET",
    });
    const json1 = (await res1.json()) as unknown;

    const res2 = await app.request("/onboarding/packs", {
      method: "GET",
    });
    const json2 = (await res2.json()) as unknown;

    expect(json1).toEqual(json2);
  });
});

describe("GET /onboarding/packs - エラーハンドリング", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getStarterPacks: vi.fn(),
      selectPacks: vi.fn(),
      selectCustom: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("Serviceがエラーをスローした場合500を返す", async () => {
    mockService.getStarterPacks.mockImplementation(() => {
      throw new Error("Unexpected error");
    });

    const res = await app.request("/onboarding/packs", {
      method: "GET",
    });

    expect(res.status).toBe(500);
  });

  it("500エラー時にもRFC 7807形式で返す", async () => {
    mockService.getStarterPacks.mockImplementation(() => {
      throw new Error("Unexpected error");
    });

    const res = await app.request("/onboarding/packs", {
      method: "GET",
    });
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.headers.get("Content-Type")).toBe("application/problem+json");
    expect(json.type).toContain("internal-error");
    expect(json.status).toBe(500);
  });
});

// ============================================
// POST /onboarding/select テスト
// ============================================

describe("POST /onboarding/select - 正常系", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getStarterPacks: vi.fn(),
      selectPacks: vi.fn().mockResolvedValue(undefined),
      selectCustom: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("有効なvisitorIdとpackTypesで200を返す", async () => {
    const res = await app.request("/onboarding/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        packTypes: ["horror"],
      }),
    });

    expect(res.status).toBe(200);
  });

  it("レスポンスにsuccess, visitorId, packTypesが含まれる", async () => {
    const res = await app.request("/onboarding/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        packTypes: ["mystery"],
      }),
    });
    const json = (await res.json()) as Record<string, unknown>;

    expect(json).toEqual({
      success: true,
      visitorId: VALID_VISITOR_ID,
      packTypes: ["mystery"],
    });
  });

  it("全てのパック種別（classic, horror, scifi, heartwarming, mystery, jp）で正常に動作する", async () => {
    const packTypes = ["classic", "horror", "scifi", "heartwarming", "mystery", "jp"];

    for (const packType of packTypes) {
      const res = await app.request("/onboarding/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId: VALID_VISITOR_ID,
          packTypes: [packType],
        }),
      });

      expect(res.status).toBe(200);
    }
  });

  it("複数パック選択で正常に動作する", async () => {
    const res = await app.request("/onboarding/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        packTypes: ["horror", "mystery", "jp"],
      }),
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.packTypes).toEqual(["horror", "mystery", "jp"]);
  });

  it("OnboardingApiService.selectPacksが適切に呼び出される", async () => {
    await app.request("/onboarding/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        packTypes: ["horror"],
      }),
    });

    expect(mockService.selectPacks).toHaveBeenCalledWith(VALID_VISITOR_ID, ["horror"]);
  });
});

describe("POST /onboarding/select - 異常系（バリデーションエラー）", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getStarterPacks: vi.fn(),
      selectPacks: vi.fn(),
      selectCustom: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("無効なUUID形式で400を返す", async () => {
    const res = await app.request("/onboarding/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: "invalid-uuid",
        packTypes: ["horror"],
      }),
    });

    expect(res.status).toBe(400);
  });

  it("visitorIdなしで400を返す", async () => {
    const res = await app.request("/onboarding/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packTypes: ["horror"],
      }),
    });

    expect(res.status).toBe(400);
  });

  it("visitorIdがnullで400を返す", async () => {
    const res = await app.request("/onboarding/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: null,
        packTypes: ["horror"],
      }),
    });

    expect(res.status).toBe(400);
  });

  it("空文字列のvisitorIdで400を返す", async () => {
    const res = await app.request("/onboarding/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: "",
        packTypes: ["horror"],
      }),
    });

    expect(res.status).toBe(400);
  });

  it("無効なpackTypeを含む配列で400を返す", async () => {
    const res = await app.request("/onboarding/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        packTypes: ["invalid"],
      }),
    });

    expect(res.status).toBe(400);
  });

  it("packTypesなしで400を返す", async () => {
    const res = await app.request("/onboarding/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
      }),
    });

    expect(res.status).toBe(400);
  });

  it("空配列のpackTypesで400を返す", async () => {
    const res = await app.request("/onboarding/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        packTypes: [],
      }),
    });

    expect(res.status).toBe(400);
  });

  it("packTypes=customで400を返す", async () => {
    const res = await app.request("/onboarding/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        packTypes: ["custom"],
      }),
    });

    expect(res.status).toBe(400);
  });

  it("RFC 7807形式のエラーを返す", async () => {
    const res = await app.request("/onboarding/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        packTypes: ["invalid"],
      }),
    });
    const json = (await res.json()) as Record<string, unknown>;

    expect(json).toHaveProperty("type");
    expect(json.type).toContain("validation-error");
    expect(json).toHaveProperty("title", "Validation Error");
    expect(json).toHaveProperty("status", 400);
  });

  it("Content-Typeがapplication/problem+jsonである", async () => {
    const res = await app.request("/onboarding/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        packTypes: ["invalid"],
      }),
    });

    expect(res.headers.get("Content-Type")).toBe("application/problem+json");
  });
});

describe("POST /onboarding/select - 異常系（visitorId未登録）", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getStarterPacks: vi.fn(),
      selectPacks: vi.fn(),
      selectCustom: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("未登録visitorIdで404を返す", async () => {
    mockService.selectPacks.mockRejectedValue(new NotFoundError("Visitor", VALID_VISITOR_ID));

    const res = await app.request("/onboarding/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        packTypes: ["horror"],
      }),
    });

    expect(res.status).toBe(404);
  });

  it("404エラー時にRFC 7807形式を返す", async () => {
    mockService.selectPacks.mockRejectedValue(new NotFoundError("Visitor", VALID_VISITOR_ID));

    const res = await app.request("/onboarding/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        packTypes: ["horror"],
      }),
    });

    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as Record<string, unknown>;
    expect(json).toHaveProperty("type");
    expect(json.type).toContain("not-found");
    expect(json).toHaveProperty("status", 404);
  });

  it("detailにvisitorIdが含まれる", async () => {
    mockService.selectPacks.mockRejectedValue(new NotFoundError("Visitor", VALID_VISITOR_ID));

    const res = await app.request("/onboarding/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        packTypes: ["horror"],
      }),
    });
    const json = (await res.json()) as Record<string, unknown>;

    expect(json.detail).toContain(VALID_VISITOR_ID);
  });
});

describe("POST /onboarding/select - エラーハンドリング", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getStarterPacks: vi.fn(),
      selectPacks: vi.fn(),
      selectCustom: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("Serviceがエラーをスローした場合500を返す", async () => {
    mockService.selectPacks.mockRejectedValue(new Error("DB connection failed"));

    const res = await app.request("/onboarding/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        packTypes: ["horror"],
      }),
    });

    expect(res.status).toBe(500);
  });

  it("500エラー時にもRFC 7807形式を返す", async () => {
    mockService.selectPacks.mockRejectedValue(new Error("Unexpected error"));

    const res = await app.request("/onboarding/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        packTypes: ["horror"],
      }),
    });

    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as Record<string, unknown>;
    expect(json.type).toContain("internal-error");
    expect(json.status).toBe(500);
  });
});

// ============================================
// POST /onboarding/select/custom テスト
// ============================================

describe("POST /onboarding/select/custom - 正常系", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getStarterPacks: vi.fn(),
      selectPacks: vi.fn(),
      selectCustom: vi.fn().mockResolvedValue(undefined),
    };
    app = createTestApp(mockService);
  });

  it("3件以上のarticleIdsで200を返す", async () => {
    const res = await app.request("/onboarding/select/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleIds: ["scp-173", "scp-087", "scp-106"],
      }),
    });

    expect(res.status).toBe(200);
  });

  it("レスポンスにsuccess, visitorId, articleCountが含まれる", async () => {
    const res = await app.request("/onboarding/select/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleIds: ["scp-173", "scp-087", "scp-106"],
      }),
    });
    const json = (await res.json()) as Record<string, unknown>;

    expect(json).toEqual({
      success: true,
      visitorId: VALID_VISITOR_ID,
      articleCount: 3,
    });
  });

  it("OnboardingApiService.selectCustomが適切に呼び出される", async () => {
    const articleIds = ["scp-173", "scp-087", "scp-106"];

    await app.request("/onboarding/select/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleIds,
      }),
    });

    expect(mockService.selectCustom).toHaveBeenCalledWith(VALID_VISITOR_ID, articleIds);
  });
});

describe("POST /onboarding/select/custom - 正常系（境界値）", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getStarterPacks: vi.fn(),
      selectPacks: vi.fn(),
      selectCustom: vi.fn().mockResolvedValue(undefined),
    };
    app = createTestApp(mockService);
  });

  it("ちょうど3件のarticleIdsで200を返す", async () => {
    const res = await app.request("/onboarding/select/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleIds: ["scp-001", "scp-002", "scp-003"],
      }),
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.articleCount).toBe(3);
  });

  it("10件以上のarticleIdsで200を返す", async () => {
    const articleIds = Array.from(
      { length: 10 },
      (_, i) => `scp-${String(i + 1).padStart(3, "0")}`
    );

    const res = await app.request("/onboarding/select/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleIds,
      }),
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.articleCount).toBe(10);
  });
});

describe("POST /onboarding/select/custom - 異常系（articleIds検証）", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getStarterPacks: vi.fn(),
      selectPacks: vi.fn(),
      selectCustom: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("0件のarticleIdsで400を返す", async () => {
    const res = await app.request("/onboarding/select/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleIds: [],
      }),
    });

    expect(res.status).toBe(400);
  });

  it("1件のarticleIdsで400を返す", async () => {
    const res = await app.request("/onboarding/select/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleIds: ["scp-173"],
      }),
    });

    expect(res.status).toBe(400);
  });

  it("2件のarticleIdsで400を返す（境界値-1）", async () => {
    const res = await app.request("/onboarding/select/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleIds: ["scp-173", "scp-087"],
      }),
    });

    expect(res.status).toBe(400);
  });

  it("ValidationErrorのメッセージが適切", async () => {
    const res = await app.request("/onboarding/select/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleIds: ["scp-173", "scp-087"],
      }),
    });
    const json = (await res.json()) as Record<string, unknown>;

    expect(json.detail).toContain("At least 3 articles must be selected");
  });

  it("articleIdsなしで400を返す", async () => {
    const res = await app.request("/onboarding/select/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
      }),
    });

    expect(res.status).toBe(400);
  });

  it("articleIdsがnullで400を返す", async () => {
    const res = await app.request("/onboarding/select/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleIds: null,
      }),
    });

    expect(res.status).toBe(400);
  });
});

describe("POST /onboarding/select/custom - 異常系（visitorId検証）", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getStarterPacks: vi.fn(),
      selectPacks: vi.fn(),
      selectCustom: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("無効なUUID形式で400を返す", async () => {
    const res = await app.request("/onboarding/select/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: "invalid-uuid",
        articleIds: ["scp-173", "scp-087", "scp-106"],
      }),
    });

    expect(res.status).toBe(400);
  });

  it("visitorIdなしで400を返す", async () => {
    const res = await app.request("/onboarding/select/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        articleIds: ["scp-173", "scp-087", "scp-106"],
      }),
    });

    expect(res.status).toBe(400);
  });

  it("RFC 7807形式のエラーを返す", async () => {
    const res = await app.request("/onboarding/select/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: "invalid-uuid",
        articleIds: ["scp-173", "scp-087", "scp-106"],
      }),
    });
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.headers.get("Content-Type")).toBe("application/problem+json");
    expect(json.type).toContain("validation-error");
    expect(json.status).toBe(400);
  });
});

describe("POST /onboarding/select/custom - 異常系（visitorId未登録）", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getStarterPacks: vi.fn(),
      selectPacks: vi.fn(),
      selectCustom: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("未登録visitorIdで404を返す", async () => {
    mockService.selectCustom.mockRejectedValue(new NotFoundError("Visitor", VALID_VISITOR_ID));

    const res = await app.request("/onboarding/select/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleIds: ["scp-173", "scp-087", "scp-106"],
      }),
    });

    expect(res.status).toBe(404);
  });

  it("404エラー時にRFC 7807形式を返す", async () => {
    mockService.selectCustom.mockRejectedValue(new NotFoundError("Visitor", VALID_VISITOR_ID));

    const res = await app.request("/onboarding/select/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleIds: ["scp-173", "scp-087", "scp-106"],
      }),
    });

    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as Record<string, unknown>;
    expect(json.type).toContain("not-found");
    expect(json.status).toBe(404);
  });
});

describe("POST /onboarding/select/custom - エッジケース", () => {
  let app: Hono;
  let mockService: MockService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      getStarterPacks: vi.fn(),
      selectPacks: vi.fn(),
      selectCustom: vi.fn(),
    };
    app = createTestApp(mockService);
  });

  it("ValidationErrorがNotFoundErrorより先にスローされる（未登録visitorId + 2件のarticleIds → 400）", async () => {
    // Serviceがスローする前にバリデーションでエラーになるべき
    mockService.selectCustom.mockRejectedValue(new NotFoundError("Visitor", VALID_VISITOR_ID));

    const res = await app.request("/onboarding/select/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleIds: ["scp-173", "scp-087"], // 2件
      }),
    });

    // バリデーションエラーが先なので400
    expect(res.status).toBe(400);
    // Serviceは呼ばれない
    expect(mockService.selectCustom).not.toHaveBeenCalled();
  });

  it("Serviceがエラーをスローした場合500を返す", async () => {
    mockService.selectCustom.mockRejectedValue(new Error("DB connection failed"));

    const res = await app.request("/onboarding/select/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleIds: ["scp-173", "scp-087", "scp-106"],
      }),
    });

    expect(res.status).toBe(500);
  });

  it("500エラー時にもRFC 7807形式を返す", async () => {
    mockService.selectCustom.mockRejectedValue(new Error("Unexpected error"));

    const res = await app.request("/onboarding/select/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: VALID_VISITOR_ID,
        articleIds: ["scp-173", "scp-087", "scp-106"],
      }),
    });

    expect(res.headers.get("Content-Type")).toBe("application/problem+json");

    const json = (await res.json()) as Record<string, unknown>;
    expect(json.type).toContain("internal-error");
    expect(json.status).toBe(500);
  });
});
