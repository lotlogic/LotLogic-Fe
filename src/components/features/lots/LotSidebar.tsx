import React, { useState } from 'react';
import { Button } from "../../ui/Button";
import { X, ChevronLeft, ArrowRight, ChevronRight } from 'lucide-react';
import type { LotSidebarProps } from "../../../types/lot";
import { getZoningColor, hexToRgba } from "../../../lib/utils/zoning";
import { FilterSectionWithSingleLineSliders } from "../../ui/HouseDesignFilter";
import { Sidebar } from "../../ui/Sidebar";
// import { HouseDesignDetailOverlay } from "../facades/HouseDesignOverlay";
import { GetYourQuoteSidebar } from '../quote/QuoteSideBar';
import type { DesignState, HouseDesignItem } from "../../../types/houseDesign";
import { useContent } from "../../../hooks/useContent";
import { SummaryView } from "./SummaryView";
import { HouseDesignList } from "../facades/HouseDesignList";
import { Diamond } from "lucide-react"; 

export function LotSidebar({ open, onClose, lot, geometry, onSelectFloorPlan}: LotSidebarProps) {
    
    const { lotSidebar } = useContent();
    // const queryClient = useQueryClient();

    const [showFilter, setShowFilter] = React.useState(false);
    const [showHouseDesigns, setShowHouseDesigns] = React.useState(false); 
    const [selectedHouseDesignForModals, setSelectedHouseDesignForModals] = React.useState<HouseDesignItem | null>(null); 

    // Filter states
    const [bedroom, setBedroom] = React.useState<number[]>([3, 4]); // Default to show 3-4 bedroom designs
    const [bathroom, setBathroom] = React.useState<number[]>([1, 2]); // Default to show 1-2 bathroom designs
    const [car, setCar] = React.useState<number[]>([1, 2]); // Default to show 1-2 car designs
    const [design, setDesign] = React.useState<DesignState>({
      rumpus: false,
      alfresco: false,
      pergola: false,
    });
    const [min_size, setMinSize] = React.useState<number>(NaN);
    const [max_size, setMaxSize] = React.useState<number>(NaN);
    const [filterErrors, setFilterErrors] = React.useState<{ min_size?: string; max_size?: string; bedroom?: string; bathroom?: string; car?: string }>({});
    const [showErrors, setShowErrors] = React.useState(false);

    const [showQuoteSidebar, setShowQuoteSidebar] = React.useState(false);
    const [quoteDesign, setQuoteDesign] = React.useState<HouseDesignItem | null>(null);
    
    const [showFloorPlanModal, setShowFloorPlanModal] = React.useState(false);
    const [showFacadeModal, setShowFacadeModal] = React.useState(false);
    const [currentModalFacadeIdx, setCurrentModalFacadeIdx] = useState(0); 

    if (!open || !lot) return null;

    const zoningColor = getZoningColor(lot.zoning);
    const zoningText = lot.zoning || '--';

    const handleShowHouseDesign = () => {

      // const filterPayload = { 
      //   bedroom,
      //   bathroom,
      //   car,
      //   rumpus: design.rumpus,
      //   alfresco: design.alfresco,
      //   pergola: design.pergola,
      //   min_size,
      //   max_size
      // };

      if(validateFilter()) {
        setShowHouseDesigns(true);
        setShowFilter(false);
        setSelectedHouseDesignForModals(null);
      }
    };

    const validateFilter = () => {
      const errors: { min_size?: string; max_size?: string; bedroom?: string; bathroom?: string; car?: string } = {};

      // House size validation
      if (isNaN(min_size) || min_size < 150) {
        errors.min_size = "Minimum size should be at least 150";
      }

      if (isNaN(max_size) || max_size > 300) {
        errors.max_size = "Maximum size cannot exceed 300";
      }

      if (!isNaN(min_size) && !isNaN(max_size) && min_size > max_size) {
        errors.min_size = "Min size cannot be greater than max size";
        errors.max_size = "Max size must be greater than min size";
      }

      if (!bedroom.length) {
        errors.bedroom = "Please choose one";
      }
      if (!bathroom.length) {
        errors.bathroom = "Please choose one";
      }
      if (!car.length) {
        errors.car = "Please choose one";
      }

      setShowErrors(true);
      setFilterErrors(errors);

      return Object.keys(errors).length === 0;
    };

    const handleBackClick = () => {
      if (showQuoteSidebar) {
        setShowQuoteSidebar(false);
        setQuoteDesign(null);

        setShowHouseDesigns(true);
      } else if (showHouseDesigns) {
        setShowHouseDesigns(false);
        setShowFilter(true);
      } else if (showFilter) {
        setShowFilter(false);
      }
      setShowFloorPlanModal(false);
      setShowFacadeModal(false);
      setSelectedHouseDesignForModals(null); 
    };

    const handleDesignSelectedInList = (design: HouseDesignItem | null) => {
        setSelectedHouseDesignForModals(design); 
        
        if (design && onSelectFloorPlan && lot.apiMatches?.[0]?.floorplanUrl && geometry && geometry.type === 'Polygon') {
            const ring = geometry.coordinates[0];
            if (ring && ring.length >= 4) {
                const coordinates = [ring[0], ring[1], ring[2], ring[3]] as [[number, number], [number, number], [number, number], [number, number]];
                onSelectFloorPlan({
                    url: lot.apiMatches?.[0]?.floorplanUrl,
                    coordinates,
                });
            }
        } else if (!design && onSelectFloorPlan) {
            onSelectFloorPlan(null);
        }
    };

    const handleViewFloorPlanClick = (design: HouseDesignItem) => {
      setSelectedHouseDesignForModals(design); 
      setShowFloorPlanModal(true);
    };

    const handleViewFacadesClick = (design: HouseDesignItem) => {
      setSelectedHouseDesignForModals(design); 
      setCurrentModalFacadeIdx(0); 
      setShowFacadeModal(true);
    };

    const handleEnquireNow = (design: HouseDesignItem) => {
      setQuoteDesign(design);
      setShowQuoteSidebar(true);
    };


    const headerTitle = showHouseDesigns
        ? lotSidebar.houseDesigns
        : showFilter
          ? "Build A House"
          : lotSidebar.buildYourSite;

    const showBackArrow = showFilter || showHouseDesigns || showQuoteSidebar;

    const headerContent = (
      <>
        <h2 className="text-2xl font-medium text-[#000000]">
        {headerTitle}
        </h2>
        {/* Lot details only shown when not in filter mode */}
        {!showFilter && (
          <div className="text-gray-600 mt-1 text-base font-normal">
            {`Lot ID: ${lot.id || '--'}, ${lot.suburb?.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || '--'} | ${lot.address?.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || '--'}`}
            {/* Chips only shown in house design section */}
            {showHouseDesigns && (
              <div className="mt-2 flex flex-nowrap items-center gap-2 text-xs font-normal overflow-x-auto">
                  {lot.size && <span className="px-2 py-1 bg-gray-100 rounded-md flex items-center text-gray-700 flex-shrink-0"><Diamond className="h-3 w-3 mr-1" />{lot.size}m²</span>}
                  {lot.type && <span className="px-2 py-1 bg-gray-100 rounded-md text-gray-700 flex-shrink-0">{lot.type}</span>}
                  {lot.zoning && (
                    <span 
                      className="px-2 py-1 rounded-full text-black font-medium flex-shrink-0"
                      style={{ backgroundColor: hexToRgba(zoningColor, 0.3) }}
                    >
                      {zoningText}
                    </span>
                  )}
                  {lot.overlays === 'Flood' && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md flex-shrink-0">Flood</span>}
              </div>
            )}
          </div>
        )}
      </>
    );

    // const showLoading = isLoadingApiData && !lot.apiDimensions;
    
    // const showError = apiError && !lot.apiDimensions;

    // const handleRetry = () => {
    //   if (lot.id) {
    //     queryClient.invalidateQueries({ queryKey: ['lot-calculation', lot.id] });
    //   }
    // };

    return (
      <>
        {/* Main LotSidebar - Only hide when quote sidebar is open */}
        {!showQuoteSidebar && (
        <Sidebar 
          open={open} 
          onClose={onClose}
          onBack={showBackArrow ? handleBackClick : undefined}
          showBackButton={showBackArrow}
          headerContent={headerContent}
        >
          {/* Conditional rendering for sidebar content */}
            {showHouseDesigns ? ( 
            <HouseDesignList
              filter={{ bedroom, bathroom, car }}
              lot={{lotId: lot.id ?? '', suburb: lot.suburb ?? '', address: lot.address ?? '', size: lot.size ?? '', zoning: lot.zoning ?? '', overlays: lot.overlays ?? ''}}
              onShowFilter={() => {
                setShowHouseDesigns(false);
                setShowFilter(true);
              }}
                onDesignClick={handleDesignSelectedInList} 
                onEnquireNow={handleEnquireNow} 
                onViewFloorPlan={handleViewFloorPlanClick} 
                onViewFacades={handleViewFacadesClick} 
            />
            ) : showFilter ? ( 
              <FilterSectionWithSingleLineSliders
                bedroom={bedroom}
                setBedroom={setBedroom}
                bathroom={bathroom}
                setBathroom={setBathroom}
                car={car}
                setCar={setCar}
                design={design}
                setDesign={setDesign}
                min_size={min_size}
                setMinSize={setMinSize}
                max_size={max_size}
                setMaxSize={setMaxSize}
                onShowHouseDesign={handleShowHouseDesign}
                showErrors={showErrors}
                filterErrors={filterErrors}
              />
            ) : ( 
            <SummaryView
              lot={lot}
              zoningColor={zoningColor}
              zoningText={zoningText}
              />
            )}

            {/* Action Button - Conditional for "Show Me What I Can Build Here" */}
            {/* Show only if not in filter and not showing house designs */}
            {!showFilter && !showHouseDesigns && (
              <div className="sticky bottom-0 px-6 pt-0 pb-6">
                <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
                  <div className="text-left mb-4">
                    <p className="text-gray-600 text-base font-medium">
                      Get inspired with new house designs
                    </p>
                  </div>

              <Button
                    className="w-full text-base py-4 rounded-xl font-semibold animated-gradient-button transition-all duration-300 shadow-md cursor-pointer"
                onClick={() => setShowFilter(true)}
              >
                    <span className="flex items-center justify-center gap-2">
                      {lotSidebar.showMeWhatICanBuild}
                      <ArrowRight className='h-6 w-8'/>
                    </span>
              </Button>
                </div>
            </div>
          )}
        </Sidebar>
        )}
        
        {/* Quote Sidebar - Render this as an overlay */}
        {showQuoteSidebar && quoteDesign && (
          <React.Suspense fallback={<div>Loading...</div>}>
            <GetYourQuoteSidebar
              open={showQuoteSidebar}
              onClose={() => {
                setShowQuoteSidebar(false);
                setQuoteDesign(null);
              }}
              onBack={() => {
                setShowQuoteSidebar(false);
                setQuoteDesign(null);
                setShowHouseDesigns(true); 
              }}
              selectedHouseDesign={quoteDesign}
              lotDetails={{
                id: String(lot.id || ''),
                suburb: lot.suburb || '',
                address: lot.address || '',
              }}
            />
          </React.Suspense>
        )}

        {/* Floor Plan Modal (Popup) */}
        {showFloorPlanModal && selectedHouseDesignForModals && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[16px] w-[956px] h-[662px] overflow-hidden shadow-2xl flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold">
                  Lot ID: {lot.id}, {selectedHouseDesignForModals.title}
                </h3>
                <button
                  onClick={() => setShowFloorPlanModal(false)}
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Floor Plan Image */}
              <div className="flex-1 flex items-center justify-center overflow-hidden px-6 pb-6">
                {lot.apiMatches?.[0]?.floorplanUrl ? (
                  <img
                    src={lot.apiMatches[0].floorplanUrl}
                    alt="Floor Plan"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <p className="text-center text-gray-500">Floor plan not available for this design.</p>
                )}
              </div>

            </div>
          </div>
        )}

        {/* Facade Modal (Popup) */}
        {showFacadeModal && selectedHouseDesignForModals && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[16px] w-[956px] h-[662px] overflow-hidden shadow-2xl flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold">
                  {selectedHouseDesignForModals.title} - Facades
                </h3>
                <button
                  onClick={() => { setShowFacadeModal(false); setCurrentModalFacadeIdx(0); }} // Reset index on close
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Facade Images */}
              <div className="p-6 flex-1 overflow-auto relative">
                {selectedHouseDesignForModals.images && selectedHouseDesignForModals.images.length > 0 ? (
                    <>
                        <div className="relative w-[900px] h-[430px] mb-4 flex items-center justify-center">
                            <img
                                src={selectedHouseDesignForModals.images[currentModalFacadeIdx]?.src || ''}
                                alt={`Facade ${currentModalFacadeIdx + 1}`}
                                className="w-full h-full object-cover rounded-lg"
                            />
                            <div className="absolute top-0 left-0 right-0 bg-black/30 text-white text-center py-2 rounded-t-lg">
                                {lotSidebar.facedOption}: {selectedHouseDesignForModals.images[currentModalFacadeIdx]?.faced || 'N/A'}
                            </div>
                            {selectedHouseDesignForModals.images.length > 1 && (
                                <>
                                    <button
                                        onClick={() => setCurrentModalFacadeIdx(prev => (prev - 1 + selectedHouseDesignForModals.images.length) % selectedHouseDesignForModals.images.length)}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                                    >
                                        <ChevronLeft className="h-6 w-6" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentModalFacadeIdx(prev => (prev + 1) % selectedHouseDesignForModals.images.length)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                                    >
                                        <ChevronRight className="h-6 w-6" />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Thumbnails below the main facade image */}
                        <div className="flex justify-center gap-2 overflow-x-auto pb-2">
                            {selectedHouseDesignForModals.images.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentModalFacadeIdx(idx)}
                                    className={`w-16 h-16 rounded object-cover border-2 ${currentModalFacadeIdx === idx ? 'border-[#2F5D62]' : 'border-transparent'} flex-shrink-0 relative group`}
                                    title={img.faced || `Facade ${idx + 1}`}
                                >
                                    <img src={img.src} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover rounded" />
                                    
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                        {img.faced || `Facade ${idx + 1}`}
                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <p className="text-center text-gray-500">Facades not available for this design.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
}