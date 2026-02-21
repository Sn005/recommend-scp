import { generateMetadata } from "../(viewer)/article/[articleId]/page";

describe("記事ページ generateMetadata", () => {
  it("articleIdからタイトルを大文字変換で生成する", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ articleId: "scp-173" }),
    });
    expect(metadata.title).toBe("SCP-173");
  });

  it("descriptionにSCP番号が含まれる", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ articleId: "scp-999" }),
    });
    expect(metadata.description).toContain("SCP-999");
  });

  it("OGPタイトルにSCPicksが含まれる", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ articleId: "scp-173" }),
    });
    const og = metadata.openGraph as { title: string };
    expect(og.title).toContain("SCPicks");
  });

  it('OGP typeが "article" に設定されている', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ articleId: "scp-173" }),
    });
    const og = metadata.openGraph as { type: string };
    expect(og.type).toBe("article");
  });

  it("Twitter Cardが設定されている", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ articleId: "scp-173" }),
    });
    const twitter = metadata.twitter as { card: string };
    expect(twitter.card).toBe("summary");
  });

  it("canonical URLにarticleIdが含まれる", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ articleId: "scp-173" }),
    });
    const alternates = metadata.alternates as { canonical: string };
    expect(alternates.canonical).toContain("scp-173");
  });
});
