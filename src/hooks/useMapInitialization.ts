import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";

const EMPTY_FEATURE_COLLECTION: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

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
      const brandPrimary =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--color-primary")
          .trim() || "#EF7B6C";

      //set the source for the map
      map.addSource("demo-lot-source", {
        type: "geojson",
        data: dataRef.current,
        promoteId: "BLOCK_KEY",
      });
      map.addSource("hovered-lot-source", {
        type: "geojson",
        data: EMPTY_FEATURE_COLLECTION,
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
            "#2B3D48",
            [
              "all",
              ["boolean", ["feature-state", "hovered"], false],
              ["!=", ["get", "lifecycleStage"], "sold"],
            ],
            brandPrimary,
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
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            "#2B3D48",
            [
              "all",
              ["boolean", ["feature-state", "hovered"], false],
              ["!=", ["get", "lifecycleStage"], "sold"],
            ],
            brandPrimary,
            ["==", ["get", "lifecycleStage"], "sold"],
            "#7f1d1d",
            "#2B3D48",
          ],
          "line-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            1,
            [
              "all",
              ["boolean", ["feature-state", "hovered"], false],
              ["!=", ["get", "lifecycleStage"], "sold"],
            ],
            0.92,
            ["==", ["get", "lifecycleStage"], "sold"],
            0.9,
            0.72,
          ],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            2.75,
            [
              "all",
              ["boolean", ["feature-state", "hovered"], false],
              ["!=", ["get", "lifecycleStage"], "sold"],
            ],
            3.75,
            1.6,
          ],
          "line-color-transition": { duration: 220, delay: 0 },
          "line-opacity-transition": { duration: 220, delay: 0 },
          "line-width-transition": { duration: 220, delay: 0 },
        },
      });

      map.addLayer({
        id: "demo-lot-hover-glow",
        type: "line",
        source: "hovered-lot-source",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": brandPrimary,
          "line-width": 9,
          "line-opacity": 0.18,
          "line-blur": 1.2,
        },
      });

      map.addLayer({
        id: "demo-lot-hover-outline",
        type: "line",
        source: "hovered-lot-source",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": brandPrimary,
          "line-width": 4.5,
          "line-opacity": 0.96,
        },
      });

      map.addLayer({
        id: "estate-lot-labels",
        type: "symbol",
        source: "demo-lot-source",
        layout: {
          "text-field": [
            "step",
            ["zoom"],
            ["get", "lotLabel"],
            17.4,
            ["get", "lotLabelDetailed"],
          ],
          "text-font": ["Open Sans Bold"],
          "text-size": [
            "step",
            ["zoom"],
            15,
            17.4,
            13.75,
            18.6,
            14.5,
          ],
          "text-line-height": 1.05,
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
