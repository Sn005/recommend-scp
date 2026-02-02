export type IconName = "menu" | "heart" | "heart-filled" | "chevron-right" | "clock" | "bookmark";

export const iconPaths: Record<IconName, string> = {
  menu: "M4 6h16M4 12h16M4 18h16",
  heart:
    "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  "heart-filled":
    "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  "chevron-right": "M9 5l7 7-7 7",
  clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  bookmark: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z",
};

export const filledIcons: IconName[] = ["heart-filled"];
