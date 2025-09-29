import { useEffect } from 'react';
import mapboxgl, { Map, MapMouseEvent } from 'mapbox-gl';
import type { MapboxGeoJSONFeature } from 'mapbox-gl';
import { debounce } from '@/lib/utils/geometry';
import type { LotProperties } from '@/types/lot';
import { trackLotSelected } from '@/lib/analytics/mixpanel';
import { useMobile } from '@/hooks/useMobile';
import * as turf from '@turf/turf';
import { setGlobalLotFrontageMidpoint } from './MapLayers';

// -----------------------------
// Helper Functions
// -----------------------------
const addFrontageMidpointMarker = (map: Map, coordinates: [number, number]) => {
  // Remove existing frontage midpoint marker if it exists
  const existingMarker = document.getElementById('frontage-midpoint-marker');
  if (existingMarker) {
    existingMarker.remove();
  }

  // Create a custom marker element
  const markerEl = document.createElement('div');
  markerEl.id = 'frontage-midpoint-marker';
  // markerEl.style.width = '20px';
  // markerEl.style.height = '20px';
  // markerEl.style.borderRadius = '50%';
  // markerEl.style.backgroundColor = '#ff0000';
  // markerEl.style.border = '3px solid #ffffff';
  // markerEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
  // markerEl.style.cursor = 'pointer';
  markerEl.title = 'Frontage Midpoint';

  // Create and add the marker
  new mapboxgl.Marker(markerEl)
    .setLngLat(coordinates)
    .addTo(map);
};

// -----------------------------
// Props
// -----------------------------
interface MapControlsProps {
  map: Map | null;
  setSelectedLot: (lot: MapboxGeoJSONFeature & { properties: LotProperties } | null) => void;
  selectedIdRef: React.MutableRefObject<string | null>;
  sidebarOpenRef: React.MutableRefObject<boolean>;
  initialView: { center: [number, number]; zoom: number } | null;
}

// -----------------------------
// Component
// -----------------------------
export function MapControls({
  map,
  setSelectedLot,
  selectedIdRef,
  sidebarOpenRef,
  initialView
}: MapControlsProps) {
  const isMobile = useMobile();
  const handleResize = debounce(() => map?.resize(), 250);
  // const controlsAddedRef = useRef(false);

  // Add standard navigation controls (only zoom on mobile, full controls on tablet/desktop)
  useEffect(() => {
    if (!map) return;

    // Remove existing controls first
    const existingControls = map.getContainer().querySelectorAll('.mapboxgl-ctrl-group');
    existingControls.forEach(control => control.remove());

    // Add controls based on screen size
    if (!isMobile) {
      // Desktop (≥769px): show full navigation control (zoom + recenter)
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    }
    // Mobile (≤768px): no zoom controls - hidden completely

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [map, isMobile, handleResize]);

  // Add compass reset functionality when initial view is available
  useEffect(() => {
    if (!map || !initialView) return;

    // Use a timeout to ensure the compass button is available after map loads
    const timeoutId = setTimeout(() => {
      const compassButton = map.getContainer().querySelector('.mapboxgl-ctrl-compass');
      // console.log('Compass button found:', !!compassButton);
      
      if (compassButton) {
        const handleCompassClick = () => {
          // console.log('Compass button clicked, dispatching recenter event');
          // Use the same event system as mobile
          window.dispatchEvent(new CustomEvent('recenter-map'));
        };
        
        // Add click listener
        compassButton.addEventListener('click', handleCompassClick);
        
        // Store the handler for cleanup
        (compassButton as any)._recenterHandler = handleCompassClick;
      }
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
      // Cleanup if button exists
      const compassButton = map.getContainer().querySelector('.mapboxgl-ctrl-compass');
      if (compassButton && (compassButton as any)._recenterHandler) {
        compassButton.removeEventListener('click', (compassButton as any)._recenterHandler);
      }
    };
  }, [map, initialView]);

  // Add mouse interactions
  useEffect(() => {
    if (!map) return;

    const handleMouseEnter = (e: MapMouseEvent) => {
      const f = map.queryRenderedFeatures(e.point, { layers: ['demo-lot-layer'] })[0] as MapboxGeoJSONFeature | undefined;
      if (!f) return;
      const isRed = !!(f.properties as Record<string, unknown>)?.isRed;
      const isSidebarOpen = sidebarOpenRef.current;
      map.getCanvas().style.cursor = (isRed && !isSidebarOpen) ? 'pointer' : 'not-allowed';
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    const handleClick = (e: MapMouseEvent) => {
      const f = map.queryRenderedFeatures(e.point, { layers: ['demo-lot-layer'] })[0] as MapboxGeoJSONFeature | undefined;
      if (!f) {
        return;
      }
      const isRed = !!(f.properties as Record<string, unknown>)?.isRed;
      if (!isRed) {
        return;
      }
      if (sidebarOpenRef.current) {
        return;
      }

      const id = (f.properties as Record<string, unknown>)?.BLOCK_KEY as string;
      if (!id) {
        return;
      }

      if (selectedIdRef.current) {
        map.setFeatureState({ source: 'demo-lot-source', id: selectedIdRef.current }, { selected: false });
      }
      map.setFeatureState({ source: 'demo-lot-source', id }, { selected: true });
      selectedIdRef.current = id;

      setSelectedLot(f as MapboxGeoJSONFeature & { properties: LotProperties });
      
      // Calculate and log frontage midpoint
      const frontageData = (f.properties as Record<string, unknown>)?.frontageCoordinate;
      // console.log("🔍 Raw frontage data:", frontageData);
      
      if (frontageData && typeof frontageData === 'string') {
        try {
          // Parse GeoJSON format: "{\"type\":\"LineString\",\"coordinates\":[[148.9246407,-34.8503355],[148.924815,-34.8504019]]}"
          const parsedFrontage = JSON.parse(frontageData);
          if (parsedFrontage.type === 'LineString' && parsedFrontage.coordinates && parsedFrontage.coordinates.length >= 2) {
            const coord1 = parsedFrontage.coordinates[0] as [number, number];
            const coord2 = parsedFrontage.coordinates[1] as [number, number];
            const frontageMidpoint = turf.midpoint(turf.point(coord1), turf.point(coord2)).geometry.coordinates as [number, number];
            // console.log("🏘️ Lot Frontage Midpoint (from API):", frontageMidpoint);
            
            // Add marker to map to show frontage midpoint
            addFrontageMidpointMarker(map, frontageMidpoint);
            
            // Set global lot frontage midpoint for distance calculations
            setGlobalLotFrontageMidpoint(frontageMidpoint);
          } else {
            console.log("❌ Invalid LineString format in frontage data");
          }
        } catch (error) {
          console.log("❌ Error parsing frontage JSON:", error);
        }
      } else {
        // Fallback: Calculate lot frontage midpoint (midpoint of the longest side)
        const geometry = f.geometry as GeoJSON.Polygon;
        const coordinates = geometry.coordinates[0] as [number, number][];
        
        const side1 = turf.distance(coordinates[0], coordinates[1], { units: 'meters' });
        const side2 = turf.distance(coordinates[1], coordinates[2], { units: 'meters' });
        const side3 = turf.distance(coordinates[2], coordinates[3], { units: 'meters' });
        const side4 = turf.distance(coordinates[3], coordinates[0], { units: 'meters' });
        
        const sides = [side1, side2, side3, side4];
        const maxSideIndex = sides.indexOf(Math.max(...sides));
        
        let frontageMidpoint: [number, number] = [0, 0];
        if (maxSideIndex === 0) {
          frontageMidpoint = turf.midpoint(turf.point(coordinates[0]), turf.point(coordinates[1])).geometry.coordinates as [number, number];
        } else if (maxSideIndex === 1) {
          frontageMidpoint = turf.midpoint(turf.point(coordinates[1]), turf.point(coordinates[2])).geometry.coordinates as [number, number];
        } else if (maxSideIndex === 2) {
          frontageMidpoint = turf.midpoint(turf.point(coordinates[2]), turf.point(coordinates[3])).geometry.coordinates as [number, number];
        } else {
          frontageMidpoint = turf.midpoint(turf.point(coordinates[3]), turf.point(coordinates[0])).geometry.coordinates as [number, number];
        }
        
        // console.log("🏘️ Lot Frontage Midpoint (fallback):", frontageMidpoint);
        
        // Add marker to map to show frontage midpoint (fallback)
        addFrontageMidpointMarker(map, frontageMidpoint);
        
        // Set global lot frontage midpoint for distance calculations
        setGlobalLotFrontageMidpoint(frontageMidpoint);
      }
      
      // Track lot selection in Segment
      trackLotSelected(id, f.properties as Record<string, unknown>);
      
      // Improved zoom to lot: fit the entire lot boundary with padding
      try {
        const geometry = f.geometry as GeoJSON.Polygon;
        if (geometry && geometry.coordinates && geometry.coordinates[0]) {
          const coordinates = geometry.coordinates[0] as [number, number][];
          if (coordinates.length >= 3) {
            // Calculate the bounding box of the lot
            const lngs = coordinates.map(coord => coord[0]);
            const lats = coordinates.map(coord => coord[1]);
            const bounds = [
              [Math.min(...lngs), Math.min(...lats)],
              [Math.max(...lngs), Math.max(...lats)]
            ] as [[number, number], [number, number]];
            
            // Fit the map to the lot bounds with padding
            map.fitBounds(bounds, {
              padding: 50, // Add 50px padding around the lot
              maxZoom: 25, // Maximum zoom level
              duration: 1000 // Smooth animation duration
            });
          } else {
            // Fallback to center point zoom if geometry is invalid
            map.flyTo({ 
              center: e.lngLat, 
              zoom: Math.max(map.getZoom() || 16, 16),
              duration: 1000
            });
          }
        } else {
          // Fallback to center point zoom if no geometry
          map.flyTo({ 
            center: e.lngLat, 
            zoom: Math.max(map.getZoom() || 16, 16),
            duration: 1000
          });
        }
      } catch (error) {
        // Fallback to center point zoom on error
        map.flyTo({ 
          center: e.lngLat, 
          zoom: Math.max(map.getZoom() || 16, 16),
          duration: 1000
        });
      }
    };

    map.on('mouseenter', 'demo-lot-layer', handleMouseEnter);
    map.on('mouseleave', 'demo-lot-layer', handleMouseLeave);
    map.on('click', 'demo-lot-layer', handleClick);

    return () => {
      map.off('mouseenter', 'demo-lot-layer', handleMouseEnter);
      map.off('mouseleave', 'demo-lot-layer', handleMouseLeave);
      map.off('click', 'demo-lot-layer', handleClick);
    };
  }, [map, selectedIdRef, sidebarOpenRef, setSelectedLot]);

  return null; // This component doesn't render anything
}

