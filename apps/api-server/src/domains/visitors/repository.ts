/**
 * @file VisitorsRepository
 * @description visitorsテーブルのDB操作層
 * @see specs/005-backend-api/005-03-visitors-api/005-03-01.md
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Visitor } from "./types";

/** DB行の型（snake_case） */
interface VisitorRow {
  id: string;
  visitor_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * VisitorsRepository
 *
 * visitorsテーブルのCRUD操作を提供。
 * snake_case（DB）↔ camelCase（アプリ）の変換を行う。
 */
export class VisitorsRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * visitorIdで既存visitorを取得
   *
   * @param visitorId - クライアント生成UUID
   * @returns Visitor | null
   */
  findByVisitorId = async (visitorId: string): Promise<Visitor | null> => {
    const { data, error } = await this.supabase
      .from("visitors")
      .select("id, visitor_id, created_at, updated_at")
      .eq("visitor_id", visitorId)
      .single();

    // Not found (PGRST116)
    if (error?.code === "PGRST116") return null;
    if (error) throw error;

    return this.toVisitor(data as VisitorRow);
  };

  /**
   * 新規visitorを作成
   *
   * @param visitorId - クライアント生成UUID
   * @returns Visitor
   * @throws UNIQUE制約違反時などにエラー
   */
  create = async (visitorId: string): Promise<Visitor> => {
    const { data, error } = await this.supabase
      .from("visitors")
      .insert({ visitor_id: visitorId })
      .select("id, visitor_id, created_at, updated_at")
      .single();

    if (error) throw error;

    return this.toVisitor(data as VisitorRow);
  };

  /**
   * visitorIdの存在確認
   *
   * @param visitorId - クライアント生成UUID
   * @returns boolean
   */
  existsByVisitorId = async (visitorId: string): Promise<boolean> => {
    const { count, error } = await this.supabase
      .from("visitors")
      .select("*", { count: "exact", head: true })
      .eq("visitor_id", visitorId);

    if (error) throw error;

    return (count ?? 0) > 0;
  };

  // ============================================
  // Private: DB row → Domain model 変換
  // ============================================

  private toVisitor = (row: VisitorRow): Visitor => ({
    id: row.id,
    visitorId: row.visitor_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
