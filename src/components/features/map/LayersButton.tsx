import { colors } from "@/constants/content";
import type { LayersButtonProps } from "@/types/ui";
import { Layers } from "lucide-react";
import React from "react";

export const LayersButton = ({
  onClick,
  isActive = false,
}: LayersButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:border-transparent ${
        isActive ? "ring-2 border-current" : ""
      }`}
      style={
        {
          "--tw-ring-color": colors.primary,
          "--tw-border-opacity": isActive ? "1" : "0",
          borderColor: isActive ? colors.primary : undefined,
        } as React.CSSProperties
      }
      aria-label="Toggle layers"
    >
      <Layers className="w-5 h-5" />
    </button>
  );
};

export default LayersButton;
