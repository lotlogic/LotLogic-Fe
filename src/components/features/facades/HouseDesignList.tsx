import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { BedDouble, Bath, Car, Building2, Bookmark, Funnel, MailQuestionMark, CheckCircle, Check } from "lucide-react";
import { HouseDesignItem, HouseDesignListProps } from "@/types/houseDesign";
import { initialHouseData } from "@/constants/houseDesigns";
import { houseDesign, filter as filterContent, lotSidebar, colors } from "@/constants/content";
import { Bounce, ToastContainer, toast } from 'react-toastify';

export function HouseDesignList({ filter, onShowFilter, onDesignClick, onEnquireNow, onViewFloorPlan, onViewFacades }: HouseDesignListProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [houseDesigns, setHouseDesigns] = useState<HouseDesignItem[]>(initialHouseData);

  const filteredHouses = houseDesigns.filter(house => {
    return (
      filter.bedroom.includes(house.bedrooms) &&
      filter.bathroom.includes(house.bathrooms) &&
      filter.car.includes(house.cars)
    );

  });

  const handleStarClick = (event: React.MouseEvent, clickedHouseId: string) => {
    // toast.success("Design saved to your Shortlist", {
    //   icon: (
    //     <div className="w-7 h-7 p-1 rounded-full border-5 border-[#2F5D62] flex items-center justify-center">
    //       <Check strokeWidth={4} className="w-4 h-6 text-[#2F5D62]" />
    //     </div>
    //   ),
    //   className: 'ml-2'
    // });
    toast.success("Design saved to your Shortlist", {
      icon: (
        <div className="w-7 h-7 p-1 rounded-full border-4 border-[#2F5D62] flex items-center justify-center">
          <Check strokeWidth={4} className="w-4 h-6 text-[#2F5D62]" />
        </div>
      ),
      className: 'ml-8'
    });
    event.stopPropagation();
    setHouseDesigns(prevDesigns =>
      prevDesigns.map(house =>
        house.id === clickedHouseId
          ? { ...house, isFavorite: !house.isFavorite }
          : house
      )
    );
  };

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xl font-bold">
          <span className="text-[#2F5D62]">{filteredHouses.length}</span> {houseDesign.title}
        </span>
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
          const mainImage = images[selectedImageIdx]?.src || house.image;
          const facedOption = images[selectedImageIdx]?.faced;

          return (
            <div
              key={house.id}
              className={`rounded-2xl border border-gray-200 p-4 transition-all duration-300 ${isExpanded ? 'bg-[#eaf3f2]' : 'bg-white hover:shadow-md'}`}
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
                  src={house.floorPlanImage || images[0]?.src || house.image} 
                  alt="Floor Plan" 
                  className="w-24 h-24 rounded-lg object-cover flex-shrink-0" 
                />
                
                {/* House Details and Buttons on the right */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-lg truncate">{house.title}</div>
                      <div className="text-gray-600 text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                        {lotSidebar.singleStorey} {houseDesign.area}: {house.area} {houseDesign.ft}
                      </div>
                    </div>
                    <Bookmark
                      className={`h-6 w-6 cursor-pointer transition-colors duration-200 flex-shrink-0 ${
                        house.isFavorite ? 'fill-current' : 'text-gray-400'
                      }`}
                      style={{
                        color: house.isFavorite ? colors.primary : undefined,
                      }}
                      onClick={(e) => handleStarClick(e, house.id)}
                      data-star-icon
                    />
                    <ToastContainer 
                      position="bottom-right"
                      autoClose={500}
                      hideProgressBar={true}
                      closeOnClick
                      pauseOnHover
                      transition={Bounce}
                    />
                  </div>
                  
                  {/* Specifications Icons */}
                  <div className="flex gap-4 mt-2 text-gray-700 text-sm flex-wrap">
                    <span className="flex items-center gap-1"><BedDouble className="h-5 w-5 text-gray-500" />{house.bedrooms}</span>
                    <span className="flex items-center gap-1"><Bath className="h-5 w-5 text-gray-500" />{house.bathrooms}</span>
                    <span className="flex items-center gap-1"><Car className="h-5 w-5 text-gray-500" />{house.cars}</span>
                    <span className="flex items-center gap-1"><Building2 className="h-5 w-5 text-gray-500" />{house.storeys}</span>
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
                        className="bg-[#2F5D62] text-white py-2 px-4 rounded-lg font-medium hover:bg-[#1a3d42] transition-colors flex-1"
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
                        className="bg-[#2F5D62] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#1a3d42] transition-colors flex-1"
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
                      className="border border-gray-300 bg-white text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-[#2F5D62] hover:text-white hover:border-[#2F5D62] transition-colors w-full flex items-center justify-center gap-2"
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