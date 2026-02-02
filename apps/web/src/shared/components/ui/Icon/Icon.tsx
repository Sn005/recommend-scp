import type { IconName } from "./icons";
import { filledIcons, iconPaths } from "./icons";

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  "aria-label"?: string;
}

export const Icon = ({ name, size = 24, className, "aria-label": ariaLabel }: IconProps) => {
  const path = iconPaths[name];
  const isFilled = filledIcons.includes(name);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className={className}
      role="img"
      focusable="false"
      {...(ariaLabel ? { "aria-label": ariaLabel } : { "aria-hidden": "true" as const })}
    >
      <path
        d={path}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        fill={isFilled ? "currentColor" : "none"}
      />
    </svg>
  );
};
