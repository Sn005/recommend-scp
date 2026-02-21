/**
 * @file ライセンスページ
 * @description ライセンス情報・クレジットの表示ページ
 * @see specs/014-scp-licensing/014-02-licensing-page/014-02-01.md
 */
"use client";

import { MenuButton } from "@/shared/components/ui/MenuButton";

const externalLinks = [
  {
    label: "CC BY-SA 3.0 ライセンス全文",
    href: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  {
    label: "GPLv3 ライセンス全文",
    href: "https://www.gnu.org/licenses/gpl-3.0.html",
  },
  {
    label: "SCP Foundation",
    href: "https://scp-wiki.wikidot.com/",
  },
  {
    label: "tedivm/scp-data (GitHub)",
    href: "https://github.com/tedivm/scp-data",
  },
] as const;

export default function LicensingPage() {
  return (
    <div data-testid="licensing-page" className="min-h-screen bg-gray-50">
      <MenuButton />

      <main className="px-4 pb-8">
        {/* ヘッダー */}
        <div className="py-4 pl-12">
          <h1 className="text-lg font-semibold text-gray-800">ライセンス</h1>
        </div>

        <div className="space-y-6">
          {/* アプリコードのライセンス */}
          <section className="rounded-lg bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-800">アプリケーションコード</h2>
            <p className="text-sm leading-relaxed text-gray-600">
              このアプリケーションは GPLv3 ライセンスの下で提供されています。ソースコードは GitHub
              リポジトリで公開しています。
            </p>
          </section>

          {/* SCPコンテンツのライセンス */}
          <section className="rounded-lg bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-800">SCPコンテンツ</h2>
            <p className="text-sm leading-relaxed text-gray-600">
              SCP Foundationのコンテンツは CC BY-SA 3.0 ライセンスの下で提供されています。
            </p>
          </section>

          {/* クレジット */}
          <section className="rounded-lg bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-800">クレジット</h2>
            <ul className="space-y-2 text-sm leading-relaxed text-gray-600">
              <li>
                SCP Foundationのコンテンツは{" "}
                <a
                  href="https://scp-wiki.wikidot.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  SCP Foundation
                </a>{" "}
                コミュニティにより作成されています。
              </li>
              <li>
                記事データは{" "}
                <a
                  href="https://github.com/tedivm/scp-data"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  tedivm/scp-data
                </a>{" "}
                を通じて取得しています。
              </li>
            </ul>
          </section>

          {/* 外部リンク */}
          <section className="rounded-lg bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-800">ライセンス全文・関連リンク</h2>
            <ul className="space-y-2">
              {externalLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
