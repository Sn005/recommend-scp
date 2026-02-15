"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DRAG_THRESHOLD = 5;
const STORAGE_KEY = "menu-button-position";

interface Position {
  readonly x: number;
  readonly y: number;
}

interface DragState {
  readonly startX: number;
  readonly startY: number;
  readonly startPosX: number;
  readonly startPosY: number;
  readonly isDragging: boolean;
}

const loadPosition = (defaultPos: Position): Position => {
  if (typeof window === "undefined") return defaultPos;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultPos;
    const parsed = JSON.parse(stored) as Position;
    return clampPosition(parsed.x, parsed.y);
  } catch {
    return defaultPos;
  }
};

const savePosition = (pos: Position): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    // localStorage unavailable
  }
};

const clampPosition = (x: number, y: number): Position => {
  if (typeof window === "undefined") return { x, y };
  const maxX = window.innerWidth - 48;
  const maxY = window.innerHeight - 48;
  return {
    x: Math.max(0, Math.min(x, maxX)),
    y: Math.max(0, Math.min(y, maxY)),
  };
};

const getDefaultPosition = (): Position => {
  if (typeof window === "undefined") return { x: 0, y: 16 };
  return { x: window.innerWidth - 56, y: 16 };
};

export const useDraggable = () => {
  const [position, setPosition] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const wasDraggedRef = useRef(false);

  // Initialize position on mount and handle resize
  useEffect(() => {
    setPosition(loadPosition(getDefaultPosition()));

    const handleResize = () => {
      setPosition((prev) => (prev ? clampPosition(prev.x, prev.y) : null));
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!position) return;
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startPosX: position.x,
        startPosY: position.y,
        isDragging: false,
      };
      wasDraggedRef.current = false;
      const el = e.currentTarget as HTMLElement;
      if (typeof el.setPointerCapture === "function") {
        el.setPointerCapture(e.pointerId);
      }
    },
    [position]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;

    const deltaX = e.clientX - drag.startX;
    const deltaY = e.clientY - drag.startY;

    if (
      !drag.isDragging &&
      Math.abs(deltaX) < DRAG_THRESHOLD &&
      Math.abs(deltaY) < DRAG_THRESHOLD
    ) {
      return;
    }

    dragRef.current = { ...drag, isDragging: true };
    setIsDragging(true);
    wasDraggedRef.current = true;

    const newPos = clampPosition(drag.startPosX + deltaX, drag.startPosY + deltaY);
    setPosition(newPos);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (dragRef.current?.isDragging) {
      setPosition((prev) => {
        savePosition(prev);
        return prev;
      });
    }
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  return {
    position,
    isDragging,
    wasDragged: wasDraggedRef,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
    },
  };
};
