import { ReactNode } from 'react';

export type LotSidebarProps = {
  open: boolean;
  onClose: () => void;
  lot: LotData;
};

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
};