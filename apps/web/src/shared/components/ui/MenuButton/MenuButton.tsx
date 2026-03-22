"use client";

import { useDrawer } from "@/shared/components/ui/Drawer";
import { Icon } from "@/shared/components/ui/Icon";
import { useDraggable } from "./useDraggable";

export const MenuButton = () => {
  const { toggle } = useDrawer();
  const { position, isDragging, wasDragged, handlers } = useDraggable();

  const handleClick = () => {
    if (wasDragged.current) {
      wasDragged.current = false;
      return;
    }
    toggle();
  };

  const positionStyle: React.CSSProperties = position
    ? {
        left: `${String(position.x)}px`,
        top: `${String(position.y)}px`,
      }
    : {
        right: "16px",
        top: "16px",
      };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="メニューを開く"
      className="fixed z-nav w-10 h-10 rounded-full
                 bg-white/80 backdrop-blur-md shadow-menu-button
                 flex items-center justify-center
                 active:scale-95 select-none md:hidden"
      style={{
        ...positionStyle,
        cursor: isDragging ? "grabbing" : "grab",
        transition: isDragging ? "none" : "box-shadow 0.2s ease",
        touchAction: "none",
      }}
      {...handlers}
    >
      <Icon name="menu" size={20} className="text-gray-600 pointer-events-none" />
    </button>
  );
};
