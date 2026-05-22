import { useQuery } from "@tanstack/react-query";
import { lotApi, type Builder } from "../lib/api/lotApi";

export const useBuilders = () => {
  return useQuery({
    queryKey: ["builders"],
    queryFn: () => lotApi.getBuilders(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Helper function to convert Builder to MultiSelect option format
export const convertBuildersToOptions = (builders: Builder[]) => {
  return builders.map((builder) => ({
    id: builder.id,
    label: builder.name,
    logoText: builder.name.charAt(0).toUpperCase(),
  }));
};
