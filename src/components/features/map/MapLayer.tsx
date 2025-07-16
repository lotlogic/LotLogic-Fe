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

type LotProperties = {
  ADDRESSES?: string;
  AP_NUMBER?: string;
  BLOCK_DERIVED_AREA?: string;
  BLOCK_KEY: string; 
  BLOCK_LEASED_AREA?: string;
  BLOCK_NUMBER: number; 
  BLOCK_SECTION?: string;
  BLOCK_TYPE_ID?: string;
  CURRENT_LIFECYCLE_STAGE?: string;
  DEPOSITED_PLAN_NO?: string;
  DISTRICT_CODE: number; 
  DISTRICT_NAME?: string;
  DISTRICT_SHORT?: string;
  DIVISION_CODE?: number; 
  DIVISION_NAME?: string; 
  DIVISION_SHORT?: string; 
  GROUND_LEVEL?: number; 
  GlobalID?: string;
  ID: number; 
  LAND_USE_POLICY_ZONES?: string;
  LAST_UPDATE?: string;
  NEW_TERRITORY_PLAN?: string;
  OBJECTID: number; 
  OVERLAY_PROVISION_ZONES?: string;
  PLAN_NUMBERS?: string;
  SECTION_NUMBER: number; 
  SENSITIVE_FLAG?: string; 
  STRATUM_DATUM_ID?: string; 
  STRATUM_HIGHEST_LEVEL?: number; 
  STRATUM_LOWEST_LEVEL?: number; 
  TRANSITION_FLAG?: string;
  TYPE?: string;
  VOLUME_FOLIO?: string; 
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

export default function ZoneMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [selectedLot, setSelectedLot] = useState<MapboxGeoJSONFeature & { properties: LotProperties } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<FloorPlan | null>(null);
  const [isZoningSidebarOpen, setIsZoningSidebarOpen] = useState(false);
  const [isSavedSidebarOpen, setIsSavedSidebarOpen] = useState(false);

  // Mock saved properties data
  const savedProperties = [
    {
      id: '1',
      lotId: '205',
      suburb: 'Rydalmere',
      address: '15 Bowden Street',
      size: 495,
      zoning: 'RZ2: Low density residential',
      overlays: 'Flood',
      houseDesign: {
        id: 'design1',
        title: 'Allium Place, Orlando',
        area: '2,096.00',
        image: '/images/brick.jpg',
        images: [
          { src: '/images/brick.jpg', faced: 'Brick' },
          { src: '/images/timmerland.jpg', faced: 'Render' },
          { src: '/images/weatherboard.jpg', faced: 'Weatherboard' },
        ],
        bedrooms: 4,
        bathrooms: 2,
        cars: 2,
        storeys: 1,
        isFavorite: true,
        floorPlanImage: '/images/floorplan.jpg',
      }
    }
  ];

  const handleViewDetails = (property: any) => {
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
      center: [149.1300, -35.2809],
      zoom: 13,
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
      if (feature) {
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
        'fill-color': '#EAEFEF',
        'fill-opacity': 0.3
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

      {!isLoading && selectedLot && (
        <LotSidebar
          open={!!selectedLot}
          onClose={handleCloseSidebar}
          lot={{
            id: selectedLot.properties.ID,
            suburb: selectedLot.properties.DISTRICT_NAME,
            address: selectedLot.properties.ADDRESSES,
            zoning: selectedLot.properties.LAND_USE_POLICY_ZONES,
            size: selectedLot.properties.BLOCK_DERIVED_AREA,
            width: selectedLot.properties.WIDTH,
            depth: selectedLot.properties.DEPTH,
            frontageType: selectedLot.properties.FRONTAGE_TYPE,
            overlays: selectedLot.properties.OVERLAY_PROVISION_ZONES,
            planningId: selectedLot.properties.PLAN_NUMBERS,
            maxHeight: selectedLot.properties.MAX_BUILDING_HEIGHT,
            maxSize: selectedLot.properties.MAX_LOT_SIZE,
            maxFSR: selectedLot.properties.MAX_FSR,
          }}
          geometry={selectedLot.geometry}
          onSelectFloorPlan={setSelectedFloorPlan}
        />
      )}  
    </div>
  );
}