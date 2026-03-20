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
  type CSSProperties,
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

type PickMode = "topLeft" | "bottomRight" | null;

const LOT_SOURCE_ID = "admin-estate-background-lots-source";
const LOT_FILL_LAYER_ID = "admin-estate-background-lots-fill";
const LOT_OUTLINE_LAYER_ID = "admin-estate-background-lots-outline";
const LOT_LABEL_LAYER_ID = "admin-estate-background-lots-labels";

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
  const [previewOverlayStyle, setPreviewOverlayStyle] =
    useState<CSSProperties>({
      display: "none",
    });

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const topLeftMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const bottomRightMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const initialFitDoneRef = useRef(false);
  const pickModeRef = useRef<PickMode>(null);

  useEffect(() => {
    setDraft(toDraft(initialValue));
  }, [initialValue]);

  useEffect(() => {
    pickModeRef.current = pickMode;
  }, [pickMode]);

  const lotsGeoJson = useMemo(() => buildLotsFeatureCollection(lots), [lots]);
  const normalizedPreviewOverlay = useMemo(
    () =>
      normalizeEstateBackgroundOverlay({
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

  const updatePreviewOverlayPosition = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !normalizedPreviewOverlay) {
      setPreviewOverlayStyle({ display: "none" });
      return;
    }

    const topLeft = map.project([
      normalizedPreviewOverlay.west,
      normalizedPreviewOverlay.north,
    ]);
    const bottomRight = map.project([
      normalizedPreviewOverlay.east,
      normalizedPreviewOverlay.south,
    ]);

    const left = Math.min(topLeft.x, bottomRight.x);
    const top = Math.min(topLeft.y, bottomRight.y);
    const width = Math.abs(bottomRight.x - topLeft.x);
    const height = Math.abs(bottomRight.y - topLeft.y);

    if (width < 1 || height < 1) {
      setPreviewOverlayStyle({ display: "none" });
      return;
    }

    setPreviewOverlayStyle({
      display: "block",
      position: "absolute",
      left,
      top,
      width,
      height,
      objectFit: "fill",
      pointerEvents: "none",
      opacity: previewOpacity / 100,
      userSelect: "none",
    });
  }, [mapReady, normalizedPreviewOverlay, previewOpacity]);

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

    map.on("load", () => {
      setMapReady(true);
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
    });

    return () => {
      setMapReady(false);
      topLeftMarkerRef.current?.remove();
      bottomRightMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map?.isStyleLoaded()) {
      return;
    }

    const source = map.getSource(LOT_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(lotsGeoJson);
    }

    if (
      !initialFitDoneRef.current &&
      (lotsGeoJson.features.length > 0 || hasCompleteBounds)
    ) {
      fitMapToContent();
      initialFitDoneRef.current = true;
    }
  }, [fitMapToContent, hasCompleteBounds, lotsGeoJson, mapReady]);

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
    if (!mapReady || !normalizedPreviewOverlay) {
      return;
    }

    fitMapToContent();
  }, [fitMapToContent, mapReady, normalizedPreviewOverlay]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      setPreviewOverlayStyle({ display: "none" });
      return;
    }

    const refresh = () => {
      updatePreviewOverlayPosition();
    };

    refresh();
    map.on("move", refresh);
    map.on("resize", refresh);

    return () => {
      map.off("move", refresh);
      map.off("resize", refresh);
    };
  }, [mapReady, updatePreviewOverlayPosition]);

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
              <span className="text-sm font-medium">Top-left longitude</span>
              <Input
                value={draft.topLeftLng}
                onChange={(event) =>
                  handleDraftChange("topLeftLng", event.target.value)
                }
                placeholder="151.203000"
              />
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Top-left latitude</span>
              <Input
                value={draft.topLeftLat}
                onChange={(event) =>
                  handleDraftChange("topLeftLat", event.target.value)
                }
                placeholder="-33.870000"
              />
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Bottom-right longitude</span>
              <Input
                value={draft.bottomRightLng}
                onChange={(event) =>
                  handleDraftChange("bottomRightLng", event.target.value)
                }
                placeholder="151.214000"
              />
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Bottom-right latitude</span>
              <Input
                value={draft.bottomRightLat}
                onChange={(event) =>
                  handleDraftChange("bottomRightLat", event.target.value)
                }
                placeholder="-33.876000"
              />
            </div>
            <p className="m-0 text-xs text-muted-foreground">
              Use the map buttons to click the two corners, or type coordinates
              directly. The `TL` and `BR` markers can also be dragged once placed.
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
            {normalizedPreviewOverlay?.imageUrl && (
              <img
                src={normalizedPreviewOverlay.imageUrl}
                alt="Estate background overlay preview"
                draggable={false}
                style={previewOverlayStyle}
                className="select-none"
              />
            )}
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
