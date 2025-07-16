export interface HouseDesignItem {
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
  overlayOnly?: boolean;
}

export interface HouseDesignListProps {
  filter: {
    bedroom: [number, number];
    bathroom: [number, number];
    cars: [number, number];
    storeys: [number, number];
  };
  onShowFilter: () => void;
  onDesignClick: (design: HouseDesignItem | null) => void;
  onEnquireNow?: (design: HouseDesignItem) => void;
}

export interface GetYourQuoteSidebarProps {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  selectedHouseDesign: HouseDesignItem | null;
  lotDetails: {
    id: string | number; 
    suburb: string;
    address: string;
    size?: number;
  };
}

export interface FilterSectionProps {
  bedroom: [number, number];
  setBedroom: React.Dispatch<React.SetStateAction<[number, number]>>;
  bathroom: [number, number];
  setBathroom: React.Dispatch<React.SetStateAction<[number, number]>>;
  cars: [number, number];
  setCars: React.Dispatch<React.SetStateAction<[number, number]>>;
  storeys: [number, number];
  setStoreys: React.Dispatch<React.SetStateAction<[number, number]>>;
  onShowHouseDesign: () => void;
}

export interface FilterRowProps {
  icon: React.ReactNode;
  label: string;
  value: [number, number];
  setValue: (v: [number, number]) => void;
  minRange: number;
  maxRange: number;
}

export type RangeValue = [number, number];
export type RangeSetter = React.Dispatch<React.SetStateAction<RangeValue>>;
