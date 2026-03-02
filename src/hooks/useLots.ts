import { useQuery } from "@tanstack/react-query";
import { lotApi, type DatabaseLot } from "../lib/api/lotApi";
import { normalizeLotLifecycle } from "@/constants/lotLifecycle";

export const useLots = (estateId?: string) => {
  return useQuery({
    queryKey: ["lots", estateId ?? "all"],
    queryFn: () => lotApi.getAllLots(estateId),
    staleTime: 1 * 60 * 1000, // 1 minutes
    refetchOnWindowFocus: false,
  });
};

export const convertLotsToGeoJSON = (lots: DatabaseLot[]) => {
  return {
    type: "FeatureCollection" as const,
    features: lots.reduce<GeoJSON.Feature[]>((acc, lot) => {
      const lifecycleStage = normalizeLotLifecycle(lot.lifecycleStage);
      if (lifecycleStage !== "available") {
        return acc;
      }

      const lotId = String(lot.id);
      const lotNumber = lot.blockNumber != null ? String(lot.blockNumber) : lotId;

      // ---- Extract s1..s4 and check exact match ----
      const propsArr = lot?.geojson?.properties || [];

      const keys = propsArr.flatMap((o) => Object.keys(o));
      const uniq = Array.from(new Set(keys));

      const hasExactS1S2S3S4 =
        keys.length === 4 &&
        uniq.length === 4 &&
        ["s1", "s2", "s3", "s4"].every((k) => uniq.includes(k));

      // Extract values
      const s1 = propsArr.find((o) => "s1" in o)?.s1 ?? null;
      const s2 = propsArr.find((o) => "s2" in o)?.s2 ?? null;
      const s3 = propsArr.find((o) => "s3" in o)?.s3 ?? null;
      const s4 = propsArr.find((o) => "s4" in o)?.s4 ?? null;

      const isRed = hasExactS1S2S3S4;

      acc.push({
        type: "Feature" as const,
        geometry: lot.geometry,
        properties: {
          BLOCK_KEY: lot.blockKey,
          ADDRESSES: lot.address ?? "",
          BLOCK_DERIVED_AREA: lot.areaSqm != null ? String(lot.areaSqm) : "",
          DISTRICT_NAME: lot.district ?? "",
          LAND_USE_POLICY_ZONES: lot.zoning ?? "unknown",
          OVERLAY_PROVISION_ZONES: lot.overlays?.join(", ") ?? "",
          LOT_NUMBER: lotNumber,
          STAGE: lifecycleStage,
          ID: lotId,
          BLOCK_NUMBER: lot.blockNumber ?? null,
          SECTION_NUMBER: lot.sectionNumber ?? null,
          DISTRICT_CODE: 1,
          OBJECTID: lotId,
          databaseId: lotId,
          areaSqm: lot.areaSqm,
          division: lot.division ?? "",
          estateId: lot.estateId ?? "",
          lifecycleStage,
          s1,
          s2,
          s3,
          s4,
          hasExactS1S2S3S4,
          isRed,
          width: lot.geojson.width,
          depth: lot.geojson.depth,
          frontageCoordinate: lot.frontageCoordinate,
        },
      });

      return acc;
    }, []),
  };
};
