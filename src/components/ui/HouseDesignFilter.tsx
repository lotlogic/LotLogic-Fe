import React from "react";
import { BedDouble, Bath, Car, Building2 } from "lucide-react"; 
import { Checkbox } from "./checkbox";
import { Button } from "./Button";
import { FilterSectionProps, FilterRowProps } from "@/types/houseDesign";
import { Input } from "./input";
import { DesignRowProps, FilterRowProps, FilterSectionProps, HouseSizeInputRowProps } from "@/types/houseDesign";
import { FILTER_CONFIGS, INITIAL_FILTER_RANGES } from "@/constants/houseDesigns";

const FilterRow = React.memo(({
  icon,
  label,
  value,
  setValue,
  initial,
  showErrors,
  designErrors = {}
}: FilterRowProps) => {
  return (
    <div className="mb-8 border-b border-gray-200 fix pb-4">
      <div className="flex items-center justify-between mb-2 w-full">
        <div className="flex items-center">
          {React.isValidElement(icon) ? React.cloneElement(icon) : icon}
          <span className="ml-2 text-base font-semibold text-gray-800">{label}</span>
        </div>

        {showErrors && designErrors[initial as keyof typeof designErrors] && (
          <p className="text-sm text-red-600">{designErrors[initial as keyof typeof designErrors]}</p>
        )}
      </div>
      <div className="flex items-center">
        <div className="flex gap-8 flex-wrap">  
          {INITIAL_FILTER_RANGES[initial as keyof typeof INITIAL_FILTER_RANGES].map((v: number, index:number) => (
            <div key={index} className="flex items-center space-x-2">
              <Checkbox
                id={`checkbox-${index}`}
                checked={value.includes(v)}
                onCheckedChange={(checked) => {
                  checked
                    ? !value.includes(v)
                      ? setValue([...value, v])
                      : setValue([...value])
                    : setValue(value.filter(item => item !== v))
                }}
              />
              <label
                htmlFor={`checkbox-${index}`}
                className="text-sm font-sm"
              >
                {v} {initial}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

FilterRow.displayName = 'FilterRow';

const DesignRow = React.memo(({
  rumpus = false,
  alfresco = false,
  pergola = false,
  onChange
}: DesignRowProps) => {
  return (
    <div className="mb-8 border-b border-gray-200 fix pb-4">
      <div className="flex items-center">
        <div className="flex gap-8">  
          <div className="flex items-center space-x-3">
            <Checkbox
              id="checkbox-rumpus"
              checked={rumpus}
              onCheckedChange={(checked: boolean) => {
                onChange('rumpus', checked);
              }}
            />
            <label htmlFor="checkbox-rumpus" className="text-sm font-bold">
              Rumpus
            </label>

            <Checkbox
              id="checkbox-alfresco"
              checked={alfresco}
              onCheckedChange={(checked: boolean) => {
                onChange('alfresco', checked);
              }}
            />
            <label htmlFor="checkbox-alfresco" className="text-sm font-bold">
              Alfresco
            </label>

            <Checkbox
              id="checkbox-pergola"
              checked={pergola}
              onCheckedChange={(checked: boolean) => {
                onChange('pergola', checked);
              }}
            />
            <label htmlFor="checkbox-pergola" className="text-sm font-bold">
              Pergola
            </label>
          </div>
        </div>
      </div>
    </div>
  );
});

DesignRow.displayName = 'DesignRow';

const HouseSizeInputRow = React.memo(({
  min_size,
  setMinSize,
  max_size,
  setMaxSize,
  showErrors,
  sizeErrors = {},
}: HouseSizeInputRowProps) => {
  return (
    <div className="fix pb-4">
      <div className="flex items-center mb-2">
        <Building2 />
        <span className="ml-2 text-base font-semibold text-gray-800">Enter House Size</span>
      </div>

      <div className="flex items-center">
        <div className="flex gap-8">  
          <div className="flex flex-col space-y-1">
            <Input 
              type="text"
              value={isNaN(min_size) ? "" : min_size}
              placeholder="Min: 150m²"
              className={showErrors && sizeErrors.min_size ? "border-red-500" : ""}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setMinSize(isNaN(val) ? NaN : val);
              }}
            />
            {showErrors && sizeErrors.min_size && (
              <p className="text-sm text-red-600">{sizeErrors.min_size}</p>
            )}
          </div>

          <div className="flex flex-col space-y-1">
            <Input
              type="text"
              value={isNaN(max_size) ? "" : max_size}
              placeholder="Max: 300m²"
              className={showErrors && sizeErrors.max_size ? "border-red-500" : ""}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setMaxSize(isNaN(val) ? NaN : val);
              }}
            />
            {showErrors && sizeErrors.max_size && (
              <p className="text-sm text-red-600">{sizeErrors.max_size}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});


HouseSizeInputRow.displayName = 'HouseSizeInputRow';


export const FilterSectionWithSingleLineSliders = React.memo(({
  bedroom,
  setBedroom,
  bathroom,
  setBathroom,
  car,
  setCar,
  design,
  setDesign,
  min_size,
  setMinSize,
  max_size,
  setMaxSize,
  onShowHouseDesign,
  showErrors,
  sizeErrors,
  designErrors
}: FilterSectionProps) => {

  const stateMap = {
    bedroom: { value: bedroom, setValue: setBedroom },
    bathroom: { value: bathroom, setValue: setBathroom },
    car: { value: car, setValue: setCar },
  };


  const handleChange = (key: keyof typeof design, value: boolean) => {
    setDesign(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col h-full px-6"> {/* Added px-6 here */}

      {/* Scrollable Content */}
      <div className="flex-grow overflow-y-auto py-6">
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
              value={stateMap[key].value}
              setValue={stateMap[key].setValue}
              label={label}
              initial={key}
              showErrors={showErrors}
              designErrors={designErrors}
            />
          );
        })}

        <DesignRow
          rumpus={design.rumpus}
          alfresco={design.alfresco}
          pergola={design.pergola}
          onChange={handleChange}
        />
        <HouseSizeInputRow 
          min_size={min_size}
          setMinSize={setMinSize}
          max_size={max_size}
          setMaxSize={setMaxSize}
          showErrors={showErrors}
          sizeErrors={sizeErrors}
        />
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
