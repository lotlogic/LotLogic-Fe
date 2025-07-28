import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { BedDouble, Bath, Car, Building2, Star, Funnel } from "lucide-react";
import { HouseDesignItem, HouseDesignListProps } from "@/types/houseDesign";
import { initialHouseData } from "@/constants/houseDesigns";
import { houseDesign, filter as filterContent, lotSidebar, colors } from "@/constants/content";

export function HouseDesignList({ filter, onShowFilter, onDesignClick, onEnquireNow }: HouseDesignListProps) {
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
          if (expandedIdx === idx) {
            const images = house.images;
            const mainImage = images[selectedImageIdx].src;
            const facedOption = images[selectedImageIdx].faced;
            return (
              <div
                key={house.id}
                className="rounded-2xl border border-gray-200 bg-[#eaf3f2] p-4"
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                    e.stopPropagation();
                    setExpandedIdx(null);
                    onDesignClick(null);
                }}
              >
                <div className="flex gap-4">
                  <img src={images[0].src} alt="House" className="w-24 h-24 rounded-lg object-cover" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-lg">{house.title}</div>
                        <div className="text-gray-600 text-sm">{lotSidebar.singleStorey} &nbsp; {houseDesign.area}: {house.area} {houseDesign.ft}</div>
                      </div>
                      {/* Collapse button */}
                      {/* <button
                        className="ml-2 p-1 rounded-full hover:bg-gray-200"
                        onClick={e => {
                          e.stopPropagation();
                          setExpandedIdx(null);
                          onDesignClick(null);
                        }}
                        aria-label="Collapse"
                      >
                        <ChevronUp className="h-5 w-5" />
                      </button> */}
                      <Star
                        className={`h-6 w-6 cursor-pointer transition-colors duration-200 ${
                          house.isFavorite ? 'fill-current' : 'text-gray-400'
                        }`}
                        style={{
                          color: house.isFavorite ? colors.primary : undefined,
                        }}
                        onClick={(e) => handleStarClick(e, house.id)}
                        data-star-icon
                      />
                    </div>
                    <div className="flex gap-4 mt-2 text-gray-700">
                      <span className="flex items-center gap-1"><BedDouble className="h-5 w-5" />{house.bedrooms}</span>
                      <span className="flex items-center gap-1"><Bath className="h-5 w-5" />{house.bathrooms}</span>
                      <span className="flex items-center gap-1"><Car className="h-5 w-5" />{house.cars}</span>
                      <span className="flex items-center gap-1"><Building2 className="h-5 w-5" />{house.storeys}</span>
                    </div>
                    <div className="mt-2 text-gray-700 text-sm">
                      {lotSidebar.facedOption}: <span className="font-semibold text-[#2F5D62]">{facedOption}</span>
                    </div>
                  </div>
                </div>
                <img src={mainImage} alt="Main" className="w-full h-56 rounded-xl object-cover mt-4" />
                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="flex gap-2" data-thumbnails>
                    {images.map((img, imgIdx) => (
                      <button
                        key={img.src}
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedImageIdx(imgIdx);
                        }}
                        className={`w-14 h-14 rounded object-cover border-2 ${selectedImageIdx === imgIdx ? 'border-[#2F5D62]' : 'border-transparent'}`}
                        style={{ padding: 0, background: 'none' }}
                        tabIndex={0}
                        aria-label={`Select image ${imgIdx + 1}`}
                        data-ignore-collapse
                      >
                        <img src={img.src} className="w-14 h-14 rounded object-cover" alt={`Thumbnail ${imgIdx + 1}`} />
                      </button>
                    ))}
                  </div>
                  <Button
                    className="bg-[#2F5D62] text-white px-9 py-3 rounded-lg font-medium"
                    data-ignore-collapse
                    onClick={e => {
                      e.stopPropagation();
                      if (onEnquireNow) {
                        onEnquireNow(house);
                      }
                    }}
                  >
                    {houseDesign.enquireNow}
                  </Button>
                </div>
              </div>
            );
          }
          return (
            <div
              key={house.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 cursor-pointer hover:shadow flex gap-4 items-center"
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
              <img src={house.image} alt={house.title} className="w-24 h-24 rounded-lg object-cover" />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-lg">{house.title}</div>
                    <div className="text-gray-600 text-sm">{lotSidebar.singleStorey} &nbsp; {houseDesign.area}: {house.area} {houseDesign.ft}</div>
                  </div>
                  <Star
                    className={`h-6 w-6 cursor-pointer transition-colors duration-200 ${
                      house.isFavorite ? 'fill-current' : 'text-gray-400'
                    }`}
                    style={{
                      color: house.isFavorite ? colors.primary : undefined,
                    }}
                    onClick={(e) => handleStarClick(e, house.id)}
                    data-star-icon
                  />
                </div>
                <div className="flex gap-4 mt-2 text-gray-900">
                  <span className="flex items-center gap-1"><BedDouble className="h-5 w-5" />{house.bedrooms}</span>
                  <span className="flex items-center gap-1"><Bath className="h-5 w-5" />{house.bathrooms}</span>
                  <span className="flex items-center gap-1"><Car className="h-5 w-5" />{house.cars}</span>
                  <span className="flex items-center gap-1"><Building2 className="h-5 w-5" />{house.storeys}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}