import { useQuery } from "@tanstack/react-query";
import { lotApi, type PublicEstate } from "@/lib/api/lotApi";

export const useEstate = (estateId?: string | null) => {
  return useQuery<PublicEstate>({
    queryKey: ["estate", estateId ?? "none"],
    queryFn: () => lotApi.getEstateById(String(estateId)),
    enabled: Boolean(estateId),
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export default useEstate;
