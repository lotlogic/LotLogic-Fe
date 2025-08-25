import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import { insetQuadPerSideLL, createSValueLabel, type Pt, type SetbackValues } from '@/lib/utils/geometry';
import type { LotProperties } from '@/types/lot';
import { getImageUrlWithCorsProxy } from '@/lib/api/lotApi';

// -----------------------------
// Types
// -----------------------------

type FloorPlan = {
  url: string;
  coordinates: [[number, number], [number, number], [number, number], [number, number]];
  houseArea?: number;
};

// -----------------------------
// Props
// -----------------------------
interface MapLayersProps {
  map: mapboxgl.Map | null;
  selectedLot: mapboxgl.MapboxGeoJSONFeature & { properties: LotProperties } | null;
  setbackValues: SetbackValues;
  fsrBuildableArea: number;
  selectedFloorPlan: FloorPlan | null;
  showFloorPlanModal: boolean;
  showFacadeModal: boolean;
  setSValuesMarkers: (markers: mapboxgl.Marker[]) => void;
}

// -----------------------------
// Component
// -----------------------------
export function MapLayers({
  map,
  selectedLot,
  setbackValues,
  fsrBuildableArea,
  selectedFloorPlan,
  showFloorPlanModal,
  showFacadeModal,
  setSValuesMarkers
}: MapLayersProps) {
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // console.log(selectedFloorPlan, "floorplan");

  // Floorplan overlay - now uses house area boundary coordinates
  useEffect(() => {
    if (!map || !selectedFloorPlan) return;
    
    const sourceId = 'floorplan-image';
    const layerId = 'floorplan-layer';

    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    // Use CORS proxy for the image URL
    const proxiedImageUrl = getImageUrlWithCorsProxy(selectedFloorPlan.url);
    
    // Preload the image to check for errors
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      
      // Calculate house area boundary coordinates for the floor plan
      if (selectedFloorPlan.houseArea && selectedFloorPlan.houseArea > 0 && selectedLot) {
        const geometry = selectedLot.geometry as GeoJSON.Polygon;
        const coordinates = geometry.coordinates[0] as [number, number][];
        if (coordinates && coordinates.length >= 4) {
          const setbacks = { front: 4, side: 3, rear: 3 };
          const innerLL = insetQuadPerSideLL(coordinates, setbacks);

          if (innerLL && innerLL.length >= 5) {
            const innerPoly = turf.polygon([innerLL]);
            const innerArea = turf.area(innerPoly);
            const innerCenter = turf.center(innerPoly);

            // Calculate house area boundary
            const houseArea = selectedFloorPlan.houseArea;
            const houseScale = Math.sqrt(houseArea / innerArea);
            const houseBoundary = turf.transformScale(innerPoly, houseScale, { origin: innerCenter });

            // Extract coordinates from house boundary for floor plan
            if (houseBoundary && houseBoundary.geometry && 'coordinates' in houseBoundary.geometry && houseBoundary.geometry.coordinates[0]) {
              const houseCoordinates = houseBoundary.geometry.coordinates[0] as [number, number][];
              const floorPlanCoordinates: [[number, number], [number, number], [number, number], [number, number]] = [
                houseCoordinates[0],
                houseCoordinates[1],
                houseCoordinates[2],
                houseCoordinates[3]
              ];

              map.addSource(sourceId, { 
                type: 'image', 
                url: proxiedImageUrl, 
                coordinates: floorPlanCoordinates 
              });
              map.addLayer({ 
                id: layerId, 
                type: 'raster', 
                source: sourceId, 
                paint: { 'raster-opacity': 0.8 } 
              });
            }
          }
        }
      } else {
        // Fallback to original coordinates if no house area
        map.addSource(sourceId, { 
          type: 'image', 
          url: proxiedImageUrl, 
          coordinates: selectedFloorPlan.coordinates 
        });
        map.addLayer({ 
          id: layerId, 
          type: 'raster', 
          source: sourceId, 
          paint: { 'raster-opacity': 0.8 } 
        });
      }
    };
    
    img.onerror = () => {
      // Image failed to load
      console.error('Failed to load floor plan image:', selectedFloorPlan.url);
      
      // Remove any existing floorplan layers
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
    
    img.src = proxiedImageUrl;

    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, selectedFloorPlan, selectedLot]);

  // S values + Setbacks + FSR boundary (per-side)
  useEffect(() => {
    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    setSValuesMarkers([]);

    if (!map || !selectedLot) return;

    const geometry = selectedLot.geometry as GeoJSON.Polygon;
    const coordinates = geometry.coordinates[0] as [number, number][];
    if (!coordinates || coordinates.length < 4) return;

    const { s1, s2, s3, s4 } = selectedLot.properties;
    const newMarkers: mapboxgl.Marker[] = [];

    // --------- Per-side setbacks ring (in meters) ----------
    const innerLL = insetQuadPerSideLL(coordinates, {
      front: setbackValues.front,
      side: setbackValues.side,
      rear: setbackValues.rear,
    });

    if (innerLL && innerLL.length >= 5) {
      const innerPoly = turf.polygon([innerLL]);

      // Draw setback boundary (red dashed)
      if (map.getLayer('setback-boundary-layer')) map.removeLayer('setback-boundary-layer');
      if (map.getSource('setback-boundary-source')) map.removeSource('setback-boundary-source');
      map.addSource('setback-boundary-source', { type: 'geojson', data: innerPoly });
      map.addLayer({
        id: 'setback-boundary-layer',
        type: 'line',
        source: 'setback-boundary-source',
        paint: { 'line-color': '#FF0000', 'line-width': 2, 'line-dasharray': [2, 2] }
      });

      // --------- FSR boundary INSIDE setbacks ----------
      const innerArea = turf.area(innerPoly); // m²
      const desired = Math.min(fsrBuildableArea, innerArea);
      const scale = Math.sqrt(desired / innerArea); // <= 1
      const innerCenter = turf.center(innerPoly);
      const fsrBoundary = turf.transformScale(innerPoly, scale, { origin: innerCenter });

      if (map.getLayer('fsr-boundary-layer')) map.removeLayer('fsr-boundary-layer');
      if (map.getSource('fsr-boundary-source')) map.removeSource('fsr-boundary-source');
      map.addSource('fsr-boundary-source', { type: 'geojson', data: fsrBoundary });
    //   map.addLayer({
    //     id: 'fsr-boundary-layer',
    //     type: 'line',
    //     source: 'fsr-boundary-source',
    //     paint: { 'line-color': '#FF9800', 'line-width': 2, 'line-dasharray': [4, 4] }
    //   });

      // Center label for FSR m² - only show when no floor plan is displayed and no modals are open
      if (!selectedFloorPlan && !showFloorPlanModal && !showFacadeModal) {
        const fsrAreaLabel = new mapboxgl.Marker({
          element: createSValueLabel(`${Math.round(desired)} m² FSR`, 'center'),
          anchor: 'center'
        })
          .setLngLat(innerCenter.geometry.coordinates as [number, number])
          .addTo(map);
        newMarkers.push(fsrAreaLabel);
      }

      // --------- House Design Area Boundary (Green Dotted) ----------
      if (selectedFloorPlan && selectedFloorPlan.houseArea && selectedFloorPlan.houseArea > 0) {
        const houseArea = selectedFloorPlan.houseArea;
        const houseScale = Math.sqrt(houseArea / innerArea); // Scale to house area
        const houseBoundary = turf.transformScale(innerPoly, houseScale, { origin: innerCenter });

        if (map.getLayer('house-area-boundary-layer')) map.removeLayer('house-area-boundary-layer');
        if (map.getSource('house-area-boundary-source')) map.removeSource('house-area-boundary-source');
        map.addSource('house-area-boundary-source', { type: 'geojson', data: houseBoundary });
        // map.addLayer({
        //   id: 'house-area-boundary-layer',
        //   type: 'line',
        //   source: 'house-area-boundary-source',
        //   paint: { 'line-color': '#15cf04', 'line-width': 2, 'line-dasharray': [4, 4] }
        // });

        // Center label for House Area m² - only show when no floor plan is displayed and no modals are open
        if (!selectedFloorPlan && !showFloorPlanModal && !showFacadeModal) {
          const houseAreaLabel = new mapboxgl.Marker({
            element: createSValueLabel(`${Math.round(houseArea)} m² House`, 'center'),
            anchor: 'center'
          })
            .setLngLat(innerCenter.geometry.coordinates as [number, number])
            .addTo(map);
          newMarkers.push(houseAreaLabel);
        }
      }
    }

    // --------- S labels on sides (optional) ----------
    const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const sides: Array<{ a: Pt; b: Pt; val: number | null | undefined; label: 'S1' | 'S2' | 'S3' | 'S4'; pos: 'top' | 'right' | 'bottom' | 'left' }> = [
      { a: coordinates[0], b: coordinates[1], val: s1, label: 'S1', pos: 'top' },
      { a: coordinates[1], b: coordinates[2], val: s2, label: 'S2', pos: 'right' },
      { a: coordinates[2], b: coordinates[3], val: s3, label: 'S3', pos: 'bottom' },
      { a: coordinates[3], b: coordinates[0], val: s4, label: 'S4', pos: 'left' },
    ];
    
    sides.forEach(side => {
      if (side.val == null) return;
      // Only show S-value labels when no modals are open
      if (!showFloorPlanModal && !showFacadeModal) {
        const mpt = mid(side.a, side.b);
        const marker = new mapboxgl.Marker({
          element: createSValueLabel(`${side.label}: ${side.val}m`, side.pos),
          anchor: 'center'
        }).setLngLat(mpt).addTo(map);
        newMarkers.push(marker);
      }
    });

    markersRef.current = newMarkers;
    setSValuesMarkers(newMarkers);

    return () => {
      newMarkers.forEach(m => m.remove());
      if (map.getLayer('setback-fill')) map.removeLayer('setback-fill');
      if (map.getSource('setback-fill-src')) map.removeSource('setback-fill-src');
      if (map.getLayer('setback-boundary-layer')) map.removeLayer('setback-boundary-layer');
      if (map.getSource('setback-boundary-source')) map.removeSource('setback-boundary-source');
      if (map.getLayer('fsr-boundary-layer')) map.removeLayer('fsr-boundary-layer');
      if (map.getSource('fsr-boundary-source')) map.removeSource('fsr-boundary-source');
      if (map.getLayer('house-area-boundary-layer')) map.removeLayer('house-area-boundary-layer');
      if (map.getSource('house-area-boundary-source')) map.removeSource('house-area-boundary-source');
    };
  }, [map, selectedLot, setbackValues, fsrBuildableArea, selectedFloorPlan, showFloorPlanModal, showFacadeModal, setSValuesMarkers]);

  return null; 
}