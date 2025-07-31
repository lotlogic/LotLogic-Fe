'use client';

import React from "react";
import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl, { Map, MapMouseEvent, MapboxGeoJSONFeature } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { LotSidebar } from "../lots/LotSidebar";
import { SearchControl } from "./SearchControl";
import { LayersButton } from "./LayersButton";
import { SavedButton } from "./SavedButton";
import '../map/MapControls.css';
import { ZoningLayersSidebar } from "./ZoningLayerSidebar";
import { SavedPropertiesSidebar } from "./SavedPropertiesSidebar";
import { useLotCalculation } from "@/hooks/useLotCalculation";
import { SavedProperty } from "@/types/ui";

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

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

// Debounce utility function
const debounce = (func: (...args: unknown[]) => void, wait: number) => {
  let timeout: NodeJS.Timeout;
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
  // const savedProperties: SavedProperty[] = [
  //   {
  //     id: '1',
  //     lotId: '205',
  //     suburb: 'Rydalmere',
  //     address: '15 Bowden Street',
  //     size: 495,
  //     zoning: 'RZ2: Low density residential',
  //     overlays: 'Flood',
  //     houseDesign: {
  //       id: 'design1',
  //       title: 'Allium Place, Orlando',
  //       image: '/images/brick.jpg',
  //       bedrooms: 4,
  //       bathrooms: 2,
  //       cars: 2,
  //       storeys: 1,
  //     }
  //   }
  // ];
  
  const savedProperties: SavedProperty[] = JSON.parse(localStorage.getItem('userFavorite') ?? "[]");

  const handleViewDetails = (property: SavedProperty) => {
    // Handle viewing property details
    console.log('View details for property:', property);
    setIsSavedSidebarOpen(false);
  };

  // Initialize map layers
  const initializeMapLayers = useCallback((map: mapboxgl.Map) => {
    // Add vector tileset source
    map.addSource('blocks', {
      type: 'vector',
      url: 'mapbox://beyondhimalayatech.69bhedj9',
    });

    // Add fill layer with zoning-based coloring
    map.addLayer({
      id: 'block-layer',
      type: 'fill',
      source: 'blocks',
      'source-layer': 'ACTGOV_BLOCKS-cw1mr0',
      paint: {
        'fill-color': [
          'case',
          ['==', ['get', 'WATER_FLAG'], 'Y'], '#1E90FF',
          ['!=', ['get', 'LAND_USE_POLICY_ZONES'], ''], '#456882',
          ['!=', ['get', 'OVERLAY_PROVISION_ZONES'], ''], '#FFA500',
          '#4CAF50'
        ],
        'fill-opacity': 0.7,
        'fill-outline-color': '#D2C1B6'
      },
    });

    // Add hover effect
    map.addLayer({
      id: 'block-layer-hover',
      type: 'line',
      source: 'blocks',
      'source-layer': 'ACTGOV_BLOCKS-cw1mr0',
      paint: {
        'line-color': '#000',
        'line-width': 3,
        'line-opacity': 0
      }
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    // Mouse enter/leave handlers
    map.on('mouseenter', 'block-layer', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'block-layer', () => {
      map.getCanvas().style.cursor = '';
      map.setPaintProperty('block-layer-hover', 'line-opacity', 0);
    });
  }, []);

  // Map initialization
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [149.12821, -35.2710585], // coordinates for 14 Macleay Street, Turner ACT
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
      const feature = e.features?.[0];
      if (feature && feature.properties) {
        setSelectedLot(feature as MapboxGeoJSONFeature & { properties: LotProperties });
        
        // Fly to the selected feature
        map.flyTo({
          center: e.lngLat,
          zoom: Math.max(map.getZoom(), 15)
        });
      }
    };

    map.on('click', 'block-layer', handleClick);
    return () => {
      map.off('click', 'block-layer', handleClick);
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