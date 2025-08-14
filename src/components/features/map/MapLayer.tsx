import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl, { Map, MapMouseEvent } from 'mapbox-gl';
import type { MapboxGeoJSONFeature } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as turf from '@turf/turf';

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
import { useModalStore } from "../../../stores/modalStore";


// -----------------------------
// Types
// -----------------------------
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

// -----------------------------
// Mapbox token
// -----------------------------
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

// -----------------------------
// Utils
// -----------------------------
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

  switch (position) {
    case 'top': el.style.transform = 'translate(-50%, -120%)'; break;
    case 'right': el.style.transform = 'translate(20%, -50%)'; break;
    case 'bottom': el.style.transform = 'translate(-50%, 20%)'; break;
    case 'left': el.style.transform = 'translate(-120%, -50%)'; break;
    case 'center': el.style.transform = 'translate(-50%, -50%)'; break;
  }
  return el;
}

// -----------------------------
// Geometry helpers (per-side inset in meters)
// Assumes quad ring order: S1(front)=p0->p1, S2=p1->p2, S3=p2->p3, S4(rear)=p3->p0
// -----------------------------
type Pt = [number, number];

function polygonOrientation(points: Pt[]): number {
  let sum = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    sum += (x2 - x1) * (y2 + y1);
  }
  return sum; // >0 CCW, <0 CW
}
function unit(vec: Pt): Pt {
  const len = Math.hypot(vec[0], vec[1]) || 1;
  return [vec[0] / len, vec[1] / len];
}
function offsetEdge(p1: Pt, p2: Pt, inwardNormal: Pt, d: number): [Pt, Pt] {
  return [
    [p1[0] + inwardNormal[0] * d, p1[1] + inwardNormal[1] * d],
    [p2[0] + inwardNormal[0] * d, p2[1] + inwardNormal[1] * d],
  ];
}
function intersectLines(a1: Pt, a2: Pt, b1: Pt, b2: Pt): Pt {
  const x1 = a1[0], y1 = a1[1], x2 = a2[0], y2 = a2[1];
  const x3 = b1[0], y3 = b1[1], x4 = b2[0], y4 = b2[1];
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(den) < 1e-9) return a2;
  const px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / den;
  const py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / den;
  return [px, py];
}
function insetQuadPerSideLL(
  ringLL: Pt[], // closed ring [p0,p1,p2,p3,p0]
  sides: { front: number; side: number; rear: number }
): Pt[] | null {
  if (!ringLL || ringLL.length < 5) return null;

  const ringMerc = (turf.toMercator(turf.polygon([ringLL])) as any)
    .geometry.coordinates[0] as Pt[];

  const p0 = ringMerc[0], p1 = ringMerc[1], p2 = ringMerc[2], p3 = ringMerc[3];

  const ori = polygonOrientation([p0, p1, p2, p3, p0]); // >0 CCW, <0 CW
  const sign = ori > 0 ? -1 : 1; // inward normal direction

  const v01 = unit([p1[0] - p0[0], p1[1] - p0[1]]);
  const v12 = unit([p2[0] - p1[0], p2[1] - p1[1]]);
  const v23 = unit([p3[0] - p2[0], p3[1] - p2[1]]);
  const v30 = unit([p0[0] - p3[0], p0[1] - p3[1]]);

  const n01: Pt = [sign * -v01[1], sign * v01[0]]; // front (S1)
  const n12: Pt = [sign * -v12[1], sign * v12[0]]; // side  (S2)
  const n23: Pt = [sign * -v23[1], sign * v23[0]]; // side  (S3)
  const n30: Pt = [sign * -v30[1], sign * v30[0]]; // rear  (S4)

  const [a0, a1] = offsetEdge(p0, p1, n01, sides.front);
  const [b0, b1] = offsetEdge(p1, p2, n12, sides.side);
  const [c0, c1] = offsetEdge(p2, p3, n23, sides.side);
  const [d0, d1] = offsetEdge(p3, p0, n30, sides.rear);

  const q0 = intersectLines(d0, d1, a0, a1);
  const q1 = intersectLines(a0, a1, b0, b1);
  const q2 = intersectLines(b0, b1, c0, c1);
  const q3 = intersectLines(c0, c1, d0, d1);

  const innerMerc = [q0, q1, q2, q3, q0] as Pt[];
  const innerLL = (turf.toWgs84(turf.polygon([innerMerc])) as any)
    .geometry.coordinates[0] as Pt[];

  return innerLL;
}

// -----------------------------
// Component
// -----------------------------
export default function ZoneMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);

  const dataRef = useRef<GeoJSON.FeatureCollection>({ type: 'FeatureCollection', features: [] });
  const selectedIdRef = useRef<string | null>(null);
  const sidebarOpenRef = useRef<boolean>(false);

  const [selectedLot, setSelectedLot] = useState<MapboxGeoJSONFeature & { properties: LotProperties } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<FloorPlan | null>(null);
  const [sValuesMarkers, setSValuesMarkers] = useState<mapboxgl.Marker[]>([]);
  const [initialView, setInitialView] = useState<{ center: [number, number]; zoom: number } | null>(null);

  // Setbacks (m). Change front to 9 to see the front edge move 9m inward.
  const [setbackValues, setSetbackValues] = useState({ front: 4, side: 3, rear: 3 });

  // FSR buildable area (m²) requested; will be capped by setbacks buildable area
  const [fsrBuildableArea, setFsrBuildableArea] = useState(300);


  // Modal state from Zustand
  const { showFloorPlanModal, showFacadeModal } = useModalStore();

  // data
  const { data: lotsData, isLoading: isLoadingLots, error: lotsError } = useLots();
  const estateLots = lotsData ? convertLotsToGeoJSON(lotsData) : { type: 'FeatureCollection' as const, features: [] };
  useEffect(() => { dataRef.current = estateLots as any; }, [estateLots]);

  // keep sidebar open ref in sync
  useEffect(() => { sidebarOpenRef.current = !!selectedLot; }, [selectedLot]);

  // lot details for sidebar
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

  // saved props
  let savedProperties: SavedProperty[] = [];
  if (typeof window !== 'undefined') {
    try { savedProperties = JSON.parse(localStorage.getItem('userFavorite') ?? '[]'); }
    catch (e) { console.error('Error parsing localStorage:', e); }
  }

  const handleViewDetails = (property: SavedProperty) => {
    setIsSavedSidebarOpen(false);
    const lotData = lotsData?.find(lot => lot.id?.toString() === property.lotId || lot.blockKey === property.lotId);
    if (!lotData) return;

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
        isRed: true,
      }
    } as unknown as MapboxGeoJSONFeature & { properties: LotProperties };

    setSelectedLot(lotFeature);
    const map = mapRef.current;
    if (!map) return;
    if (selectedIdRef.current) {
      map.setFeatureState({ source: 'demo-lot-source', id: selectedIdRef.current }, { selected: false });
    }
    map.setFeatureState({ source: 'demo-lot-source', id: property.lotId }, { selected: true });
    selectedIdRef.current = property.lotId;

    if (property.houseDesign.floorPlanImage) {
      const coordinates = lotData.geometry.coordinates[0] as [number, number][];
      if (coordinates?.length >= 4) {
        const lotArea = property.size || 0;
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

  // create map ONCE
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [148.987084, -35.224035],
      zoom: 16,
      attributionControl: false,
    });
          mapRef.current = map;

      // Add standard navigation controls
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    const handleResize = debounce(() => map.resize(), 250);
    window.addEventListener('resize', handleResize);

    map.on('load', () => {
      map.addSource('demo-lot-source', {
        type: 'geojson',
        data: dataRef.current,
        promoteId: 'BLOCK_KEY',
      });

      map.addLayer({
        id: 'demo-lot-layer',
        type: 'fill',
        source: 'demo-lot-source',
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], '#FFFFFF',
            ['==', ['get', 'isRed'], true], '#2E5A1C',
            '#A52A2A'
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 0.9,
            ['==', ['get', 'isRed'], true], 0.3,
            0.4
          ],
          'fill-outline-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], '#2F5D62',
            ['==', ['get', 'lifecycleStage'], 'unavailable'], '#8B0000',
            '#1B4D1B'
          ]
        }
      });

      map.addLayer({
        id: 'demo-lot-outline',
        type: 'line',
        source: 'demo-lot-source',
        paint: { 'line-color': '#2F5D62', 'line-width': 1.5 }
      });

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
            ['boolean', ['feature-state', 'selected'], false], 0,
            1
          ]
        }
      });

      map.on('mouseenter', 'demo-lot-layer', (e) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ['demo-lot-layer'] })[0] as MapboxGeoJSONFeature | undefined;
        if (!f) return;
        const isRed = !!(f.properties as any)?.isRed;
        const isSidebarOpen = sidebarOpenRef.current;
        map.getCanvas().style.cursor = (isRed && !isSidebarOpen) ? 'pointer' : 'not-allowed';
      });
      map.on('mouseleave', 'demo-lot-layer', () => (map.getCanvas().style.cursor = ''));



      map.on('click', 'demo-lot-layer', (e: MapMouseEvent) => {
        console.log('Lot clicked!', e.point);
        const f = map.queryRenderedFeatures(e.point, { layers: ['demo-lot-layer'] })[0] as MapboxGeoJSONFeature | undefined;
        console.log('Clicked feature:', f);
        if (!f) {
          console.log('No feature found at click point');
          return;
        }
        const isRed = !!(f.properties as any)?.isRed;
        console.log('Is red lot:', isRed, 'Properties:', f.properties);
        if (!isRed) {
          console.log('Lot is not red (not available or missing s1-s4 data)');
          return;
        }
        if (sidebarOpenRef.current) {
          console.log('Sidebar is open, ignoring click');
          return;
        }

        const id = (f.properties as any)?.BLOCK_KEY;
        console.log('Lot ID:', id);
        if (!id) {
          console.log('No lot ID found');
          return;
        }

        if (selectedIdRef.current) {
          map.setFeatureState({ source: 'demo-lot-source', id: selectedIdRef.current }, { selected: false });
        }
        map.setFeatureState({ source: 'demo-lot-source', id }, { selected: true });
        selectedIdRef.current = id;

        setSelectedLot(f as any);
        console.log('Selected lot set, now zooming...');
        
        // Improved zoom to lot: fit the entire lot boundary with padding
        try {
          const geometry = f.geometry as GeoJSON.Polygon;
          console.log('Lot geometry:', geometry);
          if (geometry && geometry.coordinates && geometry.coordinates[0]) {
            const coordinates = geometry.coordinates[0] as [number, number][];
            console.log('Lot coordinates:', coordinates);
            if (coordinates.length >= 3) {
              // Calculate the bounding box of the lot
              const lngs = coordinates.map(coord => coord[0]);
              const lats = coordinates.map(coord => coord[1]);
              const bounds = [
                [Math.min(...lngs), Math.min(...lats)],
                [Math.max(...lngs), Math.max(...lats)]
              ] as [[number, number], [number, number]];
              
              console.log('Calculated bounds:', bounds);
              // Fit the map to the lot bounds with padding
              map.fitBounds(bounds, {
                padding: 50, // Add 50px padding around the lot
                maxZoom: 25, // Maximum zoom level
                duration: 1000 // Smooth animation duration
              });
              console.log('fitBounds called successfully');
            } else {
              console.log('Geometry has insufficient coordinates, using fallback zoom');
              // Fallback to center point zoom if geometry is invalid
              map.flyTo({ 
                center: e.lngLat, 
                zoom: Math.max(map.getZoom() || 16, 16),
                duration: 1000
              });
            }
          } else {
            console.log('No geometry found, using fallback zoom');
            // Fallback to center point zoom if no geometry
            map.flyTo({ 
              center: e.lngLat, 
              zoom: Math.max(map.getZoom() || 16, 16),
              duration: 1000
            });
          }
        } catch (error) {
          console.error('Error fitting bounds to lot:', error);
          // Fallback to center point zoom on error
          map.flyTo({ 
            center: e.lngLat, 
            zoom: Math.max(map.getZoom() || 16, 16),
            duration: 1000
          });
        }
      });

      setIsLoading(false);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // update source data when estate lots change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource('demo-lot-source') as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData(estateLots as any);
  }, [estateLots]);

  // initial center based on first lot
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !lotsData || lotsData.length === 0) return;
    const first = lotsData[0];
    const coords = first?.geometry?.coordinates?.[0];
    if (!coords?.length) return;
    const avgLng = coords.reduce((s: number, c: number[]) => s + c[0], 0) / coords.length;
    const avgLat = coords.reduce((s: number, c: number[]) => s + c[1], 0) / coords.length;
    const initialCenter: [number, number] = [avgLng, avgLat];
    const initialZoom = 16;
    
    // Store initial view for compass reset
    setInitialView({ center: initialCenter, zoom: initialZoom });
    map.jumpTo({ center: initialCenter, zoom: initialZoom });
  }, [lotsData]);

  // Add compass reset functionality when initial view is available
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !initialView) return;

    // Find the compass button and add click handler
    const compassButton = map.getContainer().querySelector('.mapboxgl-ctrl-compass');
    if (compassButton) {
      const handleCompassClick = () => {
        map.flyTo({
          center: initialView.center,
          zoom: initialView.zoom,
          bearing: 0,
          duration: 1000
        });
      };
      
      compassButton.addEventListener('click', handleCompassClick);
      
      // Cleanup
      return () => {
        compassButton.removeEventListener('click', handleCompassClick);
      };
    }
  }, [initialView]);

  // Floorplan overlay - now uses house area boundary coordinates
  useEffect(() => {
    if (!mapRef.current || !selectedFloorPlan) return;
    const map = mapRef.current;
    const sourceId = 'floorplan-image';
    const layerId = 'floorplan-layer';

    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

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

            map.addSource(sourceId, { type: 'image', url: selectedFloorPlan.url, coordinates: floorPlanCoordinates });
            map.addLayer({ id: layerId, type: 'raster', source: sourceId, paint: { 'raster-opacity': 0.8 } });
          }
        }
      }
    } else {
      // Fallback to original coordinates if no house area
      map.addSource(sourceId, { type: 'image', url: selectedFloorPlan.url, coordinates: selectedFloorPlan.coordinates });
      map.addLayer({ id: layerId, type: 'raster', source: sourceId, paint: { 'raster-opacity': 0.8 } });
    }

    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [selectedFloorPlan, selectedLot]);

  // S values + Setbacks + FSR boundary (per-side)
  useEffect(() => {
    sValuesMarkers.forEach(m => m.remove());
    setSValuesMarkers([]);

    if (!mapRef.current || !selectedLot) return;
    const map = mapRef.current;

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

    // const lotPoly = turf.polygon([coordinates]); // temporarily disabled

    if (innerLL && innerLL.length >= 5) {
      const innerPoly = turf.polygon([innerLL]);

      // Draw setback boundary (blue dashed)
      if (map.getLayer('setback-boundary-layer')) map.removeLayer('setback-boundary-layer');
      if (map.getSource('setback-boundary-source')) map.removeSource('setback-boundary-source');
      map.addSource('setback-boundary-source', { type: 'geojson', data: innerPoly });
      map.addLayer({
        id: 'setback-boundary-layer',
        type: 'line',
        source: 'setback-boundary-source',
        paint: { 'line-color': '#2196F3', 'line-width': 2, 'line-dasharray': [2, 2] }
      });

            // Shade the setback area (lot minus inner) - temporarily disabled due to turf.difference issues
      // try {
      //   const diff = turf.difference(lotPoly as any, innerPoly as any);
      //   if (diff) {
      //     if (map.getLayer('setback-fill')) map.removeLayer('setback-fill');
      //     if (map.getSource('setback-fill-src')) map.removeSource('setback-fill-src');
      //     map.addSource('setback-fill-src', { type: 'geojson', data: diff });
      //     map.addLayer({
      //       id: 'setback-fill',
      //       type: 'fill',
      //       source: 'setback-fill-src',
      //       paint: { 'fill-color': '#2196F3', 'fill-opacity': 0.12 }
      //     });
      //   }
      // } catch (e) { 
      //   console.error("Error calculating setback fill:", e); 
      // }

      // --------- FSR boundary INSIDE setbacks ----------
      const innerArea = turf.area(innerPoly); // m²
      const desired = Math.min(fsrBuildableArea, innerArea);
      const scale = Math.sqrt(desired / innerArea); // <= 1
      const innerCenter = turf.center(innerPoly);
      const fsrBoundary = turf.transformScale(innerPoly, scale, { origin: innerCenter });

      if (map.getLayer('fsr-boundary-layer')) map.removeLayer('fsr-boundary-layer');
      if (map.getSource('fsr-boundary-source')) map.removeSource('fsr-boundary-source');
      map.addSource('fsr-boundary-source', { type: 'geojson', data: fsrBoundary });
      map.addLayer({
        id: 'fsr-boundary-layer',
        type: 'line',
        source: 'fsr-boundary-source',
        paint: { 'line-color': '#FF9800', 'line-width': 2, 'line-dasharray': [4, 4] }
      });

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

      // --------- House Design Area Boundary (Red Dotted) ----------
      if (selectedFloorPlan && selectedFloorPlan.houseArea && selectedFloorPlan.houseArea > 0) {
        const houseArea = selectedFloorPlan.houseArea;
        const houseScale = Math.sqrt(houseArea / innerArea); // Scale to house area
        const houseBoundary = turf.transformScale(innerPoly, houseScale, { origin: innerCenter });

        if (map.getLayer('house-area-boundary-layer')) map.removeLayer('house-area-boundary-layer');
        if (map.getSource('house-area-boundary-source')) map.removeSource('house-area-boundary-source');
        map.addSource('house-area-boundary-source', { type: 'geojson', data: houseBoundary });
        map.addLayer({
          id: 'house-area-boundary-layer',
          type: 'line',
          source: 'house-area-boundary-source',
          paint: { 'line-color': '#FF0000', 'line-width': 2, 'line-dasharray': [4, 4] }
        });

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
          element: createSValueLabel(`${side.label}: ${side.val}`, side.pos),
          anchor: 'center'
        }).setLngLat(mpt).addTo(map);
        newMarkers.push(marker);
      }
    });

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
  }, [selectedLot, setbackValues, fsrBuildableArea, selectedFloorPlan, showFloorPlanModal, showFacadeModal]);

  // CLOSE
  const handleCloseSidebar = useCallback(() => {
    const map = mapRef.current;
    if (map && selectedIdRef.current) {
      map.setFeatureState({ source: 'demo-lot-source', id: selectedIdRef.current }, { selected: false });
      selectedIdRef.current = null;
    }
    setSelectedLot(null);
    setSelectedFloorPlan(null);
    sValuesMarkers.forEach(m => m.remove());
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
          onZoningDataUpdate={handleZoningDataUpdate}
        />
      )}
    </div>
  );
}
