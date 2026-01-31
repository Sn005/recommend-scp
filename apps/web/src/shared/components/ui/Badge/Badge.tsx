import { cn } from "@/shared/lib/utils";

export type ObjectClass = "Safe" | "Euclid" | "Keter" | "Thaumiel" | "Neutralized";

interface BadgeProps {
  variant: ObjectClass;
  children?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<ObjectClass, string> = {
  Safe: "bg-scp-safe",
  Euclid: "bg-scp-euclid",
  Keter: "bg-scp-keter",
  Thaumiel: "bg-scp-thaumiel",
  Neutralized: "bg-scp-neutralized",
};

export const Badge = ({ variant, children, className }: BadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white",
        variantStyles[variant],
        className
      )}
    >
      {children ?? variant}
    </span>
  );
};
