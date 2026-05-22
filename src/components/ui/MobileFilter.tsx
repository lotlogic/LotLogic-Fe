import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  Car,
  Filter,
} from "lucide-react";
import React from "react";

interface FilterOption {
  id: string;
  label: string;
  value: string | number;
}

interface FilterCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  options: FilterOption[];
}

interface MobileFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  title?: string;
  categories: FilterCategory[];
  selectedFilters: Record<string, (string | number)[]>;
  onFilterChange: (categoryId: string, values: (string | number)[]) => void;
  onApplyFilters: () => void;
  className?: string;
}

export const MobileFilter = ({
  isOpen,
  onClose,
  onBack,
  title = "Build A House",
  categories,
  selectedFilters,
  onFilterChange,
  onApplyFilters,
  className = "",
}: MobileFilterProps) => {
  // const { isMobile } = useResponsive();

  const handleOptionToggle = (categoryId: string, value: string | number) => {
    const currentValues = selectedFilters[categoryId] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];

    onFilterChange(categoryId, newValues);
  };

  const isOptionSelected = (categoryId: string, value: string | number) => {
    return (selectedFilters[categoryId] || []).includes(value);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`
      fixed inset-0 z-50 bg-white flex flex-col
      ${className}
    `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors touch-target"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
          )}
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors touch-target"
          aria-label="Close"
        >
          <Filter className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Filter Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category.id} className="space-y-3">
              {/* Category Header */}
              <div className="flex items-center gap-2">
                <category.icon className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  {category.label}
                </h2>
              </div>

              {/* Filter Options */}
              <div className="space-y-2">
                {category.options.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer touch-target"
                  >
                    <input
                      type="checkbox"
                      checked={isOptionSelected(category.id, option.value)}
                      onChange={() =>
                        handleOptionToggle(category.id, option.value)
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onApplyFilters}
          className="w-full bg-gray-800 text-white text-lg font-medium py-3 px-4 rounded-lg hover:bg-gray-900 transition-colors touch-target"
        >
          Show My House
        </button>
      </div>
    </div>
  );
};

export default MobileFilter;

// Predefined filter categories for house designs
export const HOUSE_DESIGN_FILTERS: FilterCategory[] = [
  {
    id: "bedroom",
    label: "Bedroom",
    icon: BedDouble,
    options: [
      { id: "bed-3", label: "3 bedroom", value: 3 },
      { id: "bed-4", label: "4 bedroom", value: 4 },
      { id: "bed-5", label: "5 bedroom", value: 5 },
    ],
  },
  {
    id: "bathroom",
    label: "Bathroom",
    icon: Bath,
    options: [
      { id: "bath-1", label: "1 bathroom", value: 1 },
      { id: "bath-2", label: "2 bathroom", value: 2 },
      { id: "bath-3", label: "3 bathroom", value: 3 },
    ],
  },
  {
    id: "car",
    label: "Cars",
    icon: Car,
    options: [
      { id: "car-1", label: "1 car", value: 1 },
      { id: "car-2", label: "2 car", value: 2 },
      { id: "car-3", label: "3 car", value: 3 },
    ],
  },
  {
    id: "features",
    label: "Additional Features",
    icon: Building2,
    options: [
      { id: "rumpus", label: "Rumpus", value: "rumpus" },
      { id: "alfresco", label: "Alfresco", value: "alfresco" },
      { id: "pergola", label: "Pergola", value: "pergola" },
    ],
  },
];
