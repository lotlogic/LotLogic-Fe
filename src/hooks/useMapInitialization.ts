import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';



// -----------------------------
// Hook
// -----------------------------
export function useMapInitialization(
  mapContainer: React.RefObject<HTMLDivElement | null>,
  estateLots: GeoJSON.FeatureCollection,
  activeOverlays: Set<string> = new Set()
) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const dataRef = useRef<GeoJSON.FeatureCollection>({ type: 'FeatureCollection', features: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [initialView, setInitialView] = useState<{ center: [number, number]; zoom: number } | null>(null);

  // Set Mapbox token
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

  // Initialize map
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
            ['boolean', ['feature-state', 'flood'], false], '#00FFFF',
            ['boolean', ['feature-state', 'bushfire'], false], '#FF6347',
            ['boolean', ['feature-state', 'heritage'], false], '#F3E5AB',
            ['==', ['get', 'isRed'], true], '#2E5A1C',
            '#A52A2A'
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 0.9,
            ['any', 
              ['boolean', ['feature-state', 'flood'], false],
              ['boolean', ['feature-state', 'bushfire'], false],
              ['boolean', ['feature-state', 'heritage'], false]
            ], 0.7,
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

      setIsLoading(false);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapContainer]);

  // Update source data when estate lots change
  useEffect(() => {
    dataRef.current = estateLots;
    
    const map = mapRef.current;
    if (!map) return;
    
    const src = map.getSource('demo-lot-source') as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData(estateLots);
  }, [estateLots]);

  // Update overlay feature states when activeOverlays change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !dataRef.current) return;

    // Clear all overlay states first
    dataRef.current.features.forEach(feature => {
      const id = feature.properties?.BLOCK_KEY;
      if (id) {
        map.setFeatureState(
          { source: 'demo-lot-source', id },
          { flood: false, bushfire: false, heritage: false }
        );
      }
    });

    // Set overlay states for active overlays
    activeOverlays.forEach(overlayType => {
      dataRef.current.features.forEach(feature => {
        const id = feature.properties?.BLOCK_KEY;
        const overlayString = feature.properties?.OVERLAY_PROVISION_ZONES || '';
        
        if (id && overlayString.toLowerCase().includes(overlayType.toLowerCase())) {
          map.setFeatureState(
            { source: 'demo-lot-source', id },
            { [overlayType]: true }
          );
        }
      });
    });
  }, [activeOverlays]);

  return {
    map: mapRef.current,
    isLoading,
    initialView,
    setInitialView
  };
}
