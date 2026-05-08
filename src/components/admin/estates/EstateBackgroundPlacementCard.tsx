import { AdminUploadField } from "@/components/admin/AdminUploadField";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Slider } from "@/components/ui/Slider";
import { adminApi } from "@/lib/api/adminApi";
import { normalizeEstateBackgroundOverlay } from "@/lib/map/estateBackgroundOverlay";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { EstateLotRecord } from "./EstateLotsCrud";

type EstateBackgroundPlacementValue = {
  backgroundImageUrl?: string | null;
  backgroundImageNorth?: number | null;
  backgroundImageSouth?: number | null;
  backgroundImageEast?: number | null;
  backgroundImageWest?: number | null;
};

type EstateBackgroundPlacementCardProps = {
  estateId: string;
  initialValue?: EstateBackgroundPlacementValue | null;
  onUpdated?: (value: EstateBackgroundPlacementValue) => Promise<void> | void;
};

type DraftState = {
  imageUrl: string;
  topLeftLng: string;
  topLeftLat: string;
  bottomRightLng: string;
  bottomRightLat: string;
};

type BoundsDraftState = Pick<
  DraftState,
  "topLeftLng" | "topLeftLat" | "bottomRightLng" | "bottomRightLat"
>;

type PickMode = "topLeft" | "bottomRight" | null;

type OverlayDragState = {
  startLng: number;
  startLat: number;
  west: number;
  north: number;
  east: number;
  south: number;
};

type OverlayDragEvent = mapboxgl.MapMouseEvent | mapboxgl.MapTouchEvent;

type PreviewCanvasOverlay = {
  imageUrl: string;
  canvas: HTMLCanvasElement;
};

const PREVIEW_BACKGROUND_SOURCE_ID = "admin-estate-background-preview-source";
const PREVIEW_BACKGROUND_LAYER_ID = "admin-estate-background-preview-layer";
const LOT_SOURCE_ID = "admin-estate-background-lots-source";
const LOT_FILL_LAYER_ID = "admin-estate-background-lots-fill";
const LOT_OUTLINE_LAYER_ID = "admin-estate-background-lots-outline";
const LOT_LABEL_LAYER_ID = "admin-estate-background-lots-labels";
const DEFAULT_COORDINATE_INCREMENT = "0.00001";
const OVERLAY_DRAG_REFRESH_MS = 100;

const formatCoordinate = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(6) : "";

const parseCoordinate = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatEditableCoordinate = (value: number) =>
  Number.isFinite(value) ? Number(value.toFixed(8)).toString() : "";

const getCoordinateInputStep = (value: string) => {
  const trimmed = value.trim();
  const parsed = Number(trimmed);
  return trimmed && Number.isFinite(parsed) && parsed > 0
    ? trimmed
    : DEFAULT_COORDINATE_INCREMENT;
};

const isLngLatInsideOverlay = (
  lngLat: mapboxgl.LngLat,
  overlay: NonNullable<ReturnType<typeof normalizeEstateBackgroundOverlay>>
) =>
  lngLat.lng >= overlay.west &&
  lngLat.lng <= overlay.east &&
  lngLat.lat >= overlay.south &&
  lngLat.lat <= overlay.north;

const toDraft = (
  value?: EstateBackgroundPlacementValue | null
): DraftState => ({
  imageUrl: value?.backgroundImageUrl?.trim() ?? "",
  topLeftLng: formatCoordinate(value?.backgroundImageWest),
  topLeftLat: formatCoordinate(value?.backgroundImageNorth),
  bottomRightLng: formatCoordinate(value?.backgroundImageEast),
  bottomRightLat: formatCoordinate(value?.backgroundImageSouth),
});

const getLotGeometry = (
  lot: EstateLotRecord
): GeoJSON.Polygon | GeoJSON.MultiPolygon | null => {
  const geometry = (lot.geometry ?? lot.geojson?.geometry) as
    | GeoJSON.Polygon
    | GeoJSON.MultiPolygon
    | undefined;

  if (!geometry || typeof geometry !== "object") {
    return null;
  }

  if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
    return geometry;
  }

  return null;
};

const buildLotsFeatureCollection = (
  lots: EstateLotRecord[]
): GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon> => ({
  type: "FeatureCollection",
  features: lots.reduce<
    GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[]
  >((acc, lot) => {
      const geometry = getLotGeometry(lot);
      if (!geometry) {
        return acc;
      }

      acc.push({
        type: "Feature" as const,
        geometry,
        properties: {
          id: lot.id?.toString() ?? "",
          lotLabel:
            lot.blockNumber != null
              ? String(lot.blockNumber)
              : lot.blockKey?.toString() ?? lot.id?.toString() ?? "",
        },
      });

      return acc;
    }, []),
});

const refreshLotPreviewLayers = (map: mapboxgl.Map) => {
  if (map.getLayer(LOT_OUTLINE_LAYER_ID)) {
    map.setPaintProperty(LOT_OUTLINE_LAYER_ID, "line-opacity", 0.879);
    map.setPaintProperty(LOT_OUTLINE_LAYER_ID, "line-opacity", 0.88);
  }

  if (map.getLayer(LOT_FILL_LAYER_ID)) {
    map.setPaintProperty(LOT_FILL_LAYER_ID, "fill-opacity", 0.119);
    map.setPaintProperty(LOT_FILL_LAYER_ID, "fill-opacity", 0.12);
  }

  map.triggerRepaint();
};

const syncLotPreviewData = (
  map: mapboxgl.Map,
  lotsGeoJson: GeoJSON.FeatureCollection<
    GeoJSON.Polygon | GeoJSON.MultiPolygon
  >
) => {
  const source = map.getSource(LOT_SOURCE_ID) as
    | mapboxgl.GeoJSONSource
    | undefined;

  if (!source) {
    return false;
  }

  source.setData(lotsGeoJson);
  refreshLotPreviewLayers(map);
  return true;
};

const removePreviewCanvasOverlay = (map: mapboxgl.Map) => {
  if (map.getLayer(PREVIEW_BACKGROUND_LAYER_ID)) {
    map.removeLayer(PREVIEW_BACKGROUND_LAYER_ID);
  }

  if (map.getSource(PREVIEW_BACKGROUND_SOURCE_ID)) {
    map.removeSource(PREVIEW_BACKGROUND_SOURCE_ID);
  }

  map.triggerRepaint();
};

const refreshPreviewCanvasOverlay = (
  map: mapboxgl.Map,
  rasterOpacity: number
) => {
  if (!map.getLayer(PREVIEW_BACKGROUND_LAYER_ID)) {
    return;
  }

  const refreshOpacity =
    rasterOpacity > 0.0001 ? rasterOpacity - 0.0001 : rasterOpacity + 0.0001;

  map.setPaintProperty(
    PREVIEW_BACKGROUND_LAYER_ID,
    "raster-opacity",
    refreshOpacity
  );
  map.setPaintProperty(
    PREVIEW_BACKGROUND_LAYER_ID,
    "raster-opacity",
    rasterOpacity
  );
  map.triggerRepaint();
};

const syncPreviewCanvasOverlay = ({
  map,
  overlay,
  canvasOverlay,
  beforeLayerId,
  opacity,
}: {
  map: mapboxgl.Map;
  overlay: NonNullable<ReturnType<typeof normalizeEstateBackgroundOverlay>> | null;
  canvasOverlay: PreviewCanvasOverlay | null;
  beforeLayerId: string;
  opacity: number;
}) => {
  if (!map.isStyleLoaded()) {
    return false;
  }

  if (!overlay) {
    removePreviewCanvasOverlay(map);
    return true;
  }

  if (!canvasOverlay || canvasOverlay.imageUrl !== overlay.imageUrl) {
    return false;
  }

  const rasterOpacity = Math.min(Math.max(opacity, 0), 1);
  const existingSource = map.getSource(PREVIEW_BACKGROUND_SOURCE_ID) as
    | mapboxgl.CanvasSource
    | undefined;

  if (existingSource?.getCanvas() !== canvasOverlay.canvas) {
    removePreviewCanvasOverlay(map);
    const canvasSourceConfig = {
      type: "canvas",
      canvas: canvasOverlay.canvas,
      coordinates: overlay.coordinates,
      animate: false,
    } as unknown as mapboxgl.AnySourceData;

    map.addSource(PREVIEW_BACKGROUND_SOURCE_ID, canvasSourceConfig);
  } else {
    existingSource.setCoordinates(overlay.coordinates);
  }

  if (!map.getLayer(PREVIEW_BACKGROUND_LAYER_ID)) {
    const layerConfig = {
      id: PREVIEW_BACKGROUND_LAYER_ID,
      type: "raster" as const,
      source: PREVIEW_BACKGROUND_SOURCE_ID,
      paint: {
        "raster-opacity": rasterOpacity,
        "raster-resampling": "linear" as const,
      },
    };

    if (beforeLayerId && map.getLayer(beforeLayerId)) {
      map.addLayer(layerConfig, beforeLayerId);
    } else {
      map.addLayer(layerConfig);
    }
  } else if (beforeLayerId && map.getLayer(beforeLayerId)) {
    map.moveLayer(PREVIEW_BACKGROUND_LAYER_ID, beforeLayerId);
  }

  const source = map.getSource(PREVIEW_BACKGROUND_SOURCE_ID) as
    | mapboxgl.CanvasSource
    | undefined;
  source?.play();
  requestAnimationFrame(() => {
    if (source && map.getSource(PREVIEW_BACKGROUND_SOURCE_ID) === source) {
      source.pause();
    }
    refreshPreviewCanvasOverlay(map, rasterOpacity);
  });
  refreshPreviewCanvasOverlay(map, rasterOpacity);

  return true;
};

const createMarkerElement = (label: string, color: string) => {
  const element = document.createElement("div");
  element.style.display = "flex";
  element.style.alignItems = "center";
  element.style.justifyContent = "center";
  element.style.width = "34px";
  element.style.height = "34px";
  element.style.borderRadius = "9999px";
  element.style.border = "2px solid white";
  element.style.background = color;
  element.style.boxShadow = "0 6px 16px rgba(15, 23, 42, 0.25)";
  element.style.color = "white";
  element.style.fontSize = "11px";
  element.style.fontWeight = "700";
  element.style.cursor = "grab";
  element.textContent = label;
  return element;
};

export const EstateBackgroundPlacementCard = ({
  estateId,
  initialValue,
  onUpdated,
}: EstateBackgroundPlacementCardProps) => {
  const [draft, setDraft] = useState<DraftState>(() => toDraft(initialValue));
  const [pickMode, setPickMode] = useState<PickMode>(null);
  const [mapReady, setMapReady] = useState(false);
  const [lots, setLots] = useState<EstateLotRecord[]>([]);
  const [loadingLots, setLoadingLots] = useState(true);
  const [lotsError, setLotsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [previewOpacity, setPreviewOpacity] = useState(90);
  const [previewCanvasOverlay, setPreviewCanvasOverlay] =
    useState<PreviewCanvasOverlay | null>(null);
  const [coordinateIncrement, setCoordinateIncrement] = useState(
    DEFAULT_COORDINATE_INCREMENT
  );

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const topLeftMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const bottomRightMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const initialFitDoneRef = useRef(false);
  const pickModeRef = useRef<PickMode>(null);
  const overlayDragRef = useRef<OverlayDragState | null>(null);
  const overlayDragLastRenderAtRef = useRef(0);
  const overlayDragPendingDraftRef = useRef<BoundsDraftState | null>(null);
  const overlayDragTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(
    null
  );
  const normalizedPreviewOverlayRef = useRef<
    NonNullable<ReturnType<typeof normalizeEstateBackgroundOverlay>> | null
  >(null);

  useEffect(() => {
    setDraft(toDraft(initialValue));
  }, [initialValue]);

  useEffect(() => {
    pickModeRef.current = pickMode;
  }, [pickMode]);

  const lotsGeoJson = useMemo(() => buildLotsFeatureCollection(lots), [lots]);
  const previewOverlayInput = useMemo(
    () => ({
      backgroundImageUrl: draft.imageUrl,
      backgroundImageNorth: draft.topLeftLat,
      backgroundImageSouth: draft.bottomRightLat,
      backgroundImageEast: draft.bottomRightLng,
      backgroundImageWest: draft.topLeftLng,
    }),
    [
      draft.bottomRightLat,
      draft.bottomRightLng,
      draft.imageUrl,
      draft.topLeftLat,
      draft.topLeftLng,
    ]
  );
  const normalizedPreviewOverlay = useMemo(
    () => normalizeEstateBackgroundOverlay(previewOverlayInput),
    [previewOverlayInput]
  );
  const coordinateInputStep = useMemo(
    () => getCoordinateInputStep(coordinateIncrement),
    [coordinateIncrement]
  );

  useEffect(() => {
    normalizedPreviewOverlayRef.current = normalizedPreviewOverlay;
  }, [normalizedPreviewOverlay]);

  useEffect(() => {
    if (!normalizedPreviewOverlay?.imageUrl) {
      setPreviewCanvasOverlay(null);
      return;
    }

    let isActive = true;
    const image = new Image();
    image.crossOrigin = "anonymous";
    const handleImageReady = () => {
      if (!isActive) {
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;

      const context = canvas.getContext("2d");
      if (!context || canvas.width === 0 || canvas.height === 0) {
        return;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      setPreviewCanvasOverlay({
        imageUrl: normalizedPreviewOverlay.imageUrl,
        canvas,
      });
    };

    image.onload = handleImageReady;
    image.onerror = () => {
      if (isActive) {
        setPreviewCanvasOverlay(null);
      }
    };
    image.src = normalizedPreviewOverlay.imageUrl;

    if (image.complete) {
      handleImageReady();
    }

    return () => {
      isActive = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [normalizedPreviewOverlay?.imageUrl]);

  const hasCompleteBounds =
    parseCoordinate(draft.topLeftLng) !== null &&
    parseCoordinate(draft.topLeftLat) !== null &&
    parseCoordinate(draft.bottomRightLng) !== null &&
    parseCoordinate(draft.bottomRightLat) !== null;

  const fitMapToContent = useCallback(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const bounds = new mapboxgl.LngLatBounds();
    let hasBounds = false;

    for (const feature of lotsGeoJson.features) {
      const geometry = feature.geometry;
      const coordinateSets =
        geometry.type === "Polygon"
          ? geometry.coordinates
          : geometry.coordinates.flat();

      for (const ring of coordinateSets) {
        for (const coordinate of ring) {
          bounds.extend(coordinate as [number, number]);
          hasBounds = true;
        }
      }
    }

    const topLeftLng = parseCoordinate(draft.topLeftLng);
    const topLeftLat = parseCoordinate(draft.topLeftLat);
    const bottomRightLng = parseCoordinate(draft.bottomRightLng);
    const bottomRightLat = parseCoordinate(draft.bottomRightLat);

    if (
      topLeftLng !== null &&
      topLeftLat !== null &&
      bottomRightLng !== null &&
      bottomRightLat !== null
    ) {
      bounds.extend([topLeftLng, topLeftLat]);
      bounds.extend([bottomRightLng, bottomRightLat]);
      hasBounds = true;
    }

    if (!hasBounds) {
      map.jumpTo({ center: [151.2093, -33.8688], zoom: 12 });
      return;
    }

    map.fitBounds(bounds, {
      padding: 40,
      duration: 0,
      maxZoom: 18,
    });
  }, [
    draft.bottomRightLat,
    draft.bottomRightLng,
    draft.topLeftLat,
    draft.topLeftLng,
    lotsGeoJson.features,
  ]);

  useEffect(() => {
    let isMounted = true;

    const loadLots = async () => {
      setLoadingLots(true);
      setLotsError(null);

      try {
        const data = await adminApi.getLots<EstateLotRecord>({ estateId });
        if (!isMounted) {
          return;
        }
        setLots(data);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setLots([]);
        setLotsError(
          error instanceof Error ? error.message : "Failed to load lots."
        );
      } finally {
        if (isMounted) {
          setLoadingLots(false);
        }
      }
    };

    void loadLots();

    return () => {
      isMounted = false;
    };
  }, [estateId]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [151.2093, -33.8688],
      zoom: 12,
      attributionControl: false,
    });

    mapRef.current = map;

    const setDefaultCursor = () => {
      map.getCanvas().style.cursor = pickModeRef.current ? "crosshair" : "";
    };

    const isMultiTouch = (event: OverlayDragEvent) =>
      "points" in event && event.points.length > 1;

    const isShiftDragEvent = (event: OverlayDragEvent) =>
      event.originalEvent.shiftKey;

    const applyOverlayDragDraft = (nextBounds: BoundsDraftState) => {
      overlayDragPendingDraftRef.current = null;
      setDraft((prev) => ({
        ...prev,
        ...nextBounds,
      }));
    };

    const clearOverlayDragTimer = () => {
      if (!overlayDragTimerRef.current) {
        return;
      }

      window.clearTimeout(overlayDragTimerRef.current);
      overlayDragTimerRef.current = null;
    };

    const flushOverlayDragDraft = () => {
      clearOverlayDragTimer();
      const pendingDraft = overlayDragPendingDraftRef.current;
      if (!pendingDraft) {
        return;
      }

      overlayDragLastRenderAtRef.current = window.performance.now();
      applyOverlayDragDraft(pendingDraft);
    };

    const scheduleOverlayDragDraft = (nextBounds: BoundsDraftState) => {
      const now = window.performance.now();
      const elapsed = now - overlayDragLastRenderAtRef.current;

      if (elapsed >= OVERLAY_DRAG_REFRESH_MS) {
        clearOverlayDragTimer();
        overlayDragLastRenderAtRef.current = now;
        applyOverlayDragDraft(nextBounds);
        return;
      }

      overlayDragPendingDraftRef.current = nextBounds;
      if (overlayDragTimerRef.current) {
        return;
      }

      overlayDragTimerRef.current = window.setTimeout(() => {
        overlayDragTimerRef.current = null;
        flushOverlayDragDraft();
      }, OVERLAY_DRAG_REFRESH_MS - elapsed);
    };

    const finishOverlayDrag = () => {
      if (!overlayDragRef.current) {
        return;
      }

      flushOverlayDragDraft();
      overlayDragRef.current = null;
      map.dragPan.enable();
      setDefaultCursor();
    };

    const startOverlayDrag = (event: OverlayDragEvent) => {
      const overlay = normalizedPreviewOverlayRef.current;

      if (
        !overlay ||
        pickModeRef.current ||
        !isShiftDragEvent(event) ||
        isMultiTouch(event) ||
        !isLngLatInsideOverlay(event.lngLat, overlay)
      ) {
        return;
      }

      event.preventDefault();
      event.originalEvent.preventDefault();
      event.originalEvent.stopPropagation();

      map.dragPan.disable();
      overlayDragRef.current = {
        startLng: event.lngLat.lng,
        startLat: event.lngLat.lat,
        west: overlay.west,
        north: overlay.north,
        east: overlay.east,
        south: overlay.south,
      };
      overlayDragLastRenderAtRef.current = 0;
      overlayDragPendingDraftRef.current = null;
      clearOverlayDragTimer();
      map.getCanvas().style.cursor = "grabbing";
      setSaveError(null);
      setSaveSuccess(null);
    };

    const moveOverlayDrag = (event: OverlayDragEvent) => {
      const dragState = overlayDragRef.current;

      if (!dragState) {
        const overlay = normalizedPreviewOverlayRef.current;
        map.getCanvas().style.cursor =
          !pickModeRef.current &&
          isShiftDragEvent(event) &&
          overlay &&
          isLngLatInsideOverlay(event.lngLat, overlay)
            ? "grab"
            : pickModeRef.current
            ? "crosshair"
            : "";
        return;
      }

      if (!isShiftDragEvent(event)) {
        finishOverlayDrag();
        return;
      }

      event.preventDefault();
      event.originalEvent.preventDefault();
      event.originalEvent.stopPropagation();

      const deltaLng = event.lngLat.lng - dragState.startLng;
      const deltaLat = event.lngLat.lat - dragState.startLat;

      scheduleOverlayDragDraft({
        topLeftLng: formatEditableCoordinate(dragState.west + deltaLng),
        topLeftLat: formatEditableCoordinate(dragState.north + deltaLat),
        bottomRightLng: formatEditableCoordinate(dragState.east + deltaLng),
        bottomRightLat: formatEditableCoordinate(dragState.south + deltaLat),
      });
    };

    map.on("load", () => {
      map.addSource(LOT_SOURCE_ID, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: LOT_FILL_LAYER_ID,
        type: "fill",
        source: LOT_SOURCE_ID,
        paint: {
          "fill-color": "#2563eb",
          "fill-opacity": 0.12,
        },
      });

      map.addLayer({
        id: LOT_OUTLINE_LAYER_ID,
        type: "line",
        source: LOT_SOURCE_ID,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#1e3a8a",
          "line-width": 1.8,
          "line-opacity": 0.88,
        },
      });

      map.addLayer({
        id: LOT_LABEL_LAYER_ID,
        type: "symbol",
        source: LOT_SOURCE_ID,
        layout: {
          "text-field": ["get", "lotLabel"],
          "text-font": ["Open Sans Bold"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#0f172a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.25,
        },
      });

      map.on("click", (event) => {
        if (!pickModeRef.current) {
          return;
        }

        const lng = event.lngLat.lng.toFixed(6);
        const lat = event.lngLat.lat.toFixed(6);

        if (pickModeRef.current === "topLeft") {
          setDraft((prev) => ({
            ...prev,
            topLeftLng: lng,
            topLeftLat: lat,
          }));
        } else {
          setDraft((prev) => ({
            ...prev,
            bottomRightLng: lng,
            bottomRightLat: lat,
          }));
        }

        setPickMode(null);
      });

      map.on("mousedown", startOverlayDrag);
      map.on("touchstart", startOverlayDrag);
      map.on("mousemove", moveOverlayDrag);
      map.on("touchmove", moveOverlayDrag);
      map.on("mouseup", finishOverlayDrag);
      map.on("touchend", finishOverlayDrag);
      map.on("mouseleave", finishOverlayDrag);
      window.addEventListener("mouseup", finishOverlayDrag);
      window.addEventListener("touchend", finishOverlayDrag);
      refreshLotPreviewLayers(map);
      setMapReady(true);
    });

    return () => {
      setMapReady(false);
      window.removeEventListener("mouseup", finishOverlayDrag);
      window.removeEventListener("touchend", finishOverlayDrag);
      clearOverlayDragTimer();
      topLeftMarkerRef.current?.remove();
      bottomRightMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    const syncLots = () => {
      if (!map.isStyleLoaded() || !syncLotPreviewData(map, lotsGeoJson)) {
        return;
      }

      if (
        !initialFitDoneRef.current &&
        (lotsGeoJson.features.length > 0 || hasCompleteBounds)
      ) {
        fitMapToContent();
        initialFitDoneRef.current = true;
      }
    };

    if (map.isStyleLoaded() && map.getSource(LOT_SOURCE_ID)) {
      syncLots();
      return;
    }

    map.once("idle", syncLots);
    map.once("styledata", syncLots);
    map.once("sourcedata", syncLots);

    return () => {
      map.off("idle", syncLots);
      map.off("styledata", syncLots);
      map.off("sourcedata", syncLots);
    };
  }, [fitMapToContent, hasCompleteBounds, lotsGeoJson, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    const syncPreviewOverlay = () => {
      if (
        !syncPreviewCanvasOverlay({
          map,
          overlay: normalizedPreviewOverlay,
          canvasOverlay: previewCanvasOverlay,
          beforeLayerId: LOT_FILL_LAYER_ID,
          opacity: previewOpacity / 100,
        })
      ) {
        return;
      }
    };

    if (map.isStyleLoaded()) {
      syncPreviewOverlay();
      return;
    }

    map.once("idle", syncPreviewOverlay);
    map.once("styledata", syncPreviewOverlay);

    return () => {
      map.off("idle", syncPreviewOverlay);
      map.off("styledata", syncPreviewOverlay);
    };
  }, [mapReady, normalizedPreviewOverlay, previewCanvasOverlay, previewOpacity]);

  useEffect(() => {
    if (!mapReady || hasCompleteBounds) {
      return;
    }

    if (lotsGeoJson.features.length === 0) {
      return;
    }

    fitMapToContent();
  }, [fitMapToContent, hasCompleteBounds, lotsGeoJson.features.length, mapReady]);

  useEffect(() => {
    if (!mapReady || !normalizedPreviewOverlay || overlayDragRef.current) {
      return;
    }

    fitMapToContent();
  }, [fitMapToContent, mapReady, normalizedPreviewOverlay]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const topLeftLng = parseCoordinate(draft.topLeftLng);
    const topLeftLat = parseCoordinate(draft.topLeftLat);
    const bottomRightLng = parseCoordinate(draft.bottomRightLng);
    const bottomRightLat = parseCoordinate(draft.bottomRightLat);

    if (topLeftLng !== null && topLeftLat !== null) {
      if (!topLeftMarkerRef.current) {
        topLeftMarkerRef.current = new mapboxgl.Marker({
          element: createMarkerElement("TL", "#2563eb"),
          draggable: true,
        })
          .setLngLat([topLeftLng, topLeftLat])
          .addTo(map);

        topLeftMarkerRef.current.on("dragend", () => {
          const lngLat = topLeftMarkerRef.current?.getLngLat();
          if (!lngLat) {
            return;
          }
          setDraft((prev) => ({
            ...prev,
            topLeftLng: lngLat.lng.toFixed(6),
            topLeftLat: lngLat.lat.toFixed(6),
          }));
        });
      } else {
        topLeftMarkerRef.current.setLngLat([topLeftLng, topLeftLat]);
      }
    } else {
      topLeftMarkerRef.current?.remove();
      topLeftMarkerRef.current = null;
    }

    if (bottomRightLng !== null && bottomRightLat !== null) {
      if (!bottomRightMarkerRef.current) {
        bottomRightMarkerRef.current = new mapboxgl.Marker({
          element: createMarkerElement("BR", "#ea580c"),
          draggable: true,
        })
          .setLngLat([bottomRightLng, bottomRightLat])
          .addTo(map);

        bottomRightMarkerRef.current.on("dragend", () => {
          const lngLat = bottomRightMarkerRef.current?.getLngLat();
          if (!lngLat) {
            return;
          }
          setDraft((prev) => ({
            ...prev,
            bottomRightLng: lngLat.lng.toFixed(6),
            bottomRightLat: lngLat.lat.toFixed(6),
          }));
        });
      } else {
        bottomRightMarkerRef.current.setLngLat([bottomRightLng, bottomRightLat]);
      }
    } else {
      bottomRightMarkerRef.current?.remove();
      bottomRightMarkerRef.current = null;
    }
  }, [
    draft.bottomRightLat,
    draft.bottomRightLng,
    draft.topLeftLat,
    draft.topLeftLng,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    map.getCanvas().style.cursor = pickMode ? "crosshair" : "";
  }, [pickMode]);

  const handleDraftChange = (
    field: keyof DraftState,
    value: string
  ) => {
    setSaveError(null);
    setSaveSuccess(null);
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleClearPlacement = () => {
    setSaveError(null);
    setSaveSuccess(null);
    setPickMode(null);
    overlayDragRef.current = null;
    overlayDragPendingDraftRef.current = null;
    if (overlayDragTimerRef.current) {
      window.clearTimeout(overlayDragTimerRef.current);
      overlayDragTimerRef.current = null;
    }
    mapRef.current?.dragPan.enable();
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = "";
    }
    setDraft((prev) => ({
      ...prev,
      topLeftLng: "",
      topLeftLat: "",
      bottomRightLng: "",
      bottomRightLat: "",
    }));
    requestAnimationFrame(() => {
      fitMapToContent();
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const imageUrl = draft.imageUrl.trim();
      const payload = imageUrl
        ? {
            backgroundImageUrl: imageUrl,
            backgroundImageNorth: parseCoordinate(draft.topLeftLat),
            backgroundImageWest: parseCoordinate(draft.topLeftLng),
            backgroundImageSouth: parseCoordinate(draft.bottomRightLat),
            backgroundImageEast: parseCoordinate(draft.bottomRightLng),
          }
        : {
            backgroundImageUrl: null,
            backgroundImageNorth: null,
            backgroundImageWest: null,
            backgroundImageSouth: null,
            backgroundImageEast: null,
          };

      const updated = await adminApi.updateEstate<EstateBackgroundPlacementValue>(
        estateId,
        payload
      );
      setSaveSuccess("Background overlay updated.");
      await onUpdated?.(updated);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to save background."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Estate Background Overlay</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a transparent PNG and place it using top-left and bottom-right
            coordinates. This editor is only available in admin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={pickMode === "topLeft" ? "primary" : "outline"}
            className="h-9 text-xs"
            label={pickMode === "topLeft" ? "Click map for top-left" : "Pick top-left"}
            onClick={() =>
              setPickMode((current) => (current === "topLeft" ? null : "topLeft"))
            }
          />
          <Button
            type="button"
            variant={pickMode === "bottomRight" ? "primary" : "outline"}
            className="h-9 text-xs"
            label={
              pickMode === "bottomRight"
                ? "Click map for bottom-right"
                : "Pick bottom-right"
            }
            onClick={() =>
              setPickMode((current) =>
                current === "bottomRight" ? null : "bottomRight"
              )
            }
          />
          <Button
            type="button"
            variant="ghost"
            className="h-9 text-xs"
            label="Clear bounds"
            onClick={handleClearPlacement}
          />
          <Button
            type="button"
            variant="outline"
            className="h-9 text-xs"
            label="Fit preview"
            onClick={fitMapToContent}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="grid gap-4">
          <AdminUploadField
            label="Background image (PNG)"
            value={draft.imageUrl}
            onChange={(value) => handleDraftChange("imageUrl", value)}
            placeholder="https://cdn.example.com/estate-background.png"
            folder="estate-backgrounds"
            accept="image/png"
            helperText="Transparent PNG only. The live map will ignore the overlay until both corners are set."
          />

          <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Preview opacity</span>
              <span className="text-xs font-medium text-muted-foreground">
                {previewOpacity}%
              </span>
            </div>
            <Slider
              value={[previewOpacity]}
              min={0}
              max={100}
              step={1}
              onValueChange={(value) => {
                setPreviewOpacity(value[0] ?? 90);
              }}
            />
            <p className="m-0 text-xs text-muted-foreground">
              Preview only. This does not change the live estate overlay.
            </p>
          </div>

          <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-2">
              <span className="text-sm font-medium">Nudge increment</span>
              <Input
                type="number"
                value={coordinateIncrement}
                min="0.000001"
                step="0.000001"
                onChange={(event) => setCoordinateIncrement(event.target.value)}
                placeholder={DEFAULT_COORDINATE_INCREMENT}
                className="w-full"
              />
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Top-left longitude</span>
              <Input
                type="number"
                value={draft.topLeftLng}
                step={coordinateInputStep}
                onChange={(event) =>
                  handleDraftChange("topLeftLng", event.target.value)
                }
                placeholder="151.203000"
                className="w-full"
              />
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Top-left latitude</span>
              <Input
                type="number"
                value={draft.topLeftLat}
                step={coordinateInputStep}
                onChange={(event) =>
                  handleDraftChange("topLeftLat", event.target.value)
                }
                placeholder="-33.870000"
                className="w-full"
              />
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Bottom-right longitude</span>
              <Input
                type="number"
                value={draft.bottomRightLng}
                step={coordinateInputStep}
                onChange={(event) =>
                  handleDraftChange("bottomRightLng", event.target.value)
                }
                placeholder="151.214000"
                className="w-full"
              />
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Bottom-right latitude</span>
              <Input
                type="number"
                value={draft.bottomRightLat}
                step={coordinateInputStep}
                onChange={(event) =>
                  handleDraftChange("bottomRightLat", event.target.value)
                }
                placeholder="-33.876000"
                className="w-full"
              />
            </div>
            <p className="m-0 text-xs text-muted-foreground">
              Use the map buttons to click the two corners, or type coordinates
              directly. The `TL` and `BR` markers can also be dragged once placed,
              and holding Shift while dragging the preview image moves all bounds
              together.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              disabled={saving}
              loading={saving}
              label="Save overlay"
              onClick={handleSave}
            />
            {saveError && (
              <span className="text-sm text-destructive">{saveError}</span>
            )}
            {saveSuccess && (
              <span className="text-sm text-emerald-600">{saveSuccess}</span>
            )}
          </div>
        </div>

        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-sm font-medium text-slate-900">
                Placement preview
              </span>
              <p className="m-0 text-xs text-muted-foreground">
                Lots are shown for alignment. The overlay renders behind them using
                the saved PNG and bounds.
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              {loadingLots
                ? "Loading lots..."
                : lotsError
                ? "Preview unavailable"
                : `${lotsGeoJson.features.length} lots loaded`}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-slate-200">
            <div ref={mapContainerRef} className="h-[520px] w-full bg-slate-50" />
          </div>

          {lotsError && (
            <p className="text-sm text-destructive">{lotsError}</p>
          )}
          {!lotsError && !loadingLots && lotsGeoJson.features.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No lots are available for this estate yet. You can still upload the
              PNG now, but the map preview will be more useful after lot import.
            </p>
          )}
          {!draft.imageUrl.trim() && (
            <p className="text-sm text-muted-foreground">
              Upload a PNG to preview the estate background.
            </p>
          )}
          {draft.imageUrl.trim() && !hasCompleteBounds && (
            <p className="text-sm text-amber-700">
              Add both corners to render the overlay on the preview and live map.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EstateBackgroundPlacementCard;
