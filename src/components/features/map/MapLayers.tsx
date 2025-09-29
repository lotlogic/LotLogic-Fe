import { useEffect, useRef } from 'react';
// import { useMobile } from '@/hooks/useMobile';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import { insetQuadPerSideLL, createSValueLabel, mapSValuesToSides, type Pt, type SetbackValues } from '@/lib/utils/geometry';
import type { LotProperties } from '@/types/lot';
import { getImageUrlWithCorsProxy } from '@/lib/api/lotApi';
import type { FloorPlan } from '@/types/houseDesign';
import { useRotationStore } from '@/stores/rotationStore';
// import { colors, getContent } from '@/constants/content';
// import { useUIStore } from '@/stores/uiStore';
// import { toast } from 'react-toastify';



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
}

// -----------------------------
// Utility Functions
// -----------------------------

// Add marker for edge midpoint
// const addEdgeMidpointMarker = (map: mapboxgl.Map, coordinates: [number, number], edgeLabel: string) => {
//   // Remove existing edge midpoint marker if it exists
//   const existingMarker = document.getElementById(`edge-midpoint-${edgeLabel}`);
//   if (existingMarker) {
//     existingMarker.remove();
//   }

//   // Create a custom marker element
//   const markerEl = document.createElement('div');
//   markerEl.id = `edge-midpoint-${edgeLabel}`;
//   markerEl.style.width = '25px';
//   markerEl.style.height = '25px';
//   markerEl.style.borderRadius = '50%';
//   markerEl.style.backgroundColor = '#00ff00';
//   markerEl.style.border = '3px solid #ffffff';
//   markerEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
//   markerEl.style.display = 'flex';
//   markerEl.style.alignItems = 'center';
//   markerEl.style.justifyContent = 'center';
//   markerEl.style.fontSize = '12px';
//   markerEl.style.fontWeight = 'bold';
//   markerEl.style.color = '#ffffff';
//   markerEl.textContent = edgeLabel;
//   markerEl.title = `Edge ${edgeLabel} Midpoint`;

//   // Create and add the marker
//   new mapboxgl.Marker(markerEl)
//     .setLngLat(coordinates)
//     .addTo(map);
// };

// Calculate distances and compare, auto-rotate if needed
const calculateAndCompareDistances = (_map: mapboxgl.Map, midpoint01: [number, number], midpoint23: [number, number]) => {
  // Get the lot frontage midpoint from the red marker
  const lotFrontageMarker = document.getElementById('frontage-midpoint-marker');
  if (!lotFrontageMarker) {
    // console.log("❌ Lot frontage midpoint marker not found");
    return;
  }

  // Get the lot frontage midpoint coordinates from the marker's position
  // We need to get this from the map marker's lngLat
  const lotFrontageMidpoint = getLotFrontageMidpointFromMarker();
  if (!lotFrontageMidpoint) {
    // console.log("❌ Could not get lot frontage midpoint coordinates");
    return;
  }

  // Calculate distances from lot frontage midpoint to house boundary edge midpoints
  const distance01 = turf.distance(turf.point(lotFrontageMidpoint), turf.point(midpoint01), { units: 'meters' });
  const distance23 = turf.distance(turf.point(lotFrontageMidpoint), turf.point(midpoint23), { units: 'meters' });

  // console.log("📏 Distance from lot frontage to house edge 0-1:", distance01.toFixed(2), "meters");
  // console.log("📏 Distance from lot frontage to house edge 2-3:", distance23.toFixed(2), "meters");

  // Check if 0-1 distance is greater than 2-3 distance
  if (distance01 > distance23) {
    // console.log("🔄 Distance 0-1 > 2-3, rotating floorplan 180°");
    // Use the existing rotation store
    const { setManualRotation } = useRotationStore.getState();
    setManualRotation(180);
  } else {
    // console.log("✅ Distance 0-1 <= 2-3, no rotation needed");
  }
};

// Global variable to store lot frontage midpoint
let globalLotFrontageMidpoint: [number, number] | null = null;

// Helper function to get lot frontage midpoint
const getLotFrontageMidpointFromMarker = (): [number, number] | null => {
  return globalLotFrontageMidpoint;
};

// Function to set the global lot frontage midpoint (called from MapControls)
export const setGlobalLotFrontageMidpoint = (coordinates: [number, number]) => {
  globalLotFrontageMidpoint = coordinates;
};

// Show house boundary points with labels (0, 1, 2, 3)
const showHouseBoundaryPoints = (map: mapboxgl.Map, coordinates: [number, number][]) => {
  // Remove existing house boundary point markers
  for (let i = 0; i < 4; i++) {
    const existingMarker = document.getElementById(`house-boundary-point-${i}`);
    if (existingMarker) {
      existingMarker.remove();
    }
  }

  // Create markers for each point with labels - COMMENTED OUT (visual only)
  // coordinates.forEach((coord, index) => {
  //   // Create a custom marker element
  //   const markerEl = document.createElement('div');
  //   markerEl.id = `house-boundary-point-${index}`;
  //   markerEl.style.width = '30px';
  //   markerEl.style.height = '30px';
  //   markerEl.style.borderRadius = '50%';
  //   markerEl.style.backgroundColor = '#ff6b35';
  //   markerEl.style.border = '3px solid #ffffff';
  //   markerEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
  //   markerEl.style.display = 'flex';
  //   markerEl.style.alignItems = 'center';
  //   markerEl.style.justifyContent = 'center';
  //   markerEl.style.fontSize = '14px';
  //   markerEl.style.fontWeight = 'bold';
  //   markerEl.style.color = '#ffffff';
  //   markerEl.textContent = index.toString();
  //   markerEl.title = `House Boundary Point ${index}`;

  //   // Create and add the marker
  //   new mapboxgl.Marker(markerEl)
  //     .setLngLat(coord)
  //     .addTo(map);
  // });

  // Log the coordinates for each point
  // console.log("🏠 House Boundary Points:");
  coordinates.forEach((coord, index) => {
    // console.log(`  Point ${index}: [${coord[0]}, ${coord[1]}]`);
  });
  
  // Log the edges
  // console.log("🏠 House Boundary Edges:");
  // console.log(`  Edge 0-1: Point 0 to Point 1`);
  // console.log(`  Edge 1-2: Point 1 to Point 2`);
  // console.log(`  Edge 2-3: Point 2 to Point 3`);
  // console.log(`  Edge 3-0: Point 3 to Point 0`);
  
  // Calculate and show midpoints for edges 0-1 and 2-3
  const midpoint01 = turf.midpoint(turf.point(coordinates[0]), turf.point(coordinates[1])).geometry.coordinates as [number, number];
  const midpoint23 = turf.midpoint(turf.point(coordinates[2]), turf.point(coordinates[3])).geometry.coordinates as [number, number];
  
  // console.log("🏠 Edge 0-1 Midpoint:", midpoint01);
  // console.log("🏠 Edge 2-3 Midpoint:", midpoint23);
  
  // Add markers for the midpoints - COMMENTED OUT (visual only)
  // addEdgeMidpointMarker(map, midpoint01, "0-1");
  // addEdgeMidpointMarker(map, midpoint23, "2-3");
  
  // Calculate distances from lot frontage midpoint to house boundary edge midpoints
  calculateAndCompareDistances(map, midpoint01, midpoint23);
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
}: MapLayersProps) {
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  
  // Manual rotation state from Zustand
  const { manualRotation, pendingRotation, setManualRotation, setPendingRotation, applyPendingRotation, setIsCalculating } = useRotationStore();
  // const { hideRotationControls } = useUIStore();
  
  // Track previous FSR violation state to show toast only once
  const prevExceedsFSRRef = useRef(false);

  // Responsive position for rotation panel using existing hook
  // const isMobileView = useMobile();

  // Reset manual rotation when switching lots or floorplans
  useEffect(() => {
    setManualRotation(0);
    setPendingRotation(null);
  }, [selectedLot?.properties?.ID, selectedFloorPlan?.url, setManualRotation, setPendingRotation]);

  // Additional reset when selectedFloorPlan changes (more immediate)
  useEffect(() => {
    if (selectedFloorPlan) {
      setManualRotation(0);
      setPendingRotation(null);
    }
  }, [selectedFloorPlan, setManualRotation, setPendingRotation]);

  // Reset FSR violation toast state when switching lots or floorplans
  useEffect(() => {
    prevExceedsFSRRef.current = false;
  }, [selectedLot?.properties?.ID, selectedFloorPlan?.url]);

  // Separate useEffect for immediate rotation updates
  useEffect(() => {
    if (!map || !selectedFloorPlan) return;
    
    // console.log("🎯 Rotation effect triggered - manualRotation:", manualRotation, "pendingRotation:", pendingRotation);
    
    const sourceId = 'floorplan-image';
    const layerId = 'floorplan-layer';
    
    // Check if layer exists, if not, store pending rotation and show loader
    // console.log("🔍 Checking if floorplan layer exists:", map.getLayer(layerId));
    if (!map.getLayer(layerId)) {
      // console.log("❌ Floorplan layer not found, storing pending rotation:", manualRotation);
      setPendingRotation(manualRotation);
      setIsCalculating(true);
      return;
    }
    
    // Determine the rotation to apply (use pending rotation if available, otherwise use current)
    let rotationToApply = manualRotation;
    if (pendingRotation !== null) {
      // console.log("🔄 Applying pending rotation:", pendingRotation);
      applyPendingRotation();
      rotationToApply = pendingRotation; // Use the pending rotation value for this execution
    }
      
      // Get the current house boundary data
      const houseBoundarySource = map.getSource('house-area-boundary-source');
      if (houseBoundarySource && houseBoundarySource.type === 'geojson') {
        const houseBoundaryData = (houseBoundarySource as mapboxgl.GeoJSONSource).serialize();
        if (houseBoundaryData.data && typeof houseBoundaryData.data === 'object' && 'geometry' in houseBoundaryData.data) {
          const houseBoundaryCoords = (houseBoundaryData.data as any).geometry.coordinates[0];
        
        // Apply rotation
        const closedRing: [number, number][] = [
          houseBoundaryCoords[0],
          houseBoundaryCoords[1],
          houseBoundaryCoords[2],
          houseBoundaryCoords[3],
          houseBoundaryCoords[0],
        ];
        const housePoly = turf.polygon([closedRing]);
        const pivot = turf.centroid(housePoly).geometry.coordinates as [number, number];
        const rotated = turf.transformRotate(housePoly, rotationToApply, { pivot });
        const rCoordsFull = rotated.geometry.coordinates[0] as [number, number][];
        const rCoords = rCoordsFull.slice(0, 4);
        
        // console.log("🔄 Applying rotation:", rotationToApply, "° to floorplan coordinates");
        // console.log("📍 Original coords:", houseBoundaryCoords);
        // console.log("📍 Rotated coords:", rCoords);
        
        // Update coordinates for Mapbox
        const floorPlanCoordinates: [[number, number], [number, number], [number, number], [number, number]] = [
          rCoords[3], // TL
          rCoords[2], // TR
          rCoords[1], // BR
          rCoords[0], // BL
        ];
        
        // Update the existing source
        if (map.getSource(sourceId)) {
          // console.log("✅ Updating floorplan source coordinates");
          (map.getSource(sourceId) as mapboxgl.ImageSource).setCoordinates(floorPlanCoordinates);
        } else {
          console.log("❌ Floorplan source not found");
        }

        // Auto-rotation logic: Check if we should rotate 180° based on distance to lot frontage
        if (globalLotFrontageMidpoint && manualRotation === 0) {
          // Calculate midpoints of the rotated house boundary edges
          const rotatedMidpoint01 = turf.midpoint(turf.point(rCoords[0]), turf.point(rCoords[1])).geometry.coordinates as [number, number];
          const rotatedMidpoint23 = turf.midpoint(turf.point(rCoords[2]), turf.point(rCoords[3])).geometry.coordinates as [number, number];
          
          // Calculate distances from lot frontage midpoint to rotated house boundary edge midpoints
          const distance01 = turf.distance(turf.point(globalLotFrontageMidpoint), turf.point(rotatedMidpoint01), { units: 'meters' });
          const distance23 = turf.distance(turf.point(globalLotFrontageMidpoint), turf.point(rotatedMidpoint23), { units: 'meters' });
          
          // console.log("🔄 Auto-rotation check - Distance 0-1:", distance01.toFixed(2), "m, Distance 2-3:", distance23.toFixed(2), "m");
          
          // If distance to edge 0-1 is greater than distance to edge 2-3, rotate 180°
          if (distance01 > distance23) {
            // console.log("🔄 Auto-rotating to 180° because distance01 > distance23");
            setManualRotation(180);
          } else {
            console.log("🔄 Keeping 0° rotation because distance01 <= distance23");
          }
        }
        
        // Check if rotated floorplan exceeds boundaries and log results
        if (selectedLot) {
          const geometry = selectedLot.geometry as GeoJSON.Polygon;
          const coordinates = geometry.coordinates[0] as [number, number][];
          
          // Create setback boundary
          const innerLL = insetQuadPerSideLL(coordinates, {
            front: setbackValues.front,
            side: setbackValues.side,
            rear: setbackValues.rear,
          });
          
          if (innerLL && innerLL.length >= 5) {
            const innerPoly = turf.polygon([innerLL]);
            const innerArea = turf.area(innerPoly);
            const desired = Math.min(fsrBuildableArea, innerArea);
            const scale = Math.sqrt(desired / innerArea);
            const innerCenter = turf.center(innerPoly);
            const fsrBoundary = turf.transformScale(innerPoly, scale, { origin: innerCenter });
            
            // Check if rotated floorplan exceeds FSR boundary
            const exceedsFSR = !turf.booleanWithin(rotated, fsrBoundary);
            
            // Check if rotated floorplan exceeds lot boundary (setback boundary)
            // const lotBoundary = turf.polygon([innerLL]);
            // const exceedsLot = !turf.booleanWithin(rotated, lotBoundary);
            
            // Console log boundary violations
            // console.log(`🎯 Rotation: ${manualRotation}° | Exceeds FSR: ${exceedsFSR} | Exceeds Lot: ${exceedsLot}`);
            
            // Show toast when FSR is exceeded (only once per violation)
            // COMMENTED OUT: Toast warning for FSR exceedance
            /*
            if (exceedsFSR && !prevExceedsFSRRef.current) {
              toast.warning("⚠️ Outside FSR. Rotate or pick another design.", {
                position: "bottom-right",
                autoClose: 4000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
              });
            }
            */
            
            // Update previous state
            prevExceedsFSRRef.current = exceedsFSR;
            
            // Show FSR boundary only when exceeded
            if (exceedsFSR) {
              // Show FSR boundary in red when exceeded
              if (!map.getLayer('fsr-boundary-layer')) {
                map.addLayer({
                  id: 'fsr-boundary-layer',
                  type: 'line',
                  source: 'fsr-boundary-source',
                  paint: { 'line-color': '#FF0000', 'line-width': 1.5, 'line-dasharray': [4, 4] }
                });
              }
            } else {
              // Remove FSR boundary layer if not exceeded
              if (map.getLayer('fsr-boundary-layer')) {
                map.removeLayer('fsr-boundary-layer');
              }
            }
          }
        }
      }
    }
  }, [manualRotation, pendingRotation, map, selectedFloorPlan, setPendingRotation, applyPendingRotation]);

  // Handle pending rotations when layer becomes available
  useEffect(() => {
    if (!map || !selectedFloorPlan || pendingRotation === null) return;
    
    const layerId = 'floorplan-layer';
    if (map.getLayer(layerId)) {
      // console.log("🔄 Layer now available, applying pending rotation:", pendingRotation);
      applyPendingRotation();
    }
  }, [map, selectedFloorPlan, pendingRotation, applyPendingRotation]);

  // Floorplan overlay
  useEffect(() => {
    if (!map || !selectedFloorPlan) return;
    
    // console.log("🏗️ Floorplan overlay effect triggered - manualRotation:", manualRotation);
    
    // Show loader while calculating
    setIsCalculating(true);
    
    const sourceId = 'floorplan-image';
    const layerId = 'floorplan-layer';

    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    // Delay floorplan creation to allow rotation calculations to complete
    const createFloorplan = () => {
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
          
          // Mapbox image coordinates must be provided in this order:
          // [top-left, top-right, bottom-right, bottom-left]. Our polygon
          // coordinates are in ring order starting from bottom-left, so we
          // reorder to avoid mirrored imagery.
          // Debug: Log original coordinates
          // console.log('Original houseBoundaryCoords:', houseBoundaryCoords);
          // console.log('Index 0 (bottom-left):', houseBoundaryCoords[0]);
          // console.log('Index 1 (bottom-right):', houseBoundaryCoords[1]);
          // console.log('Index 2 (top-right):', houseBoundaryCoords[2]);
          // console.log('Index 3 (top-left):', houseBoundaryCoords[3]);
          // const floorPlanCoordinates: [[number, number], [number, number], [number, number], [number, number]] = [

          //   houseBoundaryCoords[1],
          //   houseBoundaryCoords[0], 
          //   houseBoundaryCoords[3], 
          //   houseBoundaryCoords[2]
          //   // houseBoundaryCoords[2],
          //   // houseBoundaryCoords[1], 
          //   // houseBoundaryCoords[0], 
          //   // houseBoundaryCoords[3]
          //   // houseBoundaryCoords[3],
          //   // houseBoundaryCoords[2], 
          //   // houseBoundaryCoords[1], 
          //   // houseBoundaryCoords[0]  
          // ];
          
          // map.addSource(sourceId, { 
          //   type: 'image', 
          //   url: proxiedImageUrl, 
          //   coordinates: floorPlanCoordinates 
          // });

          
          // Align the house front (assumed indices 0-3) to the lot front (indices 0-1),
          // then use the front edge as the bottom edge for Mapbox image ordering [TL, TR, BR, BL]
          try {
            // const lotPoly = selectedLot?.geometry as GeoJSON.Polygon | undefined;
            // console.log(lotPoly, "lotPoly");
            // const lotCoords = lotPoly?.coordinates?.[0] as [number, number][] | undefined;
            
            // Determine lot frontage - use frontageCoordinate if available, otherwise fallback to first two coordinates
            // let lotFrontA: [number, number] | undefined;
            // let lotFrontB: [number, number] | undefined;
            
            // Check for explicit frontageCoordinate property (from backend)
            // const frontageData = selectedLot?.properties?.frontageCoordinate;
            // console.log("Raw frontageData from backend:", frontageData);
            
            // if (frontageData) {
            //   let parsedFrontage: [number, number][] | null = null;
              
            //   // Handle JSON string format (like the one you provided)
            //   if (typeof frontageData === 'string' && frontageData.startsWith('{"type":"LineString"')) {
            //     try {
            //       const parsed = JSON.parse(frontageData);
            //       if (parsed.type === 'LineString' && parsed.coordinates) {
            //         parsedFrontage = parsed.coordinates as [number, number][];
            //         // console.log("Parsed JSON string frontage coordinates:", parsedFrontage);
            //       }
            //     } catch (e) {
            //       console.error("Error parsing JSON frontageCoordinate:", e);
            //     }
            //   }
            //   // Handle WKT string format
            //   // else if (typeof frontageData === 'string' && frontageData.startsWith('LINESTRING')) {
            //   //   parsedFrontage = parseWKTLineString(frontageData);
            //   //   console.log("Parsed WKT frontage coordinates:", parsedFrontage);
            //   // }
            //   // Handle GeoJSON object format
            //   else if (typeof frontageData === 'object' && frontageData.type === 'LineString' && frontageData.coordinates) {
            //     parsedFrontage = frontageData.coordinates as [number, number][];
            //     // console.log("Parsed GeoJSON frontage coordinates:", parsedFrontage);
            //   }
              
            //   // if (parsedFrontage && parsedFrontage.length >= 2) {
            //   //   lotFrontA = parsedFrontage[0];
            //   //   lotFrontB = parsedFrontage[1];
            //     // console.log("Using frontageCoordinate from backend:", lotFrontA, lotFrontB);
            //   // }
            // }
            
            // Manual rotation only - user controls the floorplan direction
            const delta = manualRotation;
            // console.log("🎯 Applying rotation delta:", delta);
              
              // const houseFrontA = bestEdge.coords[0] as [number, number];
              // const houseFrontB = bestEdge.coords[1] as [number, number];
              

              // Rotate house ring around its centroid
              const closedRing: [number, number][] = [
            houseBoundaryCoords[0],
            houseBoundaryCoords[1],  
            houseBoundaryCoords[2],
                houseBoundaryCoords[3],
                houseBoundaryCoords[0],
              ];
              const housePoly = turf.polygon([closedRing]);
              const pivot = turf.centroid(housePoly).geometry.coordinates as [number, number];
              const rotated = turf.transformRotate(housePoly, delta, { pivot });
              const rCoordsFull = rotated.geometry.coordinates[0] as [number, number][];
              const rCoords = rCoordsFull.slice(0, 4);

              // For manual rotation, we use the standard coordinate mapping

              // Keep rectangle shape; only rotate. Original ring order is [BL, BR, TR, TL]
              // Map to Mapbox order [TL, TR, BR, BL]
              const floorPlanCoordinates: [[number, number], [number, number], [number, number], [number, number]] = [
                rCoords[3], // TL
                rCoords[2], // TR
                rCoords[1], // BR
                rCoords[0], // BL
          ];
          
              // Remove existing layer and source if they exist
              if (map.getLayer(layerId)) {
                map.removeLayer(layerId);
              }
              if (map.getSource(sourceId)) {
                map.removeSource(sourceId);
              }
              
              map.addSource(sourceId, {
                type: 'image',
                url: proxiedImageUrl,
                coordinates: floorPlanCoordinates,
              });
            // Floorplan will be shown regardless of frontage coordinate availability
          } catch (error) {
            console.log("Error processing frontageCoordinate - floorplan not displayed:", error);
            return; // Exit early, don't add the floorplan image
          }
        }
      }
      // } else {
      //   // Fallback to original coordinates
      //   // Fallback assumes coordinates are provided in ring order starting
      //   // from bottom-left. Reorder to the required Mapbox order.
      //   const fp = selectedFloorPlan.coordinates;
      //   const reordered: [[number, number], [number, number], [number, number], [number, number]] = [
      //     fp[1], // top-left
      //     fp[0], // top-right
      //     fp[3], // bottom-right
      //     fp[2]  // bottom-left
      //   ];
      //   map.addSource(sourceId, { 
      //     type: 'image', 
      //     url: proxiedImageUrl, 
      //     coordinates: reordered 
      //   });
      // }
      
      map.addLayer({ 
        id: layerId, 
        type: 'raster', 
        source: sourceId, 
        paint: { 'raster-opacity': 0.8 } 
      });
      
      // console.log("✅ Floorplan layer created successfully");
      
      // Apply any pending rotation now that the layer exists
      if (pendingRotation !== null) {
        // console.log("🔄 Applying pending rotation after layer creation:", pendingRotation);
        applyPendingRotation();
      }
      
      // Hide loader when layer is ready
      setIsCalculating(false);
    };
    
    img.onerror = () => {
      // console.log("❌ Image failed to load");
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      setIsCalculating(false);
    };
    
      img.src = proxiedImageUrl;
    };

    // Delay floorplan creation to allow rotation calculations to complete
    const timeoutId = setTimeout(() => {
      createFloorplan();
    }, 500); // 500ms delay to allow rotation calculations

    return () => {
      clearTimeout(timeoutId);
      if (map) {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
    };
  }, [map, selectedFloorPlan, manualRotation]);


  // Check FSR/Boundary exceedance on any relevant change, not only during rotation
  // COMMENTED OUT: FSR boundary area detection and toast message functionality
  /*
  useEffect(() => {
    if (!map || !selectedFloorPlan || !selectedLot) return;

    // Use a small delay to ensure house boundary source is created by the S values effect
    const timeoutId = setTimeout(() => {
      const houseBoundarySource = map.getSource('house-area-boundary-source');
      if (!houseBoundarySource || houseBoundarySource.type !== 'geojson') return;

      const houseBoundaryData = (houseBoundarySource as mapboxgl.GeoJSONSource).serialize();
      if (!houseBoundaryData.data || typeof houseBoundaryData.data !== 'object' || !('geometry' in houseBoundaryData.data)) return;

      const houseBoundaryCoords = (houseBoundaryData.data as any).geometry.coordinates[0] as [number, number][];
      if (!houseBoundaryCoords || houseBoundaryCoords.length < 4) return;

      // Build rotated house polygon based on current manualRotation
      const closedRing: [number, number][] = [
        houseBoundaryCoords[0],
        houseBoundaryCoords[1],
        houseBoundaryCoords[2],
        houseBoundaryCoords[3],
        houseBoundaryCoords[0],
      ];
      const housePoly = turf.polygon([closedRing]);
      const pivot = turf.centroid(housePoly).geometry.coordinates as [number, number];
      const rotated = turf.transformRotate(housePoly, manualRotation, { pivot });

      // Build setback and FSR boundary
      const geometry = selectedLot.geometry as GeoJSON.Polygon;
      const coordinates = geometry.coordinates[0] as [number, number][];
      const innerLL = insetQuadPerSideLL(coordinates, {
        front: setbackValues.front,
        side: setbackValues.side,
        rear: setbackValues.rear,
      });
      if (!innerLL || innerLL.length < 5) return;

      const innerPoly = turf.polygon([innerLL]);
      const innerArea = turf.area(innerPoly);
      const desired = Math.min(fsrBuildableArea, innerArea);
      const scale = Math.sqrt(desired / innerArea);
      const innerCenter = turf.center(innerPoly);
      const fsrBoundary = turf.transformScale(innerPoly, scale, { origin: innerCenter });

      // Ensure the FSR boundary source exists for rendering
      if (!map.getSource('fsr-boundary-source')) {
        map.addSource('fsr-boundary-source', { type: 'geojson', data: fsrBoundary });
      } else {
        (map.getSource('fsr-boundary-source') as mapboxgl.GeoJSONSource).setData(fsrBoundary as any);
      }

      // Evaluate exceedance
      const exceedsFSR = !turf.booleanWithin(rotated, fsrBoundary);

      // Toast once per violation state transition
      if (exceedsFSR && !prevExceedsFSRRef.current) {
        toast.warning("⚠️ Outside FSR. Rotate or pick another design.", {
          position: "bottom-right",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
      prevExceedsFSRRef.current = exceedsFSR;

      // Toggle red FSR boundary layer visibility
      if (exceedsFSR) {
        if (!map.getLayer('fsr-boundary-layer')) {
          map.addLayer({
            id: 'fsr-boundary-layer',
            type: 'line',
            source: 'fsr-boundary-source',
            paint: { 'line-color': '#FF0000', 'line-width': 1.5, 'line-dasharray': [4, 4] }
          });
        }
      } else if (map.getLayer('fsr-boundary-layer')) {
        map.removeLayer('fsr-boundary-layer');
      }
    }, 100); // Small delay to ensure house boundary source is ready

    return () => clearTimeout(timeoutId);
  }, [map, selectedLot, selectedFloorPlan, setbackValues, fsrBuildableArea, manualRotation]);
  */


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
      //   paint: { 'line-color': '#FF9800', 'line-width': 1.5, 'line-dasharray': [4, 4] }
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

        // Show house boundary points with labels (0, 1, 2, 3)
        const houseBoundaryCoords = houseBoundary.geometry.coordinates[0] as [number, number][];
        showHouseBoundaryPoints(map, houseBoundaryCoords);

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
      if (map) {
        if (map.getLayer('setback-boundary-layer')) map.removeLayer('setback-boundary-layer');
        if (map.getSource('setback-boundary-source')) map.removeSource('setback-boundary-source');
        if (map.getLayer('fsr-boundary-layer')) map.removeLayer('fsr-boundary-layer');
        if (map.getSource('fsr-boundary-source')) map.removeSource('fsr-boundary-source');
        if (map.getLayer('house-area-boundary-layer')) map.removeLayer('house-area-boundary-layer');
        if (map.getSource('house-area-boundary-source')) map.removeSource('house-area-boundary-source');
      }
      // Clean up house boundary point markers
      for (let i = 0; i < 4; i++) {
        const existingMarker = document.getElementById(`house-boundary-point-${i}`);
        if (existingMarker) {
          existingMarker.remove();
        }
      }
      // Clean up edge midpoint markers
      const edgeMidpoint01 = document.getElementById('edge-midpoint-0-1');
      if (edgeMidpoint01) edgeMidpoint01.remove();
      const edgeMidpoint23 = document.getElementById('edge-midpoint-2-3');
      if (edgeMidpoint23) edgeMidpoint23.remove();
    };
  }, [map, selectedLot, setbackValues, fsrBuildableArea, selectedFloorPlan, showFloorPlanModal, showFacadeModal, setSValuesMarkers]);

  // Rotation Controls UI - COMMENTED OUT (visual only)
  // if (!selectedFloorPlan || hideRotationControls) return null;
  
  // return (
  //   <>
  //     <style>
  //       {`
  //         @keyframes spin {
  //           0% { transform: rotate(0deg); }
  //           100% { transform: rotate(360deg); }
  //         }
  //       `}
  //     </style>
  //     <div style={{
  //     position: 'absolute',
  //     top: isMobileView ? '10px' : '20px',
  //     right: isMobileView ? '10px' : '70px',
  //     background: 'white',
  //     padding: '15px',
  //     borderRadius: '8px',
  //     boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  //     zIndex: 1000,
  //     minWidth: '250px'
  //   }}>
  //     <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>{getContent('map.floorplanRotation', 'Floorplan Rotation')}</h4>
      
  //     <div>
  //       <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px' }}>
  //         Rotation: {manualRotation.toFixed(0)}°
  //       </label>
  //       <input
  //         type="range"
  //         min="0"
  //         max="360"
  //         value={manualRotation}
  //         onChange={(e) => setManualRotation(Number(e.target.value))}
  //         style={{ width: '100%', marginBottom: '10px', accentColor: colors.primary }}
  //       />
        
  //       <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
  //         {[0, 90, 180, 270].map(angle => (
  //           <button
  //             key={angle}
  //             onClick={() => {
  //               setManualRotation(angle);
  //             }}
  //             style={{
  //               padding: '4px 8px',
  //               fontSize: '10px',
  //               border: '1px solid #ccc',
  //               borderRadius: '4px',
  //               background: manualRotation === angle ? colors.primary : 'white',
  //               color: manualRotation === angle ? 'white' : 'black',
  //               cursor: 'pointer'
  //             }}
  //           >
  //             {angle}°
  //           </button>
  //         ))}
  //       </div>
  //     </div>
      
  //   </div>
  //   </>
  // );

  return null; 
}

// Separate loader component that overlays the map
export function MapLoader({ isCalculating, map, selectedLot }: { 
  isCalculating: boolean; 
  map: mapboxgl.Map | null; 
  selectedLot: any;
}) {
  if (!isCalculating || !map || !selectedLot) return null;
  
  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        pointerEvents: 'none'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '4px solid rgba(255, 255, 255, 0.3)',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}></div>
      </div>
    </>
  );
}