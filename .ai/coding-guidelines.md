# recommend-scp コーディングガイドライン

このドキュメントはrecommend-scpプロジェクトのコーディング規約を定義する。
Claude Codeは実装時に必ずこのガイドラインに従うこと。

---

## 基本方針

1. **TypeScriptの型安全性を最大限活用**
2. **Repository層による責務分離を徹底**
3. **テスタビリティを考慮した設計**
4. **イミュータブルなコード（再代入を避ける）**

---

## 命名規則

### ファイル・ディレクトリ

| 対象 | 規則 | 例 |
|------|------|-----|
| ディレクトリ | kebab-case | `api-server/`, `api-types/` |
| TypeScriptファイル | kebab-case | `visitor-service.ts` |
| テストファイル | `*.test.ts` | `service.test.ts` |
| 型定義ファイル | `types.ts` | `domains/recommend/types.ts` |

### コード内

| 対象 | 規則 | 例 |
|------|------|-----|
| 変数・関数 | camelCase | `getVisitorById`, `visitorId` |
| 型・インターフェース | PascalCase | `Visitor`, `RecommendRequest` |
| 定数 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| DBカラム | snake_case | `visitor_id`, `created_at` |

### 命名の意図を明確に

```typescript
// Good
const activeVisitors = visitors.filter(v => v.isActive);
const recommendedArticles = await getRecommendations(visitorId);

// Bad
const data = visitors.filter(v => v.isActive);
const result = await getRecommendations(visitorId);
```

---

## Hono API実装ガイドライン

### ドメイン別Colocationパターン

各ドメインは以下の構成を必須とする:

```
domains/[domain]/
├── routes.ts      # APIエンドポイント定義
├── service.ts     # ビジネスロジック
├── repository.ts  # DB操作層
├── schema.ts      # Zodバリデーション
├── types.ts       # 型定義
└── __dev__/       # テストファイル
```

### routes.ts

エンドポイント定義とリクエスト処理のみ。ビジネスロジックは書かない。

```typescript
// Good
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { recommendRequestSchema } from "./schema";
import { RecommendService } from "./service";

const app = new Hono();

app.post(
  "/",
  zValidator("json", recommendRequestSchema),
  async (c) => {
    const body = c.req.valid("json");
    const service = new RecommendService();
    const result = await service.getRecommendations(body);
    return c.json(result);
  }
);

export default app;
```

```typescript
// Bad - ビジネスロジックをroutesに書いている
app.post("/", async (c) => {
  const { visitorId } = await c.req.json();
  // ここでDBアクセスやロジックを書くのはNG
  const visitor = await supabase.from("visitors").select().eq("visitor_id", visitorId);
  const recommendations = calculateScore(visitor);
  return c.json(recommendations);
});
```

### service.ts

ビジネスロジックを実装。Repositoryを呼び出す。

```typescript
import { VisitorRepository } from "./repository";
import type { RecommendRequest, RecommendResponse } from "./types";

export class RecommendService {
  private repository: VisitorRepository;

  constructor(repository?: VisitorRepository) {
    this.repository = repository ?? new VisitorRepository();
  }

  getRecommendations = async (
    request: RecommendRequest
  ): Promise<RecommendResponse> => {
    const visitor = await this.repository.findByVisitorId(request.visitorId);
    if (!visitor) {
      throw new NotFoundError("Visitor not found");
    }

    // 推薦ロジック（@recommend-scp/sharedを使用）
    const articles = await this.repository.searchSimilarArticles(
      visitor.preferenceVector,
      request.limit
    );

    return { articles };
  };
}
```

### repository.ts

DB操作のみ。snake_case ↔ camelCase変換をここで行う。

```typescript
import { supabase } from "@/lib/supabase";
import type { Visitor, Article } from "./types";

export class VisitorRepository {
  findByVisitorId = async (visitorId: string): Promise<Visitor | null> => {
    const { data, error } = await supabase
      .from("visitors")
      .select("*")
      .eq("visitor_id", visitorId)
      .single();

    if (error || !data) return null;

    // snake_case → camelCase 変換
    return {
      id: data.id,
      visitorId: data.visitor_id,
      userId: data.user_id,
      preferenceVector: data.preference_vector,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  };

  searchSimilarArticles = async (
    vector: number[],
    limit: number
  ): Promise<Article[]> => {
    const { data, error } = await supabase.rpc("search_similar_articles", {
      query_vector: vector,
      match_count: limit,
    });

    if (error) throw error;

    return data.map(this.toArticle);
  };

  private toArticle = (row: Record<string, unknown>): Article => ({
    id: row.id as string,
    title: row.title as string,
    url: row.url as string,
    // ...
  });
}
```

### schema.ts

Zodによる入力バリデーション。

```typescript
import { z } from "zod";

export const recommendRequestSchema = z.object({
  visitorId: z.string().uuid(),
  limit: z.number().int().min(1).max(50).default(10),
  includeSerendipity: z.boolean().default(true),
});

export const feedbackSchema = z.object({
  visitorId: z.string().uuid(),
  articleId: z.string().uuid(),
  type: z.enum(["like", "dislike"]),
});

// リクエスト型の導出
export type RecommendRequest = z.infer<typeof recommendRequestSchema>;
export type FeedbackRequest = z.infer<typeof feedbackSchema>;
```

### types.ts

ドメイン固有の型定義。

```typescript
export interface Visitor {
  id: string;
  visitorId: string;
  userId: string | null;
  preferenceVector: number[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Article {
  id: string;
  title: string;
  url: string;
  objectClass: string;
  tags: string[];
  similarity?: number;
}

export interface RecommendResponse {
  articles: Article[];
  serendipityCount: number;
}
```

---

## エラーハンドリング

### RFC 7807 Problem Details

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public type: string,
    public title: string,
    public status: number,
    public detail?: string,
    public instance?: string
  ) {
    super(title);
  }

  toProblemDetails = () => ({
    type: this.type,
    title: this.title,
    status: this.status,
    detail: this.detail,
    instance: this.instance,
  });
}

export class NotFoundError extends AppError {
  constructor(detail: string, instance?: string) {
    super(
      "https://recommend-scp.dev/errors/not-found",
      "Resource Not Found",
      404,
      detail,
      instance
    );
  }
}

export class ValidationError extends AppError {
  constructor(detail: string, instance?: string) {
    super(
      "https://recommend-scp.dev/errors/validation",
      "Validation Failed",
      400,
      detail,
      instance
    );
  }
}
```

### エラーミドルウェア

```typescript
// middleware/error-handler.ts
import { ErrorHandler } from "hono";
import { AppError } from "@/lib/errors";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof AppError) {
    return c.json(err.toProblemDetails(), err.status);
  }

  // 予期しないエラー
  console.error(err);
  return c.json(
    {
      type: "https://recommend-scp.dev/errors/internal",
      title: "Internal Server Error",
      status: 500,
    },
    500
  );
};
```

---

## 関数スタイル

### Arrow関数のみ使用

```typescript
// Good
const getVisitor = async (id: string): Promise<Visitor> => {
  // ...
};

const processArticles = (articles: Article[]): ProcessedArticle[] =>
  articles.map(transformArticle);

// Bad - function宣言は使わない
function getVisitor(id: string): Promise<Visitor> {
  // ...
}
```

### イミュータブル優先

```typescript
// Good
const activeVisitors = visitors.filter(v => v.isActive);
const updatedVisitor = { ...visitor, lastAccess: new Date() };

// Bad - 再代入
let result = [];
for (const v of visitors) {
  if (v.isActive) result.push(v);
}
```

### 早期リターン

```typescript
// Good
const processVisitor = (visitor: Visitor | null): Result => {
  if (!visitor) {
    return { error: "Not found" };
  }

  if (!visitor.isActive) {
    return { error: "Inactive" };
  }

  return { data: visitor };
};

// Bad - ネストが深い
const processVisitor = (visitor: Visitor | null): Result => {
  if (visitor) {
    if (visitor.isActive) {
      return { data: visitor };
    } else {
      return { error: "Inactive" };
    }
  } else {
    return { error: "Not found" };
  }
};
```

---

## ロギング

### pinoを使用

```typescript
import { pino } from "pino";

// ロガー作成
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});

// 使用例
logger.info({ visitorId, action: "recommend" }, "推薦リクエスト受信");
logger.warn({ visitorId, reason: "no_profile" }, "プロファイルなし");
logger.error({ err, visitorId }, "推薦計算エラー");
```

### ログメッセージは日本語

```typescript
// Good
logger.info("推薦計算を開始");
logger.error({ err }, "DB接続に失敗しました");

// Bad
logger.info("Starting recommendation calculation");
```

### console.log禁止

ESLint `no-console: "error"` が設定されている。pino経由でログ出力すること。

---

## テスト

### テストケース名は日本語

```typescript
// Good
describe("RecommendService", () => {
  it("visitorIdに基づいて推薦記事を取得できる", async () => {
    // ...
  });

  it("存在しないvisitorIdの場合はNotFoundErrorを投げる", async () => {
    // ...
  });
});

// Bad
describe("RecommendService", () => {
  it("should get recommended articles by visitorId", async () => {
    // ...
  });
});
```

### テストファイル配置

```
domains/recommend/
├── service.ts
├── repository.ts
└── __dev__/
    ├── service.test.ts      # 単体テスト
    ├── repository.test.ts   # 単体テスト
    └── routes.test.ts       # 統合テスト
```

### モック・DI

```typescript
// service.test.ts
import { RecommendService } from "../service";
import { VisitorRepository } from "../repository";
import { vi, describe, it, expect } from "vitest";

describe("RecommendService", () => {
  it("推薦記事を取得できる", async () => {
    // モックRepository
    const mockRepo = {
      findByVisitorId: vi.fn().mockResolvedValue({
        id: "1",
        visitorId: "visitor-123",
        preferenceVector: [0.1, 0.2],
      }),
      searchSimilarArticles: vi.fn().mockResolvedValue([
        { id: "a1", title: "SCP-001" },
      ]),
    } as unknown as VisitorRepository;

    // DIでモック注入
    const service = new RecommendService(mockRepo);
    const result = await service.getRecommendations({
      visitorId: "visitor-123",
      limit: 10,
    });

    expect(result.articles).toHaveLength(1);
    expect(mockRepo.findByVisitorId).toHaveBeenCalledWith("visitor-123");
  });
});
```

---

## Import文

### 拡張子なし

```typescript
// Good
import { RecommendService } from "./service";
import type { Visitor } from "./types";

// Bad
import { RecommendService } from "./service.js";
```

### Import順序

1. 外部パッケージ
2. 内部パッケージ（`@recommend-scp/*`）
3. 相対パス（`./`, `../`）

```typescript
// Good
import { Hono } from "hono";
import { z } from "zod";

import { logger } from "@recommend-scp/shared";

import { RecommendService } from "./service";
import type { RecommendRequest } from "./types";
```

---

## 避けるべき実装

### 1. 直接的なSupabaseアクセス

```typescript
// Bad - serviceで直接DB
const getVisitor = async (id: string) => {
  return await supabase.from("visitors").select().eq("id", id);
};

// Good - Repository経由
const getVisitor = async (id: string) => {
  return await visitorRepository.findById(id);
};
```

### 2. any型の使用

```typescript
// Bad
const processData = (data: any) => { ... };

// Good
const processData = (data: unknown) => {
  if (isValidData(data)) { ... }
};
```

### 3. マジックナンバー

```typescript
// Bad
if (articles.length > 5) { ... }

// Good
const SERENDIPITY_THRESHOLD = 5;
if (articles.length > SERENDIPITY_THRESHOLD) { ... }
```

### 4. 過度なコメント

```typescript
// Bad - 自明なコメント
// visitorIdを取得する
const visitorId = request.visitorId;

// Good - 意図が不明な箇所のみ
// 連続5記事以上同じジャンルの場合、セレンディピティ枠を強制挿入
if (consecutiveSameGenre >= SERENDIPITY_THRESHOLD) {
  insertSerendipityArticle();
}
```

---

## 参照ドキュメント

- [アーキテクチャ](.ai/architecture.md)
- [CLAUDE.md](.claude/CLAUDE.md) - プロジェクト全体のルール
