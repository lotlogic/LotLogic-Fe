import { useQuery, useQueryClient } from "@tanstack/react-query";
import { lotApi } from "../lib/api/lotApi";

export const useLotCalculation = (lotId: string | null) => {
  return useQuery({
    queryKey: ["lot-calculation", lotId],
    queryFn: () => lotApi.calculateDesignsOnLot(lotId!),
    enabled: !!lotId, // Only run query if lotId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

export const useLotDimensions = (lotId: string | null) => {
  const { data, isLoading, error } = useLotCalculation(lotId);

  return {
    dimensions: data?.matches?.[0]?.lotDimensions || null,
    zoning: data?.zoning || null,
    matches: data?.matches || [],
    isLoading,
    error,
  };
};

// Hook for prefetching lot calculations
export const usePrefetchLotCalculation = () => {
  const queryClient = useQueryClient();

  const prefetchLotCalculation = (lotId: string) => {
    queryClient.prefetchQuery({
      queryKey: ["lot-calculation", lotId],
      queryFn: () => lotApi.calculateDesignsOnLot(lotId),
      staleTime: 5 * 60 * 1000,
    });
  };

  return { prefetchLotCalculation };
};
