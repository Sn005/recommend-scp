import sitemap from "../sitemap";

describe("sitemap.ts", () => {
  it("サイトマップエントリが生成される", () => {
    const result = sitemap();
    expect(result.length).toBeGreaterThan(0);
  });

  it("トップページが最高優先度で含まれている", () => {
    const result = sitemap();
    // トップページはbaseURLそのもの（パスセグメントを含まない）
    const homeEntry = result.find(
      (entry) =>
        !entry.url.includes("/recommend") &&
        !entry.url.includes("/favorites") &&
        !entry.url.includes("/history")
    );
    expect(homeEntry).toBeDefined();
    expect(homeEntry?.priority).toBe(1.0);
  });

  it("/recommend ページが含まれている", () => {
    const result = sitemap();
    const recommend = result.find((entry) => entry.url.includes("/recommend"));
    expect(recommend).toBeDefined();
    expect(recommend?.priority).toBe(0.9);
  });

  it("noindexページ（/favorites, /history）がサイトマップに含まれていない", () => {
    const result = sitemap();
    const favorites = result.find((entry) => entry.url.includes("/favorites"));
    const history = result.find((entry) => entry.url.includes("/history"));
    expect(favorites).toBeUndefined();
    expect(history).toBeUndefined();
  });

  it("全エントリにlastModifiedが設定されている", () => {
    const result = sitemap();
    for (const entry of result) {
      expect(entry.lastModified).toBeInstanceOf(Date);
    }
  });

  it("全エントリにchangeFrequencyが設定されている", () => {
    const result = sitemap();
    for (const entry of result) {
      expect(entry.changeFrequency).toBeDefined();
    }
  });
});
