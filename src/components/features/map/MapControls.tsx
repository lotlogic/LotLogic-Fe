import showToast from "@/components/ui/Toast";
import { useMobile } from "@/hooks/useMobile";
import { trackLotSelected } from "@/lib/analytics/mixpanel";
import { debounce } from "@/lib/utils/geometry";
import { useMobileNavigationStore } from "@/stores/mobileNavigationStore";
import type { LotProperties } from "@/types/lot";
import {
  focusMapOnLot,
  getSelectedLotFocusPadding,
  isLotSelectable,
  setHoveredLotOverlayFeature,
  setSelectedLotFeatureState,
} from "./lotMapUtils";
import * as turf from "@turf/turf";
import type { MapboxGeoJSONFeature } from "mapbox-gl";
import mapboxgl, { Map, MapMouseEvent } from "mapbox-gl";
import { useEffect, useRef } from "react";
import { setGlobalLotFrontageMidpoint } from "./MapLayers";

// -----------------------------
// Helper Functions
// -----------------------------
const addFrontageMidpointMarker = (map: Map, coordinates: [number, number]) => {
  // Remove existing frontage midpoint marker if it exists
  const existingMarker = document.getElementById("frontage-midpoint-marker");
  if (existingMarker) {
    existingMarker.remove();
  }

  // Create a custom marker element
  const markerEl = document.createElement("div");
  markerEl.id = "frontage-midpoint-marker";
  // markerEl.style.width = '20px';
  // markerEl.style.height = '20px';
  // markerEl.style.borderRadius = '50%';
  // markerEl.style.backgroundColor = '#ff0000';
  // markerEl.style.border = '3px solid #ffffff';
  // markerEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
  // markerEl.style.cursor = 'pointer';
  markerEl.title = "Frontage Midpoint";

  // Create and add the marker
  new mapboxgl.Marker(markerEl).setLngLat(coordinates).addTo(map);
};

const parseFrontageLineCoordinates = (frontageData: unknown) => {
  if (!frontageData) {
    return null;
  }

  try {
    const parsed =
      typeof frontageData === "string" ? JSON.parse(frontageData) : frontageData;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      (parsed as { type?: unknown }).type !== "LineString" ||
      !Array.isArray((parsed as { coordinates?: unknown }).coordinates)
    ) {
      return null;
    }

    const coordinates = (parsed as { coordinates: unknown[] }).coordinates
      .map((coordinate) =>
        Array.isArray(coordinate) &&
        coordinate.length >= 2 &&
        Number.isFinite(Number(coordinate[0])) &&
        Number.isFinite(Number(coordinate[1]))
          ? ([Number(coordinate[0]), Number(coordinate[1])] as [
              number,
              number,
            ])
          : null
      )
      .filter(Boolean) as [number, number][];

    return coordinates.length >= 2 ? coordinates : null;
  } catch {
    return null;
  }
};

// -----------------------------
// Props
// -----------------------------
interface MapControlsProps {
  map: Map | null;
  lotFeatureLookup: globalThis.Map<
    string,
    MapboxGeoJSONFeature & { properties: LotProperties }
  >;
  setSelectedLot: (
    lot: (MapboxGeoJSONFeature & { properties: LotProperties }) | null
  ) => void;
  selectedIdRef: React.MutableRefObject<string | null>;
  sidebarOpenRef: React.MutableRefObject<boolean>;
  initialView: { center: [number, number]; zoom: number } | null;
  showFloorPlanModal: boolean;
  showFacadeModal: boolean;
}

// -----------------------------
// Component
// -----------------------------
export const MapControls = ({
  map,
  lotFeatureLookup,
  setSelectedLot,
  selectedIdRef,
  sidebarOpenRef,
  initialView,
  showFloorPlanModal,
  showFacadeModal,
}: MapControlsProps) => {
  const isMobile = useMobile();
  const { closeAllPanels } = useMobileNavigationStore();
  const handleResize = debounce(() => map?.resize(), 250);
  const hoveredIdRef = useRef<string | null>(null);
  // const controlsAddedRef = useRef(false);

  // Add standard navigation controls (only zoom on mobile, full controls on tablet/desktop)
  useEffect(() => {
    if (!map) return;

    // Remove existing controls first
    const existingControls = map
      .getContainer()
      .querySelectorAll(".mapboxgl-ctrl-group");
    existingControls.forEach((control) => control.remove());

    // Add controls based on screen size
    if (!isMobile) {
      // Desktop (≥769px): show full navigation control (zoom + recenter)
      map.addControl(new mapboxgl.NavigationControl(), "top-right");
    }
    // Mobile (≤768px): no zoom controls - hidden completely

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [map, isMobile, handleResize]);

  // Add compass reset functionality when initial view is available
  useEffect(() => {
    if (!map || !initialView) return;

    // Use a timeout to ensure the compass button is available after map loads
    const timeoutId = setTimeout(() => {
      const compassButton = map
        .getContainer()
        .querySelector(".mapboxgl-ctrl-compass");
      // console.log('Compass button found:', !!compassButton);

      if (compassButton) {
        const handleCompassClick = () => {
          // console.log('Compass button clicked, dispatching recenter event');
          // Use the same event system as mobile
          window.dispatchEvent(new CustomEvent("recenter-map"));
        };

        // Add click listener
        compassButton.addEventListener("click", handleCompassClick);

        // Store the handler for cleanup
        (compassButton as any)._recenterHandler = handleCompassClick;
      }
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
      // Cleanup if button exists
      const compassButton = map
        .getContainer()
        .querySelector(".mapboxgl-ctrl-compass");
      if (compassButton && (compassButton as any)._recenterHandler) {
        compassButton.removeEventListener(
          "click",
          (compassButton as any)._recenterHandler
        );
      }
    };
  }, [map, initialView]);

  // Add mouse interactions
  useEffect(() => {
    if (!map) return;

    const resolveCanonicalLotFeature = (
      feature: MapboxGeoJSONFeature | null | undefined
    ) => {
      if (!feature) {
        return null;
      }

      const properties = feature.properties as unknown as LotProperties;
      const blockKey =
        properties?.BLOCK_KEY != null ? String(properties.BLOCK_KEY) : "";

      return (
        (blockKey ? lotFeatureLookup.get(blockKey) : null) ??
        (feature as MapboxGeoJSONFeature & { properties: LotProperties })
      );
    };

    const setHoveredState = (
      nextFeature:
        | (MapboxGeoJSONFeature & { properties: LotProperties })
        | null
    ) => {
      const nextId =
        nextFeature?.properties?.BLOCK_KEY != null
          ? String(nextFeature.properties.BLOCK_KEY)
          : null;

      if (hoveredIdRef.current === nextId) {
        return;
      }

      if (hoveredIdRef.current) {
        map.setFeatureState(
          { source: "demo-lot-source", id: hoveredIdRef.current },
          { hovered: false }
        );
      }

      if (nextId) {
        map.setFeatureState(
          { source: "demo-lot-source", id: nextId },
          { hovered: true }
        );
      }

      setHoveredLotOverlayFeature(
        map,
        nextFeature && isLotSelectable(nextFeature.properties)
          ? nextFeature
          : null
      );
      hoveredIdRef.current = nextId;
    };

    const handleMouseEnter = (e: MapMouseEvent) => {
      const f = resolveCanonicalLotFeature(
        map.queryRenderedFeatures(e.point, {
          layers: ["demo-lot-layer"],
        })[0] as MapboxGeoJSONFeature | undefined
      );
      if (!f) return;
      const properties = f.properties as unknown as LotProperties;
      const isModalOpen = showFloorPlanModal || showFacadeModal;
      setHoveredState(f);
      map.getCanvas().style.cursor =
        isLotSelectable(properties) && !isModalOpen ? "pointer" : "not-allowed";
    };

    const handleMouseLeave = () => {
      setHoveredState(null);
      map.getCanvas().style.cursor = "";
    };

    const handleMouseMove = (e: MapMouseEvent) => {
      const f = resolveCanonicalLotFeature(
        map.queryRenderedFeatures(e.point, {
          layers: ["demo-lot-layer"],
        })[0] as MapboxGeoJSONFeature | undefined
      );

      if (!f) {
        setHoveredState(null);
        map.getCanvas().style.cursor = "";
        return;
      }

      const properties = f.properties as unknown as LotProperties;
      const isModalOpen = showFloorPlanModal || showFacadeModal;
      setHoveredState(f);
      map.getCanvas().style.cursor =
        isLotSelectable(properties) && !isModalOpen ? "pointer" : "not-allowed";
    };

    const handleClick = (e: MapMouseEvent) => {
      const f = resolveCanonicalLotFeature(
        map.queryRenderedFeatures(e.point, {
          layers: ["demo-lot-layer"],
        })[0] as MapboxGeoJSONFeature | undefined
      );
      if (!f) {
        return;
      }
      const properties = f.properties as unknown as LotProperties;
      if (!isLotSelectable(properties)) {
        showToast({
          message: `Lot ${properties.BLOCK_NUMBER ?? properties.LOT_NUMBER ?? properties.ID} is sold.`,
          type: "warning",
          options: { autoClose: 3000 },
        });
        return;
      }
      // Only block lot selection when modals are open, not when sidebar is open
      if (showFloorPlanModal || showFacadeModal) {
        return;
      }

      const id = (f.properties as Record<string, unknown>)?.BLOCK_KEY as string;
      if (!id) {
        return;
      }

      setSelectedLotFeatureState(map, selectedIdRef, id);

      setSelectedLot(f);

      // Close mobile navigation panels when lot is selected
      closeAllPanels();

      // Calculate and log frontage midpoint
      const frontageData = (f.properties as Record<string, unknown>)
        ?.frontageCoordinate;
      // console.log("🔍 Raw frontage data:", frontageData);

      const frontageCoordinates = parseFrontageLineCoordinates(frontageData);

      if (frontageCoordinates) {
        const line = turf.lineString(frontageCoordinates);
        const totalLength = turf.length(line, { units: "meters" });
        const frontageMidpoint =
          totalLength > 0
            ? (turf.along(line, totalLength / 2, { units: "meters" }).geometry
                .coordinates as [number, number])
            : frontageCoordinates[0];

        addFrontageMidpointMarker(map, frontageMidpoint);
        setGlobalLotFrontageMidpoint(frontageMidpoint);
      } else if (frontageData) {
        console.log("❌ Invalid LineString format in frontage data");
        showToast({
          message: "Invalid LineString format in frontage data",
          type: "error",
          options: { autoClose: 4000 },
        });
      } else {
        // Fallback: Calculate lot frontage midpoint (midpoint of the longest side)
        const geometry = f.geometry as GeoJSON.Polygon;
        const coordinates = geometry.coordinates[0] as [number, number][];

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

        const sides = [side1, side2, side3, side4];
        const maxSideIndex = sides.indexOf(Math.max(...sides));

        let frontageMidpoint: [number, number] = [0, 0];
        if (maxSideIndex === 0) {
          frontageMidpoint = turf.midpoint(
            turf.point(coordinates[0]),
            turf.point(coordinates[1])
          ).geometry.coordinates as [number, number];
        } else if (maxSideIndex === 1) {
          frontageMidpoint = turf.midpoint(
            turf.point(coordinates[1]),
            turf.point(coordinates[2])
          ).geometry.coordinates as [number, number];
        } else if (maxSideIndex === 2) {
          frontageMidpoint = turf.midpoint(
            turf.point(coordinates[2]),
            turf.point(coordinates[3])
          ).geometry.coordinates as [number, number];
        } else {
          frontageMidpoint = turf.midpoint(
            turf.point(coordinates[3]),
            turf.point(coordinates[0])
          ).geometry.coordinates as [number, number];
        }

        // console.log("🏘️ Lot Frontage Midpoint (fallback):", frontageMidpoint);

        // Add marker to map to show frontage midpoint (fallback)
        addFrontageMidpointMarker(map, frontageMidpoint);

        // Set global lot frontage midpoint for distance calculations
        setGlobalLotFrontageMidpoint(frontageMidpoint);
      }

      // Track lot selection in Segment
      trackLotSelected(id, f.properties as Record<string, unknown>);

      try {
        focusMapOnLot(map, f.geometry, [e.lngLat.lng, e.lngLat.lat], {
          padding: getSelectedLotFocusPadding(map, isMobile),
          maxZoom: 18.4,
          duration: 1500,
          fallbackZoomIncrement: 0.55,
        });
      } catch (error) {
        console.error("Error during lot zoom:", error);
        showToast({
          message: "Failed to zoom to lot.",
          type: "error",
          options: { autoClose: 4000 },
        });
        focusMapOnLot(map, undefined, [e.lngLat.lng, e.lngLat.lat], {
          padding: getSelectedLotFocusPadding(map, isMobile),
          maxZoom: 18.4,
          duration: 1500,
          fallbackZoomIncrement: 0.55,
        });
      }
    };

    map.on("mouseenter", "demo-lot-layer", handleMouseEnter);
    map.on("mousemove", "demo-lot-layer", handleMouseMove);
    map.on("mouseleave", "demo-lot-layer", handleMouseLeave);
    map.on("click", "demo-lot-layer", handleClick);

    return () => {
      setHoveredState(null);
      map.off("mouseenter", "demo-lot-layer", handleMouseEnter);
      map.off("mousemove", "demo-lot-layer", handleMouseMove);
      map.off("mouseleave", "demo-lot-layer", handleMouseLeave);
      map.off("click", "demo-lot-layer", handleClick);
    };
  }, [
    map,
    selectedIdRef,
    sidebarOpenRef,
    setSelectedLot,
    closeAllPanels,
    isMobile,
    showFacadeModal,
    showFloorPlanModal,
    lotFeatureLookup,
  ]);

  return null; // This component doesn't render anything
};

export default MapControls;
