import type { Article, ObjectClass } from "../index";

describe("Article型の拡張 (AC-4)", () => {
  it("objectClassフィールドが存在する", () => {
    const article: Article = {
      id: "scp-173",
      title: "SCP-173",
      similarityScore: 0.85,
      source: "preference",
      url: "https://scp-jp.wikidot.com/scp-173",
      objectClass: "Euclid",
      rating: 1234,
    };

    expect(article.objectClass).toBe("Euclid");
  });

  it("objectClassがnullの場合も型エラーにならない", () => {
    const article: Article = {
      id: "scp-unknown",
      title: "Unknown SCP",
      similarityScore: 0.5,
      source: "serendipity",
      url: "https://example.com",
      objectClass: null,
      rating: 0,
    };

    expect(article.objectClass).toBeNull();
  });

  it("ratingフィールドが存在する", () => {
    const article: Article = {
      id: "scp-173",
      title: "SCP-173",
      similarityScore: 0.85,
      source: "preference",
      url: "https://scp-jp.wikidot.com/scp-173",
      objectClass: "Euclid",
      rating: 1234,
    };

    expect(article.rating).toBe(1234);
  });

  it("ratingがnullの場合も型エラーにならない", () => {
    const article: Article = {
      id: "scp-unknown",
      title: "Unknown SCP",
      similarityScore: 0.5,
      source: "serendipity",
      url: "https://example.com",
      objectClass: "Safe",
      rating: null,
    };

    expect(article.rating).toBeNull();
  });

  it("既存のフィールドが引き続き存在する", () => {
    const article: Article = {
      id: "scp-173",
      title: "SCP-173",
      similarityScore: 0.85,
      source: "preference",
      url: "https://scp-jp.wikidot.com/scp-173",
      objectClass: "Euclid",
      rating: 1234,
    };

    expect(article).toHaveProperty("id");
    expect(article).toHaveProperty("title");
    expect(article).toHaveProperty("similarityScore");
    expect(article).toHaveProperty("source");
    expect(article).toHaveProperty("url");
  });
});

describe("ObjectClass型の統一 (AC-5)", () => {
  it("全7クラスがObjectClass型に含まれる", () => {
    const classes: ObjectClass[] = [
      "Safe",
      "Euclid",
      "Keter",
      "Thaumiel",
      "Neutralized",
      "Apollyon",
      "Archon",
    ];

    expect(classes).toHaveLength(7);
  });
});
