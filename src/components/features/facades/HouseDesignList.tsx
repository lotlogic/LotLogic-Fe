import { Bath, BedDouble, Bookmark, Car, Funnel, MailQuestionMark } from "lucide-react";
import React, { useEffect, useState } from "react";
import { colors, filter as filterContent, houseDesign, lotSidebar, getColorClass } from "../../../constants/content";
import { useHouseDesigns } from "../../../hooks/useHouseDesigns";
import type { HouseDesignFilterRequest } from "../../../lib/api/lotApi";
import { getImageUrl } from "../../../lib/api/lotApi";
import type { HouseDesignItem, HouseDesignListProps } from "../../../types/houseDesign";
import { Button } from "../../ui/Button";
import { showToast } from "../../ui/Toast";

// Define the type for saved data
interface SavedHouseData {
  lotId: string | number;
  houseDesign: HouseDesignItem & { isFavorite: boolean };
}

export function HouseDesignList({ filter, lot, onShowFilter, onDesignClick, onEnquireNow, onViewFloorPlan, onViewFacades }: HouseDesignListProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [, setSelectedImageIdx] = useState(0);
  const [showToastMessage, setShowToastMessage] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [favoriteStates, setFavoriteStates] = useState<Record<string, boolean>>({});

  // Handle toast display with useEffect
  useEffect(() => {
    if (showToastMessage) {
      showToast(showToastMessage);
      setShowToastMessage(null);
    }
  }, [showToastMessage]);


  const apiFilters: HouseDesignFilterRequest = {
    bedroom: filter.bedroom,
    bathroom: filter.bathroom,
    car: filter.car,
    min_size: filter.min_size && !isNaN(filter.min_size) ? filter.min_size : undefined,
    max_size: filter.max_size && !isNaN(filter.max_size) ? filter.max_size : undefined,
  };

  // Fetch house designs from API
  const { data: apiResponse, isLoading, error } = useHouseDesigns(
    lot.lotId?.toString() || null,
    apiFilters,
    true
  );

  

  // Safely extract house designs with fallback
  const houseDesigns = (apiResponse?.houseDesigns as HouseDesignItem[]) || [];

  const filteredHouses = houseDesigns;

  const handleStarClick = (event: React.MouseEvent, clickedHouseId: string) => {
    event.stopPropagation();
    
    const clickedHouse = (houseDesigns as HouseDesignItem[]).find(house => house.id === clickedHouseId);
    if (!clickedHouse) return;
    
    const currentFavorite = favoriteStates[clickedHouseId] ?? clickedHouse.isFavorite;
    const newFavorite = !currentFavorite;
    
    // Update the favorite states
    setFavoriteStates(prev => ({
      ...prev,
      [clickedHouseId]: newFavorite
    }));
    
    if (newFavorite) {
      const savedData = JSON.parse(localStorage.getItem('userFavorite') ?? "[]");
      
      // Check if this lot and house design combination already exists
      const existingIndex = savedData.findIndex((data: SavedHouseData) => 
        data.lotId === lot.lotId && data.houseDesign.id === clickedHouse.id
      );
      
      if (existingIndex === -1) {
        // Only add if it doesn't already exist
        savedData.push({
          ...lot,
          houseDesign: {...clickedHouse, isFavorite: newFavorite}
        });
        localStorage.setItem('userFavorite', JSON.stringify(savedData));
        
        setShowToastMessage({
          message: 'Design saved to your Shortlist',
          type: 'success'
        });
      }
    } else {
      const savedData = JSON.parse(localStorage.getItem('userFavorite') ?? "[]");
      const newFav = savedData.filter((data: SavedHouseData) => {
        if((data.lotId == lot.lotId && data.houseDesign.id == clickedHouse.id) == false) {
          return data;
        }
      })
      localStorage.setItem('userFavorite', JSON.stringify(newFav));
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="p-6 overflow-y-auto h-full">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6 overflow-y-auto h-full">
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load House Designs</h3>
              <p className="text-gray-600 mb-4">We encountered an issue while loading the house designs for this lot.</p>
            </div>
            <div className="space-y-3">
              <Button
                onClick={() => window.location.reload()}
                className={`w-full ${getColorClass('primary')} text-white py-2 px-4 rounded-lg font-medium hover:${getColorClass('accent')} transition-colors`}
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={onShowFilter}
                className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Adjust Filters
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show no results state - simplified condition
  if (!isLoading && filteredHouses.length === 0) {
    return (
      <div className="p-6 overflow-y-auto h-full">
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No House Designs Found</h3>
              <p className="text-gray-600 mb-4">
                We couldn't find any house designs matching your current criteria. Try adjusting your filters to see more options.
              </p>
            </div>
            <div className="space-y-3">
              <Button
                onClick={onShowFilter}
                className={`w-full ${getColorClass('primary')} text-white py-2 px-4 rounded-lg font-medium hover:${getColorClass('accent')} transition-colors`}
              >
                Adjust Filters
              </Button>
              <div className="text-sm text-gray-500">
                <p className="mb-2">Try these suggestions:</p>
                <ul className="text-left space-y-1">
                  <li>• Increase the number of bedrooms or bathrooms</li>
                  <li>• Adjust the size range</li>
                  <li>• Change the number of car spaces</li>
                  <li>• Clear some filters to see all available designs</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xl font-bold">
            <span className={`${getColorClass('primary', 'text')}`}>{filteredHouses.length}</span> {houseDesign.title}
          </span>
          {/* {(apiHouseDesigns as HouseDesignItem[])?.length > 0 && (
            <div className="text-xs text-green-600 mt-1">
              ✓ Loaded from database
            </div>
          )} */}
        </div>
        <Button
          variant="outline"
          className="border border-gray-300 rounded-lg px-3 py-1 flex items-center gap-2"
          onClick={onShowFilter}
        >
          <Funnel className="h-4 w-4" />
          <span>{filterContent.title}</span>
        </Button>
      </div>
      <div className="space-y-6">
        {filteredHouses.map((house, idx) => {
          const isExpanded = expandedIdx === idx;
          const images = house.images;
          

          return (
            <div
              key={house.id}
              className={`rounded-2xl border border-gray-200 p-4 transition-all duration-300 ${isExpanded ? getColorClass('background.accent') : 'bg-white hover:shadow-md'}`}
              onClick={() => {
                if (expandedIdx === idx) {
                  setExpandedIdx(null);
                  onDesignClick(null);
                } else {
                  setExpandedIdx(idx);
                  setSelectedImageIdx(0);
                  const houseWithOverlayOnly = { ...house, overlayOnly: true };
                  onDesignClick(houseWithOverlayOnly);
                }
              }}
            >
              <div className="flex gap-4 items-start">
                {/* Floor Plan Thumbnail on the left */}
                <img 
                  src={getImageUrl(house.floorPlanImage) || images[0]?.src || house.image} 
                  alt="Floor Plan" 
                  className="w-24 h-24 rounded-lg object-cover flex-shrink-0" 
                />
                
                {/* House Details and Buttons on the right */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-lg mb-1 truncate">{house.title}</div>
                      <div className="text-black text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                        {lotSidebar.singleStorey} {houseDesign.area}: {house.area} {houseDesign.ft}
                      </div>
                    </div>
                    <Bookmark
                      className={`h-6 w-6 text-gray-600 cursor-pointer transition-colors duration-200 flex-shrink-0 ${
                        (favoriteStates[house.id] ?? house.isFavorite) ? 'fill-current' : 'text-gray-400'
                      }`}
                      style={{
                        color: (favoriteStates[house.id] ?? house.isFavorite) ? colors.primary : undefined,
                      }}
                      onClick={(e) => handleStarClick(e, house.id)}
                      data-star-icon
                    />
                  </div>
                  
                  {/* Specifications Icons */}
                  <div className="flex gap-4 mt-2 text-black text-sm font-medium bold flex-wrap">
                    <span className="flex items-center gap-1"><BedDouble className="h-5 w-5 text-black" />{house.bedrooms}</span>
                    <span className="flex items-center gap-1"><Bath className="h-5 w-5 text-black" />{house.bathrooms}</span>
                    <span className="flex items-center gap-1"><Car className="h-5 w-5 text-black" />{house.cars}</span>
                  </div>
                </div>
              </div>

              {/* Expanded content for detailed view */}
              {isExpanded && (
                <div className="mt-4 pt-1">
                  
                  {/* Action Buttons for Expanded View */}
                  <div className="space-y-3">
                    {/* First Row: View Floor plan and View Facades */}
                    <div className="flex gap-3">
                      <Button
                        onClick={e => {
                          e.stopPropagation();
                          if (onViewFloorPlan) {
                            onViewFloorPlan(house);
                          }
                        }}
                        className={`${getColorClass('primary')} text-white py-2 px-4 rounded-lg font-medium hover:${getColorClass('accent')} transition-colors flex-1`}
                      >
                        View Floor plan
                      </Button>
                      <Button
                        onClick={e => {
                          e.stopPropagation();
                          if (onViewFacades) {
                            onViewFacades(house);
                          }
                        }}
                        className={`${getColorClass('primary')} text-white py-3 px-4 rounded-lg font-medium hover:${getColorClass('accent')} transition-colors flex-1`}
                      >
                        View Facades
                      </Button>
                    </div>
                    
                    {/* Second Row: Enquire Now */}
                    <Button
                      variant="outline"
                      onClick={e => {
                        e.stopPropagation();
                        if (onEnquireNow) {
                          onEnquireNow(house);
                        }
                      }}
                      className={`border border-gray-300 bg-white text-gray-700 py-3 px-4 rounded-lg font-medium hover:${getColorClass('primary')} hover:text-white hover:${getColorClass('primary', 'border')} transition-colors w-full flex items-center justify-center gap-2`}
                    >
                      <MailQuestionMark className="h-4 w-4" />
                      Enquire Now
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}