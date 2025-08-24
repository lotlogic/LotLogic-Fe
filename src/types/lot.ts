import type { ReactNode } from 'react';

export interface LotSidebarProps {
  open: boolean;
  onClose: () => void;
  lot: LotData;
  geometry?: GeoJSON.Geometry; 
  onSelectFloorPlan?: (data: { url: string; coordinates: [[number, number], [number, number], [number, number], [number, number]]; houseArea?: number } | null) => void;
  onZoningDataUpdate?: (zoning: { fsr: number; frontSetback: number; rearSetback: number; sideSetback: number }) => void;
  isLoadingApiData?: boolean;
  apiError?: Error | null;
}

export type CollapsibleSectionProps = {
  title: string;
  children: ReactNode;
  initialOpen?: boolean;
};

export type LotProperties = {
  ADDRESSES?: string;
  BLOCK_DERIVED_AREA?: string;
  BLOCK_KEY: string;
  BLOCK_NUMBER: number;
  BLOCK_SECTION?: string;
  DISTRICT_CODE: number;
  DISTRICT_NAME?: string;
  DISTRICT_SHORT?: string;
  ID: number;
  LAND_USE_POLICY_ZONES?: string;
  OBJECTID: number;
  OVERLAY_PROVISION_ZONES?: string;
  SECTION_NUMBER: number;
  TYPE?: string;
  WATER_FLAG?: string;
  STAGE?: string;
  LOT_NUMBER?: number;
  databaseId?: string;
  areaSqm?: number;
  division?: string;
  estateId?: string;
  lifecycleStage?: string;
  s1?: number | null;
  s2?: number | null;
  s3?: number | null;
  s4?: number | null;
  hasExactS1S2S3S4?: boolean;
  isRed?: boolean;
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