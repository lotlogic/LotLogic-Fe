import type { ReactNode } from "react";
import type { FloorPlan } from "./houseDesign";

export type LotFrontageCoordinate = GeoJSON.LineString | string | null;

export interface LotSidebarProps {
  open: boolean;
  onClose: () => void;
  lot: LotData;
  geometry?: GeoJSON.Geometry;
  onSelectFloorPlan?: (data: FloorPlan | null) => void;
  onZoningDataUpdate?: (zoning: {
    fsr?: number;
    frontSetback: number;
    rearSetback: number;
    sideSetback: number;
  }) => void;
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
  BLOCK_NUMBER: number | string | null;
  BLOCK_SECTION?: string;
  DISTRICT_CODE: number;
  DISTRICT_NAME?: string;
  DISTRICT_SHORT?: string;
  ID: string | number;
  LAND_USE_POLICY_ZONES?: string;
  OBJECTID: string | number;
  OVERLAY_PROVISION_ZONES?: string;
  SECTION_NUMBER: number | string | null;
  TYPE?: string;
  WATER_FLAG?: string;
  STAGE?: string;
  LOT_NUMBER?: number;
  salesMode?: string | null;
  price?: number | null;
  selectable?: boolean;
  databaseId?: string;
  areaSqm?: number;
  division?: string;
  estateId?: string;
  lifecycleStage?: string;
  width?: number | string | null;
  depth?: number | string | null;
  frontageType?: string | null;
  planningId?: string | null;
  maxHeight?: number | string | null;
  maxSize?: number | string | null;
  maxFSR?: string | null;
  maxStories?: number | string | null;
  minArea?: number | string | null;
  minDepth?: number | string | null;
  frontYardSetback?: string | null;
  sideYardMinSetback?: string | null;
  rearYardMinSetback?: string | null;
  exampleArea?: string | null;
  exampleLotSize?: string | null;
  maxFSRUpper?: string | null;
  apiZoning?: string | null;
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
  s1?: number | null;
  s2?: number | null;
  s3?: number | null;
  s4?: number | null;
  hasExactS1S2S3S4?: boolean;
  isRed?: boolean;
  frontageCoordinate?: LotFrontageCoordinate;
};

export type LotData = {
  estateId?: string | number;
  id?: string | number;
  blockKey?: string | number;
  displayLotId?: string | number;
  suburb?: string;
  address?: string;
  zoning?: string;
  size?: string | number;
  salesMode?: string | null;
  price?: number | null;
  lifecycleStage?: string | null;
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
