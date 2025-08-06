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
import { useLotCalculation } from "../../../hooks/useLotCalculation";
import type { SavedProperty } from "../../../types/ui";


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
};


type FloorPlan = {
 url: string;
 coordinates: [[number, number], [number, number], [number, number], [number, number]];
};


mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

// Debounce utility function
const debounce = (func: (...args: unknown[]) => void, wait: number) => {
 let timeout: ReturnType<typeof setTimeout>;
 return (...args: unknown[]) => {
   clearTimeout(timeout);
   timeout = setTimeout(() => func(...args), wait);
 };
};


function createLabelElement(text: string) {
 const el = document.createElement('div');
 el.style.background = 'white';
 el.style.border = '1.5px solid #2F5D62';
 el.style.borderRadius = '4px';
 el.style.padding = '2px 6px';
 el.style.fontSize = '14px';
 el.style.fontWeight = 'bold';
 el.style.color = '#2F5D62';
 el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
 el.innerText = text;
 return el;
}


// --- GEOMETRIC TRANSFORMATION FUNCTIONS ---
function calculateCentroid(features: GeoJSON.Feature<GeoJSON.Polygon>[]) {
 let totalLng = 0;
 let totalLat = 0;
 let count = 0;


 features.forEach(feature => {
   if (feature.geometry.type === 'Polygon') {
     feature.geometry.coordinates[0].forEach(coord => {
       totalLng += coord[0];
       totalLat += coord[1];
       count++;
     });
   }
 });


 return [totalLng / count, totalLat / count];
}


function rotatePoint(point: [number, number], origin: [number, number], angleInDegrees: number): [number, number] {
 const angleInRadians = angleInDegrees * Math.PI / 180;
 const [x, y] = point;
 const [ox, oy] = origin;


 const translatedX = x - ox;
 const translatedY = y - oy;


 const rotatedX = translatedX * Math.cos(angleInRadians) - translatedY * Math.sin(angleInRadians);
 const rotatedY = translatedX * Math.sin(angleInRadians) + translatedY * Math.cos(angleInRadians);


 return [rotatedX + ox, rotatedY + oy];
}


function rotatePolygon(polygonCoordinates: number[][][], origin: [number, number], angleInDegrees: number): number[][][] {
 // Assuming simple polygon with one outer ring
 const outerRing = polygonCoordinates[0].map(point =>
   rotatePoint(point as [number, number], origin, angleInDegrees)
 );
 return [outerRing];
}
// --- END GEOMETRIC TRANSFORMATION FUNCTIONS ---


export default function ZoneMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [selectedLot, setSelectedLot] = useState<MapboxGeoJSONFeature & { properties: LotProperties } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<FloorPlan | null>(null);
  const [isZoningSidebarOpen, setIsZoningSidebarOpen] = useState(false);
  const [isSavedSidebarOpen, setIsSavedSidebarOpen] = useState(false);
  const [edgeMarkers, setEdgeMarkers] = useState<mapboxgl.Marker[]>([]);


  // Get the lot ID for the API call
  const lotId = selectedLot?.properties?.BLOCK_KEY || null;
   // Use TanStack Query for lot calculation
  const { data: lotApiData, isLoading: isLoadingLotData, error: lotApiError } = useLotCalculation(lotId);


  // Mock saved properties data
//  const savedProperties: SavedProperty[] = [
//    {
//      id: '1',
//      lotId: '205',
//      suburb: 'Rydalmere',
//      address: '15 Bowden Street',
//      size: 495,
//      zoning: 'RZ2: Low density residential',
//      overlays: 'Flood',
//      houseDesign: {
//        id: 'design1',
//        title: 'Allium Place, Orlando',
//        image: '/images/brick.jpg',
//        bedrooms: 4,
//        bathrooms: 2,
//        cars: 2,
//        storeys: 1,
//      }
//    }
//  ];

   let savedProperties: SavedProperty[] = [];

  if (typeof window !== 'undefined') {
    try {
      savedProperties = JSON.parse(localStorage.getItem('userFavorite') ?? '[]');
    } catch (e) {
      console.error('Error parsing localStorage:', e);
    }
  }


 const handleViewDetails = (property: SavedProperty) => {
   // Handle viewing property details
   console.log('View details for property:', property);
   setIsSavedSidebarOpen(false);
 };


 // Hamilton Rise Estate Layout - Positioned in bottom-left corner
 const estateLots = {
   type: 'FeatureCollection' as const,
   features: [
     // Lot 1 moved to the "here" area (south-east of original block)
     {
       type: 'Feature' as const,
       geometry: {
         type: 'Polygon' as const,
         coordinates: [[
           [148.987800, -35.224500], // New topLeft for "here" area
           [148.988300, -35.224500], // New topRight
           [148.988300, -35.224900], // New bottomRight
           [148.987800, -35.224900], // New bottomLeft
           [148.987800, -35.224500]  // Close polygon
         ]]
       },
       properties: {
         BLOCK_KEY: 'lot-001',
         ADDRESSES: 'Lot 1, New Location, Macnamara ACT 2615, Australia',
         BLOCK_DERIVED_AREA: '450',
         DISTRICT_NAME: 'Macnamara',
         LAND_USE_POLICY_ZONES: 'RZ2: Low Density Residential',
         LOT_NUMBER: 1,
         STAGE: 'Stage 1',
         ID: 1,
         BLOCK_NUMBER: 1,
         SECTION_NUMBER: 1,
         DISTRICT_CODE: 1,
         OBJECTID: 1
       }
     },
     // Original Lots (2,3,4,5,6) - will be targeted for rotation
     {
       type: 'Feature' as const,
       geometry: {
         type: 'Polygon' as const,
         coordinates: [[
           [148.987184, -35.223935], // topLeft
           [148.987384, -35.223935], // topRight
           [148.987384, -35.224135], // bottomRight
           [148.987184, -35.224135], // bottomLeft
           [148.987184, -35.223935] // close polygon
         ]]
       },
       properties: {
         BLOCK_KEY: 'lot-002',
         ADDRESSES: 'Lot 2, Eric Willmot Way, Macnamara ACT 2615, Australia',
         BLOCK_DERIVED_AREA: '480',
         DISTRICT_NAME: 'Macnamara',
         LAND_USE_POLICY_ZONES: 'RZ2: Low Density Residential',
         LOT_NUMBER: 2,
         STAGE: 'Stage 1',
         ID: 2,
         BLOCK_NUMBER: 2,
         SECTION_NUMBER: 1,
         DISTRICT_CODE: 1,
         OBJECTID: 2
       }
     },
     {
       type: 'Feature' as const,
       geometry: {
         type: 'Polygon' as const,
         coordinates: [[
           [148.987384, -35.223935], // topLeft
           [148.987584, -35.223935], // topRight
           [148.987584, -35.224135], // bottomRight
           [148.987384, -35.224135], // bottomLeft
           [148.987384, -35.223935] // close polygon
         ]]
       },
       properties: {
         BLOCK_KEY: 'lot-003',
         ADDRESSES: 'Lot 3, Eric Willmot Way, Macnamara ACT 2615, Australia',
         BLOCK_DERIVED_AREA: '520',
         DISTRICT_NAME: 'Macnamara',
         LAND_USE_POLICY_ZONES: 'RZ2: Low Density Residential',
         LOT_NUMBER: 3,
         STAGE: 'Stage 1',
         ID: 3,
         BLOCK_NUMBER: 3,
         SECTION_NUMBER: 1,
         DISTRICT_CODE: 1,
         OBJECTID: 3
       }
     },
     {
       type: 'Feature' as const,
       geometry: {
         type: 'Polygon' as const,
         coordinates: [[
           [148.986984, -35.224135], // topLeft
           [148.987184, -35.224135], // topRight
           [148.987184, -35.224335], // bottomRight
           [148.986984, -35.224335], // bottomLeft
           [148.986984, -35.224135] // close polygon
         ]]
       },
       properties: {
         BLOCK_KEY: 'lot-004',
         ADDRESSES: 'Lot 4, Eric Willmot Way, Macnamara ACT 2615, Australia',
         BLOCK_DERIVED_AREA: '460',
         DISTRICT_NAME: 'Macnamara',
         LAND_USE_POLICY_ZONES: 'RZ2: Low Density Residential',
         LOT_NUMBER: 4,
         STAGE: 'Stage 1',
         ID: 4,
         BLOCK_NUMBER: 4,
         SECTION_NUMBER: 1,
         DISTRICT_CODE: 1,
         OBJECTID: 4
       }
     },
     {
       type: 'Feature' as const,
       geometry: {
         type: 'Polygon' as const,
         coordinates: [[
           [148.987184, -35.224135], // topLeft
           [148.987384, -35.224135], // topRight
           [148.987384, -35.224335], // bottomRight
           [148.987184, -35.224335], // bottomLeft
           [148.987184, -35.224135] // close polygon
         ]]
       },
       properties: {
         BLOCK_KEY: 'lot-005',
         ADDRESSES: 'Lot 5, Eric Willmot Way, Macnamara ACT 2615, Australia',
         BLOCK_DERIVED_AREA: '490',
         DISTRICT_NAME: 'Macnamara',
         LAND_USE_POLICY_ZONES: 'RZ2: Low Density Residential',
         LOT_NUMBER: 5,
         STAGE: 'Stage 1',
         ID: 5,
         BLOCK_NUMBER: 5,
         SECTION_NUMBER: 1,
         DISTRICT_CODE: 1,
         OBJECTID: 5
       }
     },
     {
       type: 'Feature' as const,
       geometry: {
         type: 'Polygon' as const,
         coordinates: [[
           [148.987384, -35.224135], // topLeft
           [148.987584, -35.224135], // topRight
           [148.987584, -35.224335], // bottomRight
           [148.987384, -35.224335], // bottomLeft
           [148.987384, -35.224135] // close polygon
         ]]
       },
       properties: {
         BLOCK_KEY: 'lot-006',
         ADDRESSES: 'Lot 6, Eric Willmot Way, Macnamara ACT 2615, Australia',
         BLOCK_DERIVED_AREA: '510',
         DISTRICT_NAME: 'Macnamara',
         LAND_USE_POLICY_ZONES: 'RZ2: Low Density Residential',
         LOT_NUMBER: 6,
         STAGE: 'Stage 1',
         ID: 6,
         BLOCK_NUMBER: 6,
         SECTION_NUMBER: 1,
         DISTRICT_CODE: 1,
         OBJECTID: 6
       }
     },
   ]
 };


 // --- ROTATION LOGIC ---
 const lotsToRotateKeys = ['lot-001', 'lot-002', 'lot-003', 'lot-004', 'lot-005', 'lot-006'];
 const currentLotsToRotate = estateLots.features.filter(f => lotsToRotateKeys.includes(f.properties.BLOCK_KEY));


 const rotatedEstateLots: typeof estateLots = JSON.parse(JSON.stringify(estateLots)); // Deep copy


 if (currentLotsToRotate.length > 0) {
   const rotationOrigin = calculateCentroid(currentLotsToRotate as GeoJSON.Feature<GeoJSON.Polygon>[]);
   const rotationAngle = -26; // Example: 15 degrees counter-clockwise. Use negative for clockwise.


   rotatedEstateLots.features = estateLots.features.map(feature => {
     if (lotsToRotateKeys.includes(feature.properties.BLOCK_KEY)) {
       const newFeature = JSON.parse(JSON.stringify(feature)); // Ensure deep copy for this feature
       if (newFeature.geometry.type === 'Polygon') {
         newFeature.geometry.coordinates = rotatePolygon(
           newFeature.geometry.coordinates as number[][][],
           rotationOrigin as [number, number],
           rotationAngle
         );
       }
       return newFeature;
     }
     return feature;
   });
 }
 // --- END ROTATION LOGIC ---


 // Initialize map layers
 const initializeMapLayers = useCallback((map: mapboxgl.Map) => {
   // Add custom demo lot source, now using rotatedEstateLots
   map.addSource('demo-lot-source', {
     type: 'geojson',
     data: rotatedEstateLots // Use the rotated data here
   });


   // Add custom demo lot layer
   map.addLayer({
     id: 'demo-lot-layer',
     type: 'fill',
     source: 'demo-lot-source',
     paint: {
       'fill-color': [
         'case',
         ['==', ['get', 'STAGE'], 'Stage 1'], '#E67E22', // Orange for Stage 1
         ['==', ['get', 'STAGE'], 'Future Release'], '#90EE90', // Light green for Future Release
         ['==', ['get', 'STAGE'], 'Local Park'], '#90EE90', // Light green for Local Park (same as Future Release)
         '#E67E22' // Default orange
       ],
       'fill-opacity': 0.6,
       'fill-outline-color': [
         'case',
         ['==', ['get', 'STAGE'], 'Stage 1'], '#D35400', // Dark orange outline
         ['==', ['get', 'STAGE'], 'Future Release'], '#32CD32', // Green outline
         ['==', ['get', 'STAGE'], 'Local Park'], '#32CD32', // Green outline (same as Future Release)
         '#D35400' // Default dark orange
       ]
     }
   });


   // Add custom demo lot outline
   map.addLayer({
     id: 'demo-lot-outline',
     type: 'line',
     source: 'demo-lot-source',
     paint: {
       'line-color': '#2F5D62',
       'line-width': 2
     }
   });


   // Add estate lot labels
   map.addLayer({
     id: 'estate-lot-labels',
     type: 'symbol',
     source: 'demo-lot-source',
     layout: {
       'text-field': ['get', 'LOT_NUMBER'],
       'text-font': ['Open Sans Bold'],
       'text-size': 14,
       'text-offset': [0, 0],
       'text-anchor': 'center'
     },
     paint: {
       'text-color': '#2c3e50',
       'text-halo-color': '#ffffff',
       'text-halo-width': 2
     }
   });


   // Add map controls
   map.addControl(new mapboxgl.NavigationControl(), 'top-right');
   map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');


   // Mouse enter/leave handlers for demo lot
   map.on('mouseenter', 'demo-lot-layer', () => {
     map.getCanvas().style.cursor = 'pointer';
   });


   map.on('mouseleave', 'demo-lot-layer', () => {
     map.getCanvas().style.cursor = '';
   });
 }, []);


 // Map initialization
 useEffect(() => {
   if (!mapContainer.current || mapRef.current) return;

   const map = new mapboxgl.Map({
     container: mapContainer.current,
     style: 'mapbox://styles/mapbox/streets-v12',
     center: [148.987084, -35.224035], // Exact coordinates: -35.224035, 148.987084
     zoom: 19.9,
     attributionControl: false,
   });

   mapRef.current = map;

   // Debounced resize handler
   const handleResize = debounce(() => map.resize(), 250);
   window.addEventListener('resize', handleResize);

   map.on('load', () => {
     setIsLoading(true);
     try {
       initializeMapLayers(map);
       setIsLoading(false);
     } catch (err) {
       console.error('Map initialization error:', err);
       setIsLoading(false);
     }
   });

   return () => {
     window.removeEventListener('resize', handleResize);
     map.remove();
     mapRef.current = null;
   };
 }, [initializeMapLayers]);


 // Click handler
 useEffect(() => {
   if (!mapRef.current) return;
   const map = mapRef.current;


   const handleClick = (e: MapMouseEvent) => {
     if (selectedLot) return; // Skip if sidebar is open
    
     // Check if click is on demo lot
     const features = map.queryRenderedFeatures(e.point, { layers: ['demo-lot-layer'] });
     if (features.length > 0) {
       const feature = features[0];
       console.log('Development lot clicked:', feature.properties);
       setSelectedLot(feature as MapboxGeoJSONFeature & { properties: LotProperties });
      
       // Fly to the selected feature
       map.flyTo({
         center: e.lngLat,
         zoom: Math.max(map.getZoom(), 15)
       });
     }
   };


   map.on('click', 'demo-lot-layer', handleClick);
   return () => {
     map.off('click', 'demo-lot-layer', handleClick);
   };
 }, [selectedLot]);


 // Highlight selected lot
 useEffect(() => {
   if (!mapRef.current || !selectedLot) return;
   const map = mapRef.current;


   const sourceId = 'selected-lot-source';
   const layerIds = ['selected-lot-fill', 'selected-lot-outline'];


   // Remove previous layers
   layerIds.forEach(layerId => {
     if (map.getLayer(layerId)) map.removeLayer(layerId);
   });
   if (map.getSource(sourceId)) map.removeSource(sourceId);


   // Add new source and layers
   map.addSource(sourceId, {
     type: 'geojson',
     data: {
       type: 'Feature',
       geometry: selectedLot.geometry,
       properties: {}
     }
   });


   map.addLayer({
     id: 'selected-lot-fill',
     type: 'fill',
     source: sourceId,
     paint: {
       'fill-color': '#FFFFFF',
       'fill-opacity': 1.0
     }
   });


   map.addLayer({
     id: 'selected-lot-outline',
     type: 'line',
     source: sourceId,
     paint: {
       'line-color': '#2F5D62',
       'line-width': 3
     }
   });


   return () => {
     layerIds.forEach(layerId => {
       if (map.getLayer(layerId)) map.removeLayer(layerId);
     });
     if (map.getSource(sourceId)) map.removeSource(sourceId);
   };
 }, [selectedLot]);


 useEffect(() => {
   edgeMarkers.forEach(marker => marker.remove());
   setEdgeMarkers([]);


   if (!mapRef.current || !selectedLot || !lotApiData?.matches?.[0]?.lotDimensions) return;


   const map = mapRef.current;
   const coordinates = selectedLot.geometry?.type === 'Polygon'
     ? selectedLot.geometry.coordinates[0]
     : null;
   if (!coordinates || coordinates.length < 4) return;


   // Get width/depth from API
   const { width, depth } = lotApiData.matches[0].lotDimensions;
   // Repeat for each edge (assuming rectangle, 4 sides)
   const labels = [
     `${width.toFixed(2)}m`,
     `${depth.toFixed(2)}m`,
     `${width.toFixed(2)}m`,
     `${depth.toFixed(2)}m`
   ];


   const newMarkers: mapboxgl.Marker[] = [];
   for (let i = 0; i < 4; i++) {
     const coord1 = coordinates[i];
     const coord2 = coordinates[(i + 1) % 4];
     // Midpoint
     const midpoint: [number, number] = [
       (coord1[0] + coord2[0]) / 2,
       (coord1[1] + coord2[1]) / 2
     ];
     const marker = new mapboxgl.Marker({ element: createLabelElement(labels[i]), anchor: 'center' })
       .setLngLat(midpoint)
       .addTo(map);
     newMarkers.push(marker);
   }
   setEdgeMarkers(newMarkers);


   // Cleanup on unmount/lot change
   return () => {
     newMarkers.forEach(marker => marker.remove());
     setEdgeMarkers([]);
   };
 }, [selectedLot, lotApiData]);


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


 const handleCloseSidebar = useCallback(() => {
   setSelectedLot(null);
   setSelectedFloorPlan(null);
 }, []);


 const handleSearchResult = useCallback((coordinates: [number, number]) => {
   if (mapRef.current) {
     mapRef.current.flyTo({
       center: coordinates,
       zoom: 15
     });
   }
 }, []);


 return (
   <div className="relative h-full w-full">
     {isLoading && (
       <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
       </div>
     )}


     {/* Search Control */}
     <div className="absolute top-4 right-5 z-10">
       <SearchControl onResultSelect={handleSearchResult} />
     </div>


     {/* Layers Button */}
     <div className="absolute top-45 right-5 z-10">
       <LayersButton
         onClick={() => setIsZoningSidebarOpen(true)}
         isActive={isZoningSidebarOpen}
       />
     </div>


     {/* Saved Button */}
     <div className="absolute top-57 right-5 z-10">
       <SavedButton
         onClick={() => setIsSavedSidebarOpen(true)}
         isActive={isSavedSidebarOpen}
       />
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


     <div
       ref={mapContainer}
       className="h-full w-full"
     />

     {/* Lot Sidebar */}
     {selectedLot && (
       <LotSidebar
         open={!!selectedLot}
         onClose={handleCloseSidebar}
         isLoadingApiData={isLoadingLotData}
         apiError={lotApiError}
         lot={{
           id: selectedLot.properties.BLOCK_KEY,
           suburb: selectedLot.properties.DISTRICT_NAME || '',
           address: selectedLot.properties.ADDRESSES || '',
           size: selectedLot.properties.BLOCK_DERIVED_AREA,
           type: selectedLot.properties.TYPE,
           zoning: selectedLot.properties.LAND_USE_POLICY_ZONES,
           overlays: selectedLot.properties.OVERLAY_PROVISION_ZONES,
           width: lotApiData?.matches?.[0]?.lotDimensions?.width,
           depth: lotApiData?.matches?.[0]?.lotDimensions?.depth,
           apiDimensions: lotApiData?.matches?.[0]?.lotDimensions,
           apiZoning: lotApiData?.zoning,
           apiMatches: lotApiData?.matches,
         }}
         geometry={selectedLot.geometry}
         onSelectFloorPlan={setSelectedFloorPlan}
       />
     )} 
   </div>
 );
}



