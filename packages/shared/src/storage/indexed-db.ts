/**
 * @file IndexedDB実装
 * @description PreferenceStorageインターフェースのIndexedDB実装
 * @see specs/004-recommend/004-01-recommend-foundation/004-01-02.md
 */

import type {
  PreferenceStorage,
  PreferenceProfile,
  ViewHistory,
  Feedback,
  RecommendationLog,
} from "./types";

const DB_NAME = "scp-recommend";
const DB_VERSION = 1;

const STORE_NAMES = {
  preferences: "preferences",
  viewHistory: "viewHistory",
  feedback: "feedback",
  recommendationLog: "recommendationLog",
} as const;

/**
 * IndexedDB実装のPreferenceStorage
 *
 * ブラウザのIndexedDBを使用して嗜好データを永続化する。
 */
export class IndexedDBStorage implements PreferenceStorage {
  private db: IDBDatabase | null = null;

  /**
   * データベースを初期化
   *
   * @throws IndexedDBが利用不可能な場合
   */
  async initialize(): Promise<void> {
    if (typeof indexedDB === "undefined") {
      throw new Error("IndexedDB is not available in this environment");
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // preferences ストア
        if (!db.objectStoreNames.contains(STORE_NAMES.preferences)) {
          db.createObjectStore(STORE_NAMES.preferences, { keyPath: "visitorId" });
        }

        // viewHistory ストア
        if (!db.objectStoreNames.contains(STORE_NAMES.viewHistory)) {
          const viewHistoryStore = db.createObjectStore(STORE_NAMES.viewHistory, {
            keyPath: "id",
          });
          viewHistoryStore.createIndex("byVisitor", "visitorId", { unique: false });
          viewHistoryStore.createIndex("byArticle", "articleId", { unique: false });
          viewHistoryStore.createIndex("byDate", "viewedAt", { unique: false });
        }

        // feedback ストア
        if (!db.objectStoreNames.contains(STORE_NAMES.feedback)) {
          const feedbackStore = db.createObjectStore(STORE_NAMES.feedback, {
            keyPath: "id",
          });
          feedbackStore.createIndex("byVisitor", "visitorId", { unique: false });
          feedbackStore.createIndex("byType", "type", { unique: false });
        }

        // recommendationLog ストア
        if (!db.objectStoreNames.contains(STORE_NAMES.recommendationLog)) {
          const recLogStore = db.createObjectStore(STORE_NAMES.recommendationLog, {
            keyPath: "id",
          });
          recLogStore.createIndex("byVisitor", "visitorId", { unique: false });
          recLogStore.createIndex("byDate", "recommendedAt", { unique: false });
        }
      };
    });
  }

  /**
   * データベース接続を閉じる
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * オブジェクトストア名一覧を取得（テスト用）
   */
  getStoreNames(): string[] {
    if (!this.db) {
      return [];
    }
    return Array.from(this.db.objectStoreNames);
  }

  /**
   * 指定ストアのインデックス名一覧を取得（テスト用）
   */
  getIndexNames(storeName: string): string[] {
    if (!this.db) {
      return [];
    }
    const tx = this.db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    return Array.from(store.indexNames);
  }

  /**
   * 嗜好プロファイルを取得
   */
  async getProfile(visitorId: string): Promise<PreferenceProfile | null> {
    return this.withStore(STORE_NAMES.preferences, "readonly", (store) => {
      return new Promise((resolve, reject) => {
        const request = store.get(visitorId);
        request.onsuccess = () => {
          resolve(request.result ?? null);
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    });
  }

  /**
   * 嗜好プロファイルを保存
   */
  async saveProfile(profile: PreferenceProfile): Promise<void> {
    return this.withStore(STORE_NAMES.preferences, "readwrite", (store) => {
      return new Promise((resolve, reject) => {
        const request = store.put(profile);
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    });
  }

  /**
   * 閲覧履歴を取得
   */
  async getViewHistory(visitorId: string, limit?: number): Promise<ViewHistory[]> {
    return this.withStore(STORE_NAMES.viewHistory, "readonly", (store) => {
      return new Promise((resolve, reject) => {
        const index = store.index("byVisitor");
        const request = index.getAll(visitorId);

        request.onsuccess = () => {
          const results = request.result as ViewHistory[];
          // viewedAtで降順ソート（最新が先）
          results.sort((a, b) => b.viewedAt.localeCompare(a.viewedAt));

          if (limit !== undefined && limit > 0) {
            resolve(results.slice(0, limit));
          } else {
            resolve(results);
          }
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    });
  }

  /**
   * 閲覧履歴を追加
   */
  async addViewHistory(history: ViewHistory): Promise<void> {
    return this.withStore(STORE_NAMES.viewHistory, "readwrite", (store) => {
      return new Promise((resolve, reject) => {
        const request = store.add(history);
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    });
  }

  /**
   * フィードバック一覧を取得
   */
  async getFeedback(visitorId: string): Promise<Feedback[]> {
    return this.withStore(STORE_NAMES.feedback, "readonly", (store) => {
      return new Promise((resolve, reject) => {
        const index = store.index("byVisitor");
        const request = index.getAll(visitorId);
        request.onsuccess = () => {
          resolve(request.result ?? []);
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    });
  }

  /**
   * 特定記事へのフィードバックを取得
   */
  async getFeedbackByArticle(visitorId: string, articleId: string): Promise<Feedback | null> {
    const feedbackId = `${visitorId}_${articleId}`;
    return this.withStore(STORE_NAMES.feedback, "readonly", (store) => {
      return new Promise((resolve, reject) => {
        const request = store.get(feedbackId);
        request.onsuccess = () => {
          resolve(request.result ?? null);
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    });
  }

  /**
   * フィードバックを追加（同じ記事への既存フィードバックは上書き）
   */
  async addFeedback(feedback: Feedback): Promise<void> {
    return this.withStore(STORE_NAMES.feedback, "readwrite", (store) => {
      return new Promise((resolve, reject) => {
        // putを使用して上書きを許可
        const request = store.put(feedback);
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    });
  }

  /**
   * 推薦ログを取得
   */
  async getRecommendationLog(visitorId: string, limit?: number): Promise<RecommendationLog[]> {
    return this.withStore(STORE_NAMES.recommendationLog, "readonly", (store) => {
      return new Promise((resolve, reject) => {
        const index = store.index("byVisitor");
        const request = index.getAll(visitorId);

        request.onsuccess = () => {
          const results = request.result as RecommendationLog[];
          // recommendedAtで降順ソート（最新が先）
          results.sort((a, b) => b.recommendedAt.localeCompare(a.recommendedAt));

          if (limit !== undefined && limit > 0) {
            resolve(results.slice(0, limit));
          } else {
            resolve(results);
          }
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    });
  }

  /**
   * 推薦ログを追加
   */
  async addRecommendationLog(log: RecommendationLog): Promise<void> {
    return this.withStore(STORE_NAMES.recommendationLog, "readwrite", (store) => {
      return new Promise((resolve, reject) => {
        const request = store.add(log);
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    });
  }

  /**
   * Dislike済み記事IDを取得
   */
  async getDislikedArticleIds(visitorId: string): Promise<string[]> {
    const feedbacks = await this.getFeedback(visitorId);
    return feedbacks.filter((f) => f.type === "dislike").map((f) => f.articleId);
  }

  /**
   * 記事のタグ情報を取得
   *
   * 現時点ではクライアント側に記事タグのキャッシュを持たないため、
   * 常にnullを返す。記事タグはサーバー（Supabase）から取得する前提。
   * 将来的にオフライン対応が必要な場合はキャッシュ機能を追加する。
   */
  async getArticleTags(_articleId: string): Promise<string[] | null> {
    // TODO: 将来的にarticleTagsストアを追加してキャッシュ対応
    return null;
  }

  /**
   * オブジェクトストアを使用した操作のヘルパー
   */
  private async withStore<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => Promise<T>
  ): Promise<T> {
    if (!this.db) {
      throw new Error("Database not initialized. Call initialize() first.");
    }
    const tx = this.db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    return operation(store);
  }
}
