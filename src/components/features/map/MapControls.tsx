import { useEffect, useRef } from 'react';
import mapboxgl, { Map, MapMouseEvent } from 'mapbox-gl';
import type { MapboxGeoJSONFeature } from 'mapbox-gl';
import { debounce } from '../../../lib/utils/geometry';
import type { LotProperties } from '../../../types/lot';

// -----------------------------
// Types
// -----------------------------

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
  const handleResize = debounce(() => map?.resize(), 250);
  const controlsAddedRef = useRef(false);

  // Add standard navigation controls
  useEffect(() => {
    if (!map || controlsAddedRef.current) return;

    // Check if navigation control already exists to prevent duplicates
    const existingControls = map.getContainer().querySelectorAll('.mapboxgl-ctrl-group');
    if (existingControls.length === 0) {
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      controlsAddedRef.current = true;
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [map, handleResize]);

  // Add compass reset functionality when initial view is available
  useEffect(() => {
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
  }, [map, initialView]);

  // Add mouse interactions
  useEffect(() => {
    if (!map) return;

    const handleMouseEnter = (e: MapMouseEvent) => {
      const f = map.queryRenderedFeatures(e.point, { layers: ['demo-lot-layer'] })[0] as MapboxGeoJSONFeature | undefined;
      if (!f) return;
      const isRed = !!(f.properties as any)?.isRed;
      const isSidebarOpen = sidebarOpenRef.current;
      map.getCanvas().style.cursor = (isRed && !isSidebarOpen) ? 'pointer' : 'not-allowed';
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    const handleClick = (e: MapMouseEvent) => {
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
