import { useQuery } from '@tanstack/react-query';
import { lotApi, type DatabaseLot } from '../lib/api/lotApi';

export const useLots = () => {
  return useQuery({
    queryKey: ['lots'],
    queryFn: lotApi.getAllLots,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

export const convertLotsToGeoJSON = (lots: DatabaseLot[]) => {
  // Debug: Log raw lot data
  console.log('Raw lots data:', lots.map(lot => ({
    id: lot.id,
    blockKey: lot.blockKey,
    overlays: lot.overlays,
    hasOverlays: !!lot.overlays,
    overlaysLength: lot.overlays?.length || 0
  })));
  
  // Debug: Log overlay data
  console.log('Lots with overlays:', lots.filter(lot => lot.overlays && lot.overlays.length > 0).map(lot => ({
    id: lot.id,
    overlays: lot.overlays,
    overlayString: lot.overlays?.join(', ') ?? ''
  })));
  
  return {
    type: 'FeatureCollection' as const,
    features: lots.map((lot) => {
      // ---- Extract s1..s4 and check exact match ----
      const propsArr = lot?.geojson?.properties || [];

      const keys = propsArr.flatMap(o => Object.keys(o));
      const uniq = Array.from(new Set(keys));

      const hasExactS1S2S3S4 =
        keys.length === 4 &&
        uniq.length === 4 &&
        ['s1', 's2', 's3', 's4'].every(k => uniq.includes(k));

      // Extract values
      const s1 = propsArr.find(o => 's1' in o)?.s1 ?? null;
      const s2 = propsArr.find(o => 's2' in o)?.s2 ?? null;
      const s3 = propsArr.find(o => 's3' in o)?.s3 ?? null;
      const s4 = propsArr.find(o => 's4' in o)?.s4 ?? null;

      // Normalize lifecycleStage
      const lifecycleStage = String(lot.lifecycleStage ?? 'unavailable').toLowerCase();

      // Determine if lot is red
      const isRed = lifecycleStage === 'available' && hasExactS1S2S3S4;

      return {
        type: 'Feature' as const,
        geometry: lot.geometry,
        properties: {
          BLOCK_KEY: lot.blockKey,
          ADDRESSES: lot.address ?? '',
          BLOCK_DERIVED_AREA: lot.areaSqm != null ? String(lot.areaSqm) : '',
          DISTRICT_NAME: lot.district ?? '',
          LAND_USE_POLICY_ZONES: lot.zoning ?? 'unknown',
          OVERLAY_PROVISION_ZONES: lot.overlays?.join(', ') ?? '',
          LOT_NUMBER: Number(lot.id),
          STAGE: lot.lifecycleStage ?? 'available',
          ID: Number(lot.id),
          BLOCK_NUMBER: lot.blockNumber ?? null,
          SECTION_NUMBER: lot.sectionNumber ?? null,
          DISTRICT_CODE: 1,
          OBJECTID: Number(lot.id),
          databaseId: lot.id,
          areaSqm: lot.areaSqm,
          division: lot.division ?? '',
          estateId: lot.estateId ?? '',
          lifecycleStage,
          s1, s2, s3, s4,
          hasExactS1S2S3S4,
          isRed,
          width: lot.geojson.width,
          depth: lot.geojson.depth
        }
      };
    })
  };
};
