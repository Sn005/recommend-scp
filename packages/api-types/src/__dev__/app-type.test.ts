/**
 * @file AppType export テスト
 * @description AC1〜AC3: AppType型のexportと型補完のテスト
 * @see specs/005-backend-api/005-08-api-types/005-08-02.md
 */

import { describe, it, expect, expectTypeOf } from "vitest";
import { hc } from "hono/client";

// AC1: @recommend-scp/api-typesからAppTypeをインポート
// 注: 現時点ではこのimportは失敗する（実装前）
import type { AppType } from "../index";

describe("AC1: AppType export", () => {
  it("AppTypeが型としてexportされている", () => {
    // 型レベルの検証: コンパイルが通れば成功
    // AppTypeが存在しない場合、コンパイルエラーになる
    expectTypeOf<AppType>().not.toBeNever();
  });

  it("@recommend-scp/api-typesからimportできる", async () => {
    // 動的importでモジュール構造を確認
    const module = await import("../index");
    // AppTypeは型なので実行時には存在しないが、importエラーが出ないことを確認
    expect(module).toBeDefined();
  });
});

describe("AC2: hc<AppType>型補完", () => {
  // Hono RPCクライアントを作成
  const client = hc<AppType>("http://localhost:3000");

  it("/healthエンドポイントの型が補完される", () => {
    // health.$get が存在し、関数であることを型レベルで検証
    expectTypeOf(client.health.$get).toBeFunction();
  });

  it("/visitorsエンドポイントの型が補完される", () => {
    // visitors.$post が存在し、関数であることを型レベルで検証
    expectTypeOf(client.visitors.$post).toBeFunction();
  });

  it("/articles/searchエンドポイントの型が補完される", () => {
    // articles.search.$get が存在し、関数であることを型レベルで検証
    expectTypeOf(client.articles.search.$get).toBeFunction();
  });

  it("/recommendエンドポイントの型が補完される", () => {
    // recommend.$post が存在し、関数であることを型レベルで検証
    expectTypeOf(client.recommend.$post).toBeFunction();
  });

  it("/feedbackエンドポイントの型が補完される", () => {
    // feedback.$post が存在し、関数であることを型レベルで検証
    expectTypeOf(client.feedback.$post).toBeFunction();
  });

  it("/onboarding/packsエンドポイントの型が補完される", () => {
    // onboarding.packs.$get が存在し、関数であることを型レベルで検証
    expectTypeOf(client.onboarding.packs.$get).toBeFunction();
  });

  it("/onboarding/selectエンドポイントの型が補完される", () => {
    // onboarding.select.$post が存在し、関数であることを型レベルで検証
    expectTypeOf(client.onboarding.select.$post).toBeFunction();
  });

  it("/onboarding/select/customエンドポイントの型が補完される", () => {
    // onboarding.select.custom.$post が存在し、関数であることを型レベルで検証
    expectTypeOf(client.onboarding.select.custom.$post).toBeFunction();
  });
});

describe("AC3: リクエスト/レスポンス型検証", () => {
  const client = hc<AppType>("http://localhost:3000");

  it("visitorsエンドポイントのリクエストボディ型が推論される", () => {
    // $post の引数に json プロパティがあることを検証
    expectTypeOf(client.visitors.$post).parameter(0).toHaveProperty("json");
  });

  it("articlesエンドポイントのクエリパラメータ型が推論される", () => {
    // $get の引数に query プロパティがあることを検証
    expectTypeOf(client.articles.search.$get).parameter(0).toHaveProperty("query");
  });

  it("recommendエンドポイントのリクエストボディ型が推論される", () => {
    // $post の引数に json プロパティがあることを検証
    expectTypeOf(client.recommend.$post).parameter(0).toHaveProperty("json");
  });

  it("feedbackエンドポイントのリクエストボディ型が推論される", () => {
    // $post の引数に json プロパティがあることを検証
    expectTypeOf(client.feedback.$post).parameter(0).toHaveProperty("json");
  });
});
