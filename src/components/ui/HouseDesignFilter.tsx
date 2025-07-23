import React from "react";
import { BedDouble, Bath, Car, Building2, RotateCcw } from "lucide-react"; 
import { Checkbox } from "./checkbox";
import { Button } from "./Button";
import { FilterRowProps, FilterSectionProps } from "@/types/houseDesign";
import { FILTER_CONFIGS, INITIAL_FILTER_RANGES } from "@/constants/houseDesigns";

const FilterRow = React.memo(({
  icon,
  label,
  value,
}: FilterRowProps) => {
  return (
    <div className="mb-8 border-b border-gray-200 fix pb-4 overflow-hidden">
      <div className="flex items-center mb-2">
        {React.isValidElement(icon) ? React.cloneElement(icon) : icon}
        <span className="ml-2 text-base font-semibold text-gray-800">{label}</span>
      </div>
      <div className="flex items-center">
        <div className="flex gap-8">
          {value.map((v, index) => (
            <div key={index} className="flex items-center space-x-2">
              <Checkbox id={`checkbox-${index}`} />
              <label
                htmlFor={`checkbox-${index}`}
                className="text-sm font-sm"
              >
                {v} {label.toLowerCase()}
              </label>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
});

FilterRow.displayName = 'FilterRow';


export const FilterSectionWithSingleLineSliders = React.memo(({
  bedroom,
  setBedroom,
  bathroom,
  setBathroom,
  cars,
  setCars,
  onShowHouseDesign,
}: FilterSectionProps) => {



  const stateMap = {
    bedroom: { value: bedroom, setValue: setBedroom },
    bathroom: { value: bathroom, setValue: setBathroom },
    cars: { value: cars, setValue: setCars },
  };

  return (
    <div className="flex flex-col h-full px-6"> {/* Added px-6 here */}

      {/* Scrollable Content */}
      <div className="flex-grow overflow-y-auto py-6 "> {/* Adjusted padding here to align with content */}
        {FILTER_CONFIGS.map(({ icon, label, key }) => {
          const IconComponent = {
            'BedDouble': BedDouble,
            'Bath': Bath,
            'Car': Car,
            'Building2': Building2,
          }[icon];
          
          return (
            <FilterRow
              key={key}
              icon={<IconComponent />}
              label={label}
              value={stateMap[key].value}
            />
          );
        })}
      </div>

      {/* Sticky Footer with "Show House Design" button */}
      <div className="sticky bottom-0 bg-white pt-4 border-t border-gray-100 pb-6">
        <Button
          className="w-full bg-[#2F5D62] text-white text-lg py-3 rounded-lg font-medium"
          onClick={onShowHouseDesign}
        >
          Show House Design
        </Button>
      </div>
    </div>
  );
});

FilterSectionWithSingleLineSliders.displayName = 'FilterSectionWithSingleLineSliders';