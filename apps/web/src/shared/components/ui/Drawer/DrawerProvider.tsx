"use client";

import { useState, useMemo, type ReactNode } from "react";
import { DrawerContext, type DrawerContextValue } from "./DrawerContext";

interface DrawerProviderProps {
  children: ReactNode;
}

export const DrawerProvider = ({ children }: DrawerProviderProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const value: DrawerContextValue = useMemo(
    () => ({
      isOpen,
      open: () => {
        setIsOpen(true);
      },
      close: () => {
        setIsOpen(false);
      },
      toggle: () => {
        setIsOpen((prev) => !prev);
      },
    }),
    [isOpen]
  );

  return (
    <DrawerContext.Provider value={value}>
      <div data-testid="drawer-provider">{children}</div>
    </DrawerContext.Provider>
  );
};
