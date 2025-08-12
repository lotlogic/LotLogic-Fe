import { useQuery } from '@tanstack/react-query';
import { lotApi } from '../lib/api/lotApi';

export const useLotDetails = (lotId: string | null) => {
  return useQuery({
    queryKey: ['lot-details', lotId],
    queryFn: async () => {
      console.log('Fetching lot details for ID:', lotId);
      try {
        const data = await lotApi.getLotById(lotId!);
        console.log('Lot details received:', data);
        return data;
      } catch (error) {
        console.error('Error fetching lot details:', error);
        throw error;
      }
    },
    enabled: !!lotId, // Only run query if lotId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};
