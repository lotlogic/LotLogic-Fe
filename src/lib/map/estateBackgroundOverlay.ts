import type { Map } from "mapbox-gl";

export type EstateBackgroundOverlayInput = {
  backgroundImageUrl?: string | null;
  backgroundImageNorth?: number | string | null;
  backgroundImageSouth?: number | string | null;
  backgroundImageEast?: number | string | null;
  backgroundImageWest?: number | string | null;
};

export type NormalizedEstateBackgroundOverlay = {
  imageUrl: string;
  north: number;
  south: number;
  east: number;
  west: number;
  coordinates: [
    [number, number],
    [number, number],
    [number, number],
    [number, number]
  ];
};

const ESTATE_BACKGROUND_SOURCE_ID = "estate-background-image-source";
const ESTATE_BACKGROUND_LAYER_ID = "estate-background-image-layer";
const ESTATE_BACKGROUND_SYNC_KEY = "__estateBackgroundOverlaySyncKey";
const BACKGROUND_FADE_START_ZOOM = 17;
const BACKGROUND_FADE_MID_ZOOM = 18.25;
const BACKGROUND_FADE_END_ZOOM = 19.75;
const DEFAULT_LOT_FILL_OPACITY = [
  "case",
  ["boolean", ["feature-state", "selected"], false],
  1,
  1,
];
const BACKGROUND_VISIBLE_LOT_FILL_OPACITY = [
  "case",
  ["boolean", ["feature-state", "selected"], false],
  0.92,
  ["==", ["get", "lifecycleStage"], "sold"],
  0.76,
  ["==", ["get", "lifecycleStage"], "reserved"],
  0.76,
  0.68,
];

const parseOverlayCoordinate = (
  value: number | string | null | undefined
): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const getSoftenedBackgroundOpacity = (rasterOpacity: number) =>
  [
    "interpolate",
    ["linear"],
    ["zoom"],
    BACKGROUND_FADE_START_ZOOM,
    rasterOpacity,
    BACKGROUND_FADE_MID_ZOOM,
    rasterOpacity * 0.72,
    BACKGROUND_FADE_END_ZOOM,
    rasterOpacity * 0.42,
  ] as any;

export const normalizeEstateBackgroundOverlay = (
  value: EstateBackgroundOverlayInput | null | undefined
): NormalizedEstateBackgroundOverlay | null => {
  const imageUrl = value?.backgroundImageUrl?.trim();
  if (!imageUrl) {
    return null;
  }

  const northInput = parseOverlayCoordinate(value?.backgroundImageNorth);
  const southInput = parseOverlayCoordinate(value?.backgroundImageSouth);
  const eastInput = parseOverlayCoordinate(value?.backgroundImageEast);
  const westInput = parseOverlayCoordinate(value?.backgroundImageWest);

  if (
    northInput === null ||
    southInput === null ||
    eastInput === null ||
    westInput === null
  ) {
    return null;
  }

  const north = Math.max(northInput, southInput);
  const south = Math.min(northInput, southInput);
  const east = Math.max(eastInput, westInput);
  const west = Math.min(eastInput, westInput);

  if (north === south || east === west) {
    return null;
  }

  return {
    imageUrl,
    north,
    south,
    east,
    west,
    coordinates: [
      [west, north],
      [east, north],
      [east, south],
      [west, south],
    ],
  };
};

const setLotFillOpacityForBackground = (map: Map, hasBackground: boolean) => {
  if (!map.getLayer("demo-lot-layer")) {
    return;
  }

  const fillOpacityExpression = (
    hasBackground
      ? BACKGROUND_VISIBLE_LOT_FILL_OPACITY
      : DEFAULT_LOT_FILL_OPACITY
  ) as any;

  map.setPaintProperty(
    "demo-lot-layer",
    "fill-opacity",
    fillOpacityExpression
  );
};

const removeEstateBackgroundOverlay = (map: Map) => {
  if (map.getLayer(ESTATE_BACKGROUND_LAYER_ID)) {
    map.removeLayer(ESTATE_BACKGROUND_LAYER_ID);
  }
  if (map.getSource(ESTATE_BACKGROUND_SOURCE_ID)) {
    map.removeSource(ESTATE_BACKGROUND_SOURCE_ID);
  }

  setLotFillOpacityForBackground(map, false);

  delete (map as Map & { [ESTATE_BACKGROUND_SYNC_KEY]?: string })[
    ESTATE_BACKGROUND_SYNC_KEY
  ];
};

const refreshEstateBackgroundOverlay = (map: Map, rasterOpacity: number) => {
  if (!map.getLayer(ESTATE_BACKGROUND_LAYER_ID)) {
    return;
  }

  const refreshOpacity =
    rasterOpacity > 0.0001 ? rasterOpacity - 0.0001 : rasterOpacity + 0.0001;

  map.setPaintProperty(
    ESTATE_BACKGROUND_LAYER_ID,
    "raster-opacity",
    getSoftenedBackgroundOpacity(refreshOpacity)
  );
  map.setPaintProperty(
    ESTATE_BACKGROUND_LAYER_ID,
    "raster-opacity",
    getSoftenedBackgroundOpacity(rasterOpacity)
  );
  map.triggerRepaint();
};

export const syncEstateBackgroundOverlay = (
  map: Map,
  overlay: EstateBackgroundOverlayInput | null | undefined,
  beforeLayerId = "demo-lot-layer",
  opacity = 1
) => {
  if (!map.isStyleLoaded()) {
    return;
  }

  const normalized = normalizeEstateBackgroundOverlay(overlay);
  if (!normalized) {
    removeEstateBackgroundOverlay(map);
    map.triggerRepaint();
    return;
  }

  const syncKey = [
    normalized.imageUrl,
    normalized.north,
    normalized.south,
    normalized.east,
    normalized.west,
    beforeLayerId,
  ].join("|");

  const mapWithSyncState = map as Map & {
    [ESTATE_BACKGROUND_SYNC_KEY]?: string;
  };
  const rasterOpacity = Math.min(Math.max(opacity, 0), 1);

  const existingSource = map.getSource(ESTATE_BACKGROUND_SOURCE_ID) as
    | {
        updateImage?: (options: {
          url: string;
          coordinates: NormalizedEstateBackgroundOverlay["coordinates"];
        }) => void;
        setCoordinates?: (
          coordinates: NormalizedEstateBackgroundOverlay["coordinates"]
        ) => void;
      }
    | undefined;

  if (
    mapWithSyncState[ESTATE_BACKGROUND_SYNC_KEY] === syncKey &&
    map.getLayer(ESTATE_BACKGROUND_LAYER_ID) &&
    existingSource
  ) {
    refreshEstateBackgroundOverlay(map, rasterOpacity);
    return;
  }

  if (existingSource?.updateImage) {
    existingSource.updateImage({
      url: normalized.imageUrl,
      coordinates: normalized.coordinates,
    });
    existingSource.setCoordinates?.(normalized.coordinates);
  } else {
    removeEstateBackgroundOverlay(map);
    map.addSource(ESTATE_BACKGROUND_SOURCE_ID, {
      type: "image",
      url: normalized.imageUrl,
      coordinates: normalized.coordinates,
    });
  }

  if (!map.getLayer(ESTATE_BACKGROUND_LAYER_ID)) {
    const layerConfig = {
      id: ESTATE_BACKGROUND_LAYER_ID,
      type: "raster" as const,
      source: ESTATE_BACKGROUND_SOURCE_ID,
      paint: {
        "raster-opacity": getSoftenedBackgroundOpacity(rasterOpacity),
        "raster-resampling": "linear" as const,
      },
    };

    if (beforeLayerId && map.getLayer(beforeLayerId)) {
      map.addLayer(layerConfig, beforeLayerId);
    } else {
      map.addLayer(layerConfig);
    }
  } else {
    if (beforeLayerId && map.getLayer(beforeLayerId)) {
      map.moveLayer(ESTATE_BACKGROUND_LAYER_ID, beforeLayerId);
    }
  }

  refreshEstateBackgroundOverlay(map, rasterOpacity);
  map.once("idle", () => {
    refreshEstateBackgroundOverlay(map, rasterOpacity);
  });
  requestAnimationFrame(() => {
    refreshEstateBackgroundOverlay(map, rasterOpacity);
  });

  setLotFillOpacityForBackground(map, true);
  mapWithSyncState[ESTATE_BACKGROUND_SYNC_KEY] = syncKey;
};
