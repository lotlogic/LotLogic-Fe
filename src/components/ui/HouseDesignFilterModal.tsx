import { Button } from "./Button";
import { BedDouble, Bath, Car, Building2, ChevronLeft, X as CloseIcon } from "lucide-react";
import { Slider } from "./slider";

const FILTER_CONFIGS = [
  { icon: <BedDouble />, label: "Bedroom", key: "bedroom" },
  { icon: <Bath />, label: "Bathroom", key: "bathroom" },
  { icon: <Car />, label: "Cars", key: "cars" },
  { icon: <Building2 />, label: "Storeys", key: "storeys" },
] as const;

type Filter = {
  bedroom: [number, number];
  bathroom: [number, number];
  cars: [number, number];
  storeys: [number, number];
};

type Props = {
  filter: Filter;
  setFilter: (f: Filter) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
};

export function HouseDesignFilterModal({ filter, setFilter, onApply, onReset, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
      <div className="bg-white rounded-xl w-full max-w-md p-0 relative shadow-xl">
        {/* Header */}
        <div className="flex items-center px-6 pt-6 pb-2 border-b">
          <button onClick={onClose} className="mr-2 p-1" aria-label="Back">
            <ChevronLeft className="h-6 w-6 text-[#2F5D62]" />
          </button>
          <h2 className="text-2xl font-bold flex-1 font-heading">Filters</h2>
          <button onClick={onClose} className="ml-2 p-1" aria-label="Close">
            <CloseIcon className="h-6 w-6 text-gray-700" />
          </button>
        </div>
        {/* Sliders */}
        <div className="px-6 pt-4 pb-2 divide-y divide-gray-200">
          {FILTER_CONFIGS.map(({ icon, label, key }) => (
            <div key={key} className="py-4">
              <div className="flex items-center mb-2">
                {icon}
                <span className="ml-2 text-lg font-semibold text-gray-900 font-heading">{label}</span>
              </div>
              <div className="flex items-center">
                <div className="w-14 h-12 flex items-center justify-center border border-gray-200 rounded-lg text-lg font-medium bg-white text-gray-700">{filter[key][0]}</div>
                <div className="flex-1 px-4">
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={filter[key]}
                    onValueChange={(v: number[]) => setFilter({ ...filter, [key]: [v[0], v[1]] })}
                    className="w-full"
                  />
                </div>
                <div className="w-14 h-12 flex items-center justify-center border border-gray-200 rounded-lg text-lg font-medium bg-white text-gray-700">{filter[key][1]}</div>
              </div>
            </div>
          ))}
        </div>
        {/* Actions */}
        <div className="px-6 pb-6 pt-4 bg-white">
          <Button className="w-full mb-2 bg-[#2F5D62] text-white text-lg py-3 rounded-lg font-medium" onClick={onApply}>
            Apply Filters
          </Button>
          <Button className="w-full text-lg py-3 rounded-lg font-medium" variant="outline" onClick={onReset}>
            Reset filters
          </Button>
        </div>
      </div>
    </div>
  );
}
