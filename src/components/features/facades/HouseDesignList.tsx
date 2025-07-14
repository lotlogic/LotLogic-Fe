import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { BedDouble, Bath, Car, Building2, Star, Funnel, ChevronUp } from "lucide-react";

// Define the type for a single house design item
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

const initialHouseData: HouseDesignItem[] = [
  {
    id: "design1",
    title: "Allium Place, Orlando",
    area: "2,096.00",
    image: "/images/brick.jpg",
    images: [
      { src: "/images/brick.jpg", faced: "Brick" },
      { src: "/images/timmerland.jpg", faced: "Render" },
      { src: "/images/weatherboard.jpg", faced: "Weatherboard" },
    ],
    bedrooms: 4,
    bathrooms: 2,
    cars: 2,
    storeys: 2,
    isFavorite: false,
    floorPlanImage: "/images/floorplan.jpg",
  },
  {
    id: "design2",
    title: "Example Design B",
    area: "1,800.00",
    image: "/images/timmerland.jpg",
    images: [
      { src: "/images/timmerland.jpg", faced: "Timber" },
      { src: "/images/brick.jpg", faced: "Brick" },
    ],
    bedrooms: 4,
    bathrooms: 2,
    cars: 2,
    storeys: 2,
    isFavorite: false,
    floorPlanImage: "/images/floorplan.jpg",
  },
];

interface HouseDesignListProps {
  filter: {
    bedroom: [number, number];
    bathroom: [number, number];
    cars: [number, number];
    storeys: [number, number];
  };
  onShowFilter: () => void;
  onDesignClick: (design: HouseDesignItem | null) => void;
}

export function HouseDesignList({ filter, onShowFilter, onDesignClick }: HouseDesignListProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [houseDesigns, setHouseDesigns] = useState<HouseDesignItem[]>(initialHouseData);

  const filteredHouses = houseDesigns.filter(house => {
    const [minBed, maxBed] = filter.bedroom;
    const [minBath, maxBath] = filter.bathroom;
    const [minCar, maxCar] = filter.cars;
    const [minStorey, maxStorey] = filter.storeys;
    return (
      house.bedrooms >= minBed && house.bedrooms <= maxBed &&
      house.bathrooms >= minBath && house.bathrooms <= maxBath &&
      house.cars >= minCar && house.cars <= maxCar &&
      house.storeys >= minStorey && house.storeys <= maxStorey
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
          <span className="text-[#2F5D62]">{filteredHouses.length}</span> House Designs
        </span>
        <Button
          variant="outline"
          className="border border-gray-300 rounded-lg px-3 py-1 flex items-center gap-2"
          onClick={onShowFilter}
        >
          <Funnel className="h-4 w-4" />
          <span>Filter</span>
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
              >
                <div className="flex gap-4">
                  <img src={images[0].src} alt="House" className="w-24 h-24 rounded-lg object-cover" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-lg">{house.title}</div>
                        <div className="text-gray-600 text-sm">Single Storey &nbsp; Area: {house.area} ft</div>
                      </div>
                      {/* Collapse button */}
                      <button
                        className="ml-2 p-1 rounded-full hover:bg-gray-200"
                        onClick={e => {
                          e.stopPropagation();
                          setExpandedIdx(null);
                          onDesignClick(null);
                        }}
                        aria-label="Collapse"
                      >
                        <ChevronUp className="h-5 w-5" />
                      </button>
                      <Star
                        className={`h-6 w-6 cursor-pointer transition-colors duration-200 ${
                          house.isFavorite ? 'text-[#2F5D62] fill-[#2F5D62]' : 'text-gray-400'
                        }`}
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
                      Faced Option: <span className="font-semibold text-[#2F5D62]">{facedOption}</span>
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
                    onClick={e => e.stopPropagation()}
                  >
                    Enquire Now
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
                  onDesignClick(house);
                }
              }}
            >
              <img src={house.image} alt={house.title} className="w-24 h-24 rounded-lg object-cover" />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-lg">{house.title}</div>
                    <div className="text-gray-600 text-sm">Single Storey &nbsp; Area: {house.area} ft</div>
                  </div>
                  <Star
                    className={`h-6 w-6 cursor-pointer transition-colors duration-200 ${
                      house.isFavorite ? 'text-[#2F5D62] fill-[#2F5D62]' : 'text-gray-400'
                    }`}
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