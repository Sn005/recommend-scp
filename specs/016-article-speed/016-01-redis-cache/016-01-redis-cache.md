---
id: "016-01"
epic_id: "016"
epic_title: "記事表示速度改善"
title: "Redisキャッシュレイヤー導入"
status: "pending"
created_at: "2026-02-21"
updated_at: "2026-02-21"
---

# Story: Redisキャッシュレイヤー導入

## 親EPIC

[016: 記事表示速度改善](../016-article-speed.md)

## ユーザーストーリー

**ペルソナ**: 推薦記事を閲覧するユーザー
**目的**: 一度表示された記事を次回から高速に表示する
**価値**: 記事切り替え時の待ち時間が大幅に短縮される
**理由**: SCP Wiki記事はほぼ静的であり、キャッシュによるパフォーマンス改善効果が高いから

> ユーザーとして、一度表示された記事を次回から高速に表示して、記事切り替え時の待ち時間が大幅に短縮されるようにしたい。なぜなら記事はほぼ静的であり、キャッシュによる改善効果が高いから。

## Acceptance Criteria

- [ ] Upstash Redisクライアントが初期化でき、接続情報未設定時はgracefulにフォールバックすること
- [ ] wiki-proxy HTMLがRedisにキャッシュされ、2回目以降のアクセスが高速化されること
- [ ] articles/contentの結果がRedisにキャッシュされ、2回目以降のアクセスが高速化されること
- [ ] 全既存テストが通過すること

## 関連Subtask

- [016-01-01: Redisクライアント・キャッシュヘルパー実装](./016-01-01.md)
- [016-01-02: wiki-proxy HTMLキャッシュ導入](./016-01-02.md)
- [016-01-03: articles/contentキャッシュ導入](./016-01-03.md)

## 備考

- キャッシュ戦略: Cache-Aside（Lazy Loading）
- Upstash Redis Free tier制約: 10,000 commands/day, 256MB storage
- 記事HTMLサイズ: 50-200KB → TTL 1時間で自動eviction、ストレージ圧迫なし
