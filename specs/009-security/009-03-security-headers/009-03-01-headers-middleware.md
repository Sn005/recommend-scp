---
id: "009-03-01"
epic_id: "009"
story_id: "009-03"
epic_title: "セキュリティ強化"
story_title: "セキュリティヘッダー"
title: "セキュリティヘッダーミドルウェア実装"
status: "pending"
created_at: "2026-02-15"
updated_at: "2026-02-15"
completed_at: null
---

# Subtask: セキュリティヘッダーミドルウェア実装

## 親Story

[009-03: セキュリティヘッダー](./009-03.md)

## ユーザーストーリー

**ペルソナ**: システム運用者
**目的**: Honoミドルウェアとしてセキュリティヘッダーを一括付与する仕組みを実装する
**価値**: 全エンドポイントに統一的にセキュリティヘッダーが付与され、ブラウザ保護が有効化される
**理由**: 各ルートで個別にヘッダーを設定するのは非効率で漏れが発生しやすいため

> システム運用者として、Honoミドルウェアでセキュリティヘッダーを一括付与して、全エンドポイントを統一的に保護したい。なぜなら個別設定は非効率で漏れが発生しやすいから。

## Acceptance Criteria

### AC-1: ミドルウェアファイル作成

- [ ] `apps/api-server/src/middleware/security-headers.ts` が作成されている
      AND `createMiddleware` を使用したHonoミドルウェアとして実装されている

### AC-2: セキュリティヘッダーの設定

- [ ] WHILE ミドルウェアがレスポンスを処理する際
      THE SYSTEM SHALL 以下のヘッダーを設定する: - `X-Content-Type-Options: nosniff` - `X-Frame-Options: DENY` - `X-XSS-Protection: 0` - `Referrer-Policy: strict-origin-when-cross-origin` - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### AC-3: app.tsへの組み込み

- [ ] `apps/api-server/src/app.ts` のミドルウェアチェーンに `securityHeaders` が追加されている
      AND CORSミドルウェアの後に配置されている

### AC-4: テスト

- [ ] セキュリティヘッダーミドルウェアの単体テストが存在する
      AND 全5ヘッダーの付与を検証するテストがある
      AND 既存レスポンスヘッダーに影響しないことを検証するテストがある

## 設計

### 新規ファイル

```typescript
// apps/api-server/src/middleware/security-headers.ts
import { createMiddleware } from "hono/factory";

export const securityHeaders = createMiddleware(async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "0");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
});
```

### app.ts変更

```typescript
// 変更前
const app = new Hono().use(corsMiddleware).onError(errorHandler).route("/", routes);

// 変更後
const app = new Hono()
  .use(corsMiddleware)
  .use(securityHeaders) // 追加
  .onError(errorHandler)
  .route("/", routes);
```

### ヘッダー値の根拠

| ヘッダー               | 値                                       | 根拠                                                    |
| ---------------------- | ---------------------------------------- | ------------------------------------------------------- |
| X-Content-Type-Options | nosniff                                  | MIMEスニッフィング防止（OWASP推奨）                     |
| X-Frame-Options        | DENY                                     | クリックジャッキング防止。APIなのでiframe埋め込み不要   |
| X-XSS-Protection       | 0                                        | モダンブラウザではXSSフィルタを無効化推奨（CSPで代替）  |
| Referrer-Policy        | strict-origin-when-cross-origin          | 同一オリジンは完全URL、クロスオリジンはオリジンのみ送信 |
| Permissions-Policy     | camera=(), microphone=(), geolocation=() | 不要な機能を明示的に無効化                              |

## テストケース

```typescript
describe("セキュリティヘッダーミドルウェア", () => {
  it("X-Content-Type-Optionsヘッダーがnosniffに設定される", () => {});
  it("X-Frame-OptionsヘッダーがDENYに設定される", () => {});
  it("X-XSS-Protectionヘッダーが0に設定される", () => {});
  it("Referrer-Policyヘッダーがstrict-origin-when-cross-originに設定される", () => {});
  it("Permissions-Policyヘッダーが設定される", () => {});
  it("既存のContent-Typeヘッダーに影響しない", () => {});
  it("CORSヘッダーと共存する", () => {});
});
```

## 完了確認

- 確認日: （完了時に記入）
- 確認者: （完了時に記入）
- 備考: （完了時に記入）

## 参照ドキュメント

- [既存CORSミドルウェア](../../../apps/api-server/src/middleware/cors.ts)
- [既存app.ts](../../../apps/api-server/src/app.ts)
