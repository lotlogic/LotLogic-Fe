import { useQuery } from '@tanstack/react-query';
import { lotApi, type HouseDesignFilterRequest, type HouseDesignItemResponse } from '../lib/api/lotApi';
import type { HouseDesignItem } from '../types/houseDesign';

// Convert API response to frontend format
const convertApiResponseToHouseDesign = (apiDesign: HouseDesignItemResponse): HouseDesignItem => {
  return {
    id: apiDesign.id,
    title: apiDesign.title,
    area: apiDesign.area.toString(),
    image: apiDesign.image,
    images: apiDesign.images,
    bedrooms: apiDesign.bedrooms,
    bathrooms: apiDesign.bathrooms,
    cars: apiDesign.cars,
    storeys: 1, // Default to 1 storey
    isFavorite: apiDesign.isFavorite,
    floorPlanImage: apiDesign.floorPlanImage || undefined,
  };
};

export const useHouseDesigns = (
  lotId: string | null,
  filters: HouseDesignFilterRequest | null,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['house-designs', lotId, filters],
    queryFn: async (): Promise<HouseDesignItem[]> => {
      if (!lotId || !filters) {
        return [];
      }
      const apiResponse = await lotApi.filterHouseDesigns(lotId, filters);
      return apiResponse.houseDesigns.map(convertApiResponseToHouseDesign);
    },
    enabled: enabled && !!lotId && !!filters,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (replaces cacheTime in newer versions)
  });
};
