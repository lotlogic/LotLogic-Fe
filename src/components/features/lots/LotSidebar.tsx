import { Diamond } from "lucide-react";
import { Button } from "@/components/ui/Button";
import React from 'react';
import { LotSidebarProps } from "@/types/lot";
import { getZoningColor } from "@/lib/utils/zoning";
import { SummaryView } from "./SummaryView";
import { DetailedRulesView } from "./DetailedRulesView";
import { FilterSectionWithSingleLineSliders } from "@/components/ui/HouseDesignFilter";
import { HouseDesignList } from "../facades/HouseDesignList";
import { BedDouble, Bath, Car, Building2, Star, ArrowRight} from "lucide-react";
import { Sidebar } from "@/components/ui/Sidebar";
import { GetYourQuoteSidebar } from "../quote/QuoteSideBar";
import { HouseDesignItem } from "@/types/houseDesign";
import { useContent } from "@/hooks/useContent";
import { colors } from "@/constants/content";
import { useQueryClient } from '@tanstack/react-query';

export function LotSidebar({ open, onClose, lot, geometry, onSelectFloorPlan, isLoadingApiData = false, apiError = null }: LotSidebarProps) {
    const { lotSidebar, houseDesign } = useContent();
    const queryClient = useQueryClient();
    // const [showDetailedRules, setShowDetailedRules] = React.useState(false);
    const [showFilter, setShowFilter] = React.useState(false);
    const [showHouseDesigns, setShowHouseDesigns] = React.useState(false);


    // Filter states
    const [bedroom, setBedroom] = React.useState<[number, number]>([2, 4]);
    const [bathroom, setBathroom] = React.useState<[number, number]>([2, 4]);
    const [cars, setCars] = React.useState<[number, number]>([2, 4]);
    const [storeys, setStoreys] = React.useState<[number, number]>([2, 4]);


    const [selectedHouseDesign, setSelectedHouseDesign] = React.useState<HouseDesignItem | null>(null);
    const [selectedImageIdx, setSelectedImageIdx] = React.useState(0);
    const [showQuoteSidebar, setShowQuoteSidebar] = React.useState(false);
    const [quoteDesign, setQuoteDesign] = React.useState<HouseDesignItem | null>(null);

    if (!open || !lot) return null;

    const zoningColor = getZoningColor(lot.zoning);
    const zoningText = lot.zoning || '--';

    const handleShowHouseDesign = () => {
      const filterPayload = { bedroom, bathroom, cars, storeys };
      console.log("Filter Payload:", filterPayload);
      setShowHouseDesigns(true);
      setShowFilter(false);
      setSelectedHouseDesign(null);
    };

    const handleBackClick = () => {
      if (selectedHouseDesign) {
        setSelectedHouseDesign(null);
        setSelectedImageIdx(0);
        setShowHouseDesigns(true);
      } else if (showHouseDesigns) {
        setShowHouseDesigns(false);
        setShowFilter(true);
      } else if (showFilter) {
        setShowFilter(false);
      }
      // else if (showDetailedRules) {
      //   setShowDetailedRules(false);
      // }
    };

    // Callback when a house design item is clicked in HouseDesignList
    const handleDesignClick = (design: HouseDesignItem | null) => {
        if (!design) return; // Handle null case
        
        // Check if this is an overlay-only request
        if ((design as HouseDesignItem & { overlayOnly?: boolean }).overlayOnly) {
            let coordinates: [[number, number], [number, number], [number, number], [number, number]] | null = null;
            if (geometry && geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
                const ring = geometry.coordinates[0];
                if (ring && ring.length >= 4) {
                    coordinates = [ring[0], ring[1], ring[2], ring[3]] as [[number, number], [number, number], [number, number], [number, number]];
                }
            }
            const floorplan  = lot.apiMatches?.[0]?.floorplanUrl;
            if (onSelectFloorPlan && floorplan && coordinates) {
                onSelectFloorPlan({
                    url: floorplan,
                    coordinates,
                });
            }
            return; 
        }
        
        // Only trigger overlay if card is not expanded
        if (!selectedHouseDesign) {
            let coordinates: [[number, number], [number, number], [number, number], [number, number]] | null = null;
            if (geometry && geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
                const ring = geometry.coordinates[0];
                if (ring && ring.length >= 4) {
                    coordinates = [ring[0], ring[1], ring[2], ring[3]] as [[number, number], [number, number], [number, number], [number, number]];
                }
            }
            const floorplanUrl = lot.apiMatches?.[0]?.floorplanUrl || design.floorPlanImage;

            if (onSelectFloorPlan && floorplanUrl && coordinates) {
                onSelectFloorPlan({
                    url: floorplanUrl,
                    coordinates,
                });
            }
        }
      setSelectedHouseDesign(design);
      setSelectedImageIdx(0); // Reset to first image when a new design is selected
      setShowHouseDesigns(false); // Hide the list, show the detailed design
    };

    // Function to render the detailed view of a single house design
    const renderDetailedHouseDesign = (design: HouseDesignItem) => {
      if (!design) return null;
      const images = design.images;
      const facedOption = images[selectedImageIdx]?.faced;


      return (
        <div
          key={design.id}
          className="rounded-2xl border border-gray-200 bg-[#eaf3f2] p-4"
        >
          <div className="flex gap-4">
            <img src={images[0].src} alt="House" className="w-24 h-24 rounded-lg object-cover" />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-lg">{design.title}</div>
                  <div className="text-gray-600 text-sm">{lotSidebar.singleStorey} &nbsp; {houseDesign.area}: {design.area} {houseDesign.ft}</div>
                </div>
                <Star
                    className={`h-6 w-6 ${
                      design.isFavorite ? 'fill-current' : 'text-gray-400'
                    }`}
                    style={{
                      color: design.isFavorite ? colors.primary : undefined,
                    }}
                />
              </div>
              <div className="flex gap-4 mt-2 text-gray-700">
                <span className="flex items-center gap-1"><BedDouble className="h-5 w-5" />{design.bedrooms}</span>
                <span className="flex items-center gap-1"><Bath className="h-5 w-5" />{design.bathrooms}</span>
                <span className="flex items-center gap-1"><Car className="h-5 w-5" />{design.cars}</span>
                <span className="flex items-center gap-1"><Building2 className="h-5 w-5" />{design.storeys}</span>
              </div>
              <div className="mt-2 text-gray-700 text-sm">
                {lotSidebar.facedOption}: <span className="font-semibold text-[#2F5D62]">{facedOption}</span>
              </div>
            </div>
          </div>
        </div>
      );
    };


    const headerTitle = selectedHouseDesign
      ? selectedHouseDesign.title
      : showHouseDesigns
        ? lotSidebar.houseDesigns
        : showFilter
          ? "Build A House"
        // : showDetailedRules
        //   ? lotSidebar.planningRules
          : lotSidebar.buildYourSite;

    const showBackArrow = showFilter || showHouseDesigns || !!selectedHouseDesign;

    const headerContent = (
      <>
        <h2 className="text-2xl font-medium text-[#000000]">
        {headerTitle}
        </h2>
        {!showFilter && (
          <div className="text-gray-600 mt-1 text-base font-normal">
            {selectedHouseDesign ? (
                `Lot ID: ${lot.id || '--'}, ${lot.suburb?.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || '--'} | ${lot.address?.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || '--'}`
            ) : (
                `Lot ID: ${lot.id || '--'}, ${lot.suburb?.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || '--'} | ${lot.address?.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || '--'}`
            )}
            {(showHouseDesigns || selectedHouseDesign) && (
                <div className="mt-2 flex flex-wrap items-center text-xs font-normal">
                    {lot.size && <span className="mr-2 px-2 py-1 bg-gray-100 rounded-md flex items-center text-gray-700"><Diamond className="h-3 w-3 mr-1" />{lot.size}m²</span>}
                    {lot.type && <span className="mr-2 px-2 py-1 bg-gray-100 rounded-md text-gray-700">{lot.type}</span>}
                    {lot.zoning && <span className="mr-2 px-2 py-1 rounded-md text-black font-medium" style={{ backgroundColor: zoningColor }}>{zoningText}</span>}
                    {lot.overlays === 'Flood' && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md">Flood</span>}
                </div>
            )}
          </div>
        )}
      </>
    );

    // Show loading indicator if API data is being fetched
    const showLoading = isLoadingApiData && !lot.apiDimensions;
    
    // Show error state if API call failed
    const showError = apiError && !lot.apiDimensions;

    // Handle retry
    const handleRetry = () => {
      if (lot.id) {
        queryClient.invalidateQueries({ queryKey: ['lot-calculation', lot.id] });
      }
    };

    return (
      <>
        <Sidebar 
          open={open} 
          onClose={onClose}
          onBack={showBackArrow ? handleBackClick : undefined}
          showBackButton={showBackArrow}
          headerContent={headerContent}
        >
          {selectedHouseDesign ? ( // Render detailed house view if a design is selected
            renderDetailedHouseDesign(selectedHouseDesign)
          ) : showHouseDesigns ? ( // Render list of house designs
            <HouseDesignList
              filter={{ bedroom, bathroom, cars, storeys }}
              onShowFilter={() => {
                setShowHouseDesigns(false);
                setShowFilter(true);
              }}
              onDesignClick={handleDesignClick}
              onEnquireNow={(design) => {
                setShowQuoteSidebar(true);
                setQuoteDesign(design);
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
          ) : ( 
            <SummaryView
              lot={lot}
              zoningColor={zoningColor}
              zoningText={zoningText}
              // onShowDetailedRules={() => setShowDetailedRules(true)}
            />
          )}

          {/* Action Button - Conditional */}
            {!showFilter && !showHouseDesigns && !selectedHouseDesign && (
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
        
        {/* Quote Sidebar */}
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
                // size: lot.size
              }}
            />
          </React.Suspense>
        )}
      </>
    );
}