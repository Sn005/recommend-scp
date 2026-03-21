# EPIC-019: レスポンシブデザイン対応

## 概要

SCPicksアプリケーションにPC版レイアウトを追加し、768px以上の画面幅で最適化されたデスクトップ体験を提供する。モバイルファーストの既存設計を維持しつつ、Tailwind `md:` ブレークポイントでPC用スタイルをオーバーレイする。

## ステータス

- **status**: pending

## ユーザーストーリー

**ペルソナ**: PCブラウザでSCPicksを利用するユーザー
**目的**: PC画面でもモバイルと同等の快適な推薦体験を得る
**価値**: 画面の広さを活かした読みやすいレイアウトで記事を楽しめる
**理由**: 現在はモバイル専用設計のため、PCブラウザでは左上に寄った小さなUIになり使いにくい

> PCブラウザのユーザーとして、デスクトップに最適化されたレイアウトで記事を読みたい。なぜならモバイル専用UIでは画面の大半が無駄になり、操作性が低下するから。

## Acceptance Criteria

### AC-1: ブレークポイント

- [ ] WHERE レスポンシブ対応の全画面
      THE SYSTEM SHALL 768px（Tailwind `md:`）を唯一のブレークポイントとして使用する
      AND モバイル（<768px）では既存のUIを一切変更しない

### AC-2: グローバルヘッダー

- [ ] WHEN 画面幅が768px以上の場合
      THEN ロゴ（左）・ナビリンク（中央）・3点メニュー（右）のグローバルヘッダーを表示する
      AND ドロワー・メニューボタンを非表示にする

### AC-3: 推薦画面PC対応

- [ ] WHEN 推薦画面をPCで表示する場合
      THEN 記事コンテンツをmax-width: 768pxで中央寄せし、サイドパネルを表示する
      AND PillNavの代わりにテキストボタン（お気に入り/次の記事）を表示する

### AC-4: お気に入り画面PC対応

- [ ] WHEN お気に入り画面をPCで表示する場合
      THEN カードリストをmax-width: 768pxで中央寄せし、ホバーエフェクトを適用する

### AC-5: オンボーディング画面PC対応

- [ ] WHEN オンボーディング画面をPCで表示する場合
      THEN パックカードを2列グリッドで配置し、見出しを中央寄せする

### AC-6: デザイン準拠

- [ ] WHERE レスポンシブ対応の全コンポーネント
      THE SYSTEM SHALL モックアップ（mockups/responsive-\*.html）のデザインに準拠する
      AND design-tokens.cssの色・spacing値を使用する

## 関連Story

- [019-01: 共通レスポンシブ基盤](./019-01-responsive-foundation/019-01.md)
- [019-02: 推薦画面レスポンシブ対応](./019-02-recommend-responsive/019-02.md)
- [019-03: お気に入り画面レスポンシブ対応](./019-03-favorites-responsive/019-03.md)
- [019-04: オンボーディング画面レスポンシブ対応](./019-04-onboarding-responsive/019-04.md)

## 技術方針

| 項目               | 方針                                             |
| ------------------ | ------------------------------------------------ |
| ブレークポイント   | Tailwind `md:` (768px) のみ                      |
| アプローチ         | モバイルファースト維持。`md:` でPC用スタイル追加 |
| 新規コンポーネント | GlobalHeader, DropdownMenu, PCActionButtons      |
| 既存変更           | `md:hidden` / `md:flex` の追加が中心             |

## 参照モックアップ

- `mockups/responsive-recommend.html`
- `mockups/responsive-favorites.html`
- `mockups/responsive-onboarding.html`
- `mockups/responsive-wireframe.html`
- `mockups/responsive-comparison.html`
