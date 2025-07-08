'use client';

import React from "react";
import { useEffect, useRef, useState } from 'react';
import mapboxgl, { Map, MapMouseEvent, MapboxGeoJSONFeature } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { LotSidebar } from "./LotSidebar";

// Type definitions based on your field specifications
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

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function ZoneMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [selectedLot, setSelectedLot] = useState<MapboxGeoJSONFeature & { properties: LotProperties } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

    map.on('load', () => {
      setIsLoading(true);
      try {
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
              ['==', ['get', 'WATER_FLAG'], 'Y'], '#1E90FF', // Blue for water
              ['!=', ['get', 'LAND_USE_POLICY_ZONES'], ''], '#456882', // Gold for special zones
              ['!=', ['get', 'OVERLAY_PROVISION_ZONES'], ''], '#FFA500', // Orange for overlay zones
              '#4CAF50' // Default green
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

        // Interaction handlers
        const handleClick = (e: MapMouseEvent) => {
          const feature = e.features?.[0];
          if (feature) {
            setSelectedLot(feature as MapboxGeoJSONFeature & { properties: LotProperties });
          }
        };

        const handleMouseEnter = () => {
          map.getCanvas().style.cursor = 'pointer';
        };

        const handleMouseLeave = () => {
          map.getCanvas().style.cursor = '';
          map.setPaintProperty('block-layer-hover', 'line-opacity', 0);
        };

        map.on('click', 'block-layer', handleClick);
        map.on('mouseenter', 'block-layer', handleMouseEnter);
        map.on('mouseleave', 'block-layer', handleMouseLeave);

        // Add controls
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

        if (selectedLot) {
          map.addSource('lot-mask', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: selectedLot.geometry,
              properties: {},
            },
          });

          map.addLayer({
            id: 'lot-mask-fill',
            type: 'fill',
            source: 'lot-mask',
            paint: {
              'fill-color': '#fff',
              'fill-opacity': 1,
            },
          }, 'building');

          map.addLayer({
            id: 'lot-overlay',
            type: 'fill',
            source: 'lot-mask',
            paint: {
              'fill-color': '#1E90FF',
              'fill-opacity': 0.5,
            },
          });
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Map initialization error:', err);
        setIsLoading(false);
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); 


  return (
    <div className="relative h-[600px] w-full rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      <div ref={mapContainer} className="h-full w-full" />

      {!isLoading && selectedLot && (
        <LotSidebar
          open={!!selectedLot}
          onClose={() => setSelectedLot(null)}
          lot={selectedLot && {
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
        />
      )}
    </div>
  );
}

