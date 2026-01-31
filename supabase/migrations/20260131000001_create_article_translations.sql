-- Subtask 010-01-01: article_translations テーブル作成
-- 多言語記事URL管理テーブルを作成する

-- テーブル作成
CREATE TABLE article_translations (
  article_id TEXT NOT NULL,
  lang TEXT NOT NULL,
  url TEXT NOT NULL,
  has_translation BOOLEAN DEFAULT NULL,
  checked_at TIMESTAMPTZ,
  PRIMARY KEY (article_id, lang),
  CONSTRAINT fk_article_translations_article
    FOREIGN KEY (article_id)
    REFERENCES scp_articles(article_id)
    ON DELETE CASCADE
);

-- コメント
COMMENT ON TABLE article_translations IS '多言語記事URL管理テーブル';
COMMENT ON COLUMN article_translations.article_id IS '記事ID (例: SCP-173)';
COMMENT ON COLUMN article_translations.lang IS '言語コード (例: ja, ko, cn)';
COMMENT ON COLUMN article_translations.url IS '各言語版のURL';
COMMENT ON COLUMN article_translations.has_translation IS '翻訳有無 (NULL=未確認, TRUE=あり, FALSE=なし)';
COMMENT ON COLUMN article_translations.checked_at IS '翻訳確認日時';

-- インデックス
CREATE INDEX idx_article_translations_lang
  ON article_translations(lang);

CREATE INDEX idx_article_translations_has_translation
  ON article_translations(lang, has_translation)
  WHERE has_translation IS NOT FALSE;

-- RLS (Row Level Security)
ALTER TABLE article_translations ENABLE ROW LEVEL SECURITY;

-- 読み取りは全員許可
CREATE POLICY "article_translations_select"
  ON article_translations
  FOR SELECT
  USING (true);

-- 挿入・更新・削除はサービスロールのみ
CREATE POLICY "article_translations_insert"
  ON article_translations
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "article_translations_update"
  ON article_translations
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "article_translations_delete"
  ON article_translations
  FOR DELETE
  USING (auth.role() = 'service_role');
