import { ChevronUp, ChevronDown } from "lucide-react";
import { CollapsibleSectionProps } from "@/types/lot";
import React from "react";

export function CollapsibleSection({ title, children, initialOpen = true }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(initialOpen);
  return (
    <div className="border-b border-gray-100 py-4 mx-6">
      <button
        className="flex justify-between items-center w-full focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-base font-semibold text-gray-800">{title}</span>
        {isOpen ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
      </button>
      {isOpen && <div className="mt-2 text-sm text-gray-700">{children}</div>}
    </div>
  );
} 