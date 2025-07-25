import { ReactNode } from 'react';

export interface LotSidebarProps {
  open: boolean;
  onClose: () => void;
  lot: LotData;
  geometry?: GeoJSON.Geometry; 
  onSelectFloorPlan?: (data: { url: string; coordinates: [[number, number], [number, number], [number, number], [number, number]] }) => void;
  isLoadingApiData?: boolean;
  apiError?: Error | null;
}

export type CollapsibleSectionProps = {
  title: string;
  children: ReactNode;
  initialOpen?: boolean;
};

export type LotData = {
  id?: string | number; 
  suburb?: string;
  address?: string;
  zoning?: string;
  size?: string | number;
  type?: string;
  overlays?: string;
  width?: string | number;
  depth?: string | number;
  frontageType?: string;
  planningId?: string;
  maxHeight?: string | number;
  maxSize?: string | number;
  maxFSR?: string;
  maxStories?: string | number;
  minArea?: string | number;
  minDepth?: string | number;
  frontYardSetback?: string;
  sideYardMinSetback?: string;
  rearYardMinSetback?: string;
  exampleArea?: string;
  exampleLotSize?: string;
  maxFSRUpper?: string;
  // API response data
  apiDimensions?: {
    width: number;
    depth: number;
  };
  apiZoning?: string;
  apiMatches?: Array<{
    houseDesignId: string;
    floorplanUrl: string;
    spacing: {
      front: number;
      rear: number;
      side: number;
    };
    maxCoverageArea: number;
    houseArea: number;
    lotDimensions: {
      width: number;
      depth: number;
    };
  }>;
};