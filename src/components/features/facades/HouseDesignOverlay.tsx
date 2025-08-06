import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight, BedDouble, Bath, Car, Building2, Bookmark } from "lucide-react";
import { Button } from "../../ui/Button";
import type { HouseDesignItem } from "../../../types/houseDesign";
import { houseDesign, lotSidebar, colors } from "../../../constants/content";

export function HouseDesignDetailOverlay({
  house,
  onClose,
  onEnquireNow,
}: {
  house: HouseDesignItem | null;
  onClose: () => void;
  onEnquireNow: (house: HouseDesignItem) => void;
}) {
  const [currentView, setCurrentView] = useState<'main' | 'floorPlan' | 'facades'>('main');
  const [currentFacadeIdx, setCurrentFacadeIdx] = useState(0);
  const [isFavorite, setIsFavorite] = useState(house?.isFavorite || false);

  if (!house) return null;

  const images = house.images || [];
  const mainImage = images.length > 0 ? images[0].src : '';
  const floorPlanImage = house.floorPlanImage || '';

  const handleStarClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsFavorite(prev => !prev);
  };

  const handleNextFacade = () => {
    setCurrentFacadeIdx((prevIdx) => (prevIdx + 1) % images.length);
  };

  const handlePrevFacade = () => {
    setCurrentFacadeIdx((prevIdx) => (prevIdx - 1 + images.length) % images.length);
  };

  const currentFacade = images[currentFacadeIdx];

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-lg w-full max-w-2xl h-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold">{house.title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* House Details */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-gray-600 text-sm">{lotSidebar.singleStorey} &nbsp; {houseDesign.area}: {house.area} {houseDesign.ft}</div>
              <div className="flex gap-4 mt-2 text-gray-700">
                <span className="flex items-center gap-1"><BedDouble className="h-5 w-5" />{house.bedrooms}</span>
                <span className="flex items-center gap-1"><Bath className="h-5 w-5" />{house.bathrooms}</span>
                <span className="flex items-center gap-1"><Car className="h-5 w-5" />{house.cars}</span>
                <span className="flex items-center gap-1"><Building2 className="h-5 w-5" />{house.storeys}</span>
              </div>
            </div>
            <Bookmark
              className={`h-7 w-7 cursor-pointer transition-colors duration-200 ${
                isFavorite ? 'fill-current' : 'text-gray-400'
              }`}
              style={{ color: isFavorite ? colors.primary : undefined }}
              onClick={handleStarClick}
            />
          </div>

          {/* Image/Plan/Facade Display Area */}
          <div className="relative w-full aspect-video bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
            {currentView === 'main' && (
              <img src={mainImage} alt="House Main" className="w-full h-full object-cover rounded-xl" />
            )}

            {currentView === 'floorPlan' && (
              floorPlanImage ? (
                <img src={floorPlanImage} alt="Floor Plan" className="w-full h-full object-contain rounded-xl p-4" />
              ) : (
                <p className="text-gray-500">Floor plan not available.</p>
              )
            )}

            {currentView === 'facades' && (
              currentFacade ? (
                <>
                  <img src={currentFacade.src} alt={`Facade ${currentFacadeIdx + 1}`} className="w-full h-full object-cover rounded-xl" />
                  <div className="absolute top-0 left-0 right-0 p-4 text-white text-center text-lg font-semibold bg-black bg-opacity-30">
                    {lotSidebar.facedOption}: {currentFacade.faced}
                  </div>
                  {images.length > 1 && ( // Only show arrows if there's more than one facade
                    <>
                      <button onClick={handlePrevFacade} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full">
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button onClick={handleNextFacade} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full">
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <p className="text-gray-500">Facades not available.</p>
              )
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                className={currentView === 'floorPlan' ? "bg-[#2F5D62] text-white" : "border border-gray-300 text-gray-700"}
                onClick={() => setCurrentView('floorPlan')}
              >
                View Floor Plan
              </Button>
              <Button
                className={currentView === 'facades' ? "bg-[#2F5D62] text-white" : "border border-gray-300 text-gray-700"}
                onClick={() => { setCurrentView('facades'); setCurrentFacadeIdx(0); }} // Reset facade index on view
              >
                View Facades
              </Button>
            </div>
            <Button
              className="w-full bg-[#2F5D62] text-white px-9 py-3 rounded-lg font-medium hover:bg-[#1a3d42] transition-colors"
              onClick={() => onEnquireNow(house)}
            >
              {houseDesign.enquireNow || "Enquire Now"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}