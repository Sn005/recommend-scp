export type IconName =
  | "menu"
  | "heart"
  | "heart-filled"
  | "chevron-left"
  | "chevron-right"
  | "clock"
  | "bookmark"
  | "file-text"
  | "x"
  | "alert-circle"
  | "refresh-cw"
  | "more-vertical";

export const iconPaths: Record<IconName, string> = {
  menu: "M4 6h16M4 12h16M4 18h16",
  heart:
    "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  "heart-filled":
    "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  "chevron-left": "M15 19l-7-7 7-7",
  "chevron-right": "M9 5l7 7-7 7",
  clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  bookmark: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z",
  "file-text":
    "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  x: "M6 18L18 6M6 6l12 12",
  "alert-circle": "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  "refresh-cw":
    "M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15",
  "more-vertical": "M12 5v.01M12 12v.01M12 19v.01",
};

export const filledIcons: IconName[] = ["heart-filled"];
