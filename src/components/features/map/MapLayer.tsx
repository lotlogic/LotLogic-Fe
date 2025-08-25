import { useEffect, useRef, useState, useCallback, Suspense, lazy } from 'react';
import type { MapboxGeoJSONFeature } from 'mapbox-gl';

// Lazy load components
const LotSidebar = lazy(() => import("../lots/LotSidebar").then(module => ({ default: module.LotSidebar })));
const SearchControl = lazy(() => import("./SearchControl").then(module => ({ default: module.SearchControl })));
const LayersButton = lazy(() => import("./LayersButton").then(module => ({ default: module.LayersButton })));
const SavedButton = lazy(() => import("./SavedButton").then(module => ({ default: module.SavedButton })));
const ZoningLayersSidebar = lazy(() => import("./ZoningLayerSidebar").then(module => ({ default: module.ZoningLayersSidebar })));
const SavedPropertiesSidebar = lazy(() => import("./SavedPropertiesSidebar").then(module => ({ default: module.SavedPropertiesSidebar })));

// Import optimized components
import { MapLayers } from './MapLayers';
import { MapControls } from './MapControls';
import { useMapInitialization } from '@/hooks/useMapInitialization';

import '../map/MapControls.css';
import { useLotDetails } from "@/hooks/useLotDetails";
import type { SavedProperty } from "@/types/ui";
import { useLots, convertLotsToGeoJSON } from "@/hooks/useLots";
import { getImageUrl } from "@/lib/api/lotApi";
import { useModalStore } from "@/stores/modalStore";
import type { SetbackValues } from '@/lib/utils/geometry';
import type { LotProperties } from "@/types/lot";


// -----------------------------
// Types
// -----------------------------

type FloorPlan = {
  url: string;
  coordinates: [[number, number], [number, number], [number, number], [number, number]];
  houseArea?: number;
};

// -----------------------------
// Component
// -----------------------------
export default function ZoneMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null>(null);
  const sidebarOpenRef = useRef<boolean>(false);

  const [selectedLot, setSelectedLot] = useState<MapboxGeoJSONFeature & { properties: LotProperties } | null>(null);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<FloorPlan | null>(null);
  const [sValuesMarkers, setSValuesMarkers] = useState<mapboxgl.Marker[]>([]);

  // Setbacks (m). Change front to 9 to see the front edge move 9m inward.
  const [setbackValues, setSetbackValues] = useState<SetbackValues>({ front: 4, side: 3, rear: 3 });

  // FSR buildable area (m²) requested; will be capped by setbacks buildable area
  const [fsrBuildableArea, setFsrBuildableArea] = useState(300);

  // Modal state from Zustand
  const { showFloorPlanModal, showFacadeModal } = useModalStore();

  // Data
  const { data: lotsData, isLoading: isLoadingLots, error: lotsError } = useLots();
  const estateLots = lotsData ? convertLotsToGeoJSON(lotsData) : { type: 'FeatureCollection' as const, features: [] };

  // Keep sidebar open ref in sync
  useEffect(() => { sidebarOpenRef.current = !!selectedLot; }, [selectedLot]);

  // Lot details for sidebar
  const lotId = selectedLot?.properties?.ID?.toString() || null;
  const { data: lotApiData, isLoading: isLoadingLotData, error: lotApiError } = useLotDetails(lotId);

  // Handle zoning data updates from LotSidebar
  const handleZoningDataUpdate = useCallback((zoning: { fsr: number; frontSetback: number; rearSetback: number; sideSetback: number }) => {
    const { fsr, frontSetback, rearSetback, sideSetback } = zoning;
    setFsrBuildableArea(fsr);
    setSetbackValues({
      front: frontSetback,
      side: sideSetback,
      rear: rearSetback
    });
  }, []);

  // Handle overlay toggling - DISABLED FOR NOW
  // const handleOverlayToggle = useCallback((overlayType: string, enabled: boolean) => {
  //   console.log('Overlay toggle:', overlayType, enabled);
  //   setActiveOverlays(prev => {
  //     const newSet = new Set(prev);
  //     if (enabled) {
  //       newSet.add(overlayType);
  //     } else {
  //       newSet.delete(overlayType);
  //     }
  //     console.log('Active overlays:', Array.from(newSet));
  //     return newSet;
  //   });
  // }, []);



  const handleViewDetails = (property: SavedProperty) => {
    setIsSavedSidebarOpen(false);
    const lotData = lotsData?.find(lot => lot.id?.toString() === property.lotId || lot.blockKey === property.lotId);
    if (!lotData) return;

    const lotFeature = {
      type: 'Feature' as const,
      geometry: lotData.geometry,
      properties: {
        BLOCK_KEY: property.lotId,
        ID: typeof property.lotId === 'number' ? property.lotId : parseInt(property.lotId),
        LOT_NUMBER: typeof property.lotId === 'number' ? property.lotId : parseInt(property.lotId),
        databaseId: property.lotId,
        areaSqm: property.size,
        lifecycleStage: 'available',
        ADDRESSES: property.address,
        DISTRICT_NAME: property.suburb,
        LAND_USE_POLICY_ZONES: property.zoning,
        BLOCK_DERIVED_AREA: property.size?.toString() || '0',
        STAGE: 'available',
        BLOCK_NUMBER: null,
        SECTION_NUMBER: null,
        DISTRICT_CODE: 1,
        OBJECTID: typeof property.lotId === 'number' ? property.lotId : parseInt(property.lotId),
        division: '',
        estateId: '',
        isRed: true,
      }
    } as unknown as MapboxGeoJSONFeature & { properties: LotProperties };

    setSelectedLot(lotFeature);
    if (!mapRef) return;
    if (selectedIdRef.current) {
      mapRef.setFeatureState({ source: 'demo-lot-source', id: selectedIdRef.current }, { selected: false });
    }
    mapRef.setFeatureState({ source: 'demo-lot-source', id: property.lotId.toString() }, { selected: true });
    selectedIdRef.current = property.lotId.toString();

    if (property.houseDesign.floorPlanImage) {
      const coordinates = lotData.geometry.coordinates[0] as [number, number][];
      if (coordinates?.length >= 4) {
        const lotArea = typeof property.size === 'number' ? property.size : (property.size ? parseFloat(property.size) : 0);
        const houseArea = property.houseDesign.area ? parseFloat(property.houseDesign.area) : 0;
        const scaleFactor = lotArea > 0 && houseArea > 0 ? Math.sqrt(houseArea / lotArea) : 1;
        const centerLng = coordinates.reduce((s, c) => s + c[0], 0) / coordinates.length;
        const centerLat = coordinates.reduce((s, c) => s + c[1], 0) / coordinates.length;
        const scaledCoordinates = coordinates.map(coord => {
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
            scaledCoordinates[3]
          ] as [[number, number], [number, number], [number, number], [number, number]],
          houseArea: property.houseDesign.area ? parseFloat(property.houseDesign.area) : 150
        });
      }
    }
  };

  // UI state
      const [isZoningSidebarOpen, setIsZoningSidebarOpen] = useState(false);
    const [isSavedSidebarOpen, setIsSavedSidebarOpen] = useState(false);
   
    // Overlay filter states
    const [activeOverlays, setActiveOverlays] = useState<Set<string>>(new Set());

    // Handle overlay toggle
    const handleOverlayToggle = (overlayType: string, enabled: boolean) => {
      setActiveOverlays(prev => {
        const newSet = new Set(prev);
        if (enabled) {
          newSet.add(overlayType);
        } else {
          newSet.delete(overlayType);
        }
        return newSet;
      });
    };

  // Initialize map using custom hook
  const { map: mapRef, isLoading, initialView: mapInitialView, setInitialView } = useMapInitialization(mapContainer, estateLots, activeOverlays);

  // Set initial view when lots data is available
  useEffect(() => {
    if (!mapRef || !lotsData || lotsData.length === 0) return;
    const first = lotsData[0];
    const coords = first?.geometry?.coordinates?.[0];
    if (!coords?.length) return;
    const avgLng = coords.reduce((s: number, c: number[]) => s + c[0], 0) / coords.length;
    const avgLat = coords.reduce((s: number, c: number[]) => s + c[1], 0) / coords.length;
    const initialCenter: [number, number] = [avgLng, avgLat];
    const initialZoom = 16;
    
    setInitialView({ center: initialCenter, zoom: initialZoom });
    mapRef.jumpTo({ center: initialCenter, zoom: initialZoom });
  }, [mapRef, lotsData, setInitialView]);

  // CLOSE
  const handleCloseSidebar = useCallback(() => {
    if (mapRef && selectedIdRef.current) {
      mapRef.setFeatureState({ source: 'demo-lot-source', id: selectedIdRef.current }, { selected: false });
      selectedIdRef.current = null;
    }
    setSelectedLot(null);
    setSelectedFloorPlan(null);
    sValuesMarkers.forEach(m => m.remove());
    setSValuesMarkers([]);
  }, [sValuesMarkers, mapRef]);

  const handleSearchResult = useCallback((coordinates: [number, number]) => {
    if (mapRef) mapRef.flyTo({ center: coordinates, zoom: 15 });
  }, [mapRef]);

  return (
    <div className="relative h-full w-full">
      {(isLoading || isLoadingLots) && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {lotsError && (
        <div className="absolute top-4 left-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-20">
          Error loading lots: {lotsError.message}
        </div>
      )}

      <div className="absolute top-4 right-5 z-10">
        <Suspense fallback={<div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>}>
          <SearchControl onResultSelect={handleSearchResult} />
        </Suspense>
      </div>

      <div className="absolute top-45 right-5 z-10">
        <Suspense fallback={<div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>}>
          <LayersButton onClick={() => setIsZoningSidebarOpen(true)} isActive={isZoningSidebarOpen} />
        </Suspense>
      </div>

      <div className="absolute top-57 right-5 z-10">
        <Suspense fallback={<div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>}>
          <SavedButton onClick={() => setIsSavedSidebarOpen(true)} isActive={isSavedSidebarOpen} />
        </Suspense>
      </div>

      <Suspense fallback={<div className="hidden"></div>}>
        <ZoningLayersSidebar
          open={isZoningSidebarOpen}
          onClose={() => setIsZoningSidebarOpen(false)}
          onOverlayToggle={handleOverlayToggle}
          activeOverlays={activeOverlays}
        />
      </Suspense>

      <Suspense fallback={<div className="hidden"></div>}>
        <SavedPropertiesSidebar
          open={isSavedSidebarOpen}
          onClose={() => setIsSavedSidebarOpen(false)}
          onViewDetails={handleViewDetails}
        />
      </Suspense>

      <div ref={mapContainer} className="h-full w-full" />

      {/* Map Controls Component */}
      <MapControls
        map={mapRef}
        setSelectedLot={setSelectedLot}
        selectedIdRef={selectedIdRef}
        sidebarOpenRef={sidebarOpenRef}
        initialView={mapInitialView}
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
      />

      {selectedLot && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading sidebar...</p>
            </div>
          </div>
        }>
          <LotSidebar
            open={!!selectedLot}
            onClose={handleCloseSidebar}
            isLoadingApiData={isLoadingLotData}
            apiError={lotApiError}
            lot={{
              id: selectedLot.properties.databaseId || selectedLot.properties.ID,
              suburb: selectedLot.properties.DISTRICT_NAME || '',
              address: selectedLot.properties.ADDRESSES || '',
              size: selectedLot.properties.BLOCK_DERIVED_AREA,
              type: selectedLot.properties.TYPE,
              zoning: selectedLot.properties.LAND_USE_POLICY_ZONES,
              overlays: selectedLot.properties.OVERLAY_PROVISION_ZONES,
              apiDimensions: {
                width: selectedLot.properties.width,
                depth: selectedLot.properties.depth,
              },
              apiZoning: lotApiData?.zoning,
              apiMatches: [],
            }}
            geometry={selectedLot.geometry}
            onSelectFloorPlan={setSelectedFloorPlan}
            onZoningDataUpdate={handleZoningDataUpdate}
          />
        </Suspense>
      )}
    </div>
  );
}
