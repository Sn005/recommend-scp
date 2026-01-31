"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";
import { DrawerContext, type DrawerContextValue } from "./DrawerContext";

interface DrawerProviderProps {
  children: ReactNode;
}

export const DrawerProvider = ({ children }: DrawerProviderProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // setIsOpen は React が保証する安定参照なので依存配列から省略可能
  const open = useCallback(() => {
    setIsOpen(true);
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
  }, []);
  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const value: DrawerContextValue = useMemo(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle]
  );

  return (
    <DrawerContext.Provider value={value}>
      <div data-testid="drawer-provider">{children}</div>
    </DrawerContext.Provider>
  );
};
