import { Diamond } from "lucide-react";
import { Button } from "@/components/ui/Button";
import React from 'react';
import { LotSidebarProps } from "@/types/lot";
import { getZoningColor } from "@/lib/utils/zoning";
import { SummaryView } from "./SummaryView";
import { DetailedRulesView } from "./DetailedRulesView";
import { FilterSectionWithSingleLineSliders } from "@/components/ui/HouseDesignFilter";
import { HouseDesignList } from "../facades/HouseDesignList";
import { BedDouble, Bath, Car, Building2, Star } from "lucide-react";
import { Sidebar } from "@/components/ui/Sidebar";
import { GetYourQuoteSidebar } from "../quote/QuoteSideBar";


interface HouseDesignItem {
    id: string;
    title: string;
    area: string;
    image: string;
    images: { src: string; faced: string; }[];
    bedrooms: number;
    bathrooms: number;
    cars: number;
    storeys: number;
    isFavorite: boolean;
    floorPlanImage?: string;
}

export function LotSidebar({ open, onClose, lot, geometry, onSelectFloorPlan }: LotSidebarProps) {
    const [showDetailedRules, setShowDetailedRules] = React.useState(false);
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
      } else if (showDetailedRules) {
        setShowDetailedRules(false);
      }
    };

    // Callback when a house design item is clicked in HouseDesignList
    const handleDesignClick = (design: HouseDesignItem | null) => {
        if (!design) return; // Handle null case
        
        // Only trigger overlay if card is not expanded
        if (!selectedHouseDesign) {
            let coordinates: [[number, number], [number, number], [number, number], [number, number]] | null = null;
            if (geometry && geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
                const ring = geometry.coordinates[0];
                if (ring && ring.length >= 4) {
                    coordinates = [ring[0], ring[1], ring[2], ring[3]] as [[number, number], [number, number], [number, number], [number, number]];
                }
            }
            if (onSelectFloorPlan && design.floorPlanImage && coordinates) {
                onSelectFloorPlan({
                    url: design.floorPlanImage,
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
      const mainImage = images[selectedImageIdx]?.src;
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
                  <div className="text-gray-600 text-sm">Single Storey &nbsp; Area: {design.area} ft</div>
                </div>
                <Star
                    className={`h-6 w-6 ${
                      design.isFavorite ? 'text-[#2F5D62] fill-[#2F5D62]' : 'text-gray-400'
                    }`}

                />
              </div>
              <div className="flex gap-4 mt-2 text-gray-700">
                <span className="flex items-center gap-1"><BedDouble className="h-5 w-5" />{design.bedrooms}</span>
                <span className="flex items-center gap-1"><Bath className="h-5 w-5" />{design.bathrooms}</span>
                <span className="flex items-center gap-1"><Car className="h-5 w-5" />{design.cars}</span>
                <span className="flex items-center gap-1"><Building2 className="h-5 w-5" />{design.storeys}</span>
              </div>
              <div className="mt-2 text-gray-700 text-sm">
                Faced Option: <span className="font-semibold text-[#2F5D62]">{facedOption}</span>
              </div>
            </div>
          </div>
          {/* Main image */}
          <img src={mainImage} alt="Main" className="w-full h-56 rounded-xl object-cover mt-4" />
          {/* Thumbnails and Enquire button  */}
          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="flex gap-2">
              {images.map((img, imgIdx) => (
                <button
                  key={img.src}
                  onClick={() => setSelectedImageIdx(imgIdx)}
                  className={`w-14 h-14 rounded object-cover border-2 ${selectedImageIdx === imgIdx ? 'border-[#2F5D62]' : 'border-transparent'}`}
                  style={{ padding: 0, background: 'none' }}
                  tabIndex={0}
                  aria-label={`Select image ${imgIdx + 1}`}
                >
                  <img src={img.src} className="w-14 h-14 rounded object-cover" alt={`Thumbnail ${imgIdx + 1}`} />
                </button>
              ))}
            </div>
            <Button
              className="bg-[#2F5D62] text-white px-9 py-3 rounded-lg font-medium"
              onClick={() => setShowQuoteSidebar(true)}
            >
              Enquire Now
            </Button>
          </div>
        </div>
      );
    };


    const headerTitle = selectedHouseDesign
      ? selectedHouseDesign.title
      : showHouseDesigns
        ? 'House Designs'
        : showDetailedRules
          ? 'Planning Rules'
          : 'Build Your Site';

    const showBackArrow = showDetailedRules || showFilter || showHouseDesigns || !!selectedHouseDesign;

    const headerContent = (
      <>
        <h2 className="text-2xl font-medium text-[#000000]">
          {headerTitle}
        </h2>
        <div className="text-gray-600 mt-1 text-base font-normal">
          {selectedHouseDesign ? (
              `Lot ID: ${lot.id || '--'}, ${lot.suburb || '--'} | ${lot.address || '--'}`
          ) : (
              `Lot ID: ${lot.id || '--'}, ${lot.suburb || '--'} | ${lot.address || '--'}`
          )}
          {(showDetailedRules || showFilter || showHouseDesigns || selectedHouseDesign) && (
              <div className="mt-2 flex flex-wrap items-center text-xs font-normal">
                  {lot.size && <span className="mr-2 px-2 py-1 bg-gray-100 rounded-md flex items-center text-gray-700"><Diamond className="h-3 w-3 mr-1" />{lot.size}m²</span>}
                  {lot.type && <span className="mr-2 px-2 py-1 bg-gray-100 rounded-md text-gray-700">{lot.type}</span>}
                  {lot.zoning && <span className="mr-2 px-2 py-1 rounded-md text-black font-medium" style={{ backgroundColor: zoningColor }}>{zoningText}</span>}
                  {lot.overlays === 'Flood' && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md">Flood</span>}
              </div>
          )}
        </div>
      </>
    );

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
              onDesignClick={handleDesignClick} // Pass the handler
            />
          ) : showFilter ? ( // Render filter section
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
          ) : !showDetailedRules ? ( // Render summary view
            <SummaryView
              lot={lot}
              zoningColor={zoningColor}
              zoningText={zoningText}
              onShowDetailedRules={() => setShowDetailedRules(true)}
            />
          ) : ( // Render detailed rules view
            <DetailedRulesView lot={lot} />
          )}

          {/* Action Button - Conditional */}
          {!showDetailedRules && !showFilter && !showHouseDesigns && !selectedHouseDesign && (
            <div className="sticky bottom-0 p-6 border-t border-gray-200 bg-white rounded-b-2xl">
              <Button
                className="w-full text-lg py-3 rounded-lg"
                onClick={() => setShowFilter(true)}
              >
                Show Me What I Can Build Here
              </Button>
            </div>
          )}
        </Sidebar>
        
        {/* Quote Sidebar */}
        {showQuoteSidebar && selectedHouseDesign && (
          <React.Suspense fallback={<div>Loading...</div>}>
            <GetYourQuoteSidebar
              open={showQuoteSidebar}
              onClose={() => setShowQuoteSidebar(false)}
              selectedHouseDesign={selectedHouseDesign}
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