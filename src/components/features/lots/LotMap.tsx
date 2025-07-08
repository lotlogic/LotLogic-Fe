'use client';

import mapboxgl from 'mapbox-gl';
import { useEffect, useRef } from 'react';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

type Props = {
  geojson?: GeoJSON.FeatureCollection;
};

export default function ZoneMap({ geojson }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (map.current) return; 

    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [149.1300, -35.2809], 
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl());

    map.current.on('load', () => {
      if (geojson) {
        map.current!.addSource('lots', {
          type: 'geojson',
          data: geojson,
        });

        map.current!.addLayer({
          id: 'lot-fill',
          type: 'fill',
          source: 'lots',
          paint: {
            'fill-color': '#00bcd4',
            'fill-opacity': 0.4,
          },
        });

        map.current!.addLayer({
          id: 'lot-outline',
          type: 'line',
          source: 'lots',
          paint: {
            'line-color': '#006064',
            'line-width': 1,
          },
        });
      }
    });
  }, [geojson]);

  return <div ref={mapContainer} className="h-[500px] w-full rounded-md shadow" />;
}
