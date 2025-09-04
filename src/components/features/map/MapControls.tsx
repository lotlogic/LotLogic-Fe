import { useEffect } from 'react';
import mapboxgl, { Map, MapMouseEvent } from 'mapbox-gl';
import type { MapboxGeoJSONFeature } from 'mapbox-gl';
import { debounce } from '@/lib/utils/geometry';
import type { LotProperties } from '@/types/lot';
import { trackLotSelected } from '@/lib/analytics/mixpanel';
import { useMobile } from '@/hooks/useMobile';

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
      console.log('Compass button found:', !!compassButton);
      
      if (compassButton) {
        const handleCompassClick = () => {
          console.log('Compass button clicked, dispatching recenter event');
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

