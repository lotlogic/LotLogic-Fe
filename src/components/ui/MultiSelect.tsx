import { colors } from "@/constants/content";
import type { MultiSelectProps } from "@/types/ui";
import { ChevronDown, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

export const MultiSelect = ({
  options,
  selectedOptions,
  onSelectionChange,
  placeholder = "Choose options",
  label,
  className = "",
}: MultiSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOptionToggle = (optionId: string) => {
    const newSelection = selectedOptions.includes(optionId)
      ? selectedOptions.filter((id) => id !== optionId)
      : [...selectedOptions, optionId];
    onSelectionChange(newSelection);
  };

  const selectedOptionsData = options.filter((option) =>
    selectedOptions.includes(option.id)
  );
  const displayText =
    selectedOptions.length > 0
      ? `${selectedOptions.length} Builders Selected`
      : placeholder;

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-brand mb-1">
          {label}
        </label>
      )}

      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent appearance-none bg-brand pr-8 text-left ${
            isOpen ? "border-brand-primary" : "border-brand"
          } ${selectedOptions.length > 0 ? "text-brand" : "text-brand-muted"}`}
        >
          {displayText}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-brand-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-brand-muted" />
            )}
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full top-0 mt-12 bg-brand border border-brand rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {options.map((option) => (
              <div
                key={option.id}
                className="flex items-center px-3 py-2 hover:bg-brand-muted cursor-pointer"
                onClick={() => handleOptionToggle(option.id)}
              >
                {/* Logo/Icon */}
                <div className="flex-shrink-0 mr-3">
                  {option.logo ? (
                    <img
                      src={option.logo}
                      alt={`${option.label} logo`}
                      width={24}
                      height={24}
                      className="rounded-full object-cover"
                    />
                  ) : option.logoText ? (
                    <div className="w-6 h-6 rounded-full bg-brand-muted flex items-center justify-center text-xs font-bold text-brand">
                      {option.logoText}
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-brand-muted flex items-center justify-center text-xs font-bold text-brand">
                      {option.label.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Label */}
                <span className="flex-1 text-sm text-brand">
                  {option.label}
                </span>

                {/* Checkbox */}
                <div className="flex-shrink-0 ml-2">
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(option.id)}
                    onChange={() => handleOptionToggle(option.id)}
                    className="w-4 h-4 border-brand rounded focus:ring-2 focus:ring-[var(--color-primary)]"
                    style={
                      {
                        "--tw-ring-color": colors.primary,
                        color: colors.primary,
                      } as React.CSSProperties
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selected Chips */}
        {selectedOptionsData.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedOptionsData.map((option) => (
              <div
                key={option.id}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm text-white"
                style={{
                  backgroundColor: colors.primary,
                }}
              >
                <span>{option.label}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOptionToggle(option.id);
                  }}
                  className="hover:bg-black/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSelect;
