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
  mapInstance: any;
}

export interface SavedButtonProps {
  onClick: () => void;
  isActive?: boolean;
}

export interface SavedPropertiesSidebarProps {
  open: boolean;
  onClose: () => void;
  savedProperties: any[];
  onViewDetails: (property: any) => void;
}

export interface SummaryViewProps {
  lot: any;
  onClose: () => void;
}

export interface DetailedRulesViewProps {
  lot: any;
  onClose: () => void;
} 