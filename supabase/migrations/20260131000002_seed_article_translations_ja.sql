-- Subtask 010-01-02: 初期データ投入マイグレーション
-- 既存の英語版記事データから日本語版URLを一括生成する

-- 日本語版URL一括投入
-- URL生成ロジック: http://scp-jp.wikidot.com/ + LOWER(article_id)
INSERT INTO article_translations (article_id, lang, url)
SELECT
  article_id,
  'ja',
  'http://scp-jp.wikidot.com/' || LOWER(article_id)
FROM scp_articles
WHERE lang = 'en'
ON CONFLICT (article_id, lang) DO NOTHING;

-- 投入件数確認用コメント
-- 期待値: scp_articles WHERE lang = 'en' と同数
