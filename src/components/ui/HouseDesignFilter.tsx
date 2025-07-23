import React from "react";
import { BedDouble, Bath, Car, Building2, RotateCcw } from "lucide-react"; 
import { Slider } from "./slider";
import { Button } from "./Button";
import { FilterRowProps, FilterSectionProps } from "@/types/houseDesign";
import { FILTER_CONFIGS, INITIAL_FILTER_RANGES } from "@/constants/houseDesigns";
import { useContent } from "@/hooks/useContent";

const FilterRow = React.memo(({
  icon,
  label,
  value,
  setValue,
  minRange,
  maxRange,
}: FilterRowProps) => {
  return (
    <div className="mb-8">
      <div className="flex items-center mb-2">
        {React.isValidElement(icon) ? React.cloneElement(icon) : icon}
        <span className="ml-2 text-base font-semibold text-gray-800">{label}</span>
      </div>
      <div className="flex items-center">
        <RangeValueDisplay value={value[0]} />
        <div className="flex-1 px-4"> 
          <Slider
            min={minRange}
            max={maxRange}
            step={1}
            value={value}
            onValueChange={(v: number[]) => setValue([v[0], v[1]])}
            className="w-full"
          />
        </div>
        <RangeValueDisplay value={value[1]} />
      </div>
    </div>
  );
});

FilterRow.displayName = 'FilterRow';

const RangeValueDisplay = React.memo(({ value }: { value: number }) => (
  <div className="w-14 h-12 flex items-center justify-center border border-gray-200 rounded-lg text-lg font-medium bg-white text-gray-700">
    {value}
  </div>
));

RangeValueDisplay.displayName = 'RangeValueDisplay';



export const FilterSectionWithSingleLineSliders = React.memo(({
  bedroom,
  setBedroom,
  bathroom,
  setBathroom,
  cars,
  setCars,
  storeys,
  setStoreys,
  onShowHouseDesign,
}: FilterSectionProps) => {

  const { filter } = useContent();

  const stateMap = {
    bedroom: { value: bedroom, setValue: setBedroom },
    bathroom: { value: bathroom, setValue: setBathroom },
    cars: { value: cars, setValue: setCars },
    storeys: { value: storeys, setValue: setStoreys },
  };

  const handleReset = () => {
    setBedroom(INITIAL_FILTER_RANGES.bedroom);
    setBathroom(INITIAL_FILTER_RANGES.bathroom);
    setCars(INITIAL_FILTER_RANGES.cars);
    setStoreys(INITIAL_FILTER_RANGES.storeys);
  };

  return (
    <div className="flex flex-col h-full px-6"> {/* Added px-6 here */}
      {/* Sticky Header with "Filters" title and "Reset" button */}
      <div className="sticky top-0 z-10 bg-white pt-6 pb-4 border-b border-gray-100 flex justify-between items-center">
        <span className="text-xl font-bold text-gray-900">{filter.title}</span>
        <Button
          variant="ghost"
          onClick={handleReset}
          className="text-sm text-[#2F5D62] hover:bg-gray-100 font-medium p-2 rounded-md flex items-center gap-1"
        >
          <RotateCcw className="h-4 w-4" />
          {filter.reset}
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-grow overflow-y-auto py-6"> {/* Adjusted padding here to align with content */}
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
              setValue={stateMap[key].setValue}
              minRange={1}
              maxRange={5}
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