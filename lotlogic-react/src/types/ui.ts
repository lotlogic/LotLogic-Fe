// UI component types and interfaces

export interface Option {
  id: string;
  label: string;
  logo?: string;
  logoText?: string;
}

export interface MultiSelectProps {
  options: Option[];
  selectedOptions: string[];
  onSelectionChange: (selected: string[]) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export interface SearchResult {
  id: string;
  place_name: string;
  center: [number, number];
}

export interface SearchControlProps {
  onResultSelect: (coordinates: [number, number]) => void;
}

export interface LayersButtonProps {
  onClick: () => void;
  isActive?: boolean;
}

export interface ZoningLayersSidebarProps {
  open: boolean;
  onClose: () => void;
  mapInstance: mapboxgl.Map | null;
}

export interface SavedButtonProps {
  onClick: () => void;
  isActive?: boolean;
}

export interface SavedPropertiesSidebarProps {
  open: boolean;
  onClose: () => void;
  savedProperties: SavedProperty[];
  onViewDetails: (property: SavedProperty) => void;
}

export interface SavedProperty {
  id: string;
  lotId: string;
  suburb: string;
  address: string;
  size: number;
  zoning: string;
  overlays?: string;
  houseDesign: {
    id: string;
    title: string;
    image: string;
    bedrooms: number;
    bathrooms: number;
    cars: number;
    storeys: number;
    isFavorite: boolean;
  };
}

export interface SummaryViewProps {
  lot: LotData;
  onClose: () => void;
}

export interface DetailedRulesViewProps {
  lot: LotData;
  onClose: () => void;
}

export interface LotData {
  id: string | number;
  suburb?: string;
  address?: string;
  size?: number;
  type?: string;
  zoning?: string;
  overlays?: string;
} 