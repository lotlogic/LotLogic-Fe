import { X, ChevronLeft, Diamond } from "lucide-react";
import { Button } from "@/components/ui/Button";
import React from 'react';
import { LotSidebarProps } from "@/types/lot";
import { getZoningColor } from "@/lib/utils/zoning";
import { SummaryView } from "./SummaryView";
import { DetailedRulesView } from "./DetailedRulesView";
import { FilterSectionWithSingleLineSliders } from "@/components/ui/HouseDesignFilter"; 
import { HouseDesignList } from "../facades/HouseDesignList";

export function LotSidebar({ open, onClose, lot }: LotSidebarProps) {
    const [showDetailedRules, setShowDetailedRules] = React.useState(false);
    const [showFilter, setShowFilter] = React.useState(false);
    const [showHouseDesigns, setShowHouseDesigns] = React.useState(false);
  
    const [bedroom, setBedroom] = React.useState<[number, number]>([2, 4]);
    const [bathroom, setBathroom] = React.useState<[number, number]>([2, 4]);
    const [cars, setCars] = React.useState<[number, number]>([2, 4]);
    const [storeys, setStoreys] = React.useState<[number, number]>([2, 4]);
  
    if (!open || !lot) return null;
  
    const zoningColor = getZoningColor(lot.zoning);
    const zoningText = lot.zoning || '--';
  
    const handleShowHouseDesign = () => {
      const filterPayload = { bedroom, bathroom, cars, storeys };
      console.log("Filter Payload:", filterPayload);
      setShowHouseDesigns(true);
      setShowFilter(false);
    };

    const handleBackClick = () => {
      if (showHouseDesigns) {
        setShowHouseDesigns(false);
        setShowFilter(true);
      } else if (showFilter) {
        setShowFilter(false);
      } else if (showDetailedRules) {
        setShowDetailedRules(false);
      }
    };
  
    const headerTitle = showHouseDesigns 
      ? 'House Designs' 
      : showDetailedRules 
        ? 'Planning Rules' 
        : 'Build Your Site';
        
    const showBackArrow = showDetailedRules || showFilter || showHouseDesigns;
  
    return (
      <aside className="fixed top-[80px] left-[20px] h-[calc(100vh-100px)] w-[550px] max-w-full z-50 bg-white shadow-2xl rounded-xl flex flex-col font-serifpro">
        {/* Header */}
        <div className="flex items-center p-6 pb-4 border-b border-gray-100 sticky top-0 z-10 bg-white">
          {showBackArrow && (
            <button
              onClick={handleBackClick}
              className="p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 mr-3"
              aria-label="Back"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          <div className="flex-grow">
            <h2 className="text-2xl font-medium text-[#000000]">
              {headerTitle}
            </h2>
            <div className="text-gray-600 mt-1 text-base font-normal">
              Lot ID: {lot.id || '--'}, {lot.suburb || '--'} | {lot.address || '--'}
              {(showDetailedRules || showFilter || showHouseDesigns) && (
                  <div className="mt-2 flex flex-wrap items-center text-xs font-normal">
                      {lot.size && <span className="mr-2 px-2 py-1 bg-gray-100 rounded-md flex items-center text-gray-700"><Diamond className="h-3 w-3 mr-1" />{lot.size}m²</span>}
                      {lot.type && <span className="mr-2 px-2 py-1 bg-gray-100 rounded-md text-gray-700">{lot.type}</span>}
                      {lot.zoning && <span className="mr-2 px-2 py-1 rounded-md text-black font-medium" style={{ backgroundColor: zoningColor }}>{zoningText}</span>}
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
          {showHouseDesigns ? (
            <HouseDesignList
              filter={{ bedroom, bathroom, cars, storeys }}
              onShowFilter={() => {
                setShowHouseDesigns(false);
                setShowFilter(true);
              }}
            />
          ) : showFilter ? (
            <FilterSectionWithSingleLineSliders
              bedroom={bedroom}
              setBedroom={setBedroom}
              bathroom={bathroom}
              setBathroom={setBathroom}
              cars={cars}
              setCars={setCars}
              storeys={storeys}
              setStoreys={setStoreys}
              onShowHouseDesign={handleShowHouseDesign}
            />
          ) : !showDetailedRules ? (
            <SummaryView
              lot={lot}
              zoningColor={zoningColor}
              zoningText={zoningText}
              onShowDetailedRules={() => setShowDetailedRules(true)}
            />
          ) : (
            <DetailedRulesView lot={lot} />
          )}
        </div>
  
        {/* Action Button - Conditional */}
        {!showDetailedRules && !showFilter && !showHouseDesigns && (
          <div className="sticky bottom-0 p-6 border-t border-gray-100 bg-white">
            <Button
              className="w-full text-lg py-3 rounded-lg"
              onClick={() => setShowFilter(true)}
            >
              Show Me What I Can Build Here
            </Button>
          </div>
        )}
      </aside>
    );
  }