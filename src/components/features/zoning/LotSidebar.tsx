import { X, Diamond, Info, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

const faded = "text-gray-400"; 

// Adjusted color map to more closely match the R2 Low Density Residential tag in the SS
const zoningColorMap: Record<string, string> = {
  rz1: "#FFCFFF", 
  rz2: "#FFEDED", 
  rz3: "#FF776F", 
  rz4: "#FF473B", 
  rz5: "#FFD8D9", 
  "r2 low density residential": "#FFEDED", 
};

function getZoningColor(zoning: string | undefined): string {
  if (!zoning) return "#F3F4F6"; // Tailwind gray-100 (fallback)
  // Normalize and match based on full text or pattern if needed
  const normalizedZoning = zoning.toLowerCase();
  if (zoningColorMap[normalizedZoning]) {
    return zoningColorMap[normalizedZoning];
  }
  const code = normalizedZoning.match(/rz[1-5]/)?.[0];
  return code ? zoningColorMap[code] || "#F3F4F6" : "#F3F4F6";
}

export type LotSidebarProps = {
  open: boolean;
  onClose: () => void;
  lot: any;
};

export function LotSidebar({ open, onClose, lot }: LotSidebarProps) {
  if (!open || !lot) return null;
  console.log(lot, "lot");

  const zoningColor = getZoningColor(lot.zoning);
  const zoningText = lot.zoning || '--';

  return (
    <aside className="fixed top-[80px] left-[20px] h-[calc(100vh-100px)] w-[550px] max-w-full z-50 bg-white shadow-2xl rounded-xl flex flex-col font-serifpro overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-2xl font-semibold text-[#000000]">Build Your Site</h2>
          <div className="text-gray-600 mt-1 text-base font-normal">
            Lot ID: {lot.id || '--'}, {lot.suburb || '--'} | {lot.address || '--'}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700"
          aria-label="Close sidebar"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Zoning Tag (R2 Low Density Residential) */}
      <div className="mx-6 my-4">
        <span
          className="inline-block w-full text-center font-[DM Sans] font-medium text-sm leading-[1.36] text-black rounded-full py-2 px-4"
          style={{ backgroundColor: zoningColor }}
        >
          {zoningText}
        </span>
      </div>

      {/* Lot Size Card - Diamond icon reverted to previous style */}
      <div className="bg-white rounded-xl shadow border border-gray-100 p-6 mx-6 mb-4 flex items-center font-[DM Sans]">
        {/* Left column: Lot Size */}
        <div className="flex flex-col items-start min-w-[150px]">
          <div className="flex items-center mb-2">
            {/* Reverted Diamond icon to previous styling */}
            <Diamond className="h-5 w-5 text-gray-700 mr-2" />
            <span className="font-medium text-sm text-gray-700">Lot Size</span>
          </div>
          <div className="text-4xl font-bold text-black leading-none">{lot.size ? `${lot.size}m²` : <span className={faded}>--</span>}</div>
        </div>

        {/* Divider */}
        <div className="h-20 w-px bg-gray-200 mx-6" />

        {/* Right column: Details */}
        <div className="flex flex-col justify-center flex-grow">
          <div className="flex items-baseline mb-1">
            <span className="text-gray-700 text-sm font-normal min-w-[85px]">Width:</span>
            <span className="ml-1 text-gray-500 text-sm font-normal">{lot.width ? `${lot.width} m` : '--'}</span>
          </div>
          <div className="flex items-baseline mb-1">
            <span className="text-gray-700 text-sm font-normal min-w-[85px]">Depth:</span>
            <span className="ml-1 text-gray-500 text-sm font-normal">{lot.depth ? `${lot.depth} m` : '--'}</span>
          </div>
          <div className="flex items-baseline mb-1">
            <span className="text-gray-700 text-sm font-normal min-w-[85px]">Frontage type:</span>
            <span className={`ml-1 text-sm font-normal ${lot.frontageType === 'Standard' ? 'text-teal-600' : 'text-gray-500'}`}>{lot.frontageType || '--'}</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-gray-700 text-sm font-normal min-w-[85px]">Overlays:</span>
            <span className={`ml-1 text-sm font-normal ${lot.overlays === 'Flood' ? 'text-teal-600' : 'text-gray-500'}`}>{lot.overlays || '--'}</span>
          </div>
        </div>
      </div>

      {/* Land Use Details - Home icon with requested colors */}
      <div className="bg-white rounded-xl shadow border border-gray-100 p-6 mx-6 mb-4 flex flex-col">
        <div className="flex items-center mb-2">
          {/* ICON WITH BACKGROUND */}
          <div className="p-2 rounded-lg" style={{ backgroundColor: '#EAEFEF' }}>
            <Home className="h-5 w-5" style={{ color: '#2F5D62' }} />
          </div>
          <span className="font-semibold text-gray-800 text-lg ml-2">Land Use Details</span>
        </div>
        <ul className="text-gray-700 text-base list-disc list-inside space-y-1">
          <li>Houses</li>
          <li>Duplexes</li>
          <li>Townhouse</li>
        </ul>
      </div>

      {/* Planning Rules - Info icon with requested colors */}
      <div className="bg-white rounded-xl shadow border border-gray-100 p-6 mx-6 mb-4 flex flex-col">
        <div className="flex items-center mb-3">
          {/* ICON WITH BACKGROUND */}
          <div className="p-2 rounded-lg" style={{ backgroundColor: '#EAEFEF' }}>
            <Info className="h-5 w-5" style={{ color: '#2F5D62' }} />
          </div>
          <span className="font-semibold text-gray-800 text-lg ml-2">Planning Rules</span>
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
        <a href="#" className="block mt-4 text-primary-btn font-medium hover:underline text-sm opacity-80" style={{ color: '#2F5D62' }}>
          View detailed planning rules &rarr;
        </a>
      </div>

      {/* Action Button */}
      <div className="p-6 mt-auto border-t border-gray-100">
        <Button className="w-full text-lg py-3 rounded-lg">
          Show Me What I Can Build Here
        </Button>
      </div>
    </aside>
  );
}