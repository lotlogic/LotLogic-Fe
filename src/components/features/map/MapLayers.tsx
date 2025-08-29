import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import { insetQuadPerSideLL, createSValueLabel, mapSValuesToSides, type Pt, type SetbackValues } from '@/lib/utils/geometry';
import type { LotProperties } from '@/types/lot';
import { getImageUrlWithCorsProxy } from '@/lib/api/lotApi';
import type { FloorPlan } from '@/types/houseDesign';

// -----------------------------
// Types
// -----------------------------

interface HouseBoundaryData {
  center: [number, number];
  widthInDegrees: number;
  depthInDegrees: number;
  houseWidth: number;
  houseDepth: number;
  angle: number;
  // isCompatible: boolean;
  scaleFactor: number;
}

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
  activeOverlays?: Set<string>;
}

// -----------------------------
// Utility Functions
// -----------------------------

// Remove overlay layers and sources
const removeOverlayLayers = (map: mapboxgl.Map) => {
  const overlayTypes = ['bushfire', 'flood', 'heritage'];
  overlayTypes.forEach(type => {
    const layerId = `${type}-overlay-layer`;
    const borderLayerId = `${type}-overlay-layer-border`;
    const sourceId = `${type}-source`;
    
    if (map.getLayer(borderLayerId)) map.removeLayer(borderLayerId);
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  });
};

// Calculate house dimensions and positioning
const calculateHouseBoundary = (
  selectedFloorPlan: FloorPlan,
  selectedLot: mapboxgl.MapboxGeoJSONFeature & { properties: LotProperties },
  innerCenter: any,
  // innerArea: number,
  // desired: number
): HouseBoundaryData | null => {
  if (!selectedFloorPlan.houseArea || selectedFloorPlan.houseArea <= 0) {
    return null;
  }

  // const houseArea = selectedFloorPlan.houseArea;
  // const isCompatible = houseArea <= desired;
  
  if (selectedFloorPlan.houseWidth && selectedFloorPlan.houseDepth) {
    const houseWidth = selectedFloorPlan.houseWidth;
        
    const houseDepth = selectedFloorPlan.houseDepth;

    
    // Calculate the lot's orientation
    const geometry = selectedLot.geometry as GeoJSON.Polygon;
    const coordinates = geometry.coordinates[0] as [number, number][];
    
    
    // Calculate sides distances from the lot geometry
    const side1 = turf.distance(coordinates[0], coordinates[1], { units: 'meters' });
    const side2 = turf.distance(coordinates[1], coordinates[2], { units: 'meters' });
    const side3 = turf.distance(coordinates[2], coordinates[3], { units: 'meters' });
    const side4 = turf.distance(coordinates[3], coordinates[0], { units: 'meters' });

    // Find the longest side to determine orientation
    const sides = [side1, side2, side3, side4];
    const maxSideIndex = sides.indexOf(Math.max(...sides));
    
    // Calculate the angle of the longest side
    let angle = 0;
    if (maxSideIndex === 0) {
      angle = turf.bearing(coordinates[0], coordinates[1]);
    } else if (maxSideIndex === 1) {
      angle = turf.bearing(coordinates[1], coordinates[2]);
    } else if (maxSideIndex === 2) {
      angle = turf.bearing(coordinates[2], coordinates[3]);
    } else {
      angle = turf.bearing(coordinates[3], coordinates[0]);
    }
    
    // Convert meters to degrees (approximate conversion)
    // const latToMeters = 111000;
    // const lngToMeters = 111000 * Math.cos(innerCenter.geometry.coordinates[1] * Math.PI / 180);
    
    // const widthInDegrees = houseWidth / lngToMeters;
    // console.log(widthInDegrees, "widthInDegrees");
    // const depthInDegrees = houseDepth / latToMeters;
    // console.log(depthInDegrees, "depthInDegrees");
    // Replace the static conversion with Turf

    // Calculate the width and depth in degrees using Turf
    const centerPoint = innerCenter.geometry.coordinates;
    const point1 = turf.point([centerPoint[0], centerPoint[1]]);
    const point2 = turf.point([centerPoint[0] + 0.001, centerPoint[1]]); // 0.001 degree longitude
    const point3 = turf.point([centerPoint[0], centerPoint[1] + 0.001]); // 0.001 degree latitude

    const lngToMeters = turf.distance(point1, point2, { units: 'meters' }) * 1000; // Convert to meters per degree
    const latToMeters = turf.distance(point1, point3, { units: 'meters' }) * 1000; // Convert to meters per degree

    const widthInDegrees = houseWidth / lngToMeters;
    const depthInDegrees = houseDepth / latToMeters;
    let scaleFactor = 1;

    
    return {
      center: innerCenter.geometry.coordinates,
      widthInDegrees: widthInDegrees,
      depthInDegrees: depthInDegrees,
      houseWidth: houseWidth * scaleFactor,
      houseDepth: houseDepth * scaleFactor,
      angle,
      // isCompatible,
      scaleFactor
    };
  }
  
  return null;
};

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
  setSValuesMarkers,
  activeOverlays = new Set()
}: MapLayersProps) {
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Floorplan overlay
  useEffect(() => {
    if (!map || !selectedFloorPlan) return;
    
    const sourceId = 'floorplan-image';
    const layerId = 'floorplan-layer';

    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    const proxiedImageUrl = getImageUrlWithCorsProxy(selectedFloorPlan.url);
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Use the house boundary coordinates for the floorplan if available
      const houseBoundarySource = map.getSource('house-area-boundary-source');
      
      if (houseBoundarySource && houseBoundarySource.type === 'geojson') {
        const houseBoundaryData = (houseBoundarySource as mapboxgl.GeoJSONSource).serialize();
        if (houseBoundaryData.data && typeof houseBoundaryData.data === 'object' && 'geometry' in houseBoundaryData.data) {
          const houseBoundaryCoords = (houseBoundaryData.data as any).geometry.coordinates[0];
          
          const floorPlanCoordinates: [[number, number], [number, number], [number, number], [number, number]] = [
            houseBoundaryCoords[0],
            houseBoundaryCoords[1],  
            houseBoundaryCoords[2],
            houseBoundaryCoords[3]
          ];
          
          map.addSource(sourceId, { 
            type: 'image', 
            url: proxiedImageUrl, 
            coordinates: floorPlanCoordinates 
          });
        }
      } else {
        // Fallback to original coordinates
        map.addSource(sourceId, { 
          type: 'image', 
          url: proxiedImageUrl, 
          coordinates: selectedFloorPlan.coordinates 
        });
      }
      
      map.addLayer({ 
        id: layerId, 
        type: 'raster', 
        source: sourceId, 
        paint: { 'raster-opacity': 0.8 } 
      });
    };
    
    img.onerror = () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
    
    img.src = proxiedImageUrl;

    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, selectedFloorPlan]);

  // Zoning Overlays using Mapbox Tilesets
  useEffect(() => {
    if (!map) return;

    removeOverlayLayers(map);

    const colors = {
      bushfire: '#FF9800',
      flood: '#FF0000',
      heritage: '#15cf04'
    };

    activeOverlays.forEach(overlayType => {
      const layerId = `${overlayType}-overlay-layer`;
      const sourceId = `${overlayType}-source`;

      try {
        if (overlayType === 'bushfire') {
          map.addSource(sourceId, {
            type: 'vector',
            url: `mapbox://beyondhimalayatech.6e6keodk`
          });

          map.addLayer({
            id: layerId,
            type: 'fill',
            source: sourceId,
            'source-layer': '79216d97-ae47-4e7b-97b4-3b304-29mkcu',
            paint: {
              'fill-color': colors[overlayType as keyof typeof colors],
              'fill-opacity': 0.4,
              'fill-outline-color': colors[overlayType as keyof typeof colors]
            }
          });

          map.addLayer({
            id: `${layerId}-border`,
            type: 'line',
            source: sourceId,
            'source-layer': '79216d97-ae47-4e7b-97b4-3b304-29mkcu',
            paint: {
              'line-color': colors[overlayType as keyof typeof colors],
              'line-width': 2,
              'line-opacity': 0.8
            }
          });
        }
      } catch (error) {
        console.error(`Error adding ${overlayType} overlay layer:`, error);
      }
    });

    return () => {
      removeOverlayLayers(map);
    };
  }, [map, activeOverlays]);

  // S values + Setbacks + FSR boundary
  useEffect(() => {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    setSValuesMarkers([]);

    if (!map || !selectedLot) return;

    const geometry = selectedLot.geometry as GeoJSON.Polygon;
    const coordinates = geometry.coordinates[0] as [number, number][];
    if (!coordinates || coordinates.length < 4) return;

    const { s1, s2, s3, s4 } = selectedLot.properties;
    const newMarkers: mapboxgl.Marker[] = [];

    // Per-side setbacks ring
    const innerLL = insetQuadPerSideLL(coordinates, {
      front: setbackValues.front,
      side: setbackValues.side,
      rear: setbackValues.rear,
    });

    if (innerLL && innerLL.length >= 5) {
      const innerPoly = turf.polygon([innerLL]);

      // Draw setback boundary
      if (map.getLayer('setback-boundary-layer')) map.removeLayer('setback-boundary-layer');
      if (map.getSource('setback-boundary-source')) map.removeSource('setback-boundary-source');
      map.addSource('setback-boundary-source', { type: 'geojson', data: innerPoly });
      // map.addLayer({
      //   id: 'setback-boundary-layer',
      //   type: 'line',
      //   source: 'setback-boundary-source',
      //   paint: { 'line-color': '#FF0000', 'line-width': 2, 'line-dasharray': [2, 2] }
      // });

      // Add center marker for testing
      // const centerMarker = new mapboxgl.Marker({
      //   color: '#00FF00',
      //   scale: 0.8
      // })
      //   .setLngLat(turf.centroid(innerPoly).geometry.coordinates as [number, number])
      //   .addTo(map);
      // newMarkers.push(centerMarker);

      // FSR boundary
      const innerArea = turf.area(innerPoly);
      const desired = Math.min(fsrBuildableArea, innerArea);
      const scale = Math.sqrt(desired / innerArea);
      const innerCenter = turf.center(innerPoly);
      const fsrBoundary = turf.transformScale(innerPoly, scale, { origin: innerCenter });

      if (map.getLayer('fsr-boundary-layer')) map.removeLayer('fsr-boundary-layer');
      if (map.getSource('fsr-boundary-source')) map.removeSource('fsr-boundary-source');
      map.addSource('fsr-boundary-source', { type: 'geojson', data: fsrBoundary });
      // map.addLayer({
      //   id: 'fsr-boundary-layer',
      //   type: 'line',
      //   source: 'fsr-boundary-source',
      //   paint: { 'line-color': '#FF9800', 'line-width': 2, 'line-dasharray': [4, 4] }
      // });

      // FSR area label
      if (!selectedFloorPlan && !showFloorPlanModal && !showFacadeModal) {
        const fsrAreaLabel = new mapboxgl.Marker({
          element: createSValueLabel(`${Math.round(desired)} m² FSR`, 'center'),
          anchor: 'center'
        })
          .setLngLat(innerCenter.geometry.coordinates as [number, number])
          .addTo(map);
        newMarkers.push(fsrAreaLabel);
      }

      // House Design Area Boundary
      if (selectedFloorPlan && selectedFloorPlan.houseArea && selectedFloorPlan.houseArea > 0) {
        const houseArea = selectedFloorPlan.houseArea;
        const boundaryData = calculateHouseBoundary(selectedFloorPlan, selectedLot, innerCenter);
        
        let houseBoundary;
        if (boundaryData) {
          const setbackCenter = turf.centroid(innerPoly);
          
          const rectCoordinates = [
            [setbackCenter.geometry.coordinates[0] - boundaryData.widthInDegrees/2, setbackCenter.geometry.coordinates[1] - boundaryData.depthInDegrees/2],
            [setbackCenter.geometry.coordinates[0] + boundaryData.widthInDegrees/2, setbackCenter.geometry.coordinates[1] - boundaryData.depthInDegrees/2],
            [setbackCenter.geometry.coordinates[0] + boundaryData.widthInDegrees/2, setbackCenter.geometry.coordinates[1] + boundaryData.depthInDegrees/2],
            [setbackCenter.geometry.coordinates[0] - boundaryData.widthInDegrees/2, setbackCenter.geometry.coordinates[1] + boundaryData.depthInDegrees/2],
            [setbackCenter.geometry.coordinates[0] - boundaryData.widthInDegrees/2, setbackCenter.geometry.coordinates[1] - boundaryData.depthInDegrees/2]
          ];
          
          const rect = turf.polygon([rectCoordinates]);
          houseBoundary = turf.transformRotate(rect, boundaryData.angle, { pivot: setbackCenter.geometry.coordinates });
        } else {
          const houseScale = Math.sqrt(houseArea / innerArea);
          houseBoundary = turf.transformScale(innerPoly, houseScale, { origin: innerCenter });
        }

        if (map.getLayer('house-area-boundary-layer')) map.removeLayer('house-area-boundary-layer');
        if (map.getSource('house-area-boundary-source')) map.removeSource('house-area-boundary-source');
        map.addSource('house-area-boundary-source', { type: 'geojson', data: houseBoundary });
        // map.addLayer({
        //   id: 'house-area-boundary-layer',
        //   type: 'line',
        //   source: 'house-area-boundary-source',
        //   paint: { 'line-color': '#15cf04', 'line-width': 2, 'line-dasharray': [4, 4] }
        // });

        // House area label
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

    // S labels on sides - Map s-values correctly to coordinates
    const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    
    // Calculate actual distances for debugging
      // const actualDistances = [
      //   turf.distance(coordinates[0], coordinates[1], { units: 'meters' }),
      //   turf.distance(coordinates[1], coordinates[2], { units: 'meters' }),
      //   turf.distance(coordinates[2], coordinates[3], { units: 'meters' }),
      //   turf.distance(coordinates[3], coordinates[0], { units: 'meters' })
      // ];
    
    // console.log('Coordinates:', coordinates);
    // console.log('S-values from DB:', [s1, s2, s3, s4]);
    // console.log('Actual distances:', actualDistances);
    
    // Map s-values to the correct sides based on distance matching
    const sValues = [s1 ?? 0, s2 ?? 0, s3 ?? 0, s4 ?? 0];
    const mappedSValues = mapSValuesToSides(coordinates, sValues);
    
    // console.log('Mapped s-values:', mappedSValues);
    
    const sides: Array<{ a: Pt; b: Pt; val: number | null | undefined; pos: 'top' | 'right' | 'bottom' | 'left' }> = [
      { a: coordinates[0], b: coordinates[1], val: mappedSValues.s1, pos: 'top' },
      { a: coordinates[1], b: coordinates[2], val: mappedSValues.s2, pos: 'right' },
      { a: coordinates[2], b: coordinates[3], val: mappedSValues.s3, pos: 'bottom' },
      { a: coordinates[3], b: coordinates[0], val: mappedSValues.s4, pos: 'left' },
    ];
    
    sides.forEach(side => {
      if (side.val == null) return;
      if (!showFloorPlanModal && !showFacadeModal) {
        const mpt = mid(side.a, side.b);
        const marker = new mapboxgl.Marker({
          element: createSValueLabel(`${side.val}m`, side.pos),
          anchor: 'center'
        }).setLngLat(mpt).addTo(map);
        newMarkers.push(marker);
      }
    });

    markersRef.current = newMarkers;
    setSValuesMarkers(newMarkers);

    return () => {
      newMarkers.forEach(m => m.remove());
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