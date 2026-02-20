# PWA リリース計画書: SCPicks

## 概要

SCP推薦Webアプリ「SCPicks」をPWA（Progressive Web App）としてリリースするための計画書。
ヒアリング（全4ラウンド）の決定事項を踏まえ、技術仕様・実装タスク・アイコン生成プロンプトをまとめる。

---

## 決定事項サマリー

### ブランディング

| 項目         | 決定                                             |
| ------------ | ------------------------------------------------ |
| アプリ名(短) | `SCPicks`                                        |
| アプリ名(長) | `SCPicks - あなた好みのSCPを発見`                |
| テーマカラー | 既存デザイントークン踏襲 (`#3B82F6` / `#FFFFFF`) |
| アイコン     | ミニマル文字ロゴ（装飾を抑えたシンプルデザイン） |

### 機能スコープ

| 機能               | 対応 | 備考                             |
| ------------------ | ---- | -------------------------------- |
| ホーム画面追加     | Yes  | manifest.json + Service Worker   |
| フルスクリーン表示 | Yes  | `display: "standalone"`          |
| オフラインサポート | No   | 不要（常時オンライン前提）       |
| プッシュ通知       | No   | 不要                             |
| インストール促進   | No   | ブラウザネイティブバナーに任せる |
| アプリストア掲載   | No   | Web全面公開のみ                  |

### テクニカルスタック

| 項目           | 技術                     |
| -------------- | ------------------------ |
| フレームワーク | Next.js 16 (App Router)  |
| ホスティング   | Vercel                   |
| アイコン生成   | 外部AI（プロンプト提供） |

---

## 技術仕様

### 1. Web App Manifest (`manifest.json`)

```jsonc
{
  "name": "SCPicks - あなた好みのSCPを発見",
  "short_name": "SCPicks",
  "description": "あなたの好みに合ったSCP記事を推薦するWebアプリ",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFFFFF",
  "theme_color": "#3B82F6",
  "orientation": "portrait",
  "lang": "ja",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable",
    },
  ],
}
```

**配置場所**: `apps/web/public/manifest.json`

### 2. Service Worker（最小構成）

ブラウザのインストールバナーを表示するには、Service Workerの登録が必須。
オフラインサポートは不要のため、最小限の実装とする。

```javascript
// apps/web/public/sw.js
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
```

### 3. layout.tsx の変更

```tsx
export const metadata: Metadata = {
  title: "SCPicks - あなた好みのSCPを発見",
  description: "あなたの好みに合ったSCP記事を推薦するWebアプリ",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SCPicks",
  },
};
```

### 4. Service Worker 登録コンポーネント

```tsx
// apps/web/src/shared/components/ServiceWorkerRegistrar.tsx
"use client";
import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);
  return null;
}
```

layout.tsx の `<body>` 内に配置。

### 5. 必要なアイコンファイル

| ファイル                            | サイズ  | 用途                              |
| ----------------------------------- | ------- | --------------------------------- |
| `public/icons/icon-192x192.png`     | 192x192 | Android ホーム画面                |
| `public/icons/icon-512x512.png`     | 512x512 | Android スプラッシュ / ストア表示 |
| `public/icons/apple-touch-icon.png` | 180x180 | iOS ホーム画面                    |
| `public/favicon.ico`                | 32x32   | ブラウザタブ                      |

---

## 実装タスク一覧

### Phase 1: PWA基盤（EPIC-005相当のSubtask）

| #   | タスク                                      | 見積 |
| --- | ------------------------------------------- | ---- |
| 1   | `public/manifest.json` を作成               | 小   |
| 2   | `public/sw.js` を作成（最小構成）           | 小   |
| 3   | `ServiceWorkerRegistrar` コンポーネント作成 | 小   |
| 4   | `layout.tsx` にメタデータ追加               | 小   |
| 5   | アイコンファイルを `public/icons/` に配置   | 小   |
| 6   | Vercelデプロイで動作確認                    | 小   |

### Phase 2: 検証

| #   | タスク                                        | 見積 |
| --- | --------------------------------------------- | ---- |
| 7   | Chrome DevTools > Application > Manifest 確認 | 小   |
| 8   | Lighthouse PWA監査（Installable判定）         | 小   |
| 9   | Android実機でホーム画面追加テスト             | 小   |
| 10  | iOS Safari でホーム画面追加テスト             | 小   |

---

## アイコン生成AIプロンプト

以下のプロンプトを画像生成AI（Midjourney / DALL-E / Stable Diffusion等）に入力してください。

### メインプロンプト（英語）

```
Design a minimal app icon for "SCPicks".

Requirements:
- Text-based logo featuring the letters "SP" as the primary element
- Ultra-minimalist design with no unnecessary decoration
- Clean, geometric sans-serif typeface
- Color: white text (#FFFFFF) on a solid blue background (#3B82F6)
- The letters should be bold and perfectly centered
- No gradients, no shadows, no 3D effects
- Square format with rounded corners (suitable for app icon)
- Must be legible at small sizes (48x48px)
- Professional, modern, tech-inspired aesthetic

Style: flat design, minimal, clean
Format: square, 1024x1024px, PNG with transparency
```

### バリエーションプロンプト

必要に応じて以下のバリエーションも生成：

**バリエーション A: フル文字**

```
Same requirements as above, but use the full text "SCPicks" instead of "SP".
Arrange the text to fit within a square icon format.
```

**バリエーション B: 反転カラー**

```
Same requirements as above, but invert colors:
- Blue text (#3B82F6) on a white background (#FFFFFF)
- Add a subtle 1px border in light gray (#E5E7EB) for visibility on white backgrounds
```

**バリエーション C: モノグラム**

```
Same requirements as above, but arrange "S" and "P" as a monogram
(overlapping or interlocking letters) in a square composition.
```

### アイコン生成後の作業

1. 生成された1024x1024画像をベースに以下のサイズをリサイズ:
   - 512x512 (`icon-512x512.png`)
   - 192x192 (`icon-192x192.png`)
   - 180x180 (`apple-touch-icon.png`)
   - 32x32 → ICO変換 (`favicon.ico`)

2. maskable アイコン用に、アイコンの周囲にセーフゾーン（20%のパディング）を確保したバージョンも生成

---

## 公開方針

| フェーズ     | 内容                                                |
| ------------ | --------------------------------------------------- |
| 開発・テスト | ローカル + Vercel Preview でPWA動作確認             |
| Web全面公開  | Vercel Production にデプロイ。URLは自由にアクセス可 |
| ストア掲載   | なし（予定なし）                                    |

---

## 備考

- オフライン対応やプッシュ通知が将来必要になった場合は、Service Workerを拡張する形で対応可能
- アプリストア掲載が必要になった場合は、TWA (Trusted Web Activity) やPWABuilder を検討
- ユーザー数が少数（5-10名）のため、パフォーマンス監視は既存のVercel Analytics で十分
