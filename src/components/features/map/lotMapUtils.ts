import type { LotProperties } from "@/types/lot";
import type { MutableRefObject } from "react";
import type {
  GeoJSONSource,
  MapboxGeoJSONFeature,
  Map,
  PaddingOptions,
} from "mapbox-gl";

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

const DESKTOP_LOT_SIDEBAR_LEFT_PX = 20;
const DESKTOP_LOT_SIDEBAR_WIDTH_PX = 496;
const DESKTOP_LOT_SIDEBAR_GAP_PX = 36;
const DESKTOP_LOT_FOCUS_RIGHT_PADDING_PX = 72;
const DESKTOP_LOT_FOCUS_VERTICAL_PADDING_PX = 76;
const MIN_DESKTOP_VISIBLE_MAP_WIDTH_PX = 220;

export const getSelectedLotFocusPadding = (
  map: Map,
  isMobile: boolean
): number | PaddingOptions => {
  if (isMobile) {
    return 86;
  }

  const containerWidth = map.getContainer().clientWidth || window.innerWidth;
  const sidebarClearance =
    DESKTOP_LOT_SIDEBAR_LEFT_PX +
    DESKTOP_LOT_SIDEBAR_WIDTH_PX +
    DESKTOP_LOT_SIDEBAR_GAP_PX;
  const maxLeftPadding = Math.max(
    DESKTOP_LOT_FOCUS_VERTICAL_PADDING_PX,
    containerWidth -
      DESKTOP_LOT_FOCUS_RIGHT_PADDING_PX -
      MIN_DESKTOP_VISIBLE_MAP_WIDTH_PX
  );

  return {
    top: DESKTOP_LOT_FOCUS_VERTICAL_PADDING_PX,
    bottom: DESKTOP_LOT_FOCUS_VERTICAL_PADDING_PX,
    left: Math.min(sidebarClearance, maxLeftPadding),
    right: DESKTOP_LOT_FOCUS_RIGHT_PADDING_PX,
  };
};

export const focusMapOnLot = (
  map: Map,
  geometry: GeoJSON.Geometry | undefined,
  fallbackCenter?: [number, number],
  options?: {
    padding?: number | PaddingOptions;
    maxZoom?: number;
    duration?: number;
    fallbackZoomIncrement?: number;
  }
) => {
  const padding = options?.padding ?? 110;
  const maxZoom = options?.maxZoom ?? 17.6;
  const duration = options?.duration ?? 1400;

  if (geometry?.type === "Polygon" && geometry.coordinates[0]?.length) {
    const coordinates = geometry.coordinates[0] as [number, number][];
    const lngs = coordinates.map((coord) => coord[0]);
    const lats = coordinates.map((coord) => coord[1]);
    const bounds = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ] as [[number, number], [number, number]];

    map.fitBounds(bounds, {
      padding,
      maxZoom,
      duration,
    });
    return;
  }

  if (fallbackCenter) {
    const currentZoom = map.getZoom() || 15.5;
    map.flyTo({
      center: fallbackCenter,
      zoom: Math.min(
        Math.max(currentZoom + (options?.fallbackZoomIncrement ?? 0.35), 15.5),
        Math.min(maxZoom, 18.4)
      ),
      duration,
    });
  }
};
