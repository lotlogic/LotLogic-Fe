import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";

// -----------------------------
// Hook
// -----------------------------
export const useMapInitialization = (
  mapContainer: React.RefObject<HTMLDivElement | null>,
  estateLots: GeoJSON.FeatureCollection
) => {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const dataRef = useRef<GeoJSON.FeatureCollection>({
    type: "FeatureCollection",
    features: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [initialView, setInitialView] = useState<{
    center: [number, number];
    zoom: number;
  } | null>(null);

  // Set Mapbox token
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [148.987084, -35.224035],
      zoom: 16,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      //set the source for the map
      map.addSource("demo-lot-source", {
        type: "geojson",
        data: dataRef.current,
        promoteId: "BLOCK_KEY",
      });

      // Add pond source
      const pondGeoJSON = {
        type: "FeatureCollection" as const,
        features: [
          {
            type: "Feature" as const,
            properties: { name: "Pond" },
            geometry: {
              type: "Polygon" as const,
              coordinates: [
                [
                  [148.9260719296633, -34.85187636224688],
                  [148.92625457288892, -34.851897651253836],
                  [148.9262976558718, -34.8519485518225],
                  [148.9262824915171, -34.85208533470767],
                  [148.9261476384239, -34.852122662010515],
                  [148.92606201741398, -34.852062499172504],
                  [148.92607164977716, -34.85187630149601],
                ],
              ],
            },
          },
        ],
      };

      map.addSource("pond-source", {
        type: "geojson",
        data: pondGeoJSON,
      });

      // Add pond layer (behind lots)
      map.addLayer({
        id: "pond-layer",
        type: "fill",
        source: "pond-source",
        paint: {
          "fill-color": "#e2dfd8",
          "fill-opacity": 1,
        },
      });

      map.addLayer({
        id: "demo-lot-layer",
        type: "fill",
        source: "demo-lot-source",
        paint: {
          "fill-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            "#FFFFFF",
            ["==", ["get", "lifecycleStage"], "sold"],
            "#e5e7eb",
            ["==", ["get", "lifecycleStage"], "reserved"],
            "#fcd8a8",
            ["==", ["get", "isRed"], true],
            "#b3bda8",
            "#d09b9a",
          ],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            1,
            ["==", ["get", "isRed"], true],
            1,
            1,
          ],
          "fill-outline-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            "#2F5D62",
            ["==", ["get", "lifecycleStage"], "sold"],
            "#7f1d1d",
            ["==", ["get", "lifecycleStage"], "reserved"],
            "#9a3412",
            "#1B4D1B",
          ],
        },
      });

      map.addLayer({
        id: "demo-lot-outline",
        type: "line",
        source: "demo-lot-source",
        paint: { "line-color": "#2F5D62", "line-width": 1.5 },
      });

      map.addLayer({
        id: "estate-lot-labels",
        type: "symbol",
        source: "demo-lot-source",
        layout: {
          "text-field": ["to-string", ["get", "LOT_NUMBER"]],
          "text-font": ["Open Sans Bold"],
          "text-size": 14,
          "text-offset": [0, 0],
          "text-anchor": "center",
        },
        paint: {
          "text-color": "#2c3e50",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
          "text-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            0,
            1,
          ],
        },
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

    const src = map.getSource("demo-lot-source") as
      | mapboxgl.GeoJSONSource
      | undefined;
    if (src) src.setData(estateLots);
  }, [estateLots]);

  return {
    map: mapRef.current,
    isLoading,
    initialView,
    setInitialView,
  };
};
