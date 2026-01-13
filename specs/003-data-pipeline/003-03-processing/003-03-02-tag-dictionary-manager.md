# Subtask-003-03-02: タグ辞書マネージャー

## 概要

タグ辞書DBと連携してタグの取得、正規化、プロンプト生成を行うマネージャークラスを実装する。
LLMプロンプトへのハードコーディングを排除し、DBベースでタグを管理する。

## ユーザーストーリー

**As a** 開発者
**I want** タグ辞書をDBから動的に取得してプロンプトに反映する
**So that** タグの追加・変更時にコード変更が不要になる

## Acceptance Criteria（EARS記法）

### 辞書取得

- [ ] WHEN タグ辞書を取得した際
      GIVEN DBに辞書データが存在する場合
      THEN カテゴリ（object_class, genre, theme, format）ごとにタグ一覧を取得する
      AND 各タグのローカライズ値と同義語を含む

- [ ] WHEN 辞書をキャッシュした際
      GIVEN 一度取得した辞書がある場合
      THEN 同一セッション内では再取得せずキャッシュを使用する
      AND キャッシュの有効期限は1時間とする

### タグ正規化

- [ ] WHEN LLMの出力タグを正規化した際
      GIVEN 辞書の同義語にマッチする場合
      THEN 正規値（canonical_value）に変換される
      AND 例: 'safe' → 'SAFE', 'ホラー' → 'HORROR'

- [ ] WHEN 辞書にないタグが出力された際
      GIVEN 同義語にもマッチしない場合
      THEN 警告ログを出力する
      AND そのタグはスキップされる（保存しない）

- [ ] WHEN 大文字小文字が異なる場合
      GIVEN 'Safe', 'SAFE', 'safe' などのバリエーションがある場合
      THEN いずれも正規値 'SAFE' に正規化される

### プロンプト生成

- [ ] WHEN タグ抽出プロンプトを生成した際
      GIVEN 辞書データが存在する場合
      THEN 各カテゴリのタグ選択肢を動的に生成する
      AND 例: `object_class: Safe | Euclid | Keter | ...`

- [ ] WHEN 言語を指定してプロンプトを生成した際
      GIVEN `lang: 'en'` が指定された場合
      THEN 英語のローカライズ値を使用する
      AND 将来の日本語対応時は `lang: 'ja'` で日本語値を使用

## 設計

### インターフェース

```typescript
// packages/shared/src/tagging/tag-dictionary-manager.ts

export type TagCategory = "object_class" | "genre" | "theme" | "format";

export interface TagEntry {
  id: number;
  canonicalValue: string;
  localizedValue: string;
  aliases: string[];
}

export interface TagDictionary {
  object_class: TagEntry[];
  genre: TagEntry[];
  theme: TagEntry[];
  format: TagEntry[];
}

export interface TagDictionaryManager {
  /** 辞書を取得（キャッシュあり） */
  getDictionary(lang?: string): Promise<TagDictionary>;

  /** タグを正規化（同義語→正規値） */
  normalize(category: TagCategory, rawTag: string, lang?: string): Promise<string | null>;

  /** プロンプト用の選択肢文字列を生成 */
  generatePromptChoices(lang?: string): Promise<string>;

  /** キャッシュをクリア */
  clearCache(): void;
}
```

### 実装

```typescript
export class TagDictionaryManagerImpl implements TagDictionaryManager {
  private cache: Map<string, { data: TagDictionary; expiresAt: Date }> = new Map();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1時間

  async getDictionary(lang = "en"): Promise<TagDictionary> {
    const cached = this.cache.get(lang);
    if (cached && cached.expiresAt > new Date()) {
      return cached.data;
    }

    const dictionary = await this.fetchFromDB(lang);
    this.cache.set(lang, {
      data: dictionary,
      expiresAt: new Date(Date.now() + this.CACHE_TTL_MS),
    });
    return dictionary;
  }

  async normalize(category: TagCategory, rawTag: string, lang = "en"): Promise<string | null> {
    const dictionary = await this.getDictionary(lang);
    const entries = dictionary[category];

    const normalized = rawTag.toLowerCase().trim();

    for (const entry of entries) {
      // ローカライズ値でマッチ
      if (entry.localizedValue.toLowerCase() === normalized) {
        return entry.canonicalValue;
      }
      // 同義語でマッチ
      if (entry.aliases.some((a) => a.toLowerCase() === normalized)) {
        return entry.canonicalValue;
      }
    }

    console.warn(`⚠️ 未知のタグ: ${category}/${rawTag}`);
    return null;
  }

  async generatePromptChoices(lang = "en"): Promise<string> {
    const dictionary = await this.getDictionary(lang);

    return `
You must select tags from the following options only:

object_class (choose ONE):
${dictionary.object_class.map((t) => t.localizedValue).join(" | ")}

genre (choose 1-3):
${dictionary.genre.map((t) => t.localizedValue).join(" | ")}

theme (choose 1-5):
${dictionary.theme.map((t) => t.localizedValue).join(" | ")}

format (choose ONE):
${dictionary.format.map((t) => t.localizedValue).join(" | ")}
`.trim();
  }
}
```

### 使用例

```typescript
const manager = new TagDictionaryManagerImpl();

// プロンプト生成
const choices = await manager.generatePromptChoices("en");
const prompt = `${SYSTEM_PROMPT}\n\n${choices}\n\nArticle:\n${content}`;

// LLM出力の正規化
const normalized = await manager.normalize("object_class", "safe", "en");
// => 'SAFE'
```

## テストケース

- [ ] 辞書がDBから正しく取得される
- [ ] キャッシュが正しく機能する
- [ ] キャッシュの有効期限切れで再取得される
- [ ] 正規値への変換が正しく行われる
- [ ] 同義語からの正規化が正しく行われる
- [ ] 大文字小文字を無視して正規化される
- [ ] 未知のタグで警告が出力されnullが返される
- [ ] プロンプト選択肢が正しく生成される
