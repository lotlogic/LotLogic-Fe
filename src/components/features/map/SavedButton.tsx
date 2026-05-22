import type { SavedButtonProps } from "@/types/ui";
import { Bookmark } from "lucide-react";
export const SavedButton = ({
  onClick,
  isActive = false,
}: SavedButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 bg-white border border-brand rounded-lg shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent ${
        isActive ? "ring-2 ring-[var(--color-primary)] border-brand-primary" : ""
      }`}
      aria-label="View saved properties"
    >
      <Bookmark className="w-5 h-5" />
    </button>
  );
};

export default SavedButton;
