"use client";

import { createContext } from "react";

export interface DrawerContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const DrawerContext = createContext<DrawerContextValue | null>(null);
