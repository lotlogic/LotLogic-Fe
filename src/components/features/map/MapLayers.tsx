import showToast from "@/components/ui/Toast";
import { getImageUrlWithCorsProxy } from "@/lib/api/lotApi";
import {
  createSValueLabel,
  insetQuadPerSideLL,
  mapSValuesToSides,
  type Pt,
  type SetbackValues,
} from "@/lib/utils/geometry";
import { useRotationStore } from "@/stores/rotationStore";
import type { FloorPlan } from "@/types/houseDesign";
import type { LotProperties } from "@/types/lot";
import * as turf from "@turf/turf";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

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
  selectedLot:
    | (mapboxgl.MapboxGeoJSONFeature & { properties: LotProperties })
    | null;
  setbackValues: SetbackValues;
  fsrBuildableArea: number | null;
  selectedFloorPlan: FloorPlan | null;
  showFloorPlanModal: boolean;
  showFacadeModal: boolean;
  setSValuesMarkers: (markers: mapboxgl.Marker[]) => void;
}

// Calculate distances and compare, auto-rotate if needed
const calculateAndCompareDistances = (
  _map: mapboxgl.Map,
  midpoint01: [number, number],
  midpoint23: [number, number]
) => {
  // Get the lot frontage midpoint from the red marker
  const lotFrontageMarker = document.getElementById("frontage-midpoint-marker");
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
  const distance01 = turf.distance(
    turf.point(lotFrontageMidpoint),
    turf.point(midpoint01),
    { units: "meters" }
  );
  const distance23 = turf.distance(
    turf.point(lotFrontageMidpoint),
    turf.point(midpoint23),
    { units: "meters" }
  );

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
export const setGlobalLotFrontageMidpoint = (coordinates: [number, number]) =>
  (globalLotFrontageMidpoint = coordinates);

// Show house boundary points with labels (0, 1, 2, 3)
const showHouseBoundaryPoints = (
  map: mapboxgl.Map,
  coordinates: [number, number][]
) => {
  // Remove existing house boundary point markers
  for (let i = 0; i < 4; i++) {
    const existingMarker = document.getElementById(`house-boundary-point-${i}`);
    if (existingMarker) {
      existingMarker.remove();
    }
  }

  // Calculate and show midpoints for edges 0-1 and 2-3
  const midpoint01 = turf.midpoint(
    turf.point(coordinates[0]),
    turf.point(coordinates[1])
  ).geometry.coordinates as [number, number];
  const midpoint23 = turf.midpoint(
    turf.point(coordinates[2]),
    turf.point(coordinates[3])
  ).geometry.coordinates as [number, number];

  // Calculate distances from lot frontage midpoint to house boundary edge midpoints
  calculateAndCompareDistances(map, midpoint01, midpoint23);
};

// Calculate house dimensions and positioning
const calculateHouseBoundary = (
  selectedFloorPlan: FloorPlan,
  selectedLot: mapboxgl.MapboxGeoJSONFeature & { properties: LotProperties },
  innerCenter: any
): HouseBoundaryData | null => {
  if (!selectedFloorPlan.houseArea || selectedFloorPlan.houseArea <= 0) {
    return null;
  }

  if (selectedFloorPlan.houseWidth && selectedFloorPlan.houseDepth) {
    const houseWidth = selectedFloorPlan.houseWidth;

    const houseDepth = selectedFloorPlan.houseDepth;

    // Calculate the lot's orientation
    const geometry = selectedLot.geometry as GeoJSON.Polygon;
    const coordinates = geometry.coordinates[0] as [number, number][];

    // Calculate sides distances from the lot geometry
    const side1 = turf.distance(coordinates[0], coordinates[1], {
      units: "meters",
    });
    const side2 = turf.distance(coordinates[1], coordinates[2], {
      units: "meters",
    });
    const side3 = turf.distance(coordinates[2], coordinates[3], {
      units: "meters",
    });
    const side4 = turf.distance(coordinates[3], coordinates[0], {
      units: "meters",
    });

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

    // Calculate the width and depth in degrees using Turf
    const centerPoint = innerCenter.geometry.coordinates;
    const point1 = turf.point([centerPoint[0], centerPoint[1]]);
    const point2 = turf.point([centerPoint[0] + 0.001, centerPoint[1]]); // 0.001 degree longitude
    const point3 = turf.point([centerPoint[0], centerPoint[1] + 0.001]); // 0.001 degree latitude

    const lngToMeters =
      turf.distance(point1, point2, { units: "meters" }) * 1000; // Convert to meters per degree
    const latToMeters =
      turf.distance(point1, point3, { units: "meters" }) * 1000; // Convert to meters per degree

    const widthInDegrees = houseWidth / lngToMeters;
    const depthInDegrees = houseDepth / latToMeters;

    return {
      center: innerCenter.geometry.coordinates,
      widthInDegrees: widthInDegrees,
      depthInDegrees: depthInDegrees,
      houseWidth: houseWidth,
      houseDepth: houseDepth,
      angle,
      scaleFactor: 1,
    };
  }

  return null;
};

// -----------------------------
// Component
// -----------------------------
export const MapLayers = ({
  map,
  selectedLot,
  setbackValues,
  fsrBuildableArea,
  selectedFloorPlan,
  showFloorPlanModal,
  showFacadeModal,
  setSValuesMarkers,
}: MapLayersProps) => {
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  // Track and manage concurrent floorplan renders so only the latest can affect loader state
  const floorplanRunIdRef = useRef(0);

  // Manual rotation state from Zustand
  const {
    manualRotation,
    pendingRotation,
    setManualRotation,
    setPendingRotation,
    applyPendingRotation,
    setIsCalculating,
  } = useRotationStore();

  // Track previous FSR violation state to show toast only once
  const prevExceedsFSRRef = useRef(false);

  // Reset manual rotation when switching lots or floorplans
  useEffect(() => {
    setManualRotation(0);
    setPendingRotation(null);
  }, [
    selectedLot?.properties?.ID,
    selectedFloorPlan?.url,
    setManualRotation,
    setPendingRotation,
  ]);

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

    const sourceId = "floorplan-image";
    const layerId = "floorplan-layer";

    // Check if layer exists, if not, store pending rotation and show loader
    // console.log("🔍 Checking if floorplan layer exists:", map.getLayer(layerId));
    if (!map.getLayer(layerId)) {
      // console.log("❌ Floorplan layer not found, storing pending rotation:", manualRotation);
      setPendingRotation(manualRotation);
      // Avoid flashing the loader again on rapid re-entry
      try {
        const { isCalculating } = useRotationStore.getState();
        if (!isCalculating) {
          setIsCalculating(true);
        }
      } catch {
        setIsCalculating(true);
      }
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
    const houseBoundarySource = map.getSource("house-area-boundary-source");
    if (houseBoundarySource && houseBoundarySource.type === "geojson") {
      const houseBoundaryData = (
        houseBoundarySource as mapboxgl.GeoJSONSource
      ).serialize();
      if (
        houseBoundaryData.data &&
        typeof houseBoundaryData.data === "object" &&
        "geometry" in houseBoundaryData.data
      ) {
        const houseBoundaryCoords = (houseBoundaryData.data as any).geometry
          .coordinates[0];

        // Apply rotation
        const closedRing: [number, number][] = [
          houseBoundaryCoords[0],
          houseBoundaryCoords[1],
          houseBoundaryCoords[2],
          houseBoundaryCoords[3],
          houseBoundaryCoords[0],
        ];
        const housePoly = turf.polygon([closedRing]);
        const pivot = turf.centroid(housePoly).geometry.coordinates as [
          number,
          number
        ];
        const rotated = turf.transformRotate(housePoly, rotationToApply, {
          pivot,
        });
        const rCoordsFull = rotated.geometry.coordinates[0] as [
          number,
          number
        ][];
        const rCoords = rCoordsFull.slice(0, 4);

        // Update coordinates for Mapbox
        const floorPlanCoordinates: [
          [number, number],
          [number, number],
          [number, number],
          [number, number]
        ] = [
          rCoords[3], // TL
          rCoords[2], // TR
          rCoords[1], // BR
          rCoords[0], // BL
        ];

        // Update the existing source
        if (map.getSource(sourceId)) {
          // console.log("✅ Updating floorplan source coordinates");
          (map.getSource(sourceId) as mapboxgl.ImageSource).setCoordinates(
            floorPlanCoordinates
          );
        } else {
          console.log("❌ Floorplan source not found");
        }

        // Auto-rotation logic: Check if we should rotate 180° based on distance to lot frontage
        if (globalLotFrontageMidpoint && manualRotation === 0) {
          // Calculate midpoints of the rotated house boundary edges
          const rotatedMidpoint01 = turf.midpoint(
            turf.point(rCoords[0]),
            turf.point(rCoords[1])
          ).geometry.coordinates as [number, number];
          const rotatedMidpoint23 = turf.midpoint(
            turf.point(rCoords[2]),
            turf.point(rCoords[3])
          ).geometry.coordinates as [number, number];

          // Calculate distances from lot frontage midpoint to rotated house boundary edge midpoints
          const distance01 = turf.distance(
            turf.point(globalLotFrontageMidpoint),
            turf.point(rotatedMidpoint01),
            { units: "meters" }
          );
          const distance23 = turf.distance(
            turf.point(globalLotFrontageMidpoint),
            turf.point(rotatedMidpoint23),
            { units: "meters" }
          );

          // console.log("🔄 Auto-rotation check - Distance 0-1:", distance01.toFixed(2), "m, Distance 2-3:", distance23.toFixed(2), "m");

          // If distance to edge 0-1 is greater than distance to edge 2-3, rotate 180°
          if (distance01 > distance23) {
            // console.log("🔄 Auto-rotating to 180° because distance01 > distance23");
            setManualRotation(180);
          } else {
            console.log(
              "🔄 Keeping 0° rotation because distance01 <= distance23"
            );
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
            const desired = fsrBuildableArea
              ? Math.min(fsrBuildableArea, innerArea)
              : innerArea;
            const scale = Math.sqrt(desired / innerArea);
            const innerCenter = turf.center(innerPoly);
            const fsrBoundary = turf.transformScale(innerPoly, scale, {
              origin: innerCenter,
            });

            // Check if rotated floorplan exceeds FSR boundary
            const exceedsFSR = !turf.booleanWithin(rotated, fsrBoundary);
            // Update previous state
            prevExceedsFSRRef.current = exceedsFSR;
          }
        }
      }
    }
  }, [
    manualRotation,
    pendingRotation,
    map,
    selectedFloorPlan,
    setPendingRotation,
    applyPendingRotation,
  ]);

  // Handle pending rotations when layer becomes available
  useEffect(() => {
    if (!map || !selectedFloorPlan || pendingRotation === null) return;

    const layerId = "floorplan-layer";
    if (map.getLayer(layerId)) {
      applyPendingRotation();
    }
  }, [map, selectedFloorPlan, pendingRotation, applyPendingRotation]);

  // Floorplan overlay
  useEffect(() => {
    if (!map || !selectedFloorPlan) return;

    // Start a new render run; only this run is allowed to clear the loader
    const myRunId = ++floorplanRunIdRef.current;
    setIsCalculating(true);

    const sourceId = "floorplan-image";
    const layerId = "floorplan-layer";

    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    // Delay floorplan creation to allow rotation calculations to complete
    const createFloorplan = () => {
      const proxiedImageUrl = getImageUrlWithCorsProxy(selectedFloorPlan.url);

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        // Use the house boundary coordinates for the floorplan if available
        const houseBoundarySource = map.getSource("house-area-boundary-source");

        if (houseBoundarySource && houseBoundarySource.type === "geojson") {
          const houseBoundaryData = (
            houseBoundarySource as mapboxgl.GeoJSONSource
          ).serialize();
          if (
            houseBoundaryData.data &&
            typeof houseBoundaryData.data === "object" &&
            "geometry" in houseBoundaryData.data
          ) {
            const houseBoundaryCoords = (houseBoundaryData.data as any).geometry
              .coordinates[0];

            // Align the house front (assumed indices 0-3) to the lot front (indices 0-1),
            // then use the front edge as the bottom edge for Mapbox image ordering [TL, TR, BR, BL]
            try {
              // Manual rotation only - user controls the floorplan direction
              const delta = manualRotation;

              // Rotate house ring around its centroid
              const closedRing: [number, number][] = [
                houseBoundaryCoords[0],
                houseBoundaryCoords[1],
                houseBoundaryCoords[2],
                houseBoundaryCoords[3],
                houseBoundaryCoords[0],
              ];
              const housePoly = turf.polygon([closedRing]);
              const pivot = turf.centroid(housePoly).geometry.coordinates as [
                number,
                number
              ];
              const rotated = turf.transformRotate(housePoly, delta, { pivot });
              const rCoordsFull = rotated.geometry.coordinates[0] as [
                number,
                number
              ][];
              const rCoords = rCoordsFull.slice(0, 4);

              // For manual rotation, we use the standard coordinate mapping

              // Keep rectangle shape; only rotate. Original ring order is [BL, BR, TR, TL]
              // Map to Mapbox order [TL, TR, BR, BL]
              const floorPlanCoordinates: [
                [number, number],
                [number, number],
                [number, number],
                [number, number]
              ] = [
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
                type: "image",
                url: proxiedImageUrl,
                coordinates: floorPlanCoordinates,
              });
              // Floorplan will be shown regardless of frontage coordinate availability
            } catch (error) {
              console.error(
                "Error processing frontageCoordinate - floorplan not displayed:",
                error
              );
              showToast({
                message:
                  "Failed to display floorplan. Please try selecting a different design.",
                type: "error",
                options: { autoClose: 5000 },
              });
              return; // Exit early, don't add the floorplan image
            }
          }
        }

        map.addLayer({
          id: layerId,
          type: "raster",
          source: sourceId,
          paint: { "raster-opacity": 0.8 },
        });

        // Apply any pending rotation now that the layer exists
        if (pendingRotation !== null) {
          applyPendingRotation();
        }

        // Hide loader when layer is ready (only if still latest run)
        if (floorplanRunIdRef.current === myRunId) {
          setIsCalculating(false);
        }
      };

      img.onerror = () => {
        console.error("Failed to load floorplan image");
        showToast({
          message:
            "Failed to load floorplan image. Please check your connection or try a different design.",
          type: "error",
          options: { autoClose: 5000 },
        });
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
        if (floorplanRunIdRef.current === myRunId) {
          setIsCalculating(false);
        }
      };

      img.src = proxiedImageUrl;
    };

    // Delay floorplan creation to allow rotation calculations to complete
    const timeoutId = setTimeout(() => {
      createFloorplan();
    }, 300);

    // Safety: auto-clear loader if something hangs
    const safetyId = setTimeout(() => {
      if (floorplanRunIdRef.current === myRunId) {
        setIsCalculating(false);
      }
    }, 10000);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(safetyId);
      if (map) {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
      // If this run is still the active one, clear the loader on cleanup
      if (floorplanRunIdRef.current === myRunId) {
        setIsCalculating(false);
      }
    };
  }, [map, selectedFloorPlan, manualRotation]);

  // S values + Setbacks + FSR boundary
  useEffect(() => {
    markersRef.current.forEach((m) => m.remove());
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
      if (map.getLayer("setback-boundary-layer"))
        map.removeLayer("setback-boundary-layer");
      if (map.getSource("setback-boundary-source"))
        map.removeSource("setback-boundary-source");
      map.addSource("setback-boundary-source", {
        type: "geojson",
        data: innerPoly,
      });
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
      let innerArea = turf.area(innerPoly);
      const desired = fsrBuildableArea
        ? Math.min(fsrBuildableArea, innerArea)
        : innerArea;
      const scale = Math.sqrt(desired / innerArea);
      const innerCenter = turf.center(innerPoly);
      const fsrBoundary = turf.transformScale(innerPoly, scale, {
        origin: innerCenter,
      });

      if (map.getLayer("fsr-boundary-layer"))
        map.removeLayer("fsr-boundary-layer");
      if (map.getSource("fsr-boundary-source"))
        map.removeSource("fsr-boundary-source");
      map.addSource("fsr-boundary-source", {
        type: "geojson",
        data: fsrBoundary,
      });
      // map.addLayer({
      //   id: 'fsr-boundary-layer',
      //   type: 'line',
      //   source: 'fsr-boundary-source',
      //   paint: { 'line-color': '#FF9800', 'line-width': 1.5, 'line-dasharray': [4, 4] }
      // });

      // Log FSR area in square meters
      // try {
      //   const fsrAreaM2 = turf.area(fsrBoundary);
      //   console.log('[FSR] Area (m²):', fsrAreaM2.toFixed(2));
      // } catch {}

      // Log FSR width and depth (meters) based on axis-aligned bbox
      // try {
      //   const bbox = turf.bbox(fsrBoundary) as [number, number, number, number];
      //   const west  = turf.point([bbox[0], bbox[1]]);
      //   const east  = turf.point([bbox[2], bbox[1]]);
      //   const south = turf.point([bbox[0], bbox[1]]);
      //   const north = turf.point([bbox[0], bbox[3]]);
      //   const fsrWidthM = turf.distance(west, east, { units: 'meters' });
      //   const fsrDepthM = turf.distance(south, north, { units: 'meters' });
      //   console.log('[FSR] Width (m):', fsrWidthM.toFixed(2), 'Depth (m):', fsrDepthM.toFixed(2));
      // } catch {}

      // FSR area label - only show when we have a valid FSR value
      if (
        fsrBuildableArea &&
        !selectedFloorPlan &&
        !showFloorPlanModal &&
        !showFacadeModal
      ) {
        const fsrAreaLabel = new mapboxgl.Marker({
          element: createSValueLabel(`${Math.round(desired)} m² FSR`, "center"),
          anchor: "center",
        })
          .setLngLat(innerCenter.geometry.coordinates as [number, number])
          .addTo(map);
        newMarkers.push(fsrAreaLabel);
      }

      // House Design Area Boundary
      if (
        selectedFloorPlan &&
        selectedFloorPlan.houseArea &&
        selectedFloorPlan.houseArea > 0
      ) {
        const houseArea = selectedFloorPlan.houseArea;
        const houseDesired = houseArea
          ? Math.min(houseArea, desired)
          : houseArea;
        let scale = Math.sqrt(houseDesired / innerArea);
        const innerCenter = turf.center(innerPoly);
        const boundaryData = calculateHouseBoundary(
          selectedFloorPlan,
          selectedLot,
          innerCenter
        );

        let houseBoundary;
        if (boundaryData) {
          const setbackCenter = turf.centroid(innerPoly);
          const rectCoordinates = [
            [
              setbackCenter.geometry.coordinates[0] -
                boundaryData.widthInDegrees / 2,
              setbackCenter.geometry.coordinates[1] -
                boundaryData.depthInDegrees / 2,
            ],
            [
              setbackCenter.geometry.coordinates[0] +
                boundaryData.widthInDegrees / 2,
              setbackCenter.geometry.coordinates[1] -
                boundaryData.depthInDegrees / 2,
            ],
            [
              setbackCenter.geometry.coordinates[0] +
                boundaryData.widthInDegrees / 2,
              setbackCenter.geometry.coordinates[1] +
                boundaryData.depthInDegrees / 2,
            ],
            [
              setbackCenter.geometry.coordinates[0] -
                boundaryData.widthInDegrees / 2,
              setbackCenter.geometry.coordinates[1] +
                boundaryData.depthInDegrees / 2,
            ],
            [
              setbackCenter.geometry.coordinates[0] -
                boundaryData.widthInDegrees / 2,
              setbackCenter.geometry.coordinates[1] -
                boundaryData.depthInDegrees / 2,
            ],
          ];

          const rect = turf.polygon([rectCoordinates]);
          const scaledRect = turf.transformScale(rect, scale, {
            origin: setbackCenter,
          });
          houseBoundary = turf.transformRotate(scaledRect, boundaryData.angle, {
            pivot: setbackCenter.geometry.coordinates,
          });
        } else {
          // const houseScale = Math.sqrt(houseArea / innerArea);
          houseBoundary = turf.transformScale(innerPoly, scale, {
            origin: innerCenter,
          });
        }

        // Ensure houseBoundary lies inside the FSR boundary by shrinking if needed
        try {
          if (!turf.booleanWithin(houseBoundary as any, fsrBoundary as any)) {
            const pivotCenter = turf.centroid(houseBoundary as any).geometry
              .coordinates as [number, number];
            let attempts = 0;
            while (
              attempts < 80 &&
              !turf.booleanWithin(houseBoundary as any, fsrBoundary as any)
            ) {
              houseBoundary = turf.transformScale(houseBoundary as any, 0.98, {
                origin: pivotCenter,
              });
              attempts++;
            }
          }
        } catch (error) {
          console.error("Error during house boundary scaling:", error);
          showToast({
            message:
              "Unable to properly scale house design. Using simplified layout.",
            type: "error",
            options: { autoClose: 4000 },
          });
        }

        if (map.getLayer("house-area-boundary-layer"))
          map.removeLayer("house-area-boundary-layer");
        if (map.getSource("house-area-boundary-source"))
          map.removeSource("house-area-boundary-source");
        map.addSource("house-area-boundary-source", {
          type: "geojson",
          data: houseBoundary,
        });
        // map.addLayer({
        //   id: 'house-area-boundary-layer',
        //   type: 'line',
        //   source: 'house-area-boundary-source',
        //   paint: { 'line-color': '#15cf04', 'line-width': 2, 'line-dasharray': [4, 4] }
        // });

        // Show house boundary points with labels (0, 1, 2, 3)
        const houseBoundaryCoords = houseBoundary.geometry.coordinates[0] as [
          number,
          number
        ][];
        showHouseBoundaryPoints(map, houseBoundaryCoords);

        // House area label
        if (!selectedFloorPlan && !showFloorPlanModal && !showFacadeModal) {
          const houseAreaLabel = new mapboxgl.Marker({
            element: createSValueLabel(
              `${Math.round(houseArea)} m² House`,
              "center"
            ),
            anchor: "center",
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

    // Map s-values to the correct sides based on distance matching
    const sValues = [s1 ?? 0, s2 ?? 0, s3 ?? 0, s4 ?? 0];
    const mappedSValues = mapSValuesToSides(coordinates, sValues);

    const sides: Array<{
      a: Pt;
      b: Pt;
      val: number | null | undefined;
      pos: "top" | "right" | "bottom" | "left";
    }> = [
      {
        a: coordinates[0],
        b: coordinates[1],
        val: mappedSValues.s1,
        pos: "top",
      },
      {
        a: coordinates[1],
        b: coordinates[2],
        val: mappedSValues.s2,
        pos: "right",
      },
      {
        a: coordinates[2],
        b: coordinates[3],
        val: mappedSValues.s3,
        pos: "bottom",
      },
      {
        a: coordinates[3],
        b: coordinates[0],
        val: mappedSValues.s4,
        pos: "left",
      },
    ];

    sides.forEach((side) => {
      if (side.val == null) return;
      if (!showFloorPlanModal && !showFacadeModal) {
        const mpt = mid(side.a, side.b);
        const marker = new mapboxgl.Marker({
          element: createSValueLabel(`${side.val}m`, side.pos),
          anchor: "center",
        })
          .setLngLat(mpt)
          .addTo(map);
        newMarkers.push(marker);
      }
    });

    markersRef.current = newMarkers;
    setSValuesMarkers(newMarkers);

    return () => {
      newMarkers.forEach((m) => m.remove());
      if (map) {
        if (map.getLayer("setback-boundary-layer"))
          map.removeLayer("setback-boundary-layer");
        if (map.getSource("setback-boundary-source"))
          map.removeSource("setback-boundary-source");
        if (map.getLayer("fsr-boundary-layer"))
          map.removeLayer("fsr-boundary-layer");
        if (map.getSource("fsr-boundary-source"))
          map.removeSource("fsr-boundary-source");
        if (map.getLayer("house-area-boundary-layer"))
          map.removeLayer("house-area-boundary-layer");
        if (map.getSource("house-area-boundary-source"))
          map.removeSource("house-area-boundary-source");
      }
      // Clean up house boundary point markers
      for (let i = 0; i < 4; i++) {
        const existingMarker = document.getElementById(
          `house-boundary-point-${i}`
        );
        if (existingMarker) {
          existingMarker.remove();
        }
      }
      // Clean up edge midpoint markers
      const edgeMidpoint01 = document.getElementById("edge-midpoint-0-1");
      if (edgeMidpoint01) edgeMidpoint01.remove();
      const edgeMidpoint23 = document.getElementById("edge-midpoint-2-3");
      if (edgeMidpoint23) edgeMidpoint23.remove();
    };
  }, [
    map,
    selectedLot,
    setbackValues,
    fsrBuildableArea,
    selectedFloorPlan,
    showFloorPlanModal,
    showFacadeModal,
    setSValuesMarkers,
  ]);

  return null;
};

export default MapLayers;

// Separate loader component that overlays the map
export const MapLoader = ({
  isCalculating,
  map,
  selectedLot,
}: {
  isCalculating: boolean;
  map: mapboxgl.Map | null;
  selectedLot: any;
}) => {
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
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            border: "4px solid rgba(255, 255, 255, 0.3)",
            borderTop: "4px solid var(--color-primary)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        ></div>
      </div>
    </>
  );
};
