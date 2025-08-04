import { Diamond, Home } from "lucide-react";
import { LotData } from "@/types/lot";
import { hexToRgba } from "@/lib/utils/zoning";

interface SummaryViewProps {
  lot: LotData;
  zoningColor: string;
  zoningText: string;
  onShowDetailedRules?: () => void;
}

export function SummaryView({ lot, zoningColor, zoningText }: SummaryViewProps) {
  return (
    <>
      <div className="mx-6 my-4">
        <span
          className="inline-block w-full text-center font-[DM Sans] font-medium text-sm leading-[1.36] text-black rounded-full py-2 px-4"
          style={{ backgroundColor: hexToRgba(zoningColor, 0.3) }}
        >
          {zoningText}
        </span>
      </div>

      {/* Lot Size Card */}
      {/* <div className="bg-white rounded-xl shadow border border-gray-100 p-6 mx-6 mb-4 flex items-center font-[DM Sans]">
        <div className="flex flex-col items-start min-w-[150px]">
          <div className="flex items-center mb-2">
            <Diamond className="h-5 w-5 text-gray-700 mr-2" />
            <span className="font-medium text-sm text-gray-700">Lot Size</span>
          </div>
          <div className="text-2xl font-bold text-black leading-none">{lot.size ? `${lot.size}m²` : <span className={faded}>--</span>}</div>
        </div>
        <div className="h-20 w-px bg-gray-200 mx-6" />
        <div className="flex flex-col justify-center flex-grow">
          <div className="flex items-baseline mb-1">
            <span className="text-gray-700 text-sm font-normal min-w-[85px]">Width:</span>
            <span className="ml-1 text-gray-500 text-sm font-normal">
              {lot.apiDimensions?.width ? `${lot.apiDimensions.width.toFixed(2)}m` : 
               lot.width ? `${lot.width} m` : '--'}
            </span>
          </div>
          <div className="flex items-baseline mb-1">
            <span className="text-gray-700 text-sm font-normal min-w-[85px]">Depth:</span>
            <span className="ml-1 text-gray-500 text-sm font-normal">
              {lot.apiDimensions?.depth ? `${lot.apiDimensions.depth.toFixed(2)}m` : 
               lot.depth ? `${lot.depth} m` : '--'}
            </span>
          </div>
        </div>
      </div> */}

      <div className="bg-white rounded-xl shadow border border-gray-100 p-6 mx-6 mb-4 flex items-center font-[DM Sans]">
        <div className="flex flex-col items-start min-w-[150px]">
          <div className="flex items-center mb-2">
            <Diamond className="h-5 w-5 text-gray-700 mr-2" />
            <span className="font-medium text-sm text-gray-700">Lot Size</span>
          </div>
          <div className="text-2xl font-bold text-black leading-none">{lot.size}m²</div>
        </div>
        <div className="h-20 w-px bg-gray-200 mx-6" />
        <div className="flex flex-col justify-center flex-grow">
          <div className="flex items-baseline mb-1">
            <span className="text-gray-700 text-sm font-normal min-w-[85px]">Width:</span>
            <span className="ml-1 text-gray-500 text-sm font-normal">{lot.apiDimensions?.width?.toFixed(2)}m</span>
          </div>
          <div className="flex items-baseline mb-1">
            <span className="text-gray-700 text-sm font-normal min-w-[85px]">Depth:</span>
            <span className="ml-1 text-gray-500 text-sm font-normal">{lot.apiDimensions?.depth?.toFixed(2)}m</span>
          </div>
        </div>
      </div>

      {/* Land Use Details */}
      <div className="bg-white rounded-xl shadow border border-gray-100 p-4 mx-6 mb-4 flex flex-col">
        <div className="flex items-center mb-2">
          <div className="p-2 rounded-full" style={{ backgroundColor: '#EAEFEF' }}>
            <Home className="h-4 w-4" style={{ color: '#2F5D62' }} />
          </div>
          <span className="font-semibold text-gray-800 text-base ml-2">Land Use Details</span>
        </div>

        <div className="flex flex-wrap items-center text-gray-700 text-base">
          <span className="mx-4 text-gray-400">•</span>
          <span>Houses</span>
          <span className="mx-4 text-gray-400">•</span>
          <span>Duplexes</span>
          <span className="mx-4 text-gray-400">•</span>
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