import { useQuery } from "@tanstack/react-query";
import { lotApi } from "../lib/api/lotApi";

export const useLotDetails = (lotId: string | null) => {
  return useQuery({
    queryKey: ["lot-details", lotId],
    queryFn: async () => {
      return await lotApi.getLotById(lotId!);
    },
    enabled: !!lotId, // Only run query if lotId is provided
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 1 * 60 * 1000, // 1 minute
    retry: false, // No retry - fail immediately
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};
