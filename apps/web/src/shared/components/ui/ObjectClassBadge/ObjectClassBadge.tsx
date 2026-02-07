import { cn } from "@/shared/lib/utils";

/** 定義済みのオブジェクトクラス */
export type KnownObjectClass =
  | "Safe"
  | "Euclid"
  | "Keter"
  | "Thaumiel"
  | "Neutralized"
  | "Apollyon"
  | "Archon";

/** オブジェクトクラスごとの背景色 */
const OBJECT_CLASS_COLORS: Record<KnownObjectClass, string> = {
  Safe: "#10B981",
  Euclid: "#F59E0B",
  Keter: "#EF4444",
  Thaumiel: "#6366F1",
  Neutralized: "#6B7280",
  Apollyon: "#DC2626",
  Archon: "#8B5CF6",
};

/** 未定義クラスのデフォルト色 */
const UNKNOWN_COLOR = "#9CA3AF";

export interface ObjectClassBadgeProps {
  /** オブジェクトクラス（KnownObjectClass以外の文字列も受け入れる） */
  variant: string;
  /** カスタムコンテンツ（指定しない場合はvariant名を表示） */
  children?: React.ReactNode;
  /** 追加のCSSクラス */
  className?: string;
}

/**
 * 指定されたvariantがKnownObjectClassかどうかを判定
 */
function isKnownObjectClass(variant: string): variant is KnownObjectClass {
  return variant in OBJECT_CLASS_COLORS;
}

/**
 * variantに対応する背景色を取得
 */
function getBackgroundColor(variant: string): string {
  if (isKnownObjectClass(variant)) {
    return OBJECT_CLASS_COLORS[variant];
  }
  return UNKNOWN_COLOR;
}

/**
 * SCPオブジェクトクラスを表示するバッジコンポーネント
 *
 * @example
 * <ObjectClassBadge variant="Safe" />
 * <ObjectClassBadge variant="Keter">危険</ObjectClassBadge>
 * <ObjectClassBadge variant="Unknown" /> // 未定義クラスはグレー表示
 */
export function ObjectClassBadge({ variant, children, className }: ObjectClassBadgeProps) {
  const backgroundColor = getBackgroundColor(variant);

  return (
    <span
      className={cn("inline-block", className)}
      style={{
        backgroundColor,
        color: "#FFFFFF",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "12px",
        fontWeight: 500,
      }}
    >
      {children ?? variant}
    </span>
  );
}
