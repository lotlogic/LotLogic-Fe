import { Diamond, Home } from "lucide-react";
import type { LotData } from "@/types/lot";
import { hexToRgba } from "@/lib/utils/zoning";
import { getColorClass, colors } from "@/constants/content";

interface SummaryViewProps {
  lot: LotData;
  zoningColor: string;
  zoningText: string;
  onShowDetailedRules?: () => void;
}

export function SummaryView({ lot, zoningColor, zoningText }: SummaryViewProps) {
  return (
    <>
      <div className="mx-4 sm:mx-6 my-3 sm:my-4">
        <span
          className="inline-block w-full text-center font-[DM Sans] font-medium text-xs sm:text-sm leading-[1.36] text-black rounded-full py-2 px-4"
          style={{ backgroundColor: hexToRgba(zoningColor, 0.3) }}
        >
          {zoningText}
        </span>
      </div>

      {/* Lot Size Card */}
      <div className="bg-white rounded-xl shadow border border-gray-100 p-4 sm:p-6 mx-4 sm:mx-6 mb-4 flex flex-col sm:flex-row items-start sm:items-center font-[DM Sans] gap-4 sm:gap-0">
        <div className="flex flex-col items-start w-full sm:w-auto">
          <div className="flex items-center mb-1 sm:mb-2">
            <Diamond className="h-5 w-5 text-gray-700 mr-2" />
            <span className="font-medium text-xs sm:text-sm text-gray-700">Lot Size</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-black leading-none">{lot.size ? `${lot.size}m²` : '--'}</div>
        </div>
        <div className="hidden sm:block h-20 w-px bg-gray-200 mx-6" />
        <div className="flex flex-col justify-center flex-grow w-full sm:w-auto">
          <div className="flex items-baseline mb-1 justify-between sm:justify-start">
            <span className="text-gray-700 text-xs sm:text-sm font-normal sm:min-w-[85px]">Width:</span>
            <span className="ml-1 text-gray-500 text-xs sm:text-sm font-normal">
              {typeof lot.apiDimensions?.width === 'number' ? `${lot.apiDimensions.width.toFixed(2)}m` : (lot.width ? `${lot.width} m` : '--')}
            </span>
          </div>
          <div className="flex items-baseline mb-1 justify-between sm:justify-start">
            <span className="text-gray-700 text-xs sm:text-sm font-normal sm:min-w-[85px]">Depth:</span>
            <span className="ml-1 text-gray-500 text-xs sm:text-sm font-normal">
              {typeof lot.apiDimensions?.depth === 'number' ? `${lot.apiDimensions.depth.toFixed(2)}m` : (lot.depth ? `${lot.depth} m` : '--')}
            </span>
          </div>
        </div>
      </div>

      {/* Land Use Details */}
      <div className="bg-white rounded-xl shadow border border-gray-100 p-4 mx-4 sm:mx-6 mb-4 flex flex-col">
        <div className="flex items-center mb-2">
          <div className={`p-2 rounded-full ${getColorClass('secondary')}`}>
            <Home className="h-4 w-4" style={{ color: colors.primary }} />
          </div>
          <span className="font-semibold text-gray-800 text-sm sm:text-base ml-2">Land Use Details</span>
        </div>

        <div className="flex flex-wrap items-center text-gray-700 text-sm sm:text-base gap-x-3 gap-y-2">
          <span>Houses</span>
          <span className="hidden sm:inline mx-2 text-gray-400">•</span>
          <span>Duplexes</span>
          <span className="hidden sm:inline mx-2 text-gray-400">•</span>
          <span>Townhouse</span>
        </div>
      </div>

      {/* Planning Rules - Commented Out */}
      {/* <div className="bg-white rounded-xl shadow border border-gray-100 p-4 mx-6 mb-4 flex flex-col">
        <div className="flex items-center mb-3">
          <div className="p-2 rounded-full" style={{ backgroundColor: '#EAEFEF' }}>
            <Info className="h-4 w-4" style={{ color: '#2F5D62' }} />
          </div>
                      <span className="font-semibold text-gray-800 text-base ml-2">Planning Rules</span>
        </div>
        <div className="text-gray-700 text-base space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-700 text-sm font-normal">Lot Id</span>
            <span className={lot.planningId ? 'text-gray-500 text-sm font-normal' : faded}>{lot.planningId || '--'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700 text-sm font-normal">Max Building Height</span>
            <span className={lot.maxHeight ? 'text-gray-500 text-sm font-normal' : faded}>{lot.maxHeight ? `${lot.maxHeight} meters` : ''}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700 text-sm font-normal">Max Lot Size</span>
            <span className={lot.maxSize ? 'text-gray-500 text-sm font-normal' : faded}>{lot.maxSize ? `${lot.maxSize}m²` : ''}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700 text-sm font-normal">Max FSR</span>
            <span className={lot.maxFSR ? 'text-gray-500 text-sm font-normal' : faded}>{lot.maxFSR || '--'}</span>
          </div>
        </div>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onShowDetailedRules?.();
          }}
          className="block mt-4 font-medium hover:underline text-sm opacity-80"
          style={{ color: '#2F5D62' }}
        >
          View detailed planning rules &rarr;
        </a>
      </div> */}
    </>
  );
}