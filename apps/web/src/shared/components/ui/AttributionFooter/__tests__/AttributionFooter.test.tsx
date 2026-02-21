/**
 * @file AttributionFooter コンポーネントのテスト
 * @description 014-03-02: 記事フッター帰属表示コンポーネント
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AttributionFooter } from "../index";

const CC_BY_SA_URL = "https://creativecommons.org/licenses/by-sa/3.0/";

describe("AttributionFooter", () => {
  describe("AC1: 著者情報が取得できた場合の帰属表示", () => {
    it("フッターコンポーネントが表示される", () => {
      render(<AttributionFooter articleId="scp-173" authorName="著者太郎" />);
      expect(screen.getByTestId("attribution-footer")).toBeInTheDocument();
    });

    it("CC BY-SA 3.0ライセンステキストが表示される", () => {
      render(<AttributionFooter articleId="scp-173" authorName="著者太郎" />);
      expect(screen.getByText(/CC BY-SA 3\.0/)).toBeInTheDocument();
    });

    it("原文リンクが scp-jp.wikidot.com/{articleId} 形式のURLを持つ", () => {
      render(<AttributionFooter articleId="scp-173" authorName="著者太郎" />);
      const link = screen.getByTestId("attribution-original-link");
      expect(link).toHaveAttribute("href", "https://scp-jp.wikidot.com/scp-173");
    });

    it("SCP Foundationクレジットが表示される", () => {
      render(<AttributionFooter articleId="scp-173" authorName="著者太郎" />);
      expect(screen.getByText(/SCP Foundation/)).toBeInTheDocument();
    });

    it("著者名がテキストとして表示される", () => {
      render(<AttributionFooter articleId="scp-173" authorName="著者太郎" />);
      expect(screen.getByText(/著者太郎/)).toBeInTheDocument();
    });

    it("ライセンス全文リンクが表示される", () => {
      render(<AttributionFooter articleId="scp-173" authorName="著者太郎" />);
      expect(screen.getByTestId("attribution-license-link")).toBeInTheDocument();
    });

    it("著者名ありの場合「Content by {著者名}」形式で表示される", () => {
      render(<AttributionFooter articleId="scp-173" authorName="著者太郎" />);
      expect(screen.getByText(/Content by 著者太郎/)).toBeInTheDocument();
    });
  });

  describe("AC2: 著者名が空文字列の場合の帰属表示", () => {
    it("「Content by」テキストが表示されない", () => {
      render(<AttributionFooter articleId="scp-173" authorName="" />);
      expect(screen.queryByText(/Content by/)).not.toBeInTheDocument();
    });

    it("代替テキスト「Content licensed under CC BY-SA 3.0」が表示される", () => {
      render(<AttributionFooter articleId="scp-173" authorName="" />);
      expect(screen.getByText(/Content licensed under/)).toBeInTheDocument();
      expect(screen.getByText(/CC BY-SA 3\.0/)).toBeInTheDocument();
    });

    it("SCP Foundationクレジットが表示される", () => {
      render(<AttributionFooter articleId="scp-173" authorName="" />);
      expect(screen.getByText(/SCP Foundation/)).toBeInTheDocument();
    });

    it("原文リンクが表示される", () => {
      render(<AttributionFooter articleId="scp-173" authorName="" />);
      expect(screen.getByTestId("attribution-original-link")).toBeInTheDocument();
    });

    it("ライセンス全文リンクが表示される", () => {
      render(<AttributionFooter articleId="scp-173" authorName="" />);
      expect(screen.getByTestId("attribution-license-link")).toBeInTheDocument();
    });
  });

  describe("AC3: 原文リンクの外部ブラウザ起動", () => {
    it("原文リンクにtarget='_blank'が設定されている", () => {
      render(<AttributionFooter articleId="scp-173" authorName="著者太郎" />);
      const link = screen.getByTestId("attribution-original-link");
      expect(link).toHaveAttribute("target", "_blank");
    });

    it("原文リンクにrel='noopener noreferrer'が設定されている", () => {
      render(<AttributionFooter articleId="scp-173" authorName="著者太郎" />);
      const link = screen.getByTestId("attribution-original-link");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("「原文を見る」というリンクテキストが表示される", () => {
      render(<AttributionFooter articleId="scp-173" authorName="著者太郎" />);
      expect(screen.getByText("原文を見る")).toBeInTheDocument();
    });
  });

  describe("AC4: ライセンスリンクの外部ブラウザ起動", () => {
    it("ライセンスリンクにtarget='_blank'が設定されている", () => {
      render(<AttributionFooter articleId="scp-173" authorName="著者太郎" />);
      const link = screen.getByTestId("attribution-license-link");
      expect(link).toHaveAttribute("target", "_blank");
    });

    it("ライセンスリンクにrel='noopener noreferrer'が設定されている", () => {
      render(<AttributionFooter articleId="scp-173" authorName="著者太郎" />);
      const link = screen.getByTestId("attribution-license-link");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("ライセンスリンクのhrefがCC BY-SA 3.0全文URLである", () => {
      render(<AttributionFooter articleId="scp-173" authorName="著者太郎" />);
      const link = screen.getByTestId("attribution-license-link");
      expect(link).toHaveAttribute("href", CC_BY_SA_URL);
    });
  });

  describe("AC5: APIリクエスト失敗時のフォールバック（authorName=undefined）", () => {
    it("authorNameがundefinedでもフッターが表示される", () => {
      render(<AttributionFooter articleId="scp-173" authorName={undefined} />);
      expect(screen.getByTestId("attribution-footer")).toBeInTheDocument();
    });

    it("authorNameがundefinedの場合に著者名部分が省略される", () => {
      render(<AttributionFooter articleId="scp-173" authorName={undefined} />);
      expect(screen.queryByText(/Content by/)).not.toBeInTheDocument();
    });

    it("authorNameがundefinedの場合にCC BY-SA 3.0テキストが表示される", () => {
      render(<AttributionFooter articleId="scp-173" authorName={undefined} />);
      expect(screen.getByText(/CC BY-SA 3\.0/)).toBeInTheDocument();
    });

    it("authorNameがundefinedの場合に原文リンクが表示される", () => {
      render(<AttributionFooter articleId="scp-173" authorName={undefined} />);
      expect(screen.getByTestId("attribution-original-link")).toBeInTheDocument();
    });

    it("authorNameがundefinedの場合にSCP Foundationクレジットが表示される", () => {
      render(<AttributionFooter articleId="scp-173" authorName={undefined} />);
      expect(screen.getByText(/SCP Foundation/)).toBeInTheDocument();
    });
  });

  describe("エッジケース", () => {
    it("articleIdにハイフンが複数含まれる場合もURLが正しく構築される", () => {
      render(<AttributionFooter articleId="scp-001-j" authorName="著者太郎" />);
      const link = screen.getByTestId("attribution-original-link");
      expect(link).toHaveAttribute("href", "https://scp-jp.wikidot.com/scp-001-j");
    });

    it("authorNameがスペースのみの場合は著者名なしとして扱われる", () => {
      render(<AttributionFooter articleId="scp-173" authorName="   " />);
      expect(screen.queryByText(/Content by/)).not.toBeInTheDocument();
    });

    it("authorNameに日本語が含まれる場合も正しく表示される", () => {
      render(<AttributionFooter articleId="scp-173" authorName="山田太郎" />);
      expect(screen.getByText(/山田太郎/)).toBeInTheDocument();
    });
  });
});
