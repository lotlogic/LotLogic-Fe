import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl, { Map, MapMouseEvent } from 'mapbox-gl';
import type { MapboxGeoJSONFeature } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { LotSidebar } from "../lots/LotSidebar";
import { SearchControl } from "./SearchControl";
import { LayersButton } from "./LayersButton";
import { SavedButton } from "./SavedButton";
import '../map/MapControls.css';
import { ZoningLayersSidebar } from "./ZoningLayerSidebar";
import { SavedPropertiesSidebar } from "./SavedPropertiesSidebar";
import { useLotDetails } from "../../../hooks/useLotDetails";
import type { SavedProperty } from "../../../types/ui";
import { useLots, convertLotsToGeoJSON } from "../../../hooks/useLots";
import { getImageUrl } from "../../../lib/api/lotApi";

type LotProperties = {
 ADDRESSES?: string;
 BLOCK_DERIVED_AREA?: string;
 BLOCK_KEY: string;
 BLOCK_NUMBER: number;
 BLOCK_SECTION?: string;
 DISTRICT_CODE: number;
 DISTRICT_NAME?: string;
 DISTRICT_SHORT?: string;
 ID: number;
 LAND_USE_POLICY_ZONES?: string;
 OBJECTID: number;
 OVERLAY_PROVISION_ZONES?: string;
 SECTION_NUMBER: number;
 TYPE?: string;
 WATER_FLAG?: string;
 STAGE?: string;
 LOT_NUMBER?: number;
 databaseId?: string;
 areaSqm?: number;
 division?: string;
 estateId?: string;
 lifecycleStage?: string;
 s1?: number | null;
 s2?: number | null;
 s3?: number | null;
 s4?: number | null;
 hasExactS1S2S3S4?: boolean;
 isRed?: boolean;
};

type FloorPlan = {
  url: string;
  coordinates: [[number, number], [number, number], [number, number], [number, number]];
  houseArea?: number;
};

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

const debounce = (func: (...args: unknown[]) => void, wait: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: unknown[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

function createSValueLabel(text: string, position: 'top' | 'right' | 'bottom' | 'left' | 'center') {
  const el = document.createElement('div');
  el.style.background = '#FF6B6B';
  el.style.border = '2px solid #FF4757';
  el.style.borderRadius = '6px';
  el.style.padding = '6px 10px';
  el.style.fontSize = '11px';
  el.style.fontWeight = 'bold';
  el.style.color = 'white';
  el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  el.style.minWidth = '40px';
  el.style.textAlign = 'center';
  el.style.zIndex = '1000';
  el.style.whiteSpace = 'pre-line';
  el.style.lineHeight = '1.2';
  el.innerText = text;
  
  // Position-specific styling
  switch (position) {
    case 'top':
      el.style.transform = 'translate(-50%, -120%)';
      break;
    case 'right':
      el.style.transform = 'translate(20%, -50%)';
      break;
    case 'bottom':
      el.style.transform = 'translate(-50%, 20%)';
      break;
    case 'left':
      el.style.transform = 'translate(-120%, -50%)';
      break;
    case 'center':
      el.style.transform = 'translate(-50%, -50%)';
      break;
  }
  
  return el;
}

export default function ZoneMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);

  // keep current geojson in a ref so "load" can use it once, then later effects can update the source
  const dataRef = useRef<GeoJSON.FeatureCollection>({ type: 'FeatureCollection', features: [] });
  const selectedIdRef = useRef<string | null>(null);
  const sidebarOpenRef = useRef<boolean>(false);

  const [selectedLot, setSelectedLot] = useState<MapboxGeoJSONFeature & { properties: LotProperties } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<FloorPlan | null>(null);
  const [sValuesMarkers, setSValuesMarkers] = useState<mapboxgl.Marker[]>([]);

  // Add/remove floor plan overlay using image source
  useEffect(() => {
    if (!mapRef.current || !selectedFloorPlan) return;
    const map = mapRef.current;

    const sourceId = 'floorplan-image';
    const layerId = 'floorplan-layer';

    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    map.addSource(sourceId, {
      type: 'image',
      url: selectedFloorPlan.url,
      coordinates: selectedFloorPlan.coordinates
    });

    map.addLayer({
      id: layerId,
      type: 'raster',
      source: sourceId,
      paint: {
        'raster-opacity': 0.8
      }
    });

    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [selectedFloorPlan]);

  // Display S-values (s1, s2, s3, s4) on clicked lot
  useEffect(() => {
    // Remove existing S-value markers
    sValuesMarkers.forEach(marker => marker.remove());
    setSValuesMarkers([]);

    if (!mapRef.current || !selectedLot) return;

    const map = mapRef.current;
    const { s1, s2, s3, s4 } = selectedLot.properties;

    // Only show S-values if they exist
    if (s1 === null && s2 === null && s3 === null && s4 === null) return;

    // Get lot coordinates
    const geometry = selectedLot.geometry as GeoJSON.Polygon;
    const coordinates = geometry.coordinates[0] as [number, number][];
    if (!coordinates || coordinates.length < 4) return;

    const newMarkers: mapboxgl.Marker[] = [];

    // Calculate midpoints of each side for better positioning
    const sides: Array<{
      start: [number, number];
      end: [number, number];
      value: number | null | undefined;
      label: string;
      position: 'top' | 'right' | 'bottom' | 'left';
    }> = [
      // Top side (between coordinates[0] and coordinates[1])
      {
        start: coordinates[0],
        end: coordinates[1],
        value: s1,
        label: 'S1',
        position: 'top'
      },
      // Right side (between coordinates[1] and coordinates[2])
      {
        start: coordinates[1],
        end: coordinates[2],
        value: s2,
        label: 'S2',
        position: 'right'
      },
      // Bottom side (between coordinates[2] and coordinates[3])
      {
        start: coordinates[2],
        end: coordinates[3],
        value: s3,
        label: 'S3',
        position: 'bottom'
      },
      // Left side (between coordinates[3] and coordinates[0])
      {
        start: coordinates[3],
        end: coordinates[0],
        value: s4,
        label: 'S4',
        position: 'left'
      }
    ];

    // Create markers for each S-value at the midpoint of each side
    sides.forEach(side => {
      if (side.value !== null) {
        // Calculate midpoint of the side
        const midLng = (side.start[0] + side.end[0]) / 2;
        const midLat = (side.start[1] + side.end[1]) / 2;

        const marker = new mapboxgl.Marker({
          element: createSValueLabel(`${side.label}: ${side.value}`, side.position),
          anchor: 'center'
        })
          .setLngLat([midLng, midLat])
          .addTo(map);
        newMarkers.push(marker);
      }
    });

    setSValuesMarkers(newMarkers);

    return () => {
      newMarkers.forEach(marker => marker.remove());
    };
  }, [selectedLot]);
  



  const [isZoningSidebarOpen, setIsZoningSidebarOpen] = useState(false);
  const [isSavedSidebarOpen, setIsSavedSidebarOpen] = useState(false);

  // fetch data
  const { data: lotsData, isLoading: isLoadingLots, error: lotsError } = useLots();
  const estateLots = lotsData ? convertLotsToGeoJSON(lotsData) : { type: 'FeatureCollection' as const, features: [] };
  // keep ref in sync
  useEffect(() => { dataRef.current = estateLots as any; }, [estateLots]);
  
  // keep sidebar open ref in sync
  useEffect(() => {
    sidebarOpenRef.current = !!selectedLot;
  }, [selectedLot]);

  // lot details for sidebar
  const lotId = selectedLot?.properties?.ID?.toString() || null;
  const { data: lotApiData, isLoading: isLoadingLotData, error: lotApiError } = useLotDetails(lotId);

  // saved props
  let savedProperties: SavedProperty[] = [];
  if (typeof window !== 'undefined') {
    try { savedProperties = JSON.parse(localStorage.getItem('userFavorite') ?? '[]'); }
    catch (e) { console.error('Error parsing localStorage:', e); }
  }

  const handleViewDetails = (property: SavedProperty) => {
    console.log('View details for property:', property);
    setIsSavedSidebarOpen(false);
    
    // Find the lot data for this property
    const lotData = lotsData?.find(lot => lot.id?.toString() === property.lotId || lot.blockKey === property.lotId);
    if (lotData) {
      // Create a MapboxGeoJSONFeature from the lot data with the correct properties
      const lotFeature = {
        type: 'Feature' as const,
        geometry: lotData.geometry,
        properties: {
          BLOCK_KEY: property.lotId,
          ID: parseInt(property.lotId),
          LOT_NUMBER: parseInt(property.lotId),
          databaseId: property.lotId,
          areaSqm: property.size,
          lifecycleStage: 'available',
          ADDRESSES: property.address,
          DISTRICT_NAME: property.suburb,
          LAND_USE_POLICY_ZONES: property.zoning,
          BLOCK_DERIVED_AREA: property.size.toString(),
          STAGE: 'available',
          BLOCK_NUMBER: null,
          SECTION_NUMBER: null,
          DISTRICT_CODE: 1,
          OBJECTID: parseInt(property.lotId),
          division: '',
          estateId: '',
          isRed: true, // Make it clickable
        }
      } as unknown as MapboxGeoJSONFeature & { properties: LotProperties };
      
      // Set the selected lot to open the sidebar
      setSelectedLot(lotFeature);
      
      // Highlight the lot on the map
      const map = mapRef.current;
      if (map && selectedIdRef.current) {
        map.setFeatureState({ source: 'demo-lot-source', id: selectedIdRef.current }, { selected: false });
      }
      if (map) {
        map.setFeatureState({ source: 'demo-lot-source', id: property.lotId }, { selected: true });
        selectedIdRef.current = property.lotId;
      }
      
      // Set the floor plan image to display on the map
      if (property.houseDesign.floorPlanImage) {
        // Get the coordinates from the lot geometry
        const coordinates = lotData.geometry.coordinates[0] as [number, number][];
        if (coordinates && coordinates.length >= 4) {
          // Calculate lot area and house area
          const lotArea = property.size || 0;
          const houseArea = property.houseDesign.area ? parseFloat(property.houseDesign.area) : 0;
          
          // Calculate scaling factor based on area ratio
          const scaleFactor = lotArea > 0 && houseArea > 0 ? Math.sqrt(houseArea / lotArea) : 1;
          
          // Calculate center of the lot
          const centerLng = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length;
          const centerLat = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;
          
          // Calculate scaled coordinates (smaller area within the lot)
          const scaledCoordinates = coordinates.map(coord => {
            const deltaLng = (coord[0] - centerLng) * scaleFactor;
            const deltaLat = (coord[1] - centerLat) * scaleFactor;
            return [centerLng + deltaLng, centerLat + deltaLat] as [number, number];
          });
          
          const floorPlan: FloorPlan = {
            url: getImageUrl(property.houseDesign.floorPlanImage),
            coordinates: [
              scaledCoordinates[0],
              scaledCoordinates[1], 
              scaledCoordinates[2],
              scaledCoordinates[3]
            ] as [[number, number], [number, number], [number, number], [number, number]],
            houseArea: property.houseDesign.area ? parseFloat(property.houseDesign.area) : 150
          };
          setSelectedFloorPlan(floorPlan);
        }
      }
    }
  };

  // create map ONCE
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // initial camera; do NOT depend on lots here (we’ll update source later)
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [148.987084, -35.224035],
      zoom: 16,
      attributionControl: false,
    });
    mapRef.current = map;

    const handleResize = debounce(() => map.resize(), 250);
    window.addEventListener('resize', handleResize);

    map.on('load', () => {
      // add source once; promoteId enables feature-state by BLOCK_KEY
      map.addSource('demo-lot-source', {
        type: 'geojson',
        data: dataRef.current,
        promoteId: 'BLOCK_KEY',
      });

      // base fill with feature-state highlight to white
      map.addLayer({
        id: 'demo-lot-layer',
        type: 'fill',
        source: 'demo-lot-source',
        paint: {
            'fill-color': [
                'case',
                ['boolean', ['feature-state', 'selected'], false], '#FFFFFF',
                ['==', ['get', 'isRed'], true], '#A52A2A',
                '#2E5A1C'
            ],
            'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'selected'], false], 0.9,
                ['==', ['get', 'isRed'], true], 0.4,
                0.3
            ],
          'fill-outline-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], '#2F5D62',
            ['==', ['get', 'lifecycleStage'], 'unavailable'], '#1B4D1B',
            '#8B0000'
          ]
        }
      });

      // outline layer (thin, to keep borders visible under highlight)
      map.addLayer({
        id: 'demo-lot-outline',
        type: 'line',
        source: 'demo-lot-source',
        paint: { 'line-color': '#2F5D62', 'line-width': 1.5 }
      });

      // labels
      map.addLayer({
        id: 'estate-lot-labels',
        type: 'symbol',
        source: 'demo-lot-source',
        layout: {
          'text-field': ['to-string', ['get', 'LOT_NUMBER']],
          'text-font': ['Open Sans Bold'],
          'text-size': 14,
          'text-offset': [0, 0],
          'text-anchor': 'center'
        },
        paint: {
          'text-color': '#2c3e50',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
          'text-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 0, // Hide when selected
            1 // Show when not selected
          ]
        }
      });

      // dynamic cursor based on lot type
      map.on('mouseenter', 'demo-lot-layer', (e) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ['demo-lot-layer'] })[0] as MapboxGeoJSONFeature | undefined;
        if (!f) return;
        
        const isRed = !!(f.properties as any)?.isRed;
        const isSidebarOpen = sidebarOpenRef.current;
        
        if (isRed && !isSidebarOpen) {
          map.getCanvas().style.cursor = 'pointer'; // Clickable
        } else {
          map.getCanvas().style.cursor = 'not-allowed'; // Not clickable
        }
      });
      
      map.on('mouseleave', 'demo-lot-layer', () => (map.getCanvas().style.cursor = ''));

      // click ONCE — use feature-state for highlight
      // map.on('click', 'demo-lot-layer', (e: MapMouseEvent) => {
      //   const f = map.queryRenderedFeatures(e.point, { layers: ['demo-lot-layer'] })[0] as MapboxGeoJSONFeature | undefined;
      //   if (!f) return;
      //   const id = (f.properties as any)?.BLOCK_KEY;
      //   if (!id) return;

      //   // clear previous highlight
      //   if (selectedIdRef.current) {
      //     map.setFeatureState({ source: 'demo-lot-source', id: selectedIdRef.current }, { selected: false });
      //   }
      //   // set new highlight
      //   map.setFeatureState({ source: 'demo-lot-source', id }, { selected: true });
      //   selectedIdRef.current = id;

      //   setSelectedLot(f as any);

      //   map.flyTo({ center: e.lngLat, zoom: Math.max(map.getZoom() || 15, 15) });
      // });

      map.on('click', 'demo-lot-layer', (e: MapMouseEvent) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ['demo-lot-layer'] })[0] as MapboxGeoJSONFeature | undefined;
        if (!f) return;
      
        const isRed = !!(f.properties as any)?.isRed;
        if (!isRed) return;
        
        // Don't allow clicking if sidebar is already open
        if (sidebarOpenRef.current) return;
      
        const id = (f.properties as any)?.BLOCK_KEY;
        if (!id) return;
      
        // clear previous highlight
        if (selectedIdRef.current) {
          map.setFeatureState({ source: 'demo-lot-source', id: selectedIdRef.current }, { selected: false });
        }
        // set new highlight
        map.setFeatureState({ source: 'demo-lot-source', id }, { selected: true });
        selectedIdRef.current = id;
      
        setSelectedLot(f as any);
      
        map.flyTo({ center: e.lngLat, zoom: Math.max(map.getZoom() || 15, 15) });
      });
      

      setIsLoading(false);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // IMPORTANT: no deps => no remount/flicker

  // when lots change, only update source data (no re-add layers)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource('demo-lot-source') as mapboxgl.GeoJSONSource | undefined;
    if (src && estateLots?.features?.length >= 0) {
      src.setData(estateLots as any);
    }
  }, [estateLots]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !lotsData || lotsData.length === 0) return;
    const first = lotsData[0];
    const coords = first?.geometry?.coordinates?.[0];
    if (!coords?.length) return;
    const avgLng = coords.reduce((s: number, c: number[]) => s + c[0], 0) / coords.length;
    const avgLat = coords.reduce((s: number, c: number[]) => s + c[1], 0) / coords.length;
    map.jumpTo({ center: [avgLng, avgLat], zoom: 16 });
  }, [lotsData]);

  // CLEAR highlight when closing sidebar
  const handleCloseSidebar = useCallback(() => {
    const map = mapRef.current;
    if (map && selectedIdRef.current) {
      map.setFeatureState({ source: 'demo-lot-source', id: selectedIdRef.current }, { selected: false });
      selectedIdRef.current = null;
    }
    setSelectedLot(null);
    setSelectedFloorPlan(null);
    
    // Clear S-values markers
    sValuesMarkers.forEach(marker => marker.remove());
    setSValuesMarkers([]);
  }, [sValuesMarkers]);

  const handleSearchResult = useCallback((coordinates: [number, number]) => {
    if (mapRef.current) mapRef.current.flyTo({ center: coordinates, zoom: 15 });
  }, []);

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
        <SearchControl onResultSelect={handleSearchResult} />
      </div>

      <div className="absolute top-45 right-5 z-10">
        <LayersButton onClick={() => setIsZoningSidebarOpen(true)} isActive={isZoningSidebarOpen} />
      </div>

      <div className="absolute top-57 right-5 z-10">
        <SavedButton onClick={() => setIsSavedSidebarOpen(true)} isActive={isSavedSidebarOpen} />
      </div>

      <ZoningLayersSidebar
        open={isZoningSidebarOpen}
        onClose={() => setIsZoningSidebarOpen(false)}
        mapInstance={mapRef.current}
      />

      <SavedPropertiesSidebar
        open={isSavedSidebarOpen}
        onClose={() => setIsSavedSidebarOpen(false)}
        savedProperties={savedProperties}
        onViewDetails={handleViewDetails}
      />

      <div ref={mapContainer} className="h-full w-full" />



      {selectedLot && (
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
            width: undefined,
            depth: undefined,
            apiDimensions: undefined,
            apiZoning: lotApiData?.zoning,
            apiMatches: [],
          }}
          geometry={selectedLot.geometry}
          onSelectFloorPlan={setSelectedFloorPlan}
        />
      )}
    </div>
  );
}
