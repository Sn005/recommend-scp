/**
 * @file pgvectorフィールドのパースユーティリティ
 * @description Supabase JS クライアントがpgvector型を文字列として返す場合に対応
 *
 * SupabaseのバージョンやPostgRESTの設定によって、pgvector型カラムは
 * number[] ではなく文字列 "[0.1,0.2,...]" として返されることがある。
 * このユーティリティは両方のケースに対応する。
 */

/**
 * pgvectorフィールドの値をnumber[]にパースする
 *
 * @param value - DBから返された値（number[] | string | null | undefined）
 * @returns パースされたnumber[]、またはnull
 */
export function parseVectorField(value: unknown): number[] | null {
  if (value === null || value === undefined) return null;

  // 既にnumber[]の場合はそのまま返す
  if (Array.isArray(value)) return value as number[];

  // 文字列の場合はJSONとしてパースする
  // pgvectorの文字列表現は "[0.1,0.2,...]" でJSON互換
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as number[];
    } catch {
      return null;
    }
  }

  return null;
}
