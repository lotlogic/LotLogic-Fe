import { useQuery } from "@tanstack/react-query";
import {
  lotApi,
  type HouseDesignFilterRequest,
  type HouseDesignItemResponse,
} from "../lib/api/lotApi";
import type { HouseDesignItem } from "../types/houseDesign";

// Convert API response to frontend format
const convertApiResponseToHouseDesign = (
  apiDesign: HouseDesignItemResponse
): HouseDesignItem => {
  return {
    ...apiDesign,
    area: apiDesign.area.toString(),
    storeys: 1, // Default to 1 storey
    floorPlanImage: apiDesign.floorPlanImage || undefined,
  };
};

export const useHouseDesigns = (
  lotId: string | null,
  filters: HouseDesignFilterRequest | null,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ["house-designs", lotId, JSON.stringify(filters)],
    queryFn: async (): Promise<{
      houseDesigns: HouseDesignItem[];
      zoning: {
        fsr?: number;
        frontSetback: number;
        rearSetback: number;
        sideSetback: number;
      };
    }> => {
      if (!lotId) {
        return {
          houseDesigns: [],
          zoning: { frontSetback: 4, rearSetback: 3, sideSetback: 3 },
        };
      }

      // If no filters, create empty filter object for API
      const filtersToSend = filters || {
        bedroom: undefined,
        bathroom: undefined,
        car: undefined,
      };

      const apiResponse = await lotApi.filterHouseDesigns(lotId, filtersToSend);

      // Handle case where apiResponse or houseDesigns might be undefined
      const houseDesigns = apiResponse?.houseDesigns || [];
      const zoning = {
        fsr:
          typeof apiResponse?.zoning?.fsr === "number"
            ? apiResponse.zoning.fsr
            : undefined,
        frontSetback:
          typeof apiResponse?.zoning?.frontSetback === "number"
            ? apiResponse.zoning.frontSetback
            : 4,
        rearSetback:
          typeof apiResponse?.zoning?.rearSetback === "number"
            ? apiResponse.zoning.rearSetback
            : 3,
        sideSetback:
          typeof apiResponse?.zoning?.sideSetback === "number"
            ? apiResponse.zoning.sideSetback
            : 3,
      };

      return {
        houseDesigns: houseDesigns.map(convertApiResponseToHouseDesign),
        zoning: zoning,
      };
    },
    enabled: enabled && !!lotId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (replaces cacheTime in newer versions)
  });
};
