import { ArrowLeft, Bath, BedDouble, Car } from "lucide-react";

interface MobileBuildHouseFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  selectedFilters: Record<string, (string | number)[]>;
  onFilterChange: (categoryId: string, values: (string | number)[]) => void;
  onApplyFilters: () => void;
  className?: string;
}

export const MobileBuildHouseFilter = ({
  isOpen,
  onClose,
  onBack,
  selectedFilters,
  onFilterChange,
  onApplyFilters,
  className = "",
}: MobileBuildHouseFilterProps) => {
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
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
          )}
          <h1 className="text-xl font-bold text-gray-900">Build A House</h1>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <span className="text-gray-600 text-xl">×</span>
        </button>
      </div>

      {/* Filter Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {/* Bedroom Filter */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BedDouble className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Bedroom</h2>
            </div>
            <div className="space-y-2">
              {[
                { id: "bed-3", label: "3 bedroom", value: 3 },
                { id: "bed-4", label: "4 bedroom", value: 4 },
              ].map((option) => (
                <label
                  key={option.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isOptionSelected("bedroom", option.value)}
                    onChange={() => handleOptionToggle("bedroom", option.value)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Bathroom Filter */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Bath className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Bathroom</h2>
            </div>
            <div className="space-y-2">
              {[
                { id: "bath-1", label: "1 bathroom", value: 1 },
                { id: "bath-2", label: "2 bathroom", value: 2 },
                { id: "bath-3", label: "3 bathroom", value: 3 },
              ].map((option) => (
                <label
                  key={option.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isOptionSelected("bathroom", option.value)}
                    onChange={() =>
                      handleOptionToggle("bathroom", option.value)
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

          {/* Car Filter */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Cars</h2>
            </div>
            <div className="space-y-2">
              {[
                { id: "car-1", label: "1 car", value: 1 },
                { id: "car-2", label: "2 car", value: 2 },
                { id: "car-3", label: "3 car", value: 3 },
              ].map((option) => (
                <label
                  key={option.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isOptionSelected("car", option.value)}
                    onChange={() => handleOptionToggle("car", option.value)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Features Filter */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Additional Features
            </h2>
            <div className="space-y-2">
              {[
                { id: "rumpus", label: "Rumpus", value: "rumpus" },
                { id: "alfresco", label: "Alfresco", value: "alfresco" },
                { id: "pergola", label: "Pergola", value: "pergola" },
              ].map((option) => (
                <label
                  key={option.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isOptionSelected("features", option.value)}
                    onChange={() =>
                      handleOptionToggle("features", option.value)
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
        </div>
      </div>

      {/* Action Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onApplyFilters}
          className="w-full bg-gray-800 text-white text-lg font-medium py-3 px-4 rounded-lg hover:bg-gray-900 transition-colors"
        >
          Show My House
        </button>
      </div>
    </div>
  );
};

export default MobileBuildHouseFilter;
