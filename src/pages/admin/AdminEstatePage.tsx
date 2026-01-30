import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminUploadField } from "@/components/admin/AdminUploadField";
import { adminApi, type CreateLotInput } from "@/lib/api/adminApi";
import { adminAuth } from "@/lib/auth/adminAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type AdminEstate = {
  id: string;
  name?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  themeColor?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
};

type AdminLot = {
  id?: string | number;
  blockKey?: string | null;
  blockNumber?: number | null;
  sectionNumber?: number | null;
  estateId?: string | null;
  address?: string | null;
  district?: string | null;
  division?: string | null;
  zoning?: string | null;
  areaSqm?: number | null;
  lifecycleStage?: string | null;
  lotNumber?: number | null;
  status?: string | null;
  overlays?: string[] | null;
  geojson?: Record<string, unknown> | null;
  [key: string]: unknown;
};

type EstateForm = {
  name: string;
  address: string;
  email: string;
  phone: string;
  logoUrl: string;
  themeColor: string;
};

type LotForm = {
  blockKey: string;
  blockNumber: string;
  sectionNumber: string;
  areaSqm: string;
  zoning: string;
  address: string;
  district: string;
  division: string;
  lifecycleStage: string;
  overlays: string;
  geojson: string;
  estateId: string;
  lotType: string;
  frontageType: string;
  planningId: string;
  maxHeight: string;
  maxSize: string;
  maxFSR: string;
  maxFSRUpper: string;
  maxStories: string;
  minArea: string;
  minDepth: string;
  frontYardSetback: string;
  sideYardMinSetback: string;
  rearYardMinSetback: string;
  exampleArea: string;
  exampleLotSize: string;
  apiZoning: string;
  apiMatches: string;
  frontageCoordinate: string;
  width: string;
  depth: string;
  s1: string;
  s2: string;
  s3: string;
  s4: string;
  zoningFrontSetback: string;
  zoningSideSetback: string;
  zoningRearSetback: string;
  highFall: boolean;
};

type DxfImportForm = {
  zoning: string;
  blockKeyPrefix: string;
  blockNumber: string;
  sectionNumber: string;
  address: string;
  district: string;
  division: string;
  lifecycleStage: string;
  layer: string;
  minArea: string;
  dropLargest: boolean;
  sourceSrid: string;
  targetSrid: string;
};

type DxfImportResult = {
  estateId?: string;
  created?: number;
  blockKeyPrefix?: string;
  sourceSrid?: number;
  targetSrid?: number;
  boundary?: { areaSqm?: number; layer?: string };
  lots?: Array<{ id?: string; blockKey?: string; areaSqm?: number }>;
};

const emptyForm: EstateForm = {
  name: "",
  address: "",
  email: "",
  phone: "",
  logoUrl: "",
  themeColor: "",
};

const createEmptyLotForm = (estateIdValue: string): LotForm => ({
  blockKey: "",
  blockNumber: "",
  sectionNumber: "",
  areaSqm: "",
  zoning: "",
  address: "",
  district: "",
  division: "",
  lifecycleStage: "",
  overlays: "",
  geojson: "",
  estateId: estateIdValue,
  lotType: "",
  frontageType: "",
  planningId: "",
  maxHeight: "",
  maxSize: "",
  maxFSR: "",
  maxFSRUpper: "",
  maxStories: "",
  minArea: "",
  minDepth: "",
  frontYardSetback: "",
  sideYardMinSetback: "",
  rearYardMinSetback: "",
  exampleArea: "",
  exampleLotSize: "",
  apiZoning: "",
  apiMatches: "",
  frontageCoordinate: "",
  width: "",
  depth: "",
  s1: "",
  s2: "",
  s3: "",
  s4: "",
  zoningFrontSetback: "",
  zoningSideSetback: "",
  zoningRearSetback: "",
  highFall: false,
});

const createDxfImportForm = (estateIdValue: string): DxfImportForm => ({
  zoning: "",
  blockKeyPrefix: estateIdValue ? `EST-${estateIdValue}-LOT-` : "EST-LOT-",
  blockNumber: "",
  sectionNumber: "",
  address: "",
  district: "",
  division: "",
  lifecycleStage: "",
  layer: "",
  minArea: "1",
  dropLargest: true,
  sourceSrid: "28355",
  targetSrid: "4326",
});

const getEstateName = (estate: AdminEstate | null): string => {
  if (!estate) {
    return "";
  }
  return typeof estate.name === "string" && estate.name.trim()
    ? estate.name
    : estate.id;
};

const normalizeOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeOptionalNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return parsed;
};

const resolveIdValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? trimmed : parsed;
};

const parseOverlays = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const parseGeojson = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { data: null, error: null };
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { data: null, error: "GeoJSON must be a JSON object." };
    }
    return { data: parsed as Record<string, unknown>, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Invalid JSON.",
    };
  }
};

const stringifyValue = (value: unknown) =>
  value === null || value === undefined ? "" : String(value);

const getGeojsonRecord = (
  value: unknown
): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const getGeojsonMetadata = (
  geojson: Record<string, unknown> | null
): Record<string, unknown> | null => {
  if (!geojson) {
    return null;
  }
  const metadata = geojson["lotMetadata"];
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  return metadata as Record<string, unknown>;
};

const getGeojsonProperties = (
  geojson: Record<string, unknown> | null
): Array<Record<string, unknown>> => {
  if (!geojson || !Array.isArray(geojson["properties"])) {
    return [];
  }
  return geojson["properties"] as Array<Record<string, unknown>>;
};

const getGeojsonSValue = (
  geojson: Record<string, unknown> | null,
  key: "s1" | "s2" | "s3" | "s4"
) => {
  const props = getGeojsonProperties(geojson);
  const match = props.find((item) => key in item);
  return match ? (match as Record<string, unknown>)[key] : undefined;
};

const stringifyJsonValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const parseLineString = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as {
      type?: string;
      coordinates?: unknown;
    };
    if (parsed?.type !== "LineString" || !Array.isArray(parsed.coordinates)) {
      return null;
    }
    const coords = parsed.coordinates as any[];
    if (
      coords.length < 2 ||
      !coords.every(
        (coord) =>
          Array.isArray(coord) &&
          coord.length >= 2 &&
          typeof coord[0] === "number" &&
          typeof coord[1] === "number"
      )
    ) {
      return null;
    }
    return coords.map((coord) => [coord[0], coord[1]] as [number, number]);
  } catch {
    return null;
  }
};

const extractPolygonRing = (
  geometry: Record<string, unknown>
): [number, number][] | null => {
  if (!geometry || typeof geometry !== "object") {
    return null;
  }
  const type = geometry["type"];
  if (type !== "Polygon") {
    return null;
  }
  const coordinates = geometry["coordinates"];
  if (!Array.isArray(coordinates)) {
    return null;
  }
  const ring = coordinates[0];
  if (!Array.isArray(ring) || ring.length < 3) {
    return null;
  }
  return ring
    .map((coord) =>
      Array.isArray(coord) && coord.length >= 2
        ? ([coord[0], coord[1]] as [number, number])
        : null
    )
    .filter(Boolean) as [number, number][];
};

const coordsEqual = (
  a: [number, number],
  b: [number, number],
  epsilon = 1e-6
) => Math.abs(a[0] - b[0]) < epsilon && Math.abs(a[1] - b[1]) < epsilon;

const isSameEdge = (
  edge: [[number, number], [number, number]],
  line: [number, number][]
) => {
  if (line.length < 2) {
    return false;
  }
  const [a, b] = edge;
  const [c, d] = line;
  return (
    (coordsEqual(a, c) && coordsEqual(b, d)) ||
    (coordsEqual(a, d) && coordsEqual(b, c))
  );
};

const isEdgeInLine = (
  edge: [[number, number], [number, number]],
  line: [number, number][] | null
) => {
  if (!line || line.length < 2) {
    return false;
  }
  for (let i = 0; i < line.length - 1; i += 1) {
    if (isSameEdge(edge, [line[i], line[i + 1]])) {
      return true;
    }
  }
  return false;
};

const extendFrontageLine = (
  current: [number, number][] | null,
  edge: [[number, number], [number, number]]
) => {
  if (!current || current.length < 2) {
    return [edge[0], edge[1]];
  }
  const first = current[0];
  const last = current[current.length - 1];
  const [start, end] = edge;

  if (coordsEqual(last, start)) {
    return [...current, end];
  }
  if (coordsEqual(last, end)) {
    return [...current, start];
  }
  if (coordsEqual(first, start)) {
    return [end, ...current];
  }
  if (coordsEqual(first, end)) {
    return [start, ...current];
  }

  return [edge[0], edge[1]];
};

const coerceBoolean = (value: unknown) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "no") {
      return false;
    }
  }
  return false;
};

const buildLotForm = (lot: AdminLot, estateIdValue: string): LotForm => {
  const geojsonRecord = getGeojsonRecord(lot.geojson);
  const metadata = getGeojsonMetadata(geojsonRecord);
  const readValue = (key: string) =>
    (lot as Record<string, unknown>)[key] ??
    metadata?.[key] ??
    geojsonRecord?.[key];
  const readMetadataOnly = (key: string) =>
    (lot as Record<string, unknown>)[key] ?? metadata?.[key];
  const zoningSetbacks = readValue("zoningSetbacks");
  const zoningSetbacksRecord =
    zoningSetbacks && typeof zoningSetbacks === "object" && !Array.isArray(zoningSetbacks)
      ? (zoningSetbacks as Record<string, unknown>)
      : null;

  return {
    blockKey: stringifyValue(
      lot.blockKey ?? (lot as { BLOCK_KEY?: string }).BLOCK_KEY
    ),
    blockNumber: stringifyValue(lot.blockNumber),
    sectionNumber: stringifyValue(lot.sectionNumber),
    areaSqm: stringifyValue(lot.areaSqm),
    zoning: stringifyValue(lot.zoning),
    address: stringifyValue(lot.address),
    district: stringifyValue(lot.district),
    division: stringifyValue(lot.division),
    lifecycleStage: stringifyValue(lot.lifecycleStage ?? lot.status),
    overlays: Array.isArray(lot.overlays) ? lot.overlays.join(", ") : "",
    geojson: lot.geojson ? JSON.stringify(lot.geojson, null, 2) : "",
    estateId: stringifyValue(extractLotEstateId(lot) ?? estateIdValue),
    lotType: stringifyValue(readMetadataOnly("type")),
    frontageType: stringifyValue(readValue("frontageType")),
    planningId: stringifyValue(readValue("planningId")),
    maxHeight: stringifyValue(readValue("maxHeight")),
    maxSize: stringifyValue(readValue("maxSize")),
    maxFSR: stringifyValue(readValue("maxFSR")),
    maxFSRUpper: stringifyValue(readValue("maxFSRUpper")),
    maxStories: stringifyValue(readValue("maxStories")),
    minArea: stringifyValue(readValue("minArea")),
    minDepth: stringifyValue(readValue("minDepth")),
    frontYardSetback: stringifyValue(readValue("frontYardSetback")),
    sideYardMinSetback: stringifyValue(readValue("sideYardMinSetback")),
    rearYardMinSetback: stringifyValue(readValue("rearYardMinSetback")),
    exampleArea: stringifyValue(readValue("exampleArea")),
    exampleLotSize: stringifyValue(readValue("exampleLotSize")),
    apiZoning: stringifyValue(readValue("apiZoning")),
    apiMatches: stringifyJsonValue(readValue("apiMatches")),
    frontageCoordinate: stringifyJsonValue(readValue("frontageCoordinate")),
    width: stringifyValue(readValue("width")),
    depth: stringifyValue(readValue("depth")),
    s1: stringifyValue(getGeojsonSValue(geojsonRecord, "s1")),
    s2: stringifyValue(getGeojsonSValue(geojsonRecord, "s2")),
    s3: stringifyValue(getGeojsonSValue(geojsonRecord, "s3")),
    s4: stringifyValue(getGeojsonSValue(geojsonRecord, "s4")),
    zoningFrontSetback: stringifyValue(zoningSetbacksRecord?.frontSetback),
    zoningSideSetback: stringifyValue(zoningSetbacksRecord?.sideSetback),
    zoningRearSetback: stringifyValue(zoningSetbacksRecord?.rearSetback),
    highFall: coerceBoolean(readValue("highFall")),
  };
};

const formatMetaValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return "--";
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return JSON.stringify(value);
};

const extractLotEstateId = (lot: AdminLot): string | undefined => {
  if (lot.estateId != null) {
    return String(lot.estateId);
  }
  const nestedEstateId = (lot as { estate?: { id?: string | number } }).estate
    ?.id;
  if (nestedEstateId != null) {
    return String(nestedEstateId);
  }
  const snakeId = (lot as { estate_id?: string | number }).estate_id;
  if (snakeId != null) {
    return String(snakeId);
  }
  return undefined;
};

const formatLotValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return "--";
  }
  if (typeof value === "number") {
    return value.toLocaleString();
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
};

const getLotAddress = (lot: AdminLot) => {
  const address =
    lot.address ??
    (lot as { ADDRESSES?: string | null }).ADDRESSES ??
    (lot as { addressLine?: string | null }).addressLine;
  return formatLotValue(address);
};

const getLotStage = (lot: AdminLot) =>
  formatLotValue(lot.lifecycleStage ?? lot.status ?? (lot as { stage?: string }).stage);

const getLotArea = (lot: AdminLot) =>
  formatLotValue(
    lot.areaSqm ??
      (lot as { area?: number | string }).area ??
      (lot as { BLOCK_DERIVED_AREA?: string }).BLOCK_DERIVED_AREA
  );

const getLotBlockKey = (lot: AdminLot) =>
  formatLotValue(lot.blockKey ?? (lot as { BLOCK_KEY?: string }).BLOCK_KEY);

const AdminEstatePage = () => {
  const { estateId } = useParams();
  const [estate, setEstate] = useState<AdminEstate | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [form, setForm] = useState<EstateForm>(emptyForm);
  const [initialForm, setInitialForm] = useState<EstateForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(
    null
  );

  const [lots, setLots] = useState<AdminLot[]>([]);
  const [lotsLoading, setLotsLoading] = useState(false);
  const [lotsErrorMessage, setLotsErrorMessage] = useState<string | null>(null);
  const [lotFilter, setLotFilter] = useState("");
  const [showLotForm, setShowLotForm] = useState(false);
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [lotForm, setLotForm] = useState<LotForm>(() =>
    createEmptyLotForm(estateId ?? "")
  );
  const [lotGeometry, setLotGeometry] = useState<Record<string, unknown> | null>(
    null
  );
  const [lotSaving, setLotSaving] = useState(false);
  const [lotDeleteId, setLotDeleteId] = useState<string | null>(null);
  const [lotFormError, setLotFormError] = useState<string | null>(null);
  const [lotFormSuccess, setLotFormSuccess] = useState<string | null>(null);
  const [showDxfImport, setShowDxfImport] = useState(false);
  const [dxfFile, setDxfFile] = useState<File | null>(null);
  const [dxfForm, setDxfForm] = useState<DxfImportForm>(() =>
    createDxfImportForm(estateId ?? "")
  );
  const [dxfImporting, setDxfImporting] = useState(false);
  const [dxfError, setDxfError] = useState<string | null>(null);
  const [dxfResult, setDxfResult] = useState<DxfImportResult | null>(null);
  const frontageLine = useMemo(
    () => parseLineString(lotForm.frontageCoordinate),
    [lotForm.frontageCoordinate]
  );
  const frontagePreview = useMemo(() => {
    if (!lotGeometry) {
      return { error: "Lot geometry not found.", ring: null };
    }
    const ring = extractPolygonRing(lotGeometry);
    if (!ring || ring.length < 3) {
      return { error: "Geometry polygon not found.", ring: null };
    }
    return { error: null, ring };
  }, [lotGeometry]);
  const frontageEdges = useMemo<{
    edges: [[number, number], [number, number]][];
    polygonPoints: string;
    toSvg: (coord: [number, number]) => { x: number; y: number };
    viewWidth: number;
    viewHeight: number;
  } | null>(() => {
    if (!frontagePreview.ring) {
      return null;
    }
    const ring = frontagePreview.ring;
    const normalized =
      ring.length > 3 && coordsEqual(ring[0], ring[ring.length - 1])
        ? ring.slice(0, -1)
        : ring;
    const edges = normalized.map((point, index) => {
      const next = normalized[(index + 1) % normalized.length];
      return [point, next] as [[number, number], [number, number]];
    });
    const lngs = normalized.map((point) => point[0]);
    const lats = normalized.map((point) => point[1]);
    const minX = Math.min(...lngs);
    const maxX = Math.max(...lngs);
    const minY = Math.min(...lats);
    const maxY = Math.max(...lats);
    const width = maxX - minX || 1;
    const height = maxY - minY || 1;
    const padding = 12;
    const viewWidth = 320;
    const viewHeight = 220;
    const scale = Math.min(
      (viewWidth - padding * 2) / width,
      (viewHeight - padding * 2) / height
    );
    const toSvg = ([lng, lat]: [number, number]) => ({
      x: padding + (lng - minX) * scale,
      y: padding + (maxY - lat) * scale,
    });
    const polygonPoints = normalized
      .map((coord) => {
        const point = toSvg(coord);
        return `${point.x},${point.y}`;
      })
      .join(" ");
    return {
      edges,
      polygonPoints,
      toSvg,
      viewWidth,
      viewHeight,
    };
  }, [frontagePreview.ring]);

  const applyEstate = useCallback((data: AdminEstate) => {
    setEstate(data);
    const nextForm: EstateForm = {
      name: data.name ?? "",
      address: data.address ?? "",
      email: data.email ?? "",
      phone: data.phone ?? "",
      logoUrl: data.logoUrl ?? "",
      themeColor: data.themeColor ?? "",
    };
    setForm(nextForm);
    setInitialForm(nextForm);
  }, []);

  const loadEstate = useCallback(async () => {
    if (!estateId) {
      setErrorMessage("Missing estate id.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminApi.getEstateById<AdminEstate>(estateId);
      applyEstate(data);
    } catch (error) {
      try {
        const estates = await adminApi.getEstates<AdminEstate>();
        const match = estates.find((item) => item.id === estateId) ?? null;
        if (!match) {
          throw new Error("Estate not found.");
        }
        applyEstate(match);
      } catch (fallbackError) {
        setEstate(null);
        setErrorMessage(
          fallbackError instanceof Error
            ? fallbackError.message
            : "Failed to load estate."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [applyEstate, estateId]);

  const loadLots = useCallback(async () => {
    if (!estateId) {
      return;
    }
    setLotsLoading(true);
    setLotsErrorMessage(null);
    try {
      const data = await adminApi.getLots<AdminLot>({ estateId });
      const hasEstateId = data.some(
        (lot) => extractLotEstateId(lot) !== undefined
      );
      const filtered = hasEstateId
        ? data.filter((lot) => extractLotEstateId(lot) === estateId)
        : data;
      setLots(filtered);
    } catch (error) {
      setLotsErrorMessage(
        error instanceof Error ? error.message : "Failed to load lots."
      );
    } finally {
      setLotsLoading(false);
    }
  }, [estateId]);

  useEffect(() => {
    loadEstate();
  }, [loadEstate]);

  useEffect(() => {
    loadLots();
  }, [loadLots]);

  useEffect(() => {
    if (editingLotId) {
      return;
    }
    if (showLotForm) {
      setLotForm(createEmptyLotForm(estateId ?? ""));
      setLotGeometry(null);
    }
  }, [editingLotId, estateId, showLotForm]);

  useEffect(() => {
    setDxfForm(createDxfImportForm(estateId ?? ""));
    setDxfFile(null);
    setDxfError(null);
    setDxfResult(null);
    setShowDxfImport(false);
  }, [estateId]);

  const openNewLotForm = useCallback(() => {
    setEditingLotId(null);
    setLotForm(createEmptyLotForm(estateId ?? ""));
    setLotGeometry(null);
    setLotFormError(null);
    setLotFormSuccess(null);
    setShowLotForm(true);
  }, [estateId]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!estateId) {
      return;
    }
    setSaving(true);
    setSaveErrorMessage(null);
    setSaveSuccessMessage(null);
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setSaveErrorMessage("Name is required.");
      setSaving(false);
      return;
    }
    const payload: Record<string, unknown> = {};
    if (trimmedName !== initialForm.name.trim()) {
      payload.name = trimmedName;
    }

    const currentAddress = normalizeOptional(form.address);
    const initialAddress = normalizeOptional(initialForm.address);
    if (currentAddress !== initialAddress) {
      payload.address = currentAddress;
    }

    const currentEmail = normalizeOptional(form.email);
    const initialEmail = normalizeOptional(initialForm.email);
    if (currentEmail !== initialEmail) {
      payload.email = currentEmail;
    }

    const currentPhone = normalizeOptional(form.phone);
    const initialPhone = normalizeOptional(initialForm.phone);
    if (currentPhone !== initialPhone) {
      payload.phone = currentPhone;
    }

    const currentLogoUrl = normalizeOptional(form.logoUrl);
    const initialLogoUrl = normalizeOptional(initialForm.logoUrl);
    if (currentLogoUrl !== initialLogoUrl) {
      payload.logoUrl = currentLogoUrl;
    }

    const currentThemeColor = normalizeOptional(form.themeColor);
    const initialThemeColor = normalizeOptional(initialForm.themeColor);
    if (currentThemeColor !== initialThemeColor) {
      payload.themeColor = currentThemeColor;
    }

    if (Object.keys(payload).length === 0) {
      setSaveSuccessMessage("No changes to save.");
      setSaving(false);
      return;
    }
    try {
      await adminApi.updateEstate(estateId, payload);
      await loadEstate();
      setSaveSuccessMessage("Estate updated.");
    } catch (error) {
      setSaveErrorMessage(
        error instanceof Error ? error.message : "Failed to update estate."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDxfFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setDxfFile(file);
    setDxfError(null);
    setDxfResult(null);
  };

  const openDxfImport = () => {
    setShowDxfImport(true);
    setDxfError(null);
    setDxfResult(null);
  };

  const closeDxfImport = () => {
    setShowDxfImport(false);
    setDxfError(null);
    setDxfResult(null);
  };

  const handleDxfImport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!estateId) {
      setDxfError("Missing estate id.");
      return;
    }
    if (!dxfFile) {
      setDxfError("Select a DXF file to import.");
      return;
    }
    setDxfImporting(true);
    setDxfError(null);
    setDxfResult(null);

    const formData = new FormData();
    formData.append("file", dxfFile);

    const blockNumberValue = normalizeOptionalNumber(dxfForm.blockNumber);
    if (blockNumberValue === undefined) {
      setDxfError("Block number must be a number.");
      setDxfImporting(false);
      return;
    }

    const sectionNumberValue = normalizeOptionalNumber(dxfForm.sectionNumber);
    if (sectionNumberValue === undefined) {
      setDxfError("Section number must be a number.");
      setDxfImporting(false);
      return;
    }

    const minAreaValue = normalizeOptionalNumber(dxfForm.minArea);
    if (minAreaValue === undefined) {
      setDxfError("Minimum area must be a number.");
      setDxfImporting(false);
      return;
    }

    const sourceSridValue = normalizeOptionalNumber(dxfForm.sourceSrid);
    if (sourceSridValue === undefined) {
      setDxfError("Source SRID must be a number.");
      setDxfImporting(false);
      return;
    }

    const targetSridValue = normalizeOptionalNumber(dxfForm.targetSrid);
    if (targetSridValue === undefined) {
      setDxfError("Target SRID must be a number.");
      setDxfImporting(false);
      return;
    }

    const addField = (key: string, value: string | number | null) => {
      if (value === null || value === undefined) {
        return;
      }
      const stringValue = typeof value === "string" ? value.trim() : String(value);
      if (!stringValue) {
        return;
      }
      formData.append(key, stringValue);
    };

    addField("zoning", dxfForm.zoning);
    addField("blockKeyPrefix", dxfForm.blockKeyPrefix);
    addField("blockNumber", blockNumberValue);
    addField("sectionNumber", sectionNumberValue);
    addField("address", dxfForm.address);
    addField("district", dxfForm.district);
    addField("division", dxfForm.division);
    addField("lifecycleStage", dxfForm.lifecycleStage);
    addField("layer", dxfForm.layer);
    addField("minArea", minAreaValue);
    addField("sourceSrid", sourceSridValue);
    addField("targetSrid", targetSridValue);
    formData.append("dropLargest", dxfForm.dropLargest ? "true" : "false");

    try {
      const result = await adminApi.importEstateLotsDxf<DxfImportResult>(
        estateId,
        formData
      );
      setDxfResult(result);
      await loadLots();
    } catch (error) {
      setDxfError(
        error instanceof Error ? error.message : "Failed to import DXF."
      );
    } finally {
      setDxfImporting(false);
    }
  };

  const closeLotForm = () => {
    setEditingLotId(null);
    setLotForm(createEmptyLotForm(estateId ?? ""));
    setLotGeometry(null);
    setLotFormError(null);
    setLotFormSuccess(null);
    setShowLotForm(false);
  };

  const handleEditLot = (lot: AdminLot) => {
    setEditingLotId(String(lot.id ?? ""));
    setLotForm(buildLotForm(lot, estateId ?? ""));
    setLotGeometry(
      ((lot as { geometry?: Record<string, unknown> }).geometry as
        | Record<string, unknown>
        | undefined) ?? null
    );
    setLotFormError(null);
    setLotFormSuccess(null);
    setShowLotForm(true);
  };

  const handleSaveLot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLotSaving(true);
    setLotFormError(null);
    setLotFormSuccess(null);

    const trimmedBlockKey = lotForm.blockKey.trim();
    if (!trimmedBlockKey) {
      setLotFormError("Block key is required.");
      setLotSaving(false);
      return;
    }

    const trimmedZoning = lotForm.zoning.trim();
    if (!trimmedZoning) {
      setLotFormError("Zoning is required.");
      setLotSaving(false);
      return;
    }

    const areaValue = normalizeOptionalNumber(lotForm.areaSqm);
    if (areaValue === undefined) {
      setLotFormError("Area (sqm) must be a number.");
      setLotSaving(false);
      return;
    }
    if (areaValue === null) {
      setLotFormError("Area (sqm) is required.");
      setLotSaving(false);
      return;
    }

    const estateIdValue = resolveIdValue(lotForm.estateId);
    if (estateIdValue === null) {
      setLotFormError("Estate ID is required.");
      setLotSaving(false);
      return;
    }

    const blockNumberValue = normalizeOptionalNumber(lotForm.blockNumber);
    if (blockNumberValue === undefined) {
      setLotFormError("Block number must be a number.");
      setLotSaving(false);
      return;
    }

    const sectionNumberValue = normalizeOptionalNumber(lotForm.sectionNumber);
    if (sectionNumberValue === undefined) {
      setLotFormError("Section number must be a number.");
      setLotSaving(false);
      return;
    }

    const geojsonValue = parseGeojson(lotForm.geojson);
    if (geojsonValue.error) {
      setLotFormError(geojsonValue.error);
      setLotSaving(false);
      return;
    }

    const parseOptionalNumberField = (value: string, label: string) => {
      const parsed = normalizeOptionalNumber(value);
      if (parsed === undefined) {
        setLotFormError(`${label} must be a number.`);
        return { ok: false, value: null as number | null };
      }
      return { ok: true, value: parsed };
    };

    const parseOptionalJsonField = (value: string, label: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return { ok: true, value: null as unknown };
      }
      try {
        return { ok: true, value: JSON.parse(trimmed) };
      } catch (error) {
        setLotFormError(
          error instanceof Error
            ? `${label} must be valid JSON. ${error.message}`
            : `${label} must be valid JSON.`
        );
        return { ok: false, value: null as unknown };
      }
    };

    const s1Result = parseOptionalNumberField(lotForm.s1, "S1");
    if (!s1Result.ok) {
      setLotSaving(false);
      return;
    }
    const s2Result = parseOptionalNumberField(lotForm.s2, "S2");
    if (!s2Result.ok) {
      setLotSaving(false);
      return;
    }
    const s3Result = parseOptionalNumberField(lotForm.s3, "S3");
    if (!s3Result.ok) {
      setLotSaving(false);
      return;
    }
    const s4Result = parseOptionalNumberField(lotForm.s4, "S4");
    if (!s4Result.ok) {
      setLotSaving(false);
      return;
    }
    const widthResult = parseOptionalNumberField(lotForm.width, "Width");
    if (!widthResult.ok) {
      setLotSaving(false);
      return;
    }
    const depthResult = parseOptionalNumberField(lotForm.depth, "Depth");
    if (!depthResult.ok) {
      setLotSaving(false);
      return;
    }
    const zoningFrontResult = parseOptionalNumberField(
      lotForm.zoningFrontSetback,
      "Zoning front setback"
    );
    if (!zoningFrontResult.ok) {
      setLotSaving(false);
      return;
    }
    const zoningSideResult = parseOptionalNumberField(
      lotForm.zoningSideSetback,
      "Zoning side setback"
    );
    if (!zoningSideResult.ok) {
      setLotSaving(false);
      return;
    }
    const zoningRearResult = parseOptionalNumberField(
      lotForm.zoningRearSetback,
      "Zoning rear setback"
    );
    if (!zoningRearResult.ok) {
      setLotSaving(false);
      return;
    }
    const apiMatchesResult = parseOptionalJsonField(
      lotForm.apiMatches,
      "API matches"
    );
    if (!apiMatchesResult.ok) {
      setLotSaving(false);
      return;
    }

    const hasZoningSetbacks =
      zoningFrontResult.value !== null ||
      zoningSideResult.value !== null ||
      zoningRearResult.value !== null;

    const lotMetadata = {
      type: normalizeOptional(lotForm.lotType),
      frontageType: normalizeOptional(lotForm.frontageType),
      planningId: normalizeOptional(lotForm.planningId),
      maxHeight: normalizeOptional(lotForm.maxHeight),
      maxSize: normalizeOptional(lotForm.maxSize),
      maxFSR: normalizeOptional(lotForm.maxFSR),
      maxFSRUpper: normalizeOptional(lotForm.maxFSRUpper),
      maxStories: normalizeOptional(lotForm.maxStories),
      minArea: normalizeOptional(lotForm.minArea),
      minDepth: normalizeOptional(lotForm.minDepth),
      frontYardSetback: normalizeOptional(lotForm.frontYardSetback),
      sideYardMinSetback: normalizeOptional(lotForm.sideYardMinSetback),
      rearYardMinSetback: normalizeOptional(lotForm.rearYardMinSetback),
      exampleArea: normalizeOptional(lotForm.exampleArea),
      exampleLotSize: normalizeOptional(lotForm.exampleLotSize),
      apiZoning: normalizeOptional(lotForm.apiZoning),
      apiMatches: apiMatchesResult.value,
      frontageCoordinate: normalizeOptional(lotForm.frontageCoordinate),
      highFall: lotForm.highFall,
      zoningSetbacks: hasZoningSetbacks
        ? {
            frontSetback: zoningFrontResult.value,
            sideSetback: zoningSideResult.value,
            rearSetback: zoningRearResult.value,
          }
        : null,
    };

    const hasMetadataValue = Object.entries(lotMetadata)
      .filter(([key]) => key !== "highFall")
      .some(([, value]) => value !== null && value !== undefined && value !== "");
    const sValues = [s1Result.value, s2Result.value, s3Result.value, s4Result.value];
    const hasSValues = sValues.some((value) => value !== null);
    const hasDimensions = widthResult.value !== null || depthResult.value !== null;
    const hasGeojsonExtras =
      hasMetadataValue || lotForm.highFall || hasSValues || hasDimensions;

    const payload: Record<string, unknown> = {
      blockKey: trimmedBlockKey,
      areaSqm: areaValue,
      zoning: trimmedZoning,
      estateId: estateIdValue,
      blockNumber: blockNumberValue,
      sectionNumber: sectionNumberValue,
      address: normalizeOptional(lotForm.address),
      district: normalizeOptional(lotForm.district),
      division: normalizeOptional(lotForm.division),
      lifecycleStage: normalizeOptional(lotForm.lifecycleStage),
      overlays: parseOverlays(lotForm.overlays),
    };

    if (geojsonValue.data === null) {
      if (hasGeojsonExtras) {
        setLotFormError(
          "GeoJSON is required to save lot metadata. Please add GeoJSON or clear the metadata fields."
        );
        setLotSaving(false);
        return;
      }
      if (editingLotId) {
        payload.geojson = null;
      }
    } else {
      const nextGeojson = {
        ...(geojsonValue.data as Record<string, unknown>),
      };

      if (widthResult.value !== null) {
        nextGeojson["width"] = widthResult.value;
      } else if ("width" in nextGeojson) {
        nextGeojson["width"] = null;
      }

      if (depthResult.value !== null) {
        nextGeojson["depth"] = depthResult.value;
      } else if ("depth" in nextGeojson) {
        nextGeojson["depth"] = null;
      }

      if (hasSValues) {
        const sProperties: Array<Record<string, number>> = [];
        if (s1Result.value !== null) sProperties.push({ s1: s1Result.value });
        if (s2Result.value !== null) sProperties.push({ s2: s2Result.value });
        if (s3Result.value !== null) sProperties.push({ s3: s3Result.value });
        if (s4Result.value !== null) sProperties.push({ s4: s4Result.value });
        nextGeojson["properties"] = sProperties;
      } else if ("properties" in nextGeojson) {
        nextGeojson["properties"] = [];
      }

      const existingMetadata = getGeojsonMetadata(nextGeojson);
      const nextMetadata = { ...(existingMetadata ?? {}), ...lotMetadata };
      const nextMetadataHasValues = Object.values(nextMetadata).some(
        (value) => value !== null && value !== undefined && value !== ""
      );
      if (nextMetadataHasValues) {
        nextGeojson["lotMetadata"] = nextMetadata;
      } else if (existingMetadata) {
        nextGeojson["lotMetadata"] = null;
      }

      payload.geojson = nextGeojson;
    }

    try {
      if (editingLotId) {
        await adminApi.updateLot(String(editingLotId), payload);
        setLotFormSuccess("Lot updated.");
      } else {
        await adminApi.createLot<AdminLot>(payload as CreateLotInput);
        setLotFormSuccess("Lot created.");
        openNewLotForm();
      }
      await loadLots();
    } catch (error) {
      setLotFormError(
        error instanceof Error ? error.message : "Failed to save lot."
      );
    } finally {
      setLotSaving(false);
    }
  };

  const handleDeleteLot = async (lotId: string | number) => {
    if (!lotId) {
      return;
    }
    const confirmed = window.confirm(
      "Delete this lot? This cannot be undone."
    );
    if (!confirmed) {
      return;
    }
    const deleteId = String(lotId);
    setLotDeleteId(deleteId);
    setLotFormError(null);
    setLotFormSuccess(null);
    try {
      await adminApi.deleteLot(deleteId);
      await loadLots();
      if (editingLotId === deleteId) {
        closeLotForm();
      }
      setLotFormSuccess("Lot deleted.");
    } catch (error) {
      setLotFormError(
        error instanceof Error ? error.message : "Failed to delete lot."
      );
    } finally {
      setLotDeleteId(null);
    }
  };

  const handleLogout = async () => {
    await adminAuth.logout();
  };

  const filteredLots = useMemo(() => {
    const needle = lotFilter.trim().toLowerCase();
    if (!needle) {
      return lots;
    }
    return lots.filter((lot) => {
      const address = [
        lot.address,
        (lot as { ADDRESSES?: string }).ADDRESSES,
        (lot as { addressLine?: string }).addressLine,
      ]
        .filter((value) => typeof value === "string" && value.trim())
        .join(" ")
        .toLowerCase();
      const haystacks = [
        String(lot.id ?? "").toLowerCase(),
        address,
        String(lot.zoning ?? "").toLowerCase(),
        String(lot.lifecycleStage ?? "").toLowerCase(),
        String(lot.blockKey ?? "").toLowerCase(),
      ];
      return haystacks.some((value) => value.includes(needle));
    });
  }, [lotFilter, lots]);

  const metaEntries = useMemo(() => {
    if (!estate) {
      return [];
    }
    return [
      { label: "Estate ID", value: estate.id },
      ...(estate.createdAt
        ? [{ label: "Created", value: estate.createdAt }]
        : []),
      ...(estate.updatedAt
        ? [{ label: "Updated", value: estate.updatedAt }]
        : []),
    ];
  }, [estate]);

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">
            <Link to="/admin/estates" className="hover:underline">
              Estates
            </Link>{" "}
            / {estateId ?? "unknown"}
          </p>
          <h1 className="text-3xl font-bold mb-2">
            {loading ? "Loading estate..." : getEstateName(estate)}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadEstate}
            disabled={loading}
            loading={loading}
            label="Refresh"
          />
          <Button
            onClick={loadLots}
            disabled={lotsLoading}
            loading={lotsLoading}
            variant="secondary"
            label="Refresh lots"
          />
          <Button onClick={handleLogout} variant="outline" label="Sign out" />
        </div>
      </div>

      <AdminNav />

      {errorMessage && (
        <div className="mt-4 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      <section className="mt-6 grid gap-6">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-1">Estate properties</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Edit the fields below. Clear a field to remove its value.
          </p>

          {loading && (
            <p className="text-sm text-muted-foreground">Loading estate...</p>
          )}

          {!loading && estate && (
            <form onSubmit={handleSave} className="grid gap-4">
              <div className="grid gap-2">
                <span className="text-sm font-medium">Name *</span>
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Estate name"
                  className="w-full"
                  required
                />
              </div>

              <div className="grid gap-2">
                <span className="text-sm font-medium">Address</span>
                <Input
                  value={form.address}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, address: event.target.value }))
                  }
                  placeholder="123 Main St"
                  className="w-full"
                />
              </div>

              <div className="grid gap-2">
                <span className="text-sm font-medium">Email</span>
                <Input
                  value={form.email}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  placeholder="sales@example.com"
                  type="email"
                  className="w-full"
                />
              </div>

              <div className="grid gap-2">
                <span className="text-sm font-medium">Phone</span>
                <Input
                  value={form.phone}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  placeholder="+61 2 5555 5555"
                  className="w-full"
                />
              </div>

              <div className="grid gap-2">
                <AdminUploadField
                  label="Logo URL"
                  value={form.logoUrl}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, logoUrl: value }))
                  }
                  placeholder="https://cdn.example.com/logo.png"
                  folder="logos"
                  accept="image/*"
                />
              </div>

              <div className="grid gap-2">
                <span className="text-sm font-medium">Theme color</span>
                <Input
                  value={form.themeColor}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, themeColor: event.target.value }))
                  }
                  placeholder="#0F766E"
                  className="w-full"
                />
              </div>

              {metaEntries.length > 0 && (
                <div className="grid gap-2 rounded-md border border-slate-100 bg-slate-50 p-3 text-sm">
                  {metaEntries.map((entry) => (
                    <div key={entry.label} className="flex gap-2">
                      <span className="text-slate-500 min-w-[90px]">
                        {entry.label}
                      </span>
                      <span className="font-mono text-slate-700">
                        {formatMetaValue(entry.value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={saving} loading={saving} label="Save changes" />
                {saveErrorMessage && (
                  <span className="text-sm text-destructive">
                    {saveErrorMessage}
                  </span>
                )}
                {saveSuccessMessage && (
                  <span className="text-sm text-emerald-600">
                    {saveSuccessMessage}
                  </span>
                )}
              </div>
            </form>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold">Estate lots</h2>
              <p className="text-sm text-muted-foreground">
                {lotsLoading
                  ? "Loading lots..."
                  : `${lots.length} lot${lots.length === 1 ? "" : "s"} linked`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={lotFilter}
                onChange={(event) => setLotFilter(event.target.value)}
                placeholder="Filter lots by id, address, or zoning"
                className="min-w-[240px]"
              />
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-2 text-xs"
                label="Create lot"
                onClick={openNewLotForm}
              />
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-2 text-xs"
                label="Seed lots"
                onClick={openDxfImport}
              />
            </div>
          </div>

          {lotsErrorMessage && (
            <div className="mb-3 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-600">
              {lotsErrorMessage}
            </div>
          )}

          {showDxfImport && (
            <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="font-semibold text-base">
                    Seed full estate lots from DXF file
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Upload a DXF containing closed LWPOLYLINEs. The importer skips
                    the largest outlier boundary by default and seeds lots with
                    GeoJSON + PostGIS geometry.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  label="Hide"
                  onClick={closeDxfImport}
                />
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Defaults: blockKeyPrefix{" "}
                {estateId ? `EST-${estateId}-LOT-` : "EST-{estateId}-LOT-"},
                minArea 1, dropLargest true, source SRID 28355, target SRID 4326
                (leave blank to use source SRID).
              </p>
              <form onSubmit={handleDxfImport} className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2 md:col-span-2">
                    <span className="text-sm font-medium">DXF file *</span>
                    <input
                      type="file"
                      accept=".dxf"
                      onChange={handleDxfFileChange}
                      className="w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 file:shadow-sm"
                    />
                  </div>
                  <div className="grid gap-2">
                    <span className="text-sm font-medium">Block key prefix</span>
                    <Input
                      value={dxfForm.blockKeyPrefix}
                      onChange={(event) =>
                        setDxfForm((prev) => ({
                          ...prev,
                          blockKeyPrefix: event.target.value,
                        }))
                      }
                      placeholder={`EST-${estateId ?? "1"}-LOT-`}
                      className="w-full"
                    />
                  </div>
                  <div className="grid gap-2">
                    <span className="text-sm font-medium">Zoning</span>
                    <Input
                      value={dxfForm.zoning}
                      onChange={(event) =>
                        setDxfForm((prev) => ({ ...prev, zoning: event.target.value }))
                      }
                      placeholder="RZ1"
                      className="w-full"
                    />
                  </div>
                  <div className="grid gap-2">
                    <span className="text-sm font-medium">Layer filter</span>
                    <Input
                      value={dxfForm.layer}
                      onChange={(event) =>
                        setDxfForm((prev) => ({ ...prev, layer: event.target.value }))
                      }
                      placeholder="CADASTRE_SUBJECT BOUNDARY"
                      className="w-full"
                    />
                  </div>
                  <div className="grid gap-2">
                    <span className="text-sm font-medium">Minimum area</span>
                    <Input
                      value={dxfForm.minArea}
                      onChange={(event) =>
                        setDxfForm((prev) => ({ ...prev, minArea: event.target.value }))
                      }
                      type="number"
                      step="0.01"
                      placeholder="1"
                      className="w-full"
                    />
                  </div>
                  <div className="grid gap-2">
                    <span className="text-sm font-medium">Block number</span>
                    <Input
                      value={dxfForm.blockNumber}
                      onChange={(event) =>
                        setDxfForm((prev) => ({ ...prev, blockNumber: event.target.value }))
                      }
                      type="number"
                      step="1"
                      placeholder="12"
                      className="w-full"
                    />
                  </div>
                  <div className="grid gap-2">
                    <span className="text-sm font-medium">Section number</span>
                    <Input
                      value={dxfForm.sectionNumber}
                      onChange={(event) =>
                        setDxfForm((prev) => ({
                          ...prev,
                          sectionNumber: event.target.value,
                        }))
                      }
                      type="number"
                      step="1"
                      placeholder="34"
                      className="w-full"
                    />
                  </div>
                  <div className="grid gap-2">
                    <span className="text-sm font-medium">Address</span>
                    <Input
                      value={dxfForm.address}
                      onChange={(event) =>
                        setDxfForm((prev) => ({ ...prev, address: event.target.value }))
                      }
                      placeholder="6 Keane Place"
                      className="w-full"
                    />
                  </div>
                  <div className="grid gap-2">
                    <span className="text-sm font-medium">District</span>
                    <Input
                      value={dxfForm.district}
                      onChange={(event) =>
                        setDxfForm((prev) => ({ ...prev, district: event.target.value }))
                      }
                      placeholder="Belconnen"
                      className="w-full"
                    />
                  </div>
                  <div className="grid gap-2">
                    <span className="text-sm font-medium">Division</span>
                    <Input
                      value={dxfForm.division}
                      onChange={(event) =>
                        setDxfForm((prev) => ({ ...prev, division: event.target.value }))
                      }
                      placeholder="Dunlop"
                      className="w-full"
                    />
                  </div>
                  <div className="grid gap-2">
                    <span className="text-sm font-medium">Lifecycle stage</span>
                    <Input
                      value={dxfForm.lifecycleStage}
                      onChange={(event) =>
                        setDxfForm((prev) => ({
                          ...prev,
                          lifecycleStage: event.target.value,
                        }))
                      }
                      placeholder="GAZETTED"
                      className="w-full"
                    />
                  </div>
                  <div className="grid gap-2">
                    <span className="text-sm font-medium">Source SRID</span>
                    <Input
                      value={dxfForm.sourceSrid}
                      onChange={(event) =>
                        setDxfForm((prev) => ({ ...prev, sourceSrid: event.target.value }))
                      }
                      type="number"
                      step="1"
                      placeholder="28355"
                      className="w-full"
                    />
                  </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Target SRID</span>
                  <Input
                    value={dxfForm.targetSrid}
                    onChange={(event) =>
                      setDxfForm((prev) => ({ ...prev, targetSrid: event.target.value }))
                    }
                    type="number"
                    step="1"
                    placeholder="4326"
                    className="w-full"
                  />
                </div>
                  <label className="flex items-center gap-2 text-sm font-medium md:col-span-2">
                    <input
                      type="checkbox"
                      checked={dxfForm.dropLargest}
                      onChange={(event) =>
                        setDxfForm((prev) => ({
                          ...prev,
                          dropLargest: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    Drop largest boundary polygon
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="submit"
                    disabled={dxfImporting}
                    loading={dxfImporting}
                    label="Import DXF"
                  />
                  {dxfError && (
                    <span className="text-sm text-destructive">{dxfError}</span>
                  )}
                  {dxfResult && (
                    <span className="text-sm text-emerald-600">
                      Imported {dxfResult.created ?? 0} lot
                      {(dxfResult.created ?? 0) === 1 ? "" : "s"}.
                    </span>
                  )}
                </div>
                {dxfResult?.boundary && (
                  <div className="text-xs text-slate-500">
                    Dropped boundary{" "}
                    {dxfResult.boundary.layer
                      ? `"${dxfResult.boundary.layer}"`
                      : "polygon"}{" "}
                    ({dxfResult.boundary.areaSqm?.toLocaleString() ?? "--"} sqm)
                  </div>
                )}
              </form>
            </div>
          )}

          {(showLotForm || editingLotId) && (
            <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h3 className="font-semibold text-base">
                  {editingLotId ? "Edit lot" : "Add new lot"}
                </h3>
                <div className="flex items-center gap-2">
                  {editingLotId && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 px-2 text-xs"
                      label="New lot"
                      onClick={openNewLotForm}
                    />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-2 text-xs"
                    label="Hide"
                    onClick={closeLotForm}
                  />
                </div>
              </div>
              <form onSubmit={handleSaveLot} className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Block key *</span>
                  <Input
                    value={lotForm.blockKey}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        blockKey: event.target.value,
                      }))
                    }
                    placeholder="B-12-34"
                    className="w-full"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Estate ID *</span>
                  <Input
                    value={lotForm.estateId}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        estateId: event.target.value,
                      }))
                    }
                    placeholder="1"
                    className="w-full"
                    disabled
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Area (sqm) *</span>
                  <Input
                    value={lotForm.areaSqm}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        areaSqm: event.target.value,
                      }))
                    }
                    type="number"
                    step="0.01"
                    placeholder="512.5"
                    className="w-full"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Zoning *</span>
                  <Input
                    value={lotForm.zoning}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        zoning: event.target.value,
                      }))
                    }
                    placeholder="RZ1"
                    className="w-full"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Block number</span>
                  <Input
                    value={lotForm.blockNumber}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        blockNumber: event.target.value,
                      }))
                    }
                    type="number"
                    step="1"
                    placeholder="12"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Section number</span>
                  <Input
                    value={lotForm.sectionNumber}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        sectionNumber: event.target.value,
                      }))
                    }
                    type="number"
                    step="1"
                    placeholder="34"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Address</span>
                  <Input
                    value={lotForm.address}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        address: event.target.value,
                      }))
                    }
                    placeholder="6 Keane Place"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">District</span>
                  <Input
                    value={lotForm.district}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        district: event.target.value,
                      }))
                    }
                    placeholder="Belconnen"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Division</span>
                  <Input
                    value={lotForm.division}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        division: event.target.value,
                      }))
                    }
                    placeholder="Dunlop"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Lifecycle stage</span>
                  <Input
                    value={lotForm.lifecycleStage}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        lifecycleStage: event.target.value,
                      }))
                    }
                    placeholder="GAZETTED"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <span className="text-sm font-medium">
                    Overlays (comma separated)
                  </span>
                  <Input
                    value={lotForm.overlays}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        overlays: event.target.value,
                      }))
                    }
                    placeholder="overlayA, overlayB"
                    className="w-full"
                  />
                </div>

                <div className="md:col-span-2 pt-2 text-sm font-semibold text-slate-600">
                  Dimensions & S-values
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Width (m)</span>
                  <Input
                    value={lotForm.width}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        width: event.target.value,
                      }))
                    }
                    type="number"
                    step="0.01"
                    placeholder="12.5"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Depth (m)</span>
                  <Input
                    value={lotForm.depth}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        depth: event.target.value,
                      }))
                    }
                    type="number"
                    step="0.01"
                    placeholder="30.2"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">S1 (m)</span>
                  <Input
                    value={lotForm.s1}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        s1: event.target.value,
                      }))
                    }
                    type="number"
                    step="0.01"
                    placeholder="12.5"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">S2 (m)</span>
                  <Input
                    value={lotForm.s2}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        s2: event.target.value,
                      }))
                    }
                    type="number"
                    step="0.01"
                    placeholder="30.2"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">S3 (m)</span>
                  <Input
                    value={lotForm.s3}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        s3: event.target.value,
                      }))
                    }
                    type="number"
                    step="0.01"
                    placeholder="12.5"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">S4 (m)</span>
                  <Input
                    value={lotForm.s4}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        s4: event.target.value,
                      }))
                    }
                    type="number"
                    step="0.01"
                    placeholder="30.2"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <span className="text-sm font-medium">
                    Frontage selector
                  </span>
                  {frontagePreview.error || !frontageEdges ? (
                    <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                      {frontagePreview.error || "Unable to render lot preview."}
                    </div>
                  ) : (
                    <div className="rounded-md border border-slate-200 bg-white p-2">
                      <svg
                        viewBox={`0 0 ${frontageEdges.viewWidth} ${frontageEdges.viewHeight}`}
                        className="h-56 w-full pointer-events-auto"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <polygon
                          points={frontageEdges.polygonPoints}
                          fill="#f1f5f9"
                          stroke="#94a3b8"
                          strokeWidth="1"
                        />
                        {frontageEdges.edges.map((edge, index) => {
                          const start = frontageEdges.toSvg(edge[0]);
                          const end = frontageEdges.toSvg(edge[1]);
                          const selected = isEdgeInLine(edge, frontageLine);
                          return (
                            <line
                              key={`frontage-edge-${index}`}
                              x1={start.x}
                              y1={start.y}
                              x2={end.x}
                              y2={end.y}
                              stroke={selected ? "#0f766e" : "#64748b"}
                              strokeWidth={selected ? 4 : 2}
                              strokeLinecap="round"
                              className="cursor-pointer pointer-events-auto"
                              onClick={(event) => {
                                const nextCoords = event.shiftKey
                                  ? extendFrontageLine(frontageLine, edge)
                                  : [edge[0], edge[1]];
                                const payload = JSON.stringify({
                                  type: "LineString",
                                  coordinates: nextCoords,
                                });
                                setLotForm((prev) => ({
                                  ...prev,
                                  frontageCoordinate: payload,
                                }));
                              }}
                            />
                          );
                        })}
                      </svg>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <span>
                          Click an edge to set the frontage line. Shift-click to
                          extend across multiple edges.
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          label="Clear frontage"
                          onClick={() =>
                            setLotForm((prev) => ({
                              ...prev,
                              frontageCoordinate: "",
                            }))
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <span className="text-sm font-medium">
                    Frontage coordinate (GeoJSON LineString)
                  </span>
                  <textarea
                    value={lotForm.frontageCoordinate}
                    readOnly
                    rows={3}
                    spellCheck={false}
                    className="w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder='{"type":"LineString","coordinates":[[148.9246407,-34.8503355],[148.924815,-34.8504019]]}'
                  />
                  <span className="text-xs text-slate-500">
                    Use the selector above to set the frontage line.
                  </span>
                </div>

                <div className="md:col-span-2 pt-2 text-sm font-semibold text-slate-600">
                  Planning & rules
                </div>
                <label className="flex items-center gap-2 text-sm font-medium md:col-span-2">
                  <input
                    type="checkbox"
                    checked={lotForm.highFall}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        highFall: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  High fall (&gt;2m across block)
                </label>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Lot type</span>
                  <Input
                    value={lotForm.lotType}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        lotType: event.target.value,
                      }))
                    }
                    placeholder="Standard"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Frontage type</span>
                  <Input
                    value={lotForm.frontageType}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        frontageType: event.target.value,
                      }))
                    }
                    placeholder="Primary"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Planning ID</span>
                  <Input
                    value={lotForm.planningId}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        planningId: event.target.value,
                      }))
                    }
                    placeholder="PLAN-001"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Max height</span>
                  <Input
                    value={lotForm.maxHeight}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        maxHeight: event.target.value,
                      }))
                    }
                    placeholder="8.5"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Max size</span>
                  <Input
                    value={lotForm.maxSize}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        maxSize: event.target.value,
                      }))
                    }
                    placeholder="250"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Max FSR</span>
                  <Input
                    value={lotForm.maxFSR}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        maxFSR: event.target.value,
                      }))
                    }
                    placeholder="0.5"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Max FSR upper</span>
                  <Input
                    value={lotForm.maxFSRUpper}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        maxFSRUpper: event.target.value,
                      }))
                    }
                    placeholder="0.65"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Max stories</span>
                  <Input
                    value={lotForm.maxStories}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        maxStories: event.target.value,
                      }))
                    }
                    placeholder="2"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Minimum area</span>
                  <Input
                    value={lotForm.minArea}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        minArea: event.target.value,
                      }))
                    }
                    placeholder="450"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Minimum depth</span>
                  <Input
                    value={lotForm.minDepth}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        minDepth: event.target.value,
                      }))
                    }
                    placeholder="25"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Front yard setback</span>
                  <Input
                    value={lotForm.frontYardSetback}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        frontYardSetback: event.target.value,
                      }))
                    }
                    placeholder="4-6"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Side yard setback (min)</span>
                  <Input
                    value={lotForm.sideYardMinSetback}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        sideYardMinSetback: event.target.value,
                      }))
                    }
                    placeholder="3"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Rear yard setback (min)</span>
                  <Input
                    value={lotForm.rearYardMinSetback}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        rearYardMinSetback: event.target.value,
                      }))
                    }
                    placeholder="6"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Example floor area</span>
                  <Input
                    value={lotForm.exampleArea}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        exampleArea: event.target.value,
                      }))
                    }
                    placeholder="279"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Example lot size</span>
                  <Input
                    value={lotForm.exampleLotSize}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        exampleLotSize: event.target.value,
                      }))
                    }
                    placeholder="465"
                    className="w-full"
                  />
                </div>

                <div className="md:col-span-2 pt-2 text-sm font-semibold text-slate-600">
                  Zoning setbacks (API)
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Front setback</span>
                  <Input
                    value={lotForm.zoningFrontSetback}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        zoningFrontSetback: event.target.value,
                      }))
                    }
                    type="number"
                    step="0.01"
                    placeholder="4"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Side setback</span>
                  <Input
                    value={lotForm.zoningSideSetback}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        zoningSideSetback: event.target.value,
                      }))
                    }
                    type="number"
                    step="0.01"
                    placeholder="3"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Rear setback</span>
                  <Input
                    value={lotForm.zoningRearSetback}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        zoningRearSetback: event.target.value,
                      }))
                    }
                    type="number"
                    step="0.01"
                    placeholder="3"
                    className="w-full"
                  />
                </div>

                <div className="md:col-span-2 pt-2 text-sm font-semibold text-slate-600">
                  API metadata
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">API zoning</span>
                  <Input
                    value={lotForm.apiZoning}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        apiZoning: event.target.value,
                      }))
                    }
                    placeholder="RZ1"
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <span className="text-sm font-medium">API matches (JSON)</span>
                  <textarea
                    value={lotForm.apiMatches}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        apiMatches: event.target.value,
                      }))
                    }
                    rows={4}
                    spellCheck={false}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder='[{"houseDesignId":"abc","floorplanUrl":"/path.png","spacing":{"front":4,"rear":3,"side":3},"maxCoverageArea":200,"houseArea":180,"lotDimensions":{"width":12,"depth":30}}]'
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">GeoJSON</span>
                <textarea
                  value={lotForm.geojson}
                  onChange={(event) =>
                    setLotForm((prev) => ({
                      ...prev,
                      geojson: event.target.value,
                    }))
                  }
                  rows={6}
                  spellCheck={false}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder='{"type":"Feature","geometry":{"type":"Polygon","coordinates":[]}}'
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  disabled={lotSaving}
                  loading={lotSaving}
                  label={editingLotId ? "Update lot" : "Create lot"}
                />
                {editingLotId && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive hover:bg-red-50 hover:text-destructive"
                    label="Delete lot"
                    onClick={() => handleDeleteLot(editingLotId)}
                    disabled={lotSaving || lotDeleteId === editingLotId}
                    loading={lotDeleteId === editingLotId}
                  />
                )}
                {lotFormError && (
                  <span className="text-sm text-destructive">
                    {lotFormError}
                  </span>
                )}
                {lotFormSuccess && (
                  <span className="text-sm text-emerald-600">
                    {lotFormSuccess}
                  </span>
                )}
              </div>
            </form>
          </div>
          )}

          <div className="overflow-auto border rounded-lg">
            <table className="w-full border-collapse min-w-[960px]">
              <thead>
                <tr className="bg-slate-100 text-left">
                  <th className="p-3 border-b font-medium text-sm text-slate-700">
                    Block Key
                  </th>
                  <th className="p-3 border-b font-medium text-sm text-slate-700">
                    Lot ID
                  </th>
                  <th className="p-3 border-b font-medium text-sm text-slate-700">
                    Address
                  </th>
                  <th className="p-3 border-b font-medium text-sm text-slate-700">
                    Stage
                  </th>
                  <th className="p-3 border-b font-medium text-sm text-slate-700">
                    Zoning
                  </th>
                  <th className="p-3 border-b font-medium text-sm text-slate-700">
                    Area (sqm)
                  </th>
                  <th className="p-3 border-b font-medium text-sm text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLots.map((lot, index) => (
                  <tr key={String(lot.id ?? `${lot.blockKey ?? "lot"}-${index}`)}>
                    <td className="p-3 border-b border-slate-100 text-sm font-mono">
                      {getLotBlockKey(lot)}
                    </td>
                    <td className="p-3 border-b border-slate-100 text-sm font-mono">
                      {formatLotValue(lot.id)}
                    </td>
                    <td className="p-3 border-b border-slate-100 text-sm">
                      {getLotAddress(lot)}
                    </td>
                    <td className="p-3 border-b border-slate-100 text-sm">
                      {getLotStage(lot)}
                    </td>
                    <td className="p-3 border-b border-slate-100 text-sm">
                      {formatLotValue(lot.zoning)}
                    </td>
                    <td className="p-3 border-b border-slate-100 text-sm">
                      {getLotArea(lot)}
                    </td>
                    <td className="p-3 border-b border-slate-100 text-sm">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 px-2 text-xs"
                          label="Edit"
                          onClick={() => handleEditLot(lot)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 px-2 text-xs text-destructive hover:bg-red-50 hover:text-destructive"
                          label="Delete"
                          onClick={() => handleDeleteLot(String(lot.id ?? ""))}
                          disabled={
                            lotSaving ||
                            lotDeleteId === String(lot.id ?? "")
                          }
                          loading={lotDeleteId === String(lot.id ?? "")}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {!lotsLoading && filteredLots.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-4 text-center text-muted-foreground"
                    >
                      No lots match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminEstatePage;
