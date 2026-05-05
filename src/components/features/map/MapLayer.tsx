import { showToast } from "@/components/ui/Toast";
import { AlertTriangle } from "lucide-react";
import mapboxgl, { type MapboxGeoJSONFeature } from "mapbox-gl";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// Lazy load components
// const LotSidebar = lazy(() => import("../lots/LotSidebar").then(module => ({ default: module.LotSidebar })));
import { LotSidebar } from "../lots/LotSidebar";
const SearchControl = lazy(() =>
  import("./SearchControl").then((module) => ({
    default: module.SearchControl,
  }))
);
const SavedButton = lazy(() =>
  import("./SavedButton").then((module) => ({ default: module.SavedButton }))
);
const SavedPropertiesSidebar = lazy(() =>
  import("./SavedPropertiesSidebar").then((module) => ({
    default: module.SavedPropertiesSidebar,
  }))
);

// Import optimized components
import { useLotDetails } from "@/hooks/useLotDetails";
import { convertLotsToGeoJSON, useLots } from "@/hooks/useLots";
import { useMapInitialization } from "@/hooks/useMapInitialization";
import useEstate from "@/hooks/useEstate";
import { useMobile } from "@/hooks/useMobile";
import { getImageUrl } from "@/lib/api/lotApi";
import {
  normalizeEstateBackgroundOverlay,
  syncEstateBackgroundOverlay,
} from "@/lib/map/estateBackgroundOverlay";
import type { SetbackValues } from "@/lib/utils/geometry";
import { useMobileNavigationStore } from "@/stores/mobileNavigationStore";
import { useModalStore } from "@/stores/modalStore";
import { useRotationStore } from "@/stores/rotationStore";
import type { FloorPlan } from "@/types/houseDesign";
import type { LotProperties } from "@/types/lot";
import type { SavedProperty } from "@/types/ui";
import "../map/MapControls.css";
import { focusMapOnLot, setSelectedLotFeatureState } from "./lotMapUtils";
import { MapControls } from "./MapControls";
import { MapLayers, MapLoader } from "./MapLayers";

type ZoneMapProps = {
  estateId?: string;
};

export const ZoneMap = ({ estateId }: ZoneMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null>(null);
  const sidebarOpenRef = useRef<boolean>(false);
  const initialViewKeyRef = useRef<string | null>(null);
  const isMobile = useMobile();
  const eventListenersAddedRef = useRef<boolean>(false);

  const [selectedLot, setSelectedLot] = useState<
    (MapboxGeoJSONFeature & { properties: LotProperties }) | null
  >(null);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<FloorPlan | null>(
    null
  );
  const [floorPlanFitWarning, setFloorPlanFitWarning] = useState<string | null>(
    null
  );
  const [sValuesMarkers, setSValuesMarkers] = useState<mapboxgl.Marker[]>([]);

  // Setbacks (m). Change front to 9 to see the front edge move 9m inward.

  // FSR buildable area (m²) - calculated dynamically
  const [fsrBuildableArea, setFsrBuildableArea] = useState<number | null>(null);

  // Modal state from Zustand
  const { showFloorPlanModal, showFacadeModal } = useModalStore();

  // Rotation state from Zustand
  const { isCalculating } = useRotationStore();

  // Mobile navigation state from Zustand
  const { closeAllPanels, setClearSelectedLotCallback } =
    useMobileNavigationStore();

  // Data
  const {
    data: lotsData,
    isLoading: isLoadingLots,
    error: lotsError,
  } = useLots(estateId);
  const { data: estateData } = useEstate(estateId ?? null);

  //convert lotsData to geojson format for mapbox
  const estateLots = lotsData
    ? convertLotsToGeoJSON(lotsData)
    : { type: "FeatureCollection" as const, features: [] };
  const lotFeatureLookup = useMemo(() => {
    const entries = estateLots.features
      .map((feature) => {
        const blockKey = String(
          ((feature.properties as GeoJSON.GeoJsonProperties | null)?.BLOCK_KEY ??
            "") as string | number
        );

        return [
          blockKey,
          feature as MapboxGeoJSONFeature & { properties: LotProperties },
        ] as const;
      })
      .filter(([blockKey]) => blockKey);

    return new Map(entries);
  }, [estateLots]);

  // Keep sidebar open ref in sync
  useEffect(() => {
    sidebarOpenRef.current = !!selectedLot;
  }, [selectedLot]);

  // Clear floor plan when switching lots
  useEffect(() => {
    setSelectedFloorPlan(null);
  }, [selectedLot?.properties?.ID]);

  // Calculate FSR buildable area when lot is selected
  useEffect(() => {
    if (selectedLot) {
      const lotSize = parseFloat(
        selectedLot.properties.BLOCK_DERIVED_AREA || "0"
      );
      const maxFSR = parseFloat(selectedLot.properties.maxFSR || "0.5");

      if (lotSize > 0 && maxFSR > 0) {
        const calculatedFSR = lotSize * maxFSR;
        setFsrBuildableArea(calculatedFSR);
      } else {
        setFsrBuildableArea(null);
      }
    } else {
      setFsrBuildableArea(null);
    }
  }, [
    selectedLot?.properties?.ID,
    selectedLot?.properties?.BLOCK_DERIVED_AREA,
    selectedLot?.properties?.maxFSR,
  ]);

  useEffect(() => {
    if (!selectedLot || !selectedFloorPlan) {
      setFloorPlanFitWarning(null);
    }
  }, [selectedFloorPlan, selectedLot]);

  // Lot details for sidebar
  const lotId = selectedLot?.properties?.ID?.toString() || null;
  const { data: lotApiData } = useLotDetails(lotId);
  const [setbackValues, setSetbackValues] = useState<SetbackValues>({
    front: 4,
    side: 3,
    rear: 3,
  });

  // Handle zoning data updates from LotSidebar
  const handleZoningDataUpdate = useCallback(
    (zoning: {
      fsr?: number;
      frontSetback: number;
      rearSetback: number;
      sideSetback: number;
    }) => {
      const { fsr, frontSetback, rearSetback, sideSetback } = zoning;
      if (typeof fsr === "number" && Number.isFinite(fsr)) {
        setFsrBuildableArea(fsr);
      }
      setSetbackValues((prev) => ({
        front: Number.isFinite(frontSetback) ? frontSetback : prev.front,
        side: Number.isFinite(sideSetback) ? sideSetback : prev.side,
        rear: Number.isFinite(rearSetback) ? rearSetback : prev.rear,
      }));
    },
    []
  );

  // Update setback values when lot data is loaded (if it contains zoning setbacks)
  useEffect(() => {
    if (lotApiData?.zoningSetbacks) {
      // console.log('MapLayer: Updating setback values from lot API:', lotApiData.zoningSetbacks);
      setSetbackValues({
        front: lotApiData.zoningSetbacks.frontSetback,
        side: lotApiData.zoningSetbacks.sideSetback,
        rear: lotApiData.zoningSetbacks.rearSetback,
      });
    }
  }, [lotApiData?.zoningSetbacks]);

  const handleViewDetails = (property: SavedProperty) => {
    setIsSavedSidebarOpen(false);
    // Close mobile navigation panels when viewing lot details
    closeAllPanels();
    const savedLotId = String(property.lotId);
    const targetEstateId =
      property.estateId !== undefined && property.estateId !== null
        ? String(property.estateId) === "default"
          ? ""
          : String(property.estateId)
        : estateId || "";

    const lotData = lotsData?.find((lot) => {
      const lotMatches =
        lot.id?.toString() === savedLotId || lot.blockKey === savedLotId;
      if (!lotMatches) {
        return false;
      }

      if (!targetEstateId) {
        return true;
      }

      return String(lot.estateId || "") === targetEstateId;
    });
    if (!lotData) return;
    const mapFeatureId = String(lotData.blockKey);
    const databaseLotId = String(lotData.id);

    const lotFeature = {
      type: "Feature" as const,
      geometry: lotData.geometry,
      properties: {
        BLOCK_KEY: mapFeatureId,
        ID: databaseLotId,
        LOT_NUMBER:
          lotData.blockNumber !== null && lotData.blockNumber !== undefined
            ? String(lotData.blockNumber)
            : databaseLotId,
        databaseId: databaseLotId,
        areaSqm: property.size,
        lifecycleStage: lotData.lifecycleStage,
        salesMode: lotData.salesMode,
        price: lotData.price,
        selectable: lotData.lifecycleStage !== "sold",
        ADDRESSES: property.address,
        DISTRICT_NAME: property.suburb,
        LAND_USE_POLICY_ZONES: property.zoning,
        BLOCK_DERIVED_AREA: property.size?.toString() || "0",
        STAGE: lotData.lifecycleStage,
        BLOCK_NUMBER: lotData.blockNumber ?? null,
        SECTION_NUMBER: null,
        DISTRICT_CODE: 1,
        OBJECTID: lotId,
        division: "",
        estateId: lotData.estateId || targetEstateId,
        frontageCoordinate: lotData.frontageCoordinate ?? null,
        isRed: true,
      },
    } as unknown as MapboxGeoJSONFeature & { properties: LotProperties };

    setSelectedLot(lotFeature);
    if (!mapRef) return;
    setSelectedLotFeatureState(mapRef, selectedIdRef, mapFeatureId);
    focusMapOnLot(mapRef, lotData.geometry);

    if (property.houseDesign.floorPlanImage) {
      const coordinates = lotData.geometry.coordinates[0] as [number, number][];
      if (coordinates?.length >= 4) {
        const lotArea =
          typeof property.size === "number"
            ? property.size
            : property.size
            ? parseFloat(property.size)
            : 0;
        const houseArea = property.houseDesign.area
          ? parseFloat(property.houseDesign.area)
          : 0;
        const scaleFactor =
          lotArea > 0 && houseArea > 0 ? Math.sqrt(houseArea / lotArea) : 1;
        const centerLng =
          coordinates.reduce((s, c) => s + c[0], 0) / coordinates.length;
        const centerLat =
          coordinates.reduce((s, c) => s + c[1], 0) / coordinates.length;
        const scaledCoordinates = coordinates.map((coord) => {
          const dLng = (coord[0] - centerLng) * scaleFactor;
          const dLat = (coord[1] - centerLat) * scaleFactor;
          return [centerLng + dLng, centerLat + dLat] as [number, number];
        });

        setSelectedFloorPlan({
          url: getImageUrl(property.houseDesign.floorPlanImage),
          coordinates: [
            scaledCoordinates[0],
            scaledCoordinates[1],
            scaledCoordinates[2],
            scaledCoordinates[3],
          ] as [
            [number, number],
            [number, number],
            [number, number],
            [number, number]
          ],
          houseArea: property.houseDesign.area
            ? parseFloat(property.houseDesign.area)
            : 150,
          houseWidth:
            typeof property.houseDesign.width === "number"
              ? property.houseDesign.width
              : undefined,
          houseDepth:
            typeof property.houseDesign.depth === "number"
              ? property.houseDesign.depth
              : undefined,
        });
      }
    }
  };

  // UI state
  const [isSavedSidebarOpen, setIsSavedSidebarOpen] = useState(false);

  // Initialize map using custom hook
  const {
    map: mapRef,
    isLoading,
    initialView: mapInitialView,
    setInitialView,
  } = useMapInitialization(mapContainer, estateLots);

  useEffect(() => {
    if (!mapRef) {
      return;
    }

    let syncCompleted = false;

    const syncOverlay = () => {
      if (syncCompleted) {
        return;
      }

      if (!mapRef.isStyleLoaded()) {
        return;
      }

      syncEstateBackgroundOverlay(mapRef, estateData, "demo-lot-layer");
      syncCompleted = true;
    };

    syncOverlay();
    const handleLoad = () => syncOverlay();
    const handleStyleData = () => syncOverlay();
    const handleIdle = () => syncOverlay();

    mapRef.on("load", handleLoad);
    mapRef.on("styledata", handleStyleData);
    mapRef.on("idle", handleIdle);

    return () => {
      mapRef.off("load", handleLoad);
      mapRef.off("styledata", handleStyleData);
      mapRef.off("idle", handleIdle);
    };
  }, [estateData, estateId, mapRef]);

  // Register callback to clear selected lot when mobile navigation tabs are clicked
  useEffect(() => {
    const clearSelectedLot = () => {
      setSelectedLot(null);
      if (selectedIdRef.current && mapRef) {
        setSelectedLotFeatureState(mapRef, selectedIdRef, null);
      }
    };

    setClearSelectedLotCallback(clearSelectedLot);

    // Cleanup on unmount
    return () => {
      setClearSelectedLotCallback(null);
    };
  }, [setClearSelectedLotCallback, mapRef]);

  // Set initial view when lots data is available
  useEffect(() => {
    if (!mapRef) {
      return;
    }

    const bounds = new mapboxgl.LngLatBounds();
    let hasBounds = false;

    const extendCoordinate = (coordinate: [number, number]) => {
      if (
        Array.isArray(coordinate) &&
        coordinate.length >= 2 &&
        Number.isFinite(coordinate[0]) &&
        Number.isFinite(coordinate[1])
      ) {
        bounds.extend(coordinate);
        hasBounds = true;
      }
    };

    const extendPolygonCoordinates = (coordinates: unknown) => {
      if (!Array.isArray(coordinates)) {
        return;
      }

      coordinates.forEach((ring) => {
        if (!Array.isArray(ring)) {
          return;
        }

        ring.forEach((coordinate) => {
          if (
            Array.isArray(coordinate) &&
            coordinate.length >= 2 &&
            Number.isFinite(Number(coordinate[0])) &&
            Number.isFinite(Number(coordinate[1]))
          ) {
            extendCoordinate([Number(coordinate[0]), Number(coordinate[1])]);
          }
        });
      });
    };

    lotsData?.forEach((lot) => {
      const geometry = lot.geometry;
      if (!geometry) {
        return;
      }

      if (geometry.type === "Polygon") {
        extendPolygonCoordinates(geometry.coordinates);
        return;
      }

      if (geometry.type === "MultiPolygon") {
        geometry.coordinates.forEach((polygon) => {
          extendPolygonCoordinates(polygon);
        });
      }
    });

    const normalizedOverlay = normalizeEstateBackgroundOverlay(estateData);
    normalizedOverlay?.coordinates.forEach((coordinate) => {
      extendCoordinate(coordinate);
    });

    if (!hasBounds) {
      return;
    }

    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();
    const nextViewKey = [
      estateId ?? "default",
      southWest.lng.toFixed(6),
      southWest.lat.toFixed(6),
      northEast.lng.toFixed(6),
      northEast.lat.toFixed(6),
      normalizedOverlay ? "overlay" : "lots",
    ].join("|");

    if (initialViewKeyRef.current === nextViewKey) {
      return;
    }

    const fitPadding = isMobile
      ? { top: 24, right: 24, bottom: 24, left: 24 }
      : { top: 32, right: 160, bottom: 48, left: 64 };

    mapRef.fitBounds(bounds, {
      padding: fitPadding,
      maxZoom: 17,
      duration: 0,
    });

    const center = mapRef.getCenter();
    const zoom = mapRef.getZoom();
    setInitialView({ center: [center.lng, center.lat], zoom });
    initialViewKeyRef.current = nextViewKey;
  }, [estateData, estateId, isMobile, lotsData, mapRef, setInitialView]);

  // CLOSE
  const handleCloseSidebar = useCallback(() => {
    if (mapRef && selectedIdRef.current) {
      setSelectedLotFeatureState(mapRef, selectedIdRef, null);
    }
    setSelectedLot(null);
    setSelectedFloorPlan(null);
    sValuesMarkers.forEach((m) => m.remove());
    setSValuesMarkers([]);
  }, [sValuesMarkers, mapRef]);

  const handleSearchResult = useCallback(
    (coordinates: [number, number]) => {
      if (mapRef) mapRef.flyTo({ center: coordinates, zoom: 15 });
    },
    [mapRef]
  );

  // Add event listeners for mobile search and recenter
  useEffect(() => {
    const handleMobileSearchResult = (event: CustomEvent) => {
      const { coordinates } = event.detail;
      if (mapRef && coordinates) {
        mapRef.flyTo({
          center: coordinates,
          zoom: 16,
          duration: 1000,
        });
      }
    };

    const handleRecenter = () => {
      if (mapRef && mapInitialView) {
        mapRef.flyTo({
          center: mapInitialView.center,
          zoom: mapInitialView.zoom,
          duration: 1000,
        });
        //  showToast({
        //    message: "Map recentered to initial view",
        //    type: 'warning',
        //    options: { autoClose: 2000 }
        //  });
      } else {
        showToast({
          message: "Unable to recenter map. Please refresh the page.",
          type: "error",
          options: { autoClose: 4000 },
        });
      }
    };

    // Only add event listeners once
    if (!eventListenersAddedRef.current) {
      // Only add mobile event listeners if on mobile
      if (isMobile) {
        window.addEventListener(
          "search-result-selected",
          handleMobileSearchResult as EventListener
        );
      }
      window.addEventListener("recenter-map", handleRecenter);

      eventListenersAddedRef.current = true;
    }

    return () => {
      if (isMobile) {
        window.removeEventListener(
          "search-result-selected",
          handleMobileSearchResult as EventListener
        );
      }
      window.removeEventListener("recenter-map", handleRecenter);
      eventListenersAddedRef.current = false;
    };
  }, [mapRef, mapInitialView, isMobile]);

  return (
    <div className="relative h-full w-full">
      {(isLoading || isLoadingLots) && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
        </div>
      )}

      {lotsError && (
        <div className="absolute top-4 left-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-20">
          Error loading lots: {lotsError.message}
        </div>
      )}

      {floorPlanFitWarning && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-20 w-[min(36rem,calc(100%-2rem))] -translate-x-1/2">
          <div className="flex items-start gap-3 rounded-xl border border-warning bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand">
                Floor plan doesn&apos;t fit
              </p>
              <p className="text-sm text-brand-secondary">
                {floorPlanFitWarning}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Only show these controls on desktop */}
      {!isMobile && (
        <>
          <div className="absolute top-4 right-5 z-10">
            <Suspense
              fallback={
                <div className="w-8 h-8 bg-brand-muted rounded animate-pulse"></div>
              }
            >
              <SearchControl onResultSelect={handleSearchResult} />
            </Suspense>
          </div>

          <div className="absolute top-45 right-5 z-10">
            <Suspense
              fallback={
                <div className="w-8 h-8 bg-brand-muted rounded animate-pulse"></div>
              }
            >
              <SavedButton
                onClick={() => setIsSavedSidebarOpen(true)}
                isActive={isSavedSidebarOpen}
              />
            </Suspense>
          </div>
        </>
      )}

      {/* Sidebars - only show on desktop since mobile uses bottom navigation */}
      {!isMobile && (
        <>
          <Suspense fallback={<div className="hidden"></div>}>
            <SavedPropertiesSidebar
              open={isSavedSidebarOpen}
              onClose={() => setIsSavedSidebarOpen(false)}
              onViewDetails={handleViewDetails}
            />
          </Suspense>
        </>
      )}

      <div ref={mapContainer} className="h-full w-full" />

      {/* Map Loader - shows over the entire map */}
      <MapLoader
        isCalculating={isCalculating}
        map={mapRef}
        selectedLot={selectedLot}
      />

      {/* Map Controls Component - only zoom controls, no duplicate functionality */}
      <MapControls
        map={mapRef}
        lotFeatureLookup={lotFeatureLookup}
        setSelectedLot={setSelectedLot}
        selectedIdRef={selectedIdRef}
        sidebarOpenRef={sidebarOpenRef}
        initialView={mapInitialView}
        showFloorPlanModal={showFloorPlanModal}
        showFacadeModal={showFacadeModal}
      />

      {/* Map Layers Component */}
      <MapLayers
        map={mapRef}
        selectedLot={selectedLot}
        setbackValues={setbackValues}
        fsrBuildableArea={fsrBuildableArea}
        selectedFloorPlan={selectedFloorPlan}
        showFloorPlanModal={showFloorPlanModal}
        showFacadeModal={showFacadeModal}
        setSValuesMarkers={setSValuesMarkers}
        onPlacementWarningChange={setFloorPlanFitWarning}
      />

      {/* Lot Sidebar - show on both desktop and mobile */}
      {selectedLot && (
        <LotSidebar
          open={!!selectedLot}
          onClose={handleCloseSidebar}
          lot={{
            estateId: selectedLot.properties.estateId || estateId || "",
            blockKey: selectedLot.properties.BLOCK_KEY || "",
            id:
              selectedLot.properties.ID?.toString() ||
              selectedLot.properties.databaseId,
            displayLotId:
              selectedLot.properties.BLOCK_NUMBER ??
              selectedLot.properties.LOT_NUMBER ??
              selectedLot.properties.ID?.toString() ??
              selectedLot.properties.databaseId,
            suburb: selectedLot.properties.DISTRICT_NAME || "",
            address: selectedLot.properties.ADDRESSES || "",
            size: selectedLot.properties.BLOCK_DERIVED_AREA,
            salesMode: selectedLot.properties.salesMode ?? undefined,
            price: selectedLot.properties.price ?? undefined,
            lifecycleStage: selectedLot.properties.lifecycleStage ?? undefined,
            type: selectedLot.properties.TYPE ?? undefined,
            zoning: selectedLot.properties.LAND_USE_POLICY_ZONES ?? undefined,
            overlays:
              selectedLot.properties.OVERLAY_PROVISION_ZONES ?? undefined,
            width: selectedLot.properties.width ?? undefined,
            depth: selectedLot.properties.depth ?? undefined,
            frontageType: selectedLot.properties.frontageType ?? undefined,
            planningId: selectedLot.properties.planningId ?? undefined,
            maxHeight: selectedLot.properties.maxHeight ?? undefined,
            maxSize: selectedLot.properties.maxSize ?? undefined,
            maxFSR: selectedLot.properties.maxFSR ?? undefined,
            maxStories: selectedLot.properties.maxStories ?? undefined,
            minArea: selectedLot.properties.minArea ?? undefined,
            minDepth: selectedLot.properties.minDepth ?? undefined,
            frontYardSetback:
              selectedLot.properties.frontYardSetback ?? undefined,
            sideYardMinSetback:
              selectedLot.properties.sideYardMinSetback ?? undefined,
            rearYardMinSetback:
              selectedLot.properties.rearYardMinSetback ?? undefined,
            exampleArea: selectedLot.properties.exampleArea ?? undefined,
            exampleLotSize: selectedLot.properties.exampleLotSize ?? undefined,
            maxFSRUpper: selectedLot.properties.maxFSRUpper ?? undefined,
            apiDimensions: {
              width:
                typeof selectedLot.properties.width === "number"
                  ? selectedLot.properties.width
                  : 0,
              depth:
                typeof selectedLot.properties.depth === "number"
                  ? selectedLot.properties.depth
                  : 0,
            },
            apiZoning: selectedLot.properties.apiZoning ?? undefined,
            apiMatches: selectedLot.properties.apiMatches || [],
          }}
          geometry={selectedLot.geometry}
          onSelectFloorPlan={setSelectedFloorPlan}
          onZoningDataUpdate={handleZoningDataUpdate}
        />
      )}
    </div>
  );
};

export default ZoneMap;
