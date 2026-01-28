/**
 * @file API型定義パッケージ エントリーポイント
 * @description apps/api-serverのAppTypeを再exportし、フロントエンドでHono RPCを使用可能にする
 *
 * 使用例:
 * ```typescript
 * import { hc } from 'hono/client';
 * import type { AppType } from '@recommend-scp/api-types';
 *
 * const client = hc<AppType>('http://localhost:3000');
 * const res = await client.visitors.$post({ json: { visitorId: 'xxx' } });
 * ```
 *
 * @see specs/005-backend-api/005-08-api-types/005-08-02.md
 */

// apps/api-serverから型を再export
export type { AppType } from "@recommend-scp/api-server";
