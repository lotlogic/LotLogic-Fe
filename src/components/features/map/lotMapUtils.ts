import type { LotProperties } from "@/types/lot";
import type { MutableRefObject } from "react";
import type { GeoJSONSource, MapboxGeoJSONFeature, Map } from "mapbox-gl";

export type SelectableLotFeature = MapboxGeoJSONFeature & {
  properties: LotProperties;
};

export const isLotSelectable = (properties: LotProperties | null | undefined) =>
  properties?.lifecycleStage !== "sold";

export const setSelectedLotFeatureState = (
  map: Map,
  selectedIdRef: MutableRefObject<string | null>,
  nextId: string | null
) => {
  if (selectedIdRef.current) {
    map.setFeatureState(
      { source: "demo-lot-source", id: selectedIdRef.current },
      { selected: false }
    );
  }

  if (nextId) {
    map.setFeatureState(
      { source: "demo-lot-source", id: nextId },
      { selected: true }
    );
  }

  selectedIdRef.current = nextId;
};

const EMPTY_FEATURE_COLLECTION: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export const setHoveredLotOverlayFeature = (
  map: Map,
  feature: SelectableLotFeature | null
) => {
  const hoveredSource = map.getSource("hovered-lot-source") as
    | GeoJSONSource
    | undefined;

  if (!hoveredSource) {
    return;
  }

  if (!feature) {
    hoveredSource.setData(EMPTY_FEATURE_COLLECTION);
    return;
  }

  hoveredSource.setData({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: feature.geometry,
        properties: feature.properties as GeoJSON.GeoJsonProperties,
      },
    ],
  });
};

export const focusMapOnLot = (
  map: Map,
  geometry: GeoJSON.Geometry | undefined,
  fallbackCenter?: [number, number]
) => {
  if (geometry?.type === "Polygon" && geometry.coordinates[0]?.length) {
    const coordinates = geometry.coordinates[0] as [number, number][];
    const lngs = coordinates.map((coord) => coord[0]);
    const lats = coordinates.map((coord) => coord[1]);
    const bounds = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ] as [[number, number], [number, number]];

    map.fitBounds(bounds, {
      padding: 50,
      maxZoom: 25,
      duration: 1000,
    });
    return;
  }

  if (fallbackCenter) {
    map.flyTo({
      center: fallbackCenter,
      zoom: Math.max(map.getZoom() || 16, 16),
      duration: 1000,
    });
  }
};
