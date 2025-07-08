import { X, ChevronLeft, Diamond } from "lucide-react";
import { Button } from "@/components/ui/Button";
import React from 'react';
import { LotSidebarProps } from "@/types/lot";
import { getZoningColor } from "@/lib/utils/zoning";
import { SummaryView } from "./SummaryView";
import { DetailedRulesView } from "./DetailedRulesView";

export function LotSidebar({ open, onClose, lot }: LotSidebarProps) {
  const [showDetailedRules, setShowDetailedRules] = React.useState(false);
  if (!open || !lot) return null;
  const zoningColor = getZoningColor(lot.zoning);
  const zoningText = lot.zoning || '--';

  return (
    <aside className="fixed top-[80px] left-[20px] h-[calc(100vh-100px)] w-[550px] max-w-full z-50 bg-white shadow-2xl rounded-xl flex flex-col font-serifpro overflow-y-auto">
      {/* Header */}
      <div className="flex items-center p-6 pb-4 border-b border-gray-100 sticky top-0 z-10 bg-white">
        {showDetailedRules && (
          <button
            onClick={() => setShowDetailedRules(false)}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 mr-3"
            aria-label="Back to summary"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        <div className="flex-grow">
          <h2 className="text-2xl font-medium text-[#000000]">
            {showDetailedRules ? 'Planning Rules' : 'Build Your Site'}
          </h2>
          <div className="text-gray-600 mt-1 text-base font-normal">
            Lot ID: {lot.id || '--'}, {lot.suburb || '--'} | {lot.address || '--'}
            {showDetailedRules && (
                <div className="mt-2 flex flex-wrap items-center text-xs font-normal">
                    {lot.size && <span className="mr-2 px-2 py-1 bg-gray-100 rounded-md flex items-center text-gray-700 "><Diamond className="h-3 w-3 mr-1" />{lot.size}m²</span>}
                    {lot.type && <span className="mr-2 px-2 py-1 bg-gray-100 rounded-md text-gray-700">{lot.type}</span>}
                    {lot.zoning && <span className="mr-2 px-2 py-1 rounded-md text-black font-medium" style={{ backgroundColor: getZoningColor(lot.zoning) }}>{lot.zoning}</span>}
                    {lot.overlays === 'Flood' && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md">Flood</span>}
                </div>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 ml-auto"
          aria-label="Close sidebar"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Main content area */}
      <div className="flex-grow overflow-y-auto">
        {!showDetailedRules ? (
          <SummaryView 
            lot={lot} 
            zoningColor={zoningColor} 
            zoningText={zoningText} 
            onShowDetailedRules={() => setShowDetailedRules(true)} 
          />
        ) : (
          <DetailedRulesView 
            lot={lot} 
            // onBackToSummary={() => setShowDetailedRules(false)} 
          />
        )}
      </div>

      {/* Action Button - Conditional */}
      {!showDetailedRules && (
        <div className="p-6 mt-auto border-t border-gray-100">
          <Button className="w-full text-lg py-3 rounded-lg">
            Show Me What I Can Build Here
          </Button>
        </div>
      )}
    </aside>
  );
}