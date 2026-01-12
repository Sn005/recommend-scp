-- ============================================
-- Subtask-003-01-02: タグ辞書テーブル構築
-- ============================================
-- タグの正規化と多言語対応を実現するためのタグ辞書テーブルを構築する。
-- LLMプロンプトへのハードコーディングを排除し、DBベースでタグを管理する。
-- ============================================

-- ============================================
-- 1. tag_dictionary テーブル作成
-- ============================================

CREATE TABLE IF NOT EXISTS tag_dictionary (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('object_class', 'genre', 'theme', 'format')),
  canonical_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, canonical_value)
);

-- コメント追加
COMMENT ON TABLE tag_dictionary IS 'タグ辞書マスタテーブル';
COMMENT ON COLUMN tag_dictionary.id IS 'タグID';
COMMENT ON COLUMN tag_dictionary.category IS 'タグカテゴリ: object_class, genre, theme, format';
COMMENT ON COLUMN tag_dictionary.canonical_value IS '言語中立の正規値（大文字スネークケース）';
COMMENT ON COLUMN tag_dictionary.is_active IS '有効/無効フラグ';
COMMENT ON COLUMN tag_dictionary.created_at IS '作成日時';
COMMENT ON COLUMN tag_dictionary.updated_at IS '更新日時';

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_tag_dictionary_category ON tag_dictionary(category);

-- ============================================
-- 2. tag_localizations テーブル作成
-- ============================================

CREATE TABLE IF NOT EXISTS tag_localizations (
  tag_id INTEGER REFERENCES tag_dictionary(id) ON DELETE CASCADE,
  lang TEXT REFERENCES supported_languages(code),
  localized_value TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  PRIMARY KEY (tag_id, lang)
);

-- コメント追加
COMMENT ON TABLE tag_localizations IS 'タグローカライズテーブル';
COMMENT ON COLUMN tag_localizations.tag_id IS 'タグID（tag_dictionaryへの外部キー）';
COMMENT ON COLUMN tag_localizations.lang IS '言語コード（supported_languagesへの外部キー）';
COMMENT ON COLUMN tag_localizations.localized_value IS 'ローカライズされたタグ値';
COMMENT ON COLUMN tag_localizations.aliases IS '同義語リスト';

-- GINインデックス作成（同義語検索用）
CREATE INDEX IF NOT EXISTS idx_tag_localizations_aliases ON tag_localizations USING GIN(aliases);

-- ============================================
-- 3. 初期データ投入: object_class
-- ============================================

INSERT INTO tag_dictionary (category, canonical_value) VALUES
  ('object_class', 'SAFE'),
  ('object_class', 'EUCLID'),
  ('object_class', 'KETER'),
  ('object_class', 'THAUMIEL'),
  ('object_class', 'NEUTRALIZED'),
  ('object_class', 'APOLLYON'),
  ('object_class', 'ARCHON')
ON CONFLICT (category, canonical_value) DO NOTHING;

-- ============================================
-- 4. 初期データ投入: genre
-- ============================================

INSERT INTO tag_dictionary (category, canonical_value) VALUES
  ('genre', 'HORROR'),
  ('genre', 'SCI_FI'),
  ('genre', 'FANTASY'),
  ('genre', 'COMEDY'),
  ('genre', 'TRAGEDY'),
  ('genre', 'MYSTERY'),
  ('genre', 'ACTION')
ON CONFLICT (category, canonical_value) DO NOTHING;

-- ============================================
-- 5. 初期データ投入: theme
-- ============================================

INSERT INTO tag_dictionary (category, canonical_value) VALUES
  ('theme', 'COGNITION'),
  ('theme', 'REALITY_BENDING'),
  ('theme', 'EXTRADIMENSIONAL'),
  ('theme', 'BIOLOGICAL'),
  ('theme', 'MECHANICAL'),
  ('theme', 'TEMPORAL'),
  ('theme', 'MEMETIC'),
  ('theme', 'ANTIMEMETIC')
ON CONFLICT (category, canonical_value) DO NOTHING;

-- ============================================
-- 6. 初期データ投入: format
-- ============================================

INSERT INTO tag_dictionary (category, canonical_value) VALUES
  ('format', 'STANDARD'),
  ('format', 'EXPLORATION_LOG'),
  ('format', 'INTERVIEW'),
  ('format', 'EXPERIMENT_LOG'),
  ('format', 'TALE')
ON CONFLICT (category, canonical_value) DO NOTHING;

-- ============================================
-- 7. 英語ローカライズ投入: object_class
-- ============================================

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Safe', ARRAY['safe', 'SAFE']
FROM tag_dictionary WHERE canonical_value = 'SAFE' AND category = 'object_class'
ON CONFLICT (tag_id, lang) DO NOTHING;

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Euclid', ARRAY['euclid', 'EUCLID']
FROM tag_dictionary WHERE canonical_value = 'EUCLID' AND category = 'object_class'
ON CONFLICT (tag_id, lang) DO NOTHING;

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Keter', ARRAY['keter', 'KETER']
FROM tag_dictionary WHERE canonical_value = 'KETER' AND category = 'object_class'
ON CONFLICT (tag_id, lang) DO NOTHING;

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Thaumiel', ARRAY['thaumiel', 'THAUMIEL']
FROM tag_dictionary WHERE canonical_value = 'THAUMIEL' AND category = 'object_class'
ON CONFLICT (tag_id, lang) DO NOTHING;

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Neutralized', ARRAY['neutralized', 'NEUTRALIZED']
FROM tag_dictionary WHERE canonical_value = 'NEUTRALIZED' AND category = 'object_class'
ON CONFLICT (tag_id, lang) DO NOTHING;

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Apollyon', ARRAY['apollyon', 'APOLLYON']
FROM tag_dictionary WHERE canonical_value = 'APOLLYON' AND category = 'object_class'
ON CONFLICT (tag_id, lang) DO NOTHING;

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Archon', ARRAY['archon', 'ARCHON']
FROM tag_dictionary WHERE canonical_value = 'ARCHON' AND category = 'object_class'
ON CONFLICT (tag_id, lang) DO NOTHING;

-- ============================================
-- 8. 英語ローカライズ投入: genre
-- ============================================

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Horror', ARRAY['horror', 'HORROR']
FROM tag_dictionary WHERE canonical_value = 'HORROR' AND category = 'genre'
ON CONFLICT (tag_id, lang) DO NOTHING;

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Sci-Fi', ARRAY['sci-fi', 'scifi', 'SCI_FI', 'science fiction']
FROM tag_dictionary WHERE canonical_value = 'SCI_FI' AND category = 'genre'
ON CONFLICT (tag_id, lang) DO NOTHING;

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Fantasy', ARRAY['fantasy', 'FANTASY']
FROM tag_dictionary WHERE canonical_value = 'FANTASY' AND category = 'genre'
ON CONFLICT (tag_id, lang) DO NOTHING;

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Comedy', ARRAY['comedy', 'COMEDY', 'humor', 'humour']
FROM tag_dictionary WHERE canonical_value = 'COMEDY' AND category = 'genre'
ON CONFLICT (tag_id, lang) DO NOTHING;

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Tragedy', ARRAY['tragedy', 'TRAGEDY', 'tragic']
FROM tag_dictionary WHERE canonical_value = 'TRAGEDY' AND category = 'genre'
ON CONFLICT (tag_id, lang) DO NOTHING;

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Mystery', ARRAY['mystery', 'MYSTERY', 'mysterious']
FROM tag_dictionary WHERE canonical_value = 'MYSTERY' AND category = 'genre'
ON CONFLICT (tag_id, lang) DO NOTHING;

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Action', ARRAY['action', 'ACTION']
FROM tag_dictionary WHERE canonical_value = 'ACTION' AND category = 'genre'
ON CONFLICT (tag_id, lang) DO NOTHING;

-- ============================================
-- 9. 英語ローカライズ投入: theme
-- ============================================

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Cognition', ARRAY['cognition', 'COGNITION', 'cognitive', 'mind']
FROM tag_dictionary WHERE canonical_value = 'COGNITION' AND category = 'theme'
ON CONFLICT (tag_id, lang) DO NOTHING;

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Reality Bending', ARRAY['reality bending', 'reality-bending', 'REALITY_BENDING', 'reality warping']
FROM tag_dictionary WHERE canonical_value = 'REALITY_BENDING' AND category = 'theme'
ON CONFLICT (tag_id, lang) DO NOTHING;

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Extradimensional', ARRAY['extradimensional', 'EXTRADIMENSIONAL', 'extra-dimensional', 'dimensional']
FROM tag_dictionary WHERE canonical_value = 'EXTRADIMENSIONAL' AND category = 'theme'
ON CONFLICT (tag_id, lang) DO NOTHING;

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Biological', ARRAY['biological', 'BIOLOGICAL', 'bio', 'organic']
FROM tag_dictionary WHERE canonical_value = 'BIOLOGICAL' AND category = 'theme'
ON CONFLICT (tag_id, lang) DO NOTHING;

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Mechanical', ARRAY['mechanical', 'MECHANICAL', 'mech', 'robotic', 'machine']
FROM tag_dictionary WHERE canonical_value = 'MECHANICAL' AND category = 'theme'
ON CONFLICT (tag_id, lang) DO NOTHING;

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Temporal', ARRAY['temporal', 'TEMPORAL', 'time', 'time-based']
FROM tag_dictionary WHERE canonical_value = 'TEMPORAL' AND category = 'theme'
ON CONFLICT (tag_id, lang) DO NOTHING;

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Memetic', ARRAY['memetic', 'MEMETIC', 'meme', 'infohazard']
FROM tag_dictionary WHERE canonical_value = 'MEMETIC' AND category = 'theme'
ON CONFLICT (tag_id, lang) DO NOTHING;

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Antimemetic', ARRAY['antimemetic', 'ANTIMEMETIC', 'anti-memetic', 'antimeme']
FROM tag_dictionary WHERE canonical_value = 'ANTIMEMETIC' AND category = 'theme'
ON CONFLICT (tag_id, lang) DO NOTHING;

-- ============================================
-- 10. 英語ローカライズ投入: format
-- ============================================

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Standard', ARRAY['standard', 'STANDARD', 'normal', 'default']
FROM tag_dictionary WHERE canonical_value = 'STANDARD' AND category = 'format'
ON CONFLICT (tag_id, lang) DO NOTHING;

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Exploration Log', ARRAY['exploration log', 'exploration-log', 'EXPLORATION_LOG', 'exploration']
FROM tag_dictionary WHERE canonical_value = 'EXPLORATION_LOG' AND category = 'format'
ON CONFLICT (tag_id, lang) DO NOTHING;

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Interview', ARRAY['interview', 'INTERVIEW', 'interviews']
FROM tag_dictionary WHERE canonical_value = 'INTERVIEW' AND category = 'format'
ON CONFLICT (tag_id, lang) DO NOTHING;

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Experiment Log', ARRAY['experiment log', 'experiment-log', 'EXPERIMENT_LOG', 'experiment']
FROM tag_dictionary WHERE canonical_value = 'EXPERIMENT_LOG' AND category = 'format'
ON CONFLICT (tag_id, lang) DO NOTHING;

INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Tale', ARRAY['tale', 'TALE', 'tales', 'story']
FROM tag_dictionary WHERE canonical_value = 'TALE' AND category = 'format'
ON CONFLICT (tag_id, lang) DO NOTHING;

-- ============================================
-- 11. 同義語検索用関数
-- ============================================

CREATE OR REPLACE FUNCTION search_tag_by_alias(
  p_alias TEXT,
  p_lang TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_canonical_value TEXT;
BEGIN
  -- 空文字列の場合はnullを返す
  IF p_alias IS NULL OR p_alias = '' THEN
    RETURN NULL;
  END IF;

  -- localized_value または aliases で検索
  SELECT td.canonical_value INTO v_canonical_value
  FROM tag_dictionary td
  JOIN tag_localizations tl ON td.id = tl.tag_id
  WHERE tl.lang = p_lang
    AND (
      tl.localized_value ILIKE p_alias
      OR EXISTS (
        SELECT 1 FROM unnest(tl.aliases) AS alias
        WHERE alias ILIKE p_alias
      )
    )
  LIMIT 1;

  RETURN v_canonical_value;
END;
$$;

COMMENT ON FUNCTION search_tag_by_alias(TEXT, TEXT) IS '同義語からタグの正規値を検索する関数';

-- ============================================
-- 検証クエリ（コメントアウト）
-- ============================================
--
-- tag_dictionary テーブル確認:
-- SELECT * FROM tag_dictionary ORDER BY category, canonical_value;
--
-- tag_localizations テーブル確認:
-- SELECT td.canonical_value, tl.*
-- FROM tag_localizations tl
-- JOIN tag_dictionary td ON td.id = tl.tag_id
-- ORDER BY td.category, td.canonical_value;
--
-- 同義語検索テスト:
-- SELECT search_tag_by_alias('safe', 'en');  -- SAFE
-- SELECT search_tag_by_alias('Sci-Fi', 'en');  -- SCI_FI
-- SELECT search_tag_by_alias('reality bending', 'en');  -- REALITY_BENDING
--
-- インデックス確認:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('tag_dictionary', 'tag_localizations');
--
