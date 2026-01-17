/**
 * タグ辞書マネージャー
 * Subtask-003-03-02
 *
 * タグ辞書DBと連携してタグの取得、正規化、プロンプト生成を行う
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TagCategory } from "../types";

export type { TagCategory };

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

/** DBから取得する行データの型 */
interface DbTagRow {
  id: number;
  category: TagCategory;
  canonical_value: string;
  is_active: boolean;
  tag_localizations: {
    lang: string;
    localized_value: string;
    aliases: string[] | null;
  }[];
}

/** キャッシュエントリの型 */
interface CacheEntry {
  data: TagDictionary;
  expiresAt: Date;
}

/** キャッシュ有効期限（1時間） */
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * タグ辞書マネージャー実装クラス
 */
export class TagDictionaryManagerImpl implements TagDictionaryManager {
  private cache = new Map<string, CacheEntry>();

  constructor(private readonly client: SupabaseClient) {}

  /**
   * 辞書を取得（キャッシュあり）
   */
  async getDictionary(lang = "en"): Promise<TagDictionary> {
    // キャッシュをチェック
    const cached = this.cache.get(lang);
    if (cached && cached.expiresAt > new Date()) {
      return cached.data;
    }

    // DBから取得
    const dictionary = await this.fetchFromDB(lang);

    // キャッシュに保存
    this.cache.set(lang, {
      data: dictionary,
      expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    });

    return dictionary;
  }

  /**
   * DBからタグ辞書を取得
   */
  private async fetchFromDB(lang: string): Promise<TagDictionary> {
    const { data, error } = await this.client
      .from("tag_dictionary")
      .select(
        `
        id,
        category,
        canonical_value,
        is_active,
        tag_localizations!inner (
          lang,
          localized_value,
          aliases
        )
      `
      )
      .eq("tag_localizations.lang", lang);

    if (error) {
      throw new Error(error.message);
    }

    // 空の辞書を初期化
    const dictionary: TagDictionary = {
      object_class: [],
      genre: [],
      theme: [],
      format: [],
    };

    if (data.length === 0) {
      return dictionary;
    }

    // データをカテゴリ別に整理
    for (const row of data as DbTagRow[]) {
      // is_active=false のタグはスキップ
      if (!row.is_active) {
        continue;
      }

      // ローカライズデータがない場合はスキップ
      if (row.tag_localizations.length === 0) {
        continue;
      }

      const localization = row.tag_localizations[0];

      const entry: TagEntry = {
        id: row.id,
        canonicalValue: row.canonical_value,
        localizedValue: localization.localized_value,
        aliases: localization.aliases ?? [],
      };

      // カテゴリに応じて追加
      if (row.category in dictionary) {
        dictionary[row.category].push(entry);
      }
    }

    return dictionary;
  }

  /**
   * タグを正規化（同義語→正規値）
   */
  async normalize(category: TagCategory, rawTag: string, lang = "en"): Promise<string | null> {
    // 空値チェック
    if (!rawTag || rawTag.trim() === "") {
      return null;
    }

    const dictionary = await this.getDictionary(lang);
    const entries = dictionary[category];

    // 入力を正規化（トリム + 小文字化）
    const normalized = rawTag.toLowerCase().trim();

    for (const entry of entries) {
      // ローカライズ値でマッチ
      if (entry.localizedValue.toLowerCase() === normalized) {
        return entry.canonicalValue;
      }

      // 正規値でマッチ
      if (entry.canonicalValue.toLowerCase() === normalized) {
        return entry.canonicalValue;
      }

      // 同義語でマッチ
      if (entry.aliases.some((alias) => alias.toLowerCase() === normalized)) {
        return entry.canonicalValue;
      }
    }

    // マッチしない場合は警告ログを出力
    console.warn(`⚠️ 未知のタグ: ${category}/${rawTag}`);
    return null;
  }

  /**
   * プロンプト用の選択肢文字列を生成
   */
  async generatePromptChoices(lang = "en"): Promise<string> {
    const dictionary = await this.getDictionary(lang);

    const objectClassChoices = dictionary.object_class.map((t) => t.localizedValue).join(" | ");
    const genreChoices = dictionary.genre.map((t) => t.localizedValue).join(" | ");
    const themeChoices = dictionary.theme.map((t) => t.localizedValue).join(" | ");
    const formatChoices = dictionary.format.map((t) => t.localizedValue).join(" | ");

    return `You must select tags from the following options only:

object_class (choose ONE):
${objectClassChoices || "(no options)"}

genre (choose 1-3):
${genreChoices || "(no options)"}

theme (choose 1-5):
${themeChoices || "(no options)"}

format (choose ONE):
${formatChoices || "(no options)"}`;
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
  }
}
