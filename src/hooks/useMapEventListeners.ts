import { useEffect, useRef } from 'react';
import type { Map } from 'mapbox-gl';
import { MAP_CONSTANTS, MAP_EVENTS } from '@/constants/map';

interface UseMapEventListenersProps {
  mapRef: Map | null;
  mapInitialView: { center: [number, number]; zoom: number } | null;
  isMobile: boolean;
}

export const useMapEventListeners = ({ mapRef, mapInitialView, isMobile }: UseMapEventListenersProps) => {
  const eventListenersAddedRef = useRef<boolean>(false);

  useEffect(() => {
    const handleMobileSearchResult = (event: CustomEvent) => {
      const { coordinates } = event.detail;
      if (mapRef && coordinates) {
        mapRef.flyTo({
          center: coordinates,
          zoom: MAP_CONSTANTS.ZOOM_LEVELS.INITIAL,
          duration: MAP_CONSTANTS.ANIMATION_DURATION
        });
      }
    };

    const handleRecenter = () => {
      if (mapRef && mapInitialView) {
        mapRef.flyTo({
          center: mapInitialView.center,
          zoom: mapInitialView.zoom,
          duration: MAP_CONSTANTS.ANIMATION_DURATION
        });
      }
    };

    // Only add event listeners once
    if (!eventListenersAddedRef.current) {
      // Only add mobile event listeners if on mobile
      if (isMobile) {
        window.addEventListener(MAP_EVENTS.SEARCH_RESULT_SELECTED, handleMobileSearchResult as EventListener);
      }
      window.addEventListener(MAP_EVENTS.RECENTER_MAP, handleRecenter);
      
      eventListenersAddedRef.current = true;
    }

    return () => {
      if (isMobile) {
        window.removeEventListener(MAP_EVENTS.SEARCH_RESULT_SELECTED, handleMobileSearchResult as EventListener);
      }
      window.removeEventListener(MAP_EVENTS.RECENTER_MAP, handleRecenter);
      eventListenersAddedRef.current = false;
    };
  }, [mapRef, mapInitialView, isMobile]);
};
