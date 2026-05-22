import {
  FILTER_CONFIGS,
  INITIAL_FILTER_RANGES,
} from "@/constants/houseDesigns";
import { trackFilterApplied } from "@/lib/analytics/mixpanel";
import type {
  DesignRowProps,
  FilterRowProps,
  FilterSectionProps,
  HouseSizeInputRowProps,
} from "@/types/houseDesign";
import { Bath, BedDouble, Building2, Car } from "lucide-react";
import React from "react";
import Button from "./Button";
import Checkbox from "./Checkbox";
import Input from "./Input";

const FilterRow = React.memo(
  ({
    icon,
    label,
    value,
    setValue,
    initial,
    showErrors,
    filterErrors = {},
  }: FilterRowProps) => {
    return (
      <div className="mb-6 border-b border-brand pb-6">
        <div className="flex items-center justify-between mb-4 w-full">
          <div className="flex items-center">
            {React.isValidElement(icon) ? React.cloneElement(icon) : icon}
            <span className="ml-2 text-base font-semibold text-brand">
              {label}
            </span>
          </div>
        </div>
        <div className="flex items-center">
          <div className="flex gap-6 flex-wrap">
            {INITIAL_FILTER_RANGES[
              initial as keyof typeof INITIAL_FILTER_RANGES
            ].map((v: number, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox
                  id={`checkbox-${initial}-${index}`}
                  checked={value.includes(v)}
                  onCheckedChange={(checked: boolean) => {
                    if (checked) {
                      if (!value.includes(v)) {
                        setValue([...value, v]);
                      }
                    } else {
                      setValue(value.filter((item) => item !== v));
                    }
                  }}
                />
                <label
                  htmlFor={`checkbox-${initial}-${index}`}
                  className="text-sm font-sm"
                >
                  {v} {initial}
                </label>
              </div>
            ))}
          </div>
        </div>
        {showErrors && filterErrors[initial as keyof typeof filterErrors] && (
          <p className="text-sm text-red-600 mt-2">
            {filterErrors[initial as keyof typeof filterErrors]}
          </p>
        )}
      </div>
    );
  }
);

FilterRow.displayName = "FilterRow";

const DesignRow = React.memo(
  ({
    rumpus = false,
    alfresco = false,
    pergola = false,
    onChange,
  }: DesignRowProps) => {
    return (
      <div className="mb-6 border-b border-brand pb-6">
        <div className="flex items-center mb-4">
          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="checkbox-rumpus"
                checked={rumpus}
                onCheckedChange={(checked: boolean) => {
                  onChange("rumpus", checked);
                }}
              />
              <label
                htmlFor="checkbox-rumpus"
                className="mr-5 text-sm font-bold"
              >
                Rumpus
              </label>

              <Checkbox
                id="checkbox-alfresco"
                checked={alfresco}
                onCheckedChange={(checked: boolean) => {
                  onChange("alfresco", checked);
                }}
              />
              <label
                htmlFor="checkbox-alfresco"
                className="mr-5 text-sm font-bold"
              >
                Alfresco
              </label>

              <Checkbox
                id="checkbox-pergola"
                checked={pergola}
                onCheckedChange={(checked: boolean) => {
                  onChange("pergola", checked);
                }}
              />
              <label
                htmlFor="checkbox-pergola"
                className="mr-5 text-sm font-bold"
              >
                Pergola
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

DesignRow.displayName = "DesignRow";

const HouseSizeInputRow = React.memo(
  ({
    min_size,
    setMinSize,
    max_size,
    setMaxSize,
    showErrors,
    filterErrors = {},
  }: HouseSizeInputRowProps) => {
    return (
      <div className="mb-6 border-b border-brand pb-6">
        <div className="flex items-center mb-4">
          <Building2 />
          <span className="ml-2 text-base font-semibold text-brand">
            House Size
          </span>
        </div>

        <div className="flex items-center">
          <div className="flex">
            <div className="flex flex-col space-y-1">
              <Input
                type="text"
                value={isNaN(min_size) ? "" : min_size}
                placeholder="Min: 150m²"
                className={
                  showErrors && filterErrors.min_size ? "border-red-500" : ""
                }
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setMinSize(isNaN(val) ? NaN : val);
                }}
              />
              {showErrors && filterErrors.min_size && (
                <p className="text-sm text-red-600 w-30">
                  {filterErrors.min_size}
                </p>
              )}
            </div>
            <div className="text-xl items-center text-brand-muted p-1">-</div>
            <div className="flex flex-col space-y-1">
              <Input
                type="text"
                value={isNaN(max_size) ? "" : max_size}
                placeholder="Max: 300m²"
                className={
                  showErrors && filterErrors.max_size ? "border-red-500" : ""
                }
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setMaxSize(isNaN(val) ? NaN : val);
                }}
              />
              {showErrors && filterErrors.max_size && (
                <p className="text-sm text-red-600 w-30">
                  {filterErrors.max_size}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

HouseSizeInputRow.displayName = "HouseSizeInputRow";

export const FilterSectionWithSingleLineSliders = React.memo(
  ({
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
    filterErrors,
  }: FilterSectionProps) => {
    const stateMap = {
      bedroom: { value: bedroom, setValue: setBedroom },
      bathroom: { value: bathroom, setValue: setBathroom },
      car: { value: car, setValue: setCar },
    };

    const handleChange = (key: keyof typeof design, value: boolean) => {
      setDesign((prev) => ({ ...prev, [key]: value }));

      // Track design feature filter
      trackFilterApplied(`design_${key}`, value);
    };

    return (
      <div className="flex flex-col h-full px-6">
        {" "}
        {/* Added px-6 here */}
        {/* Scrollable Content */}
        <div className="grow overflow-y-auto py-6">
          {FILTER_CONFIGS.map(({ icon, label, key }) => {
            const IconComponent = {
              BedDouble: BedDouble,
              Bath: Bath,
              Car: Car,
              Building2: Building2,
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
                filterErrors={filterErrors}
              />
            );
          })}

          <HouseSizeInputRow
            min_size={min_size}
            setMinSize={setMinSize}
            max_size={max_size}
            setMaxSize={setMaxSize}
            showErrors={showErrors}
            filterErrors={filterErrors}
          />
          <DesignRow
            rumpus={design.rumpus}
            alfresco={design.alfresco}
            pergola={design.pergola}
            onChange={handleChange}
          />
        </div>
        {/* Sticky footer to return to the design list with filters applied */}
        <div className="sticky bottom-0 bg-white pt-1 pb-6">
          <Button
            label="Show me matching floor plans"
            className="w-full bg-brand-primary text-white text-lg py-3 rounded-lg font-medium hover:bg-[var(--color-primary-hover)]"
            onClick={() => {
              // Track filter application
              trackFilterApplied("show_house_designs", {
                bedroom: bedroom.length,
                bathroom: bathroom.length,
                car: car.length,
                min_size,
                max_size,
                design_features: Object.values(design).filter(Boolean).length,
              });
              onShowHouseDesign();
            }}
          />
        </div>
      </div>
    );
  }
);

FilterSectionWithSingleLineSliders.displayName =
  "FilterSectionWithSingleLineSliders";
