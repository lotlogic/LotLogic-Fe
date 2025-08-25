import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import { insetQuadPerSideLL, createSValueLabel, type Pt, type SetbackValues } from '@/lib/utils/geometry';
import type { LotProperties } from '@/types/lot';
import { getImageUrlWithCorsProxy } from '@/lib/api/lotApi';
import type { FloorPlan } from '@/types/houseDesign';

// -----------------------------
// Types
// -----------------------------

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

  // console.log(selectedFloorPlan, "floorplan");

  // Floorplan overlay - positioned inside the green dotted boundary
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
      
      // Calculate house dimensions based on actual house design data
      if (selectedFloorPlan.houseArea && selectedFloorPlan.houseArea > 0 && selectedLot) {
        const geometry = selectedLot.geometry as GeoJSON.Polygon;
        const coordinates = geometry.coordinates[0] as [number, number][];
        if (coordinates && coordinates.length >= 4) {
          
          // Get house design dimensions from the selected house design
          const houseArea = selectedFloorPlan.houseArea; // in square meters
          
          // Use the exact same coordinates as the green boundary
          const storedCoords = (window as any).houseBoundaryCoordinates;
          let floorPlanCoordinates: [[number, number], [number, number], [number, number], [number, number]];
          
          if (storedCoords && selectedFloorPlan.houseWidth && selectedFloorPlan.houseDepth) {
            // Use the exact same positioning as the green boundary (including rotation)
            const { center, widthInDegrees, depthInDegrees, angle, isCompatible } = storedCoords;
            
            // Only show floor plan if house is compatible (fits within FSR area)
            if (!isCompatible) {
              console.log(`Floor plan not shown - house area exceeds FSR limit`);
              return;
            }
            
            // Create base rectangle coordinates
            const baseCoordinates = [
              [center[0] - widthInDegrees/2, center[1] - depthInDegrees/2], // bottom-left
              [center[0] + widthInDegrees/2, center[1] - depthInDegrees/2], // bottom-right
              [center[0] + widthInDegrees/2, center[1] + depthInDegrees/2], // top-right
              [center[0] - widthInDegrees/2, center[1] + depthInDegrees/2]  // top-left
            ];
            
            // Rotate the coordinates to match the green boundary
            const rotatedCoordinates = baseCoordinates.map(coord => {
              const point = turf.point(coord);
              const rotatedPoint = turf.transformRotate(point, angle, { pivot: center });
              return rotatedPoint.geometry.coordinates as [number, number];
            });
            
            floorPlanCoordinates = [
              rotatedCoordinates[0], // bottom-left
              rotatedCoordinates[1], // bottom-right
              rotatedCoordinates[2], // top-right
              rotatedCoordinates[3]  // top-left
            ];
            
            console.log(`Floor plan using exact same rotated coordinates as green boundary: ${storedCoords.houseWidth}m x ${storedCoords.houseDepth}m, rotated ${angle.toFixed(1)}°, compatible: ${isCompatible}`);
          } else {
            // Fallback: Calculate center and dimensions
            const centerLng = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length;
            const centerLat = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;
            
            let houseWidth: number;
            let houseDepth: number;
            
            if (selectedFloorPlan.houseWidth && selectedFloorPlan.houseDepth) {
              houseWidth = selectedFloorPlan.houseWidth;
              houseDepth = selectedFloorPlan.houseDepth;
            } else {
              // Fallback: Calculate from area with typical aspect ratio
              const aspectRatio = 1.5;
              houseWidth = Math.sqrt(houseArea * aspectRatio);
              houseDepth = houseArea / houseWidth;
            }
            
            // Convert meters to degrees
            const latToMeters = 111000;
            const lngToMeters = 111000 * Math.cos(centerLat * Math.PI / 180);
            
            const widthInDegrees = houseWidth / lngToMeters;
            const depthInDegrees = houseDepth / latToMeters;
            
            floorPlanCoordinates = [
              [centerLng - widthInDegrees/2, centerLat - depthInDegrees/2], // bottom-left
              [centerLng + widthInDegrees/2, centerLat - depthInDegrees/2], // bottom-right
              [centerLng + widthInDegrees/2, centerLat + depthInDegrees/2], // top-right
              [centerLng - widthInDegrees/2, centerLat + depthInDegrees/2]  // top-left
            ];
            
            console.log(`Floor plan using fallback calculation: ${houseWidth.toFixed(1)}m x ${houseDepth.toFixed(1)}m`);
          }

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
          
          console.log(`Floor plan overlay positioned inside green boundary: ${houseArea}m²`);
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

  // Zoning Overlays using Mapbox Tilesets
  useEffect(() => {
    if (!map) return;

    // Remove existing overlay layers and sources
    const overlayTypes = ['bushfire', 'flood', 'heritage'];
    overlayTypes.forEach(type => {
      const layerId = `${type}-overlay-layer`;
      const borderLayerId = `${type}-overlay-layer-border`;
      const sourceId = `${type}-source`;
      
      // Remove layers first (in reverse order to avoid dependency issues)
      if (map.getLayer(borderLayerId)) {
        map.removeLayer(borderLayerId);
      }
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      
      // Then remove source
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    });

    // Define colors for each overlay type
    const colors = {
      bushfire: '#FF9800',
      flood: '#FF0000',
      heritage: '#15cf04'
    };

    // Add overlay layers for active overlays
    activeOverlays.forEach(overlayType => {
      const layerId = `${overlayType}-overlay-layer`;
      const sourceId = `${overlayType}-source`;

      console.log(`Adding overlay layer: ${overlayType}`);

      try {
        if (overlayType === 'bushfire') {
          // Add the Mapbox vector tileset source for bushfire data
          map.addSource(sourceId, {
            type: 'vector',
            url: `mapbox://beyondhimalayatech.6e6keodk`
          });

          // Add the fill layer
          map.addLayer({
            id: layerId,
            type: 'fill',
            source: sourceId,
            'source-layer': '79216d97-ae47-4e7b-97b4-3b304-29mkcu', // Use the actual source layer name from tileset
            paint: {
              'fill-color': colors[overlayType as keyof typeof colors],
              'fill-opacity': 0.4,
              'fill-outline-color': colors[overlayType as keyof typeof colors]
            }
          });

          // Add a border layer for better visibility
          map.addLayer({
            id: `${layerId}-border`,
            type: 'line',
            source: sourceId,
            'source-layer': '79216d97-ae47-4e7b-97b4-3b304-29mkcu', // Use the actual source layer name from tileset
            paint: {
              'line-color': colors[overlayType as keyof typeof colors],
              'line-width': 2,
              'line-opacity': 0.8
            }
          });

          console.log(`Successfully added ${overlayType} overlay using Mapbox tileset`);
        } else {
          // For flood and heritage, show a message that data is not available
          console.log(`No data available for ${overlayType} overlay - tileset only contains bushfire data`);
        }
        
      } catch (error) {
        console.error(`Error adding ${overlayType} overlay layer:`, error);
      }
    });

    // Cleanup function to remove layers when component unmounts or activeOverlays changes
    return () => {
      const overlayTypes = ['bushfire', 'flood', 'heritage'];
      overlayTypes.forEach(type => {
        const layerId = `${type}-overlay-layer`;
        const borderLayerId = `${type}-overlay-layer-border`;
        const sourceId = `${type}-source`;
        
        // Remove layers first (in reverse order to avoid dependency issues)
        if (map.getLayer(borderLayerId)) {
          map.removeLayer(borderLayerId);
        }
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
        
        // Then remove source
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      });
    };
  }, [map, activeOverlays]);

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
      // map.addLayer({
      //   id: 'fsr-boundary-layer',
      //   type: 'line',
      //   source: 'fsr-boundary-source',
      //   paint: { 'line-color': '#FF9800', 'line-width': 2, 'line-dasharray': [4, 4] }
      // });

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
        
        // Check compatibility: house area should fit within FSR area
        const isCompatible = houseArea <= desired;
        // console.log(`House area: ${houseArea}m², FSR area: ${desired}m², Compatible: ${isCompatible}`);
        
        // Use actual house design dimensions if available, otherwise scale from area
        let houseBoundary;
        
        if (selectedFloorPlan.houseWidth && selectedFloorPlan.houseDepth) {
          // Create a rectangle with actual house dimensions, rotated to match lot orientation
          const houseWidth = selectedFloorPlan.houseWidth;
          const houseDepth = selectedFloorPlan.houseDepth;
          
          // Calculate the lot's orientation (angle of the longest side)
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
          const latToMeters = 111000;
          const lngToMeters = 111000 * Math.cos(innerCenter.geometry.coordinates[1] * Math.PI / 180);
          
          const widthInDegrees = houseWidth / lngToMeters;
          const depthInDegrees = houseDepth / latToMeters;
          
          // Check if house fits within FSR area
          const houseAreaInDegrees = widthInDegrees * depthInDegrees;
          const fsrAreaInDegrees = turf.area(fsrBoundary);
          
          // If house is too big for FSR area, scale it down to fit
          let finalWidthInDegrees = widthInDegrees;
          let finalDepthInDegrees = depthInDegrees;
          let scaleFactor = 1;
          
          if (houseAreaInDegrees > fsrAreaInDegrees) {
            scaleFactor = Math.sqrt(fsrAreaInDegrees / houseAreaInDegrees);
            finalWidthInDegrees = widthInDegrees * scaleFactor;
            finalDepthInDegrees = depthInDegrees * scaleFactor;
            console.log(`House scaled down by ${(scaleFactor * 100).toFixed(1)}% to fit FSR area`);
          }
          
          // Create a rectangle and rotate it to match lot orientation
          const rectCoordinates = [
            [innerCenter.geometry.coordinates[0] - finalWidthInDegrees/2, innerCenter.geometry.coordinates[1] - finalDepthInDegrees/2],
            [innerCenter.geometry.coordinates[0] + finalWidthInDegrees/2, innerCenter.geometry.coordinates[1] - finalDepthInDegrees/2],
            [innerCenter.geometry.coordinates[0] + finalWidthInDegrees/2, innerCenter.geometry.coordinates[1] + finalDepthInDegrees/2],
            [innerCenter.geometry.coordinates[0] - finalWidthInDegrees/2, innerCenter.geometry.coordinates[1] + finalDepthInDegrees/2],
            [innerCenter.geometry.coordinates[0] - finalWidthInDegrees/2, innerCenter.geometry.coordinates[1] - finalDepthInDegrees/2] // Close the polygon
          ];
          
          const rect = turf.polygon([rectCoordinates]);
          
          // Rotate the rectangle to match the lot's orientation
          houseBoundary = turf.transformRotate(rect, angle, { pivot: innerCenter.geometry.coordinates });
          console.log(`Green boundary using actual dimensions: ${houseWidth}m x ${houseDepth}m, rotated ${angle.toFixed(1)}°, compatible: ${isCompatible}`);
          
          // Store the coordinates for the floor plan to use the same positioning
          (window as any).houseBoundaryCoordinates = {
            center: innerCenter.geometry.coordinates,
            widthInDegrees: finalWidthInDegrees,
            depthInDegrees: finalDepthInDegrees,
            houseWidth: houseWidth * scaleFactor,
            houseDepth: houseDepth * scaleFactor,
            angle,
            isCompatible,
            scaleFactor
          };
        } else {
          // Fallback: Scale the inner polygon to house area
          const houseScale = Math.sqrt(houseArea / innerArea);
          houseBoundary = turf.transformScale(innerPoly, houseScale, { origin: innerCenter });
          console.log(`Green boundary using scaled area: ${houseArea}m²`);
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