import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RecomputeSummaryCard } from "@/components/admin/rules/RecomputeSummaryCard";
import { RuleLayerEditor } from "@/components/admin/rules/RuleLayerEditor";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  adminApi,
  type ActLandUseZoneLookupResponse,
  type CreateLotInput,
} from "@/lib/api/adminApi";
import { getAdminApiErrorMessage } from "@/lib/api/adminApiErrors";
import {
  LOT_LIFECYCLE_OPTIONS,
  getLotLifecycleLabel,
  normalizeLotLifecycle,
} from "@/constants/lotLifecycle";
import {
  LOT_SALES_MODE_OPTIONS,
  getLotSalesModeLabel,
  normalizeLotSalesMode,
} from "@/constants/lotSalesMode";
import type {
  CreateLotConstraintResponse,
  EstateRuleSetRecord,
  LotConstraintRecord,
  RuleLayer,
} from "@/lib/api/adminModels";

export type EstateLotRecord = {
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
  salesMode?: string | null;
  price?: number | null;
  houseAndLandFloorPlanId?: string | null;
  lifecycleStage?: string | null;
  lotNumber?: number | null;
  status?: string | null;
  overlays?: string[] | null;
  geojson?: Record<string, unknown> | null;
  geometry?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  frontageCoordinate?: GeoJSON.LineString | string | null;
  frontageM?: number | null;
  lotType?: string | null;
  roadFacing?: string | null;
  precinct?: string | null;
  ruleOverrides?: Record<string, unknown> | null;
  [key: string]: unknown;
};

type ApprovedLotFloorPlanOption = {
  designOnLotId?: string;
  floorPlanId: string;
  floorPlan?: {
    id?: string;
    name?: string | null;
    price?: number | null;
    areaSqm?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    garages?: number | null;
    builder?: {
      id?: string;
      name?: string | null;
    } | null;
  } | null;
};

type LotForm = {
  blockKey: string;
  blockNumber: string;
  sectionNumber: string;
  areaSqm: string;
  salesMode: string;
  price: string;
  houseAndLandFloorPlanId: string;
  zoning: string;
  address: string;
  district: string;
  division: string;
  lifecycleStage: string;
  overlays: string;
  geojson: string;
  estateId: string;
  lotType: string;
  frontageM: string;
  roadFacing: string;
  precinct: string;
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
  frontageCoordinate: string;
  width: string;
  depth: string;
  s1: string;
  s2: string;
  s3: string;
  s4: string;
  highFall: boolean;
};

type DxfImportForm = {
  zoning: string;
  lotType: string;
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

type LotSortField =
  | "blockKey"
  | "blockNumber"
  | "address"
  | "stage"
  | "salesMode"
  | "price"
  | "zoning"
  | "areaSqm";

type LotSortDirection = "asc" | "desc";

export type DxfImportResult = {
  estateId?: string;
  created?: number;
  blockKeyPrefix?: string;
  sourceSrid?: number;
  targetSrid?: number;
  boundary?: { areaSqm?: number; layer?: string };
  lots?: Array<{ id?: string; blockKey?: string; areaSqm?: number }>;
  recompute?: {
    estateId?: string;
    lotsProcessed?: number;
    combinationsProcessed?: number;
    pass?: number;
    fail?: number;
    manualReview?: number;
    [key: string]: unknown;
  };
};

type EstateLotsCrudProps = {
  estateId?: string | null;
  estateName?: string | null;
  estateAddress?: string | null;
  loadLots: (estateId: string) => Promise<EstateLotRecord[]>;
  createLot: (payload: CreateLotInput) => Promise<unknown>;
  updateLot: (id: string, payload: Record<string, unknown>) => Promise<unknown>;
  deleteLot: (id: string) => Promise<unknown>;
  deleteAllLots?: (estateId: string) => Promise<unknown>;
  importLotsDxf?: (estateId: string, payload: FormData) => Promise<DxfImportResult>;
  recomputeEstateDesignOnLot?: (estateId: string) => Promise<unknown>;
  enableDxfImport?: boolean;
  defaultCollapsed?: boolean;
};

const createEmptyLotForm = (estateIdValue: string): LotForm => ({
  blockKey: "",
  blockNumber: "",
  sectionNumber: "",
  areaSqm: "",
  salesMode: "land_sale",
  price: "",
  houseAndLandFloorPlanId: "",
  zoning: "",
  address: "",
  district: "",
  division: "",
  lifecycleStage: "available",
  overlays: "",
  geojson: "",
  estateId: estateIdValue,
  lotType: "",
  frontageM: "",
  roadFacing: "",
  precinct: "",
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
  frontageCoordinate: "",
  width: "",
  depth: "",
  s1: "",
  s2: "",
  s3: "",
  s4: "",
  highFall: false,
});

function createDefaultBlockKeyPrefix({
  estateIdValue,
  estateNameValue,
}: {
  estateIdValue: string | null | undefined;
  estateNameValue?: string | null;
}) {
  const initials = createEstateNameInitials(estateNameValue);
  const estateToken = sanitizeBlockKeyToken(estateIdValue ?? "");
  if (!estateToken) {
    return `${initials}-LOT-`;
  }
  return `${initials}-${estateToken}-LOT-`;
}

const createDxfImportForm = ({
  estateIdValue,
  estateNameValue,
}: {
  estateIdValue: string;
  estateNameValue?: string | null;
}): DxfImportForm => ({
  zoning: "",
  lotType: "standard",
  blockKeyPrefix: createDefaultBlockKeyPrefix({
    estateIdValue,
    estateNameValue,
  }),
  blockNumber: "",
  sectionNumber: "",
  address: "",
  district: "",
  division: "",
  lifecycleStage: "available",
  layer: "",
  minArea: "1",
  dropLargest: true,
  sourceSrid: "28355",
  targetSrid: "4326",
});

const LOT_TYPE_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "corner", label: "Corner" },
  { value: "battle_axe", label: "Battle-axe" },
  { value: "parallel_road", label: "Parallel road" },
  { value: "other", label: "Other" },
] as const;

const LIFECYCLE_STAGE_OPTIONS = LOT_LIFECYCLE_OPTIONS;
const SALES_MODE_OPTIONS = LOT_SALES_MODE_OPTIONS;

const sanitizeBlockKeyToken = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const createEstateNameInitials = (estateNameValue: string | null | undefined) => {
  const words =
    typeof estateNameValue === "string"
      ? estateNameValue
          .trim()
          .split(/[^a-zA-Z0-9]+/)
          .filter(Boolean)
      : [];
  const initials = words
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
  return sanitizeBlockKeyToken(initials) || "EST";
};

const createGeneratedBlockKey = ({
  estateIdValue,
  estateNameValue,
  blockNumberValue,
}: {
  estateIdValue: string | null | undefined;
  estateNameValue?: string | null;
  blockNumberValue?: string | number | null;
}) => {
  const initials = createEstateNameInitials(estateNameValue);
  const estateToken = sanitizeBlockKeyToken(estateIdValue ?? "");
  const blockNumberToken = sanitizeBlockKeyToken(String(blockNumberValue ?? ""));
  if (estateToken && blockNumberToken) {
    return `${initials}-${estateToken}-${blockNumberToken}`;
  }
  if (estateToken) {
    return `${initials}-${estateToken}`;
  }
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${initials}-MANUAL-${Date.now()}-${randomSuffix}`;
};

const createDefaultManualLotForm = ({
  estateIdValue,
  estateNameValue,
  existingLotsCount,
}: {
  estateIdValue: string;
  estateNameValue?: string | null;
  existingLotsCount: number;
}): LotForm => {
  const nextBlockNumber = String(existingLotsCount + 1);
  return {
    ...createEmptyLotForm(estateIdValue),
    blockNumber: nextBlockNumber,
    blockKey: createGeneratedBlockKey({
      estateIdValue,
      estateNameValue,
      blockNumberValue: nextBlockNumber,
    }),
  };
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

const extractZoneCodeFromLookup = (
  lookup: ActLandUseZoneLookupResponse | null | undefined
) => {
  const fromRules =
    typeof lookup?.lotCheckRules?.zoneCode === "string"
      ? lookup.lotCheckRules.zoneCode.trim()
      : "";
  if (fromRules) {
    return fromRules;
  }

  const fromZone =
    typeof lookup?.zone?.zoneCode === "string"
      ? lookup.zone.zoneCode.trim()
      : "";
  return fromZone || null;
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

const parseRulesJson = (value: string): RuleLayer => {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Rules must be a JSON object.");
  }
  return parsed as RuleLayer;
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

const buildLotForm = (lot: EstateLotRecord, estateIdValue: string): LotForm => {
  const geojsonRecord = getGeojsonRecord(lot.geojson);
  const metadata = getGeojsonMetadata(geojsonRecord);
  const rawLifecycleStage = stringifyValue(lot.lifecycleStage ?? lot.status);
  const normalizedLifecycleStage = normalizeLotLifecycle(rawLifecycleStage);
  const readValue = (key: string) =>
    (lot as Record<string, unknown>)[key] ??
    metadata?.[key] ??
    geojsonRecord?.[key];
  const readMetadataOnly = (key: string) =>
    (lot as Record<string, unknown>)[key] ?? metadata?.[key];
  return {
    blockKey: stringifyValue(
      lot.blockKey ?? (lot as { BLOCK_KEY?: string }).BLOCK_KEY
    ),
    blockNumber: stringifyValue(lot.blockNumber),
    sectionNumber: stringifyValue(lot.sectionNumber),
    areaSqm: stringifyValue(lot.areaSqm),
    salesMode:
      normalizeLotSalesMode(lot.salesMode) ?? createEmptyLotForm("").salesMode,
    price: stringifyValue(lot.price),
    houseAndLandFloorPlanId: stringifyValue(lot.houseAndLandFloorPlanId),
    zoning: stringifyValue(lot.zoning),
    address: stringifyValue(lot.address),
    district: stringifyValue(lot.district),
    division: stringifyValue(lot.division),
    lifecycleStage: normalizedLifecycleStage ?? rawLifecycleStage,
    overlays: Array.isArray(lot.overlays) ? lot.overlays.join(", ") : "",
    geojson: lot.geojson ? JSON.stringify(lot.geojson, null, 2) : "",
    estateId: stringifyValue(extractLotEstateId(lot) ?? estateIdValue),
    lotType: stringifyValue(
      (lot as Record<string, unknown>)["lotType"] ??
        readMetadataOnly("lotType") ??
        readMetadataOnly("type")
    ),
    frontageM: stringifyValue(readValue("frontageM")),
    roadFacing: stringifyValue(readValue("roadFacing")),
    precinct: stringifyValue(readValue("precinct")),
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
    frontageCoordinate: stringifyJsonValue(readValue("frontageCoordinate")),
    width: stringifyValue(readValue("width")),
    depth: stringifyValue(readValue("depth")),
    s1: stringifyValue(getGeojsonSValue(geojsonRecord, "s1")),
    s2: stringifyValue(getGeojsonSValue(geojsonRecord, "s2")),
    s3: stringifyValue(getGeojsonSValue(geojsonRecord, "s3")),
    s4: stringifyValue(getGeojsonSValue(geojsonRecord, "s4")),
    highFall: coerceBoolean(readValue("highFall")),
  };
};

const extractLotEstateId = (lot: EstateLotRecord): string | undefined => {
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

const getLotAddress = (lot: EstateLotRecord) => {
  const address =
    lot.address ??
    (lot as { ADDRESSES?: string | null }).ADDRESSES ??
    (lot as { addressLine?: string | null }).addressLine;
  return formatLotValue(address);
};

const getLotStage = (lot: EstateLotRecord) => {
  const rawValue =
    lot.lifecycleStage ?? lot.status ?? (lot as { stage?: string }).stage;
  const normalized = normalizeLotLifecycle(rawValue);
  if (normalized) {
    return getLotLifecycleLabel(normalized);
  }
  return formatLotValue(rawValue);
};

const getLotArea = (lot: EstateLotRecord) =>
  formatLotValue(
    lot.areaSqm ??
      (lot as { area?: number | string }).area ??
      (lot as { BLOCK_DERIVED_AREA?: string }).BLOCK_DERIVED_AREA
  );

const getLotSalesMode = (lot: EstateLotRecord) => {
  const normalized = normalizeLotSalesMode(lot.salesMode);
  if (normalized) {
    return getLotSalesModeLabel(normalized);
  }
  return "--";
};

const getLotPrice = (lot: EstateLotRecord) => {
  if (typeof lot.price === "number" && Number.isFinite(lot.price)) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(lot.price);
  }
  return "--";
};

const formatApprovedFloorPlanOption = (option: ApprovedLotFloorPlanOption) => {
  const plan = option.floorPlan;
  const title = plan?.name?.trim() || `Floor plan ${option.floorPlanId}`;
  const builder = plan?.builder?.name?.trim();
  const details = [
    typeof plan?.bedrooms === "number" ? `${plan.bedrooms} bed` : null,
    typeof plan?.bathrooms === "number" ? `${plan.bathrooms} bath` : null,
    typeof plan?.garages === "number" ? `${plan.garages} car` : null,
    typeof plan?.areaSqm === "number" ? `${Math.round(plan.areaSqm)}sqm` : null,
  ].filter(Boolean);

  return [title, builder, details.join(", ")].filter(Boolean).join(" | ");
};

const getLotBlockKey = (lot: EstateLotRecord) =>
  formatLotValue(lot.blockKey ?? (lot as { BLOCK_KEY?: string }).BLOCK_KEY);

const getLotBlockNumberValue = (lot: EstateLotRecord) => {
  const rawValue =
    lot.blockNumber ??
    (lot as { BLOCK_NUMBER?: number | string | null }).BLOCK_NUMBER ??
    lot.lotNumber ??
    (lot as { LOT_NUMBER?: number | string | null }).LOT_NUMBER;

  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    return rawValue;
  }

  if (typeof rawValue === "string" && rawValue.trim()) {
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : rawValue.trim();
  }

  return null;
};

const getLotBlockNumber = (lot: EstateLotRecord) =>
  formatLotValue(getLotBlockNumberValue(lot));

export const EstateLotsCrud = ({
  estateId,
  estateName,
  estateAddress,
  loadLots,
  createLot,
  updateLot,
  deleteLot,
  deleteAllLots,
  importLotsDxf,
  recomputeEstateDesignOnLot,
  enableDxfImport,
  defaultCollapsed = false,
}: EstateLotsCrudProps) => {
  const canImportDxf = enableDxfImport ?? Boolean(importLotsDxf);
  // Keep manual lot entry code-path available behind a local toggle.
  const enableManualLotEntry = false;
  const normalizedEstateName = useMemo(
    () => (typeof estateName === "string" ? estateName.trim() : ""),
    [estateName]
  );
  const normalizedEstateAddress = useMemo(
    () => (typeof estateAddress === "string" ? estateAddress.trim() : ""),
    [estateAddress]
  );

  const [lots, setLots] = useState<EstateLotRecord[]>([]);
  const [lotsLoading, setLotsLoading] = useState(false);
  const [lotsErrorMessage, setLotsErrorMessage] = useState<string | null>(null);
  const [lotsPanelCollapsed, setLotsPanelCollapsed] = useState(defaultCollapsed);
  const [lotFilter, setLotFilter] = useState("");
  const [lotSortField, setLotSortField] = useState<LotSortField>("blockKey");
  const [lotSortDirection, setLotSortDirection] =
    useState<LotSortDirection>("desc");
  const [showLotForm, setShowLotForm] = useState(false);
  const [showAdvancedLotFields, setShowAdvancedLotFields] = useState(false);
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const lotFormCardRef = useRef<HTMLDivElement | null>(null);
  const [lotForm, setLotForm] = useState<LotForm>(() =>
    createDefaultManualLotForm({
      estateIdValue: estateId ?? "",
      estateNameValue: normalizedEstateName,
      existingLotsCount: 0,
    })
  );
  const [lotGeometry, setLotGeometry] = useState<Record<string, unknown> | null>(
    null
  );
  const [lotSaving, setLotSaving] = useState(false);
  const [lotDeleteId, setLotDeleteId] = useState<string | null>(null);
  const [lotBulkDeleteLoading, setLotBulkDeleteLoading] = useState(false);
  const [lotFormError, setLotFormError] = useState<string | null>(null);
  const [lotFormSuccess, setLotFormSuccess] = useState<string | null>(null);
  const [approvedFloorPlanOptions, setApprovedFloorPlanOptions] = useState<
    ApprovedLotFloorPlanOption[]
  >([]);
  const [approvedFloorPlansLoading, setApprovedFloorPlansLoading] =
    useState(false);
  const [approvedFloorPlansError, setApprovedFloorPlansError] = useState<
    string | null
  >(null);
  const [lotSaveRecompute, setLotSaveRecompute] = useState<
    Record<string, unknown> | null
  >(null);
  const [lotConstraints, setLotConstraints] = useState<LotConstraintRecord[]>([]);
  const [lotConstraintsLoading, setLotConstraintsLoading] = useState(false);
  const [lotConstraintsError, setLotConstraintsError] = useState<string | null>(
    null
  );
  const [showLotConstraints, setShowLotConstraints] = useState(false);
  const [constraintName, setConstraintName] = useState("");
  const [constraintActive, setConstraintActive] = useState(true);
  const [constraintRulesJson, setConstraintRulesJson] = useState(
    `{
  "minFrontSetbackM": 7.5,
  "maxSiteCoverageRatio": 0.4
}`
  );
  const [constraintNotes, setConstraintNotes] = useState("");
  const [constraintEstateRuleSetId, setConstraintEstateRuleSetId] = useState("");
  const [constraintSaving, setConstraintSaving] = useState(false);
  const [constraintDeleteId, setConstraintDeleteId] = useState<string | null>(null);
  const [constraintErrorMessage, setConstraintErrorMessage] = useState<
    string | null
  >(null);
  const [constraintSuccessMessage, setConstraintSuccessMessage] = useState<
    string | null
  >(null);
  const [constraintRecompute, setConstraintRecompute] = useState<
    Record<string, unknown> | null
  >(null);
  const [editingConstraintId, setEditingConstraintId] = useState<string | null>(
    null
  );
  const [constraintRuleSetOptions, setConstraintRuleSetOptions] = useState<
    EstateRuleSetRecord[]
  >([]);
  const [showDxfImport, setShowDxfImport] = useState(false);
  const [showAdvancedDxfOptions, setShowAdvancedDxfOptions] = useState(false);
  const [dxfFile, setDxfFile] = useState<File | null>(null);
  const [dxfForm, setDxfForm] = useState<DxfImportForm>(() =>
    createDxfImportForm({
      estateIdValue: estateId ?? "",
      estateNameValue: normalizedEstateName,
    })
  );
  const [dxfImporting, setDxfImporting] = useState(false);
  const [dxfError, setDxfError] = useState<string | null>(null);
  const [dxfResult, setDxfResult] = useState<DxfImportResult | null>(null);
  const [recomputeLoading, setRecomputeLoading] = useState(false);
  const [recomputeError, setRecomputeError] = useState<string | null>(null);
  const [recomputeResult, setRecomputeResult] = useState<Record<string, unknown> | null>(
    null
  );

  const frontageLine = useMemo(
    () => parseLineString(lotForm.frontageCoordinate),
    [lotForm.frontageCoordinate]
  );
  const isManualLotEntry = !editingLotId;
  const showAllLotFields = isManualLotEntry || showAdvancedLotFields;

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

  const handleLoadLots = useCallback(async () => {
    if (!estateId) {
      setLots([]);
      setLotsErrorMessage("Missing estate id.");
      setLotsLoading(false);
      return;
    }
    setLotsLoading(true);
    setLotsErrorMessage(null);
    try {
      const data = await loadLots(estateId);
      const scoped = data.some((lot) => extractLotEstateId(lot) !== undefined)
        ? data.filter((lot) => extractLotEstateId(lot) === estateId)
        : data;
      setLots(scoped);
    } catch (error) {
      setLotsErrorMessage(
        error instanceof Error ? error.message : "Failed to load lots."
      );
    } finally {
      setLotsLoading(false);
    }
  }, [estateId, loadLots]);

  const lookupEstateZoneCode = useCallback(async () => {
    if (!normalizedEstateAddress) {
      return null;
    }
    try {
      const response =
        await adminApi.lookupActLandUseZoneByAddress<ActLandUseZoneLookupResponse>(
          normalizedEstateAddress
        );
      return extractZoneCodeFromLookup(response);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug("Estate zoning lookup failed", error);
      }
      return null;
    }
  }, [normalizedEstateAddress]);

  const prefillLotZoningFromEstateAddress = useCallback(async () => {
    const zoneCode = await lookupEstateZoneCode();
    if (!zoneCode) {
      return;
    }
    setLotForm((prev) =>
      prev.zoning.trim()
        ? prev
        : {
            ...prev,
            zoning: zoneCode,
          }
    );
  }, [lookupEstateZoneCode]);

  const prefillDxfZoningFromEstateAddress = useCallback(async () => {
    const zoneCode = await lookupEstateZoneCode();
    if (!zoneCode) {
      return;
    }
    setDxfForm((prev) =>
      prev.zoning.trim()
        ? prev
        : {
            ...prev,
            zoning: zoneCode,
          }
    );
  }, [lookupEstateZoneCode]);

  useEffect(() => {
    handleLoadLots();
  }, [handleLoadLots]);

  const handleManualRecompute = useCallback(async () => {
    if (!estateId) {
      setRecomputeError("Missing estate id.");
      return;
    }
    if (!recomputeEstateDesignOnLot) {
      setRecomputeError("Manual recompute is not available.");
      return;
    }
    setRecomputeLoading(true);
    setRecomputeError(null);
    try {
      const response = await recomputeEstateDesignOnLot(estateId);
      if (response && typeof response === "object") {
        setRecomputeResult(response as Record<string, unknown>);
      } else {
        setRecomputeResult({ result: response });
      }
      await handleLoadLots();
    } catch (error) {
      setRecomputeError(
        error instanceof Error ? error.message : "Failed to recompute designs."
      );
    } finally {
      setRecomputeLoading(false);
    }
  }, [estateId, handleLoadLots, recomputeEstateDesignOnLot]);

  const loadApprovedFloorPlansForLot = useCallback(async (lotId: string) => {
    if (!lotId) {
      setApprovedFloorPlanOptions([]);
      setApprovedFloorPlansLoading(false);
      setApprovedFloorPlansError(null);
      return;
    }

    setApprovedFloorPlansLoading(true);
    setApprovedFloorPlansError(null);
    try {
      const options =
        await adminApi.getApprovedFloorPlansForLot<ApprovedLotFloorPlanOption>(
          lotId
        );
      setApprovedFloorPlanOptions(options);
    } catch (error) {
      setApprovedFloorPlanOptions([]);
      setApprovedFloorPlansError(
        getAdminApiErrorMessage(error, "Failed to load approved floor plans.")
      );
    } finally {
      setApprovedFloorPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    if (
      !editingLotId ||
      normalizeLotSalesMode(lotForm.salesMode) !== "house_and_land"
    ) {
      setApprovedFloorPlanOptions([]);
      setApprovedFloorPlansLoading(false);
      setApprovedFloorPlansError(null);
      return;
    }

    void loadApprovedFloorPlansForLot(editingLotId);
  }, [editingLotId, loadApprovedFloorPlansForLot, lotForm.salesMode]);

  const resetConstraintForm = useCallback(() => {
    setEditingConstraintId(null);
    setConstraintName("");
    setConstraintActive(true);
    setConstraintRulesJson(
      `{
  "minFrontSetbackM": 7.5,
  "maxSiteCoverageRatio": 0.4
}`
    );
    setConstraintNotes("");
    setConstraintEstateRuleSetId("");
    setConstraintErrorMessage(null);
    setConstraintSuccessMessage(null);
    setConstraintRecompute(null);
  }, []);

  const loadLotConstraintContext = useCallback(
    async (lotId: string) => {
      if (!estateId || !lotId) {
        setLotConstraints([]);
        setConstraintRuleSetOptions([]);
        setLotConstraintsLoading(false);
        return;
      }
      setLotConstraintsLoading(true);
      setLotConstraintsError(null);
      try {
        const [constraints, ruleSets] = await Promise.all([
          adminApi.getEstateLotConstraints<LotConstraintRecord>(estateId, {
            lotId,
          }),
          adminApi.getEstateRuleSets<EstateRuleSetRecord>(estateId),
        ]);
        setLotConstraints(
          constraints.filter((item) => String(item.lotId ?? "") === lotId)
        );
        setConstraintRuleSetOptions(ruleSets);
      } catch (error) {
        setLotConstraints([]);
        setConstraintRuleSetOptions([]);
        setLotConstraintsError(
          getAdminApiErrorMessage(error, "Failed to load lot constraints.")
        );
      } finally {
        setLotConstraintsLoading(false);
      }
    },
    [estateId]
  );

  const handleEditConstraint = (constraint: LotConstraintRecord) => {
    setEditingConstraintId(constraint.id);
    setConstraintName(constraint.name ?? "");
    setConstraintActive(constraint.isActive ?? true);
    setConstraintRulesJson(JSON.stringify(constraint.rules ?? {}, null, 2));
    setConstraintNotes(constraint.notes ?? "");
    setConstraintEstateRuleSetId(constraint.estateRuleSetId ?? "");
    setConstraintErrorMessage(null);
    setConstraintSuccessMessage(null);
    setConstraintRecompute(null);
  };

  const handleDeleteConstraint = async (constraintId: string) => {
    if (!estateId || !editingLotId) {
      return;
    }
    const confirmed = window.confirm("Delete this lot constraint?");
    if (!confirmed) {
      return;
    }
    setConstraintDeleteId(constraintId);
    setConstraintErrorMessage(null);
    setConstraintSuccessMessage(null);
    try {
      await adminApi.deleteEstateLotConstraint(estateId, constraintId);
      if (editingConstraintId === constraintId) {
        resetConstraintForm();
      }
      setConstraintSuccessMessage("Lot constraint deleted.");
      await loadLotConstraintContext(editingLotId);
    } catch (error) {
      setConstraintErrorMessage(
        getAdminApiErrorMessage(error, "Failed to delete lot constraint.")
      );
    } finally {
      setConstraintDeleteId(null);
    }
  };

  const handleSaveConstraint = async () => {
    if (!estateId || !editingLotId) {
      setConstraintErrorMessage("Select a saved lot to manage constraints.");
      return;
    }
    const trimmedConstraintName = constraintName.trim();
    if (!trimmedConstraintName) {
      setConstraintErrorMessage("Constraint name is required.");
      return;
    }
    setConstraintSaving(true);
    setConstraintErrorMessage(null);
    setConstraintSuccessMessage(null);
    setConstraintRecompute(null);
    try {
      const rules = parseRulesJson(constraintRulesJson);
      const payload = {
        lotId: editingLotId,
        name: trimmedConstraintName,
        isActive: constraintActive,
        rules,
        notes: constraintNotes.trim() || null,
        estateRuleSetId: constraintEstateRuleSetId.trim() || null,
      };
      const response = editingConstraintId
        ? await adminApi.updateEstateLotConstraint<CreateLotConstraintResponse>(
            estateId,
            editingConstraintId,
            payload
          )
        : await adminApi.createEstateLotConstraint<CreateLotConstraintResponse>(
            estateId,
            payload
          );
      setConstraintSuccessMessage(
        editingConstraintId ? "Lot constraint updated." : "Lot constraint created."
      );
      setConstraintRecompute(
        (response.recompute as Record<string, unknown> | undefined) ?? null
      );
      if (editingConstraintId) {
        setEditingConstraintId(null);
      } else {
        setConstraintName("");
        setConstraintActive(true);
      }
      setConstraintNotes("");
      setConstraintEstateRuleSetId("");
      await loadLotConstraintContext(editingLotId);
    } catch (error) {
      setConstraintErrorMessage(
        getAdminApiErrorMessage(error, "Failed to save lot constraint.")
      );
    } finally {
      setConstraintSaving(false);
    }
  };

  const closeLotForm = useCallback(() => {
    setEditingLotId(null);
    setLotForm(
      createDefaultManualLotForm({
        estateIdValue: estateId ?? "",
        estateNameValue: normalizedEstateName,
        existingLotsCount: 0,
      })
    );
    setShowAdvancedLotFields(false);
    setLotGeometry(null);
    setLotFormError(null);
    setLotFormSuccess(null);
    setApprovedFloorPlanOptions([]);
    setApprovedFloorPlansLoading(false);
    setApprovedFloorPlansError(null);
    setLotSaveRecompute(null);
    setShowLotConstraints(false);
    setLotConstraints([]);
    setConstraintRuleSetOptions([]);
    setLotConstraintsError(null);
    resetConstraintForm();
    setShowLotForm(false);
  }, [estateId, normalizedEstateName, resetConstraintForm]);

  useEffect(() => {
    if (!estateId) {
      return;
    }
    closeLotForm();
    setDxfForm(
      createDxfImportForm({
        estateIdValue: estateId,
        estateNameValue: normalizedEstateName,
      })
    );
    setDxfFile(null);
    setDxfError(null);
    setDxfResult(null);
    setShowDxfImport(false);
    setShowAdvancedDxfOptions(false);
    setRecomputeError(null);
    setRecomputeResult(null);
    void prefillLotZoningFromEstateAddress();
    void prefillDxfZoningFromEstateAddress();
  }, [
    closeLotForm,
    estateId,
    normalizedEstateName,
    prefillDxfZoningFromEstateAddress,
    prefillLotZoningFromEstateAddress,
  ]);

  const openNewLotForm = useCallback(() => {
    setEditingLotId(null);
    setLotForm(
      createDefaultManualLotForm({
        estateIdValue: estateId ?? "",
        estateNameValue: normalizedEstateName,
        existingLotsCount: lots.length,
      })
    );
    setShowAdvancedLotFields(false);
    setLotGeometry(null);
    setLotFormError(null);
    setLotFormSuccess(null);
    setApprovedFloorPlanOptions([]);
    setApprovedFloorPlansLoading(false);
    setApprovedFloorPlansError(null);
    setLotSaveRecompute(null);
    setShowLotConstraints(false);
    setLotConstraints([]);
    setConstraintRuleSetOptions([]);
    setLotConstraintsError(null);
    resetConstraintForm();
    setShowLotForm(true);
    void prefillLotZoningFromEstateAddress();
  }, [
    estateId,
    lots.length,
    normalizedEstateName,
    prefillLotZoningFromEstateAddress,
    resetConstraintForm,
  ]);

  useEffect(() => {
    if (!showLotForm) {
      return;
    }

    const cardElement = lotFormCardRef.current;
    if (!cardElement) {
      return;
    }

    const focusAndScroll = window.requestAnimationFrame(() => {
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      cardElement.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });

      const firstFocusable = cardElement.querySelector<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >("input, select, textarea");

      firstFocusable?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(focusAndScroll);
    };
  }, [editingLotId, showLotForm]);

  const handleDxfFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setDxfFile(file);
    setDxfError(null);
    setDxfResult(null);
  };

  const openDxfImport = () => {
    if (!canImportDxf) {
      return;
    }
    setShowDxfImport(true);
    setShowAdvancedDxfOptions(false);
    setDxfError(null);
    setDxfResult(null);
    void prefillDxfZoningFromEstateAddress();
  };

  const closeDxfImport = () => {
    setShowDxfImport(false);
    setShowAdvancedDxfOptions(false);
    setDxfError(null);
    setDxfResult(null);
  };

  const handleDxfImport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!estateId) {
      setDxfError("Missing estate id.");
      return;
    }
    if (!importLotsDxf) {
      setDxfError("DXF import is not available.");
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

    const normalizedLifecycleStage = normalizeLotLifecycle(
      dxfForm.lifecycleStage
    );
    if (!normalizedLifecycleStage) {
      setDxfError(
        "Lifecycle stage must be one of: Available, Reserved, or Sold."
      );
      setDxfImporting(false);
      return;
    }

    const addField = (key: string, value: string | number | null) => {
      if (value === null || value === undefined) {
        return;
      }
      const stringValue =
        typeof value === "string" ? value.trim() : String(value);
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
    addField("lotType", dxfForm.lotType);
    addField("lifecycleStage", normalizedLifecycleStage);
    addField("layer", dxfForm.layer);
    addField("minArea", minAreaValue);
    addField("sourceSrid", sourceSridValue);
    addField("targetSrid", targetSridValue);
    formData.append("dropLargest", dxfForm.dropLargest ? "true" : "false");

    try {
      const result = await importLotsDxf(estateId, formData);
      setDxfResult(result);
      await handleLoadLots();
    } catch (error) {
      setDxfError(
        error instanceof Error ? error.message : "Failed to import DXF."
      );
    } finally {
      setDxfImporting(false);
    }
  };

  const handleEditLot = async (lot: EstateLotRecord) => {
    const lotId = String(lot.id ?? "");
    setEditingLotId(lotId);
    setLotForm(buildLotForm(lot, estateId ?? ""));
    setShowAdvancedLotFields(false);
    setLotGeometry(
      ((lot as { geometry?: Record<string, unknown> }).geometry as
        | Record<string, unknown>
        | undefined) ?? null
    );
    setLotFormError(null);
    setLotFormSuccess(null);
    setApprovedFloorPlanOptions([]);
    setApprovedFloorPlansLoading(false);
    setApprovedFloorPlansError(null);
    setLotSaveRecompute(null);
    setShowLotConstraints(false);
    resetConstraintForm();
    setShowLotForm(true);
    if (lotId) {
      await loadLotConstraintContext(lotId);
    }
  };

  const handleSaveLot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLotSaving(true);
    setLotFormError(null);
    setLotFormSuccess(null);
    setLotSaveRecompute(null);

    const trimmedZoning = lotForm.zoning.trim();
    if (!trimmedZoning) {
      setLotFormError("Zoning is required.");
      setLotSaving(false);
      return;
    }

    const trimmedLotType = lotForm.lotType.trim();
    if (!trimmedLotType) {
      setLotFormError("Lot type is required.");
      setLotSaving(false);
      return;
    }

    const trimmedLifecycleStage = lotForm.lifecycleStage.trim();
    if (!trimmedLifecycleStage) {
      setLotFormError("Lifecycle stage is required.");
      setLotSaving(false);
      return;
    }
    const normalizedLifecycleStage = normalizeLotLifecycle(trimmedLifecycleStage);
    if (!normalizedLifecycleStage) {
      setLotFormError(
        "Lifecycle stage must be one of: Available, Reserved, or Sold."
      );
      setLotSaving(false);
      return;
    }
    const normalizedSalesMode = normalizeLotSalesMode(lotForm.salesMode.trim());
    if (!normalizedSalesMode) {
      setLotFormError("Sales mode must be either Land Sale or House & Land.");
      setLotSaving(false);
      return;
    }
    const houseAndLandFloorPlanId = normalizeOptional(
      lotForm.houseAndLandFloorPlanId
    );
    if (
      editingLotId &&
      normalizedSalesMode === "house_and_land" &&
      !houseAndLandFloorPlanId
    ) {
      setLotFormError(
        "Select an approved floor plan before saving a House & Land lot."
      );
      setLotSaving(false);
      return;
    }

    const areaValueRaw = normalizeOptionalNumber(lotForm.areaSqm);
    if (areaValueRaw === undefined) {
      setLotFormError("Area (sqm) must be a number.");
      setLotSaving(false);
      return;
    }
    const priceValue = normalizeOptionalNumber(lotForm.price);
    if (priceValue === undefined || (priceValue !== null && !Number.isInteger(priceValue))) {
      setLotFormError("Price must be a whole-dollar amount.");
      setLotSaving(false);
      return;
    }

    const estateIdValue = resolveIdValue((estateId ?? "").trim());
    if (estateIdValue === null) {
      setLotFormError("Missing estate id.");
      setLotSaving(false);
      return;
    }
    if (!editingLotId && !enableManualLotEntry) {
      setLotFormError("Manual lot entry is temporarily disabled.");
      setLotSaving(false);
      return;
    }
    const blockNumberValue = normalizeOptionalNumber(lotForm.blockNumber);
    if (blockNumberValue === undefined) {
      setLotFormError("Block number must be a number.");
      setLotSaving(false);
      return;
    }
    const areaValue = areaValueRaw ?? 1;
    const fallbackBlockNumber = blockNumberValue ?? lots.length + 1;
    const trimmedBlockKey =
      lotForm.blockKey.trim() ||
      createGeneratedBlockKey({
        estateIdValue: String(estateIdValue),
        estateNameValue: normalizedEstateName,
        blockNumberValue: fallbackBlockNumber,
      });

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
    const frontageMResult = parseOptionalNumberField(
      lotForm.frontageM,
      "Frontage (m)"
    );
    if (!frontageMResult.ok) {
      setLotSaving(false);
      return;
    }
    const normalizedFrontageCoordinate = normalizeOptional(
      lotForm.frontageCoordinate
    );
    if (normalizedFrontageCoordinate && !frontageLine) {
      setLotFormError(
        "Frontage coordinate must be a valid GeoJSON LineString."
      );
      setLotSaving(false);
      return;
    }
    const lotMetadata = {
      type: trimmedLotType,
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
      frontageCoordinate: normalizedFrontageCoordinate,
      highFall: lotForm.highFall,
    };

    const hasMetadataValue = Object.entries(lotMetadata)
      .filter(
        ([key]) =>
          key !== "highFall" &&
          key !== "type" &&
          key !== "frontageCoordinate"
      )
      .some(([, value]) => value !== null && value !== undefined && value !== "");
    const sValues = [
      s1Result.value,
      s2Result.value,
      s3Result.value,
      s4Result.value,
    ];
    const hasSValues = sValues.some((value) => value !== null);
    const hasDimensions = widthResult.value !== null || depthResult.value !== null;
    const hasGeojsonExtras =
      hasMetadataValue || lotForm.highFall || hasSValues || hasDimensions;

    const payload: Record<string, unknown> = {
      blockKey: trimmedBlockKey,
      areaSqm: areaValue,
      salesMode: normalizedSalesMode,
      price: priceValue,
      zoning: trimmedZoning,
      estateId: estateIdValue,
      blockNumber: blockNumberValue,
      sectionNumber: sectionNumberValue,
      address: normalizeOptional(lotForm.address),
      district: normalizeOptional(lotForm.district),
      division: normalizeOptional(lotForm.division),
      lifecycleStage: normalizedLifecycleStage,
      overlays: parseOverlays(lotForm.overlays),
      frontageM: frontageMResult.value,
      lotType: trimmedLotType,
      roadFacing: normalizeOptional(lotForm.roadFacing),
      precinct: normalizeOptional(lotForm.precinct),
      frontageCoordinate: normalizedFrontageCoordinate
        ? {
            type: "LineString",
            coordinates: frontageLine,
          }
        : null,
    };
    if (editingLotId) {
      payload.houseAndLandFloorPlanId =
        normalizedSalesMode === "house_and_land"
          ? houseAndLandFloorPlanId
          : null;
    }

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
      let response: unknown;
      if (editingLotId) {
        response = await updateLot(String(editingLotId), payload);
        setLotFormSuccess("Lot updated.");
      } else {
        response = await createLot(payload as CreateLotInput);
        openNewLotForm();
        setLotFormSuccess("Lot created.");
      }
      const recompute = (
        response &&
        typeof response === "object" &&
        "recompute" in response
          ? (response as { recompute?: Record<string, unknown> }).recompute
          : null
      ) as Record<string, unknown> | null;
      if (recompute) {
        setLotSaveRecompute(recompute);
      }
      await handleLoadLots();
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
      await deleteLot(deleteId);
      await handleLoadLots();
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

  const handleDeleteAllLots = async () => {
    if (!estateId || !deleteAllLots) {
      return;
    }
    const confirmed = window.confirm(
      "This is not undoable and will remove all of your lots, are you sure?"
    );
    if (!confirmed) {
      return;
    }
    setLotBulkDeleteLoading(true);
    setLotFormError(null);
    setLotFormSuccess(null);
    try {
      const response = await deleteAllLots(estateId);
      await handleLoadLots();
      closeLotForm();
      const deletedCount =
        response &&
        typeof response === "object" &&
        "deleted" in response &&
        typeof (response as { deleted?: unknown }).deleted === "number"
          ? (response as { deleted: number }).deleted
          : lots.length;
      setLotFormSuccess(
        deletedCount === 1 ? "1 lot deleted." : `${deletedCount} lots deleted.`
      );
    } catch (error) {
      setLotFormError(
        error instanceof Error ? error.message : "Failed to delete all lots."
      );
    } finally {
      setLotBulkDeleteLoading(false);
    }
  };

  const filteredLots = useMemo(() => {
    const needle = lotFilter.trim().toLowerCase();
    const nextLots = !needle
      ? [...lots]
      : lots.filter((lot) => {
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
            String(getLotBlockNumberValue(lot) ?? "").toLowerCase(),
            address,
            String(lot.zoning ?? "").toLowerCase(),
            String(
              normalizeLotLifecycle(lot.lifecycleStage ?? lot.status) ??
                lot.lifecycleStage ??
                lot.status ??
                ""
            ).toLowerCase(),
            String(lot.blockKey ?? "").toLowerCase(),
          ];
          return haystacks.some((value) => value.includes(needle));
        });

    const getSortValue = (lot: EstateLotRecord): string | number | null => {
      switch (lotSortField) {
        case "blockKey":
          return String(lot.blockKey ?? "").trim() || null;
        case "blockNumber":
          return getLotBlockNumberValue(lot);
        case "address": {
          const address =
            lot.address ??
            (lot as { ADDRESSES?: string | null }).ADDRESSES ??
            (lot as { addressLine?: string | null }).addressLine;
          return String(address ?? "").trim() || null;
        }
        case "stage": {
          const rawValue =
            lot.lifecycleStage ?? lot.status ?? (lot as { stage?: string }).stage;
          const normalized = normalizeLotLifecycle(rawValue);
          return normalized ? getLotLifecycleLabel(normalized) : String(rawValue ?? "").trim() || null;
        }
        case "salesMode": {
          const normalized = normalizeLotSalesMode(lot.salesMode);
          return normalized ? getLotSalesModeLabel(normalized) : null;
        }
        case "price":
          return typeof lot.price === "number" && Number.isFinite(lot.price)
            ? lot.price
            : null;
        case "zoning":
          return String(lot.zoning ?? "").trim() || null;
        case "areaSqm": {
          const rawValue =
            lot.areaSqm ??
            (lot as { area?: number | string }).area ??
            (lot as { BLOCK_DERIVED_AREA?: string }).BLOCK_DERIVED_AREA;
          if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
            return rawValue;
          }
          if (typeof rawValue === "string" && rawValue.trim()) {
            const parsed = Number(rawValue);
            return Number.isFinite(parsed) ? parsed : rawValue.trim();
          }
          return null;
        }
        default:
          return null;
      }
    };

    nextLots.sort((left, right) => {
      const leftValue = getSortValue(left);
      const rightValue = getSortValue(right);

      if (leftValue == null && rightValue == null) {
        return 0;
      }
      if (leftValue == null) {
        return 1;
      }
      if (rightValue == null) {
        return -1;
      }

      let comparison = 0;
      if (typeof leftValue === "number" && typeof rightValue === "number") {
        comparison = leftValue - rightValue;
      } else {
        comparison = String(leftValue).localeCompare(String(rightValue), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }

      return lotSortDirection === "asc" ? comparison : -comparison;
    });

    return nextLots;
  }, [lotFilter, lotSortDirection, lotSortField, lots]);

  const toggleLotSort = useCallback((field: LotSortField) => {
    setLotSortField((currentField) => {
      if (currentField === field) {
        setLotSortDirection((currentDirection) =>
          currentDirection === "asc" ? "desc" : "asc"
        );
        return currentField;
      }

      setLotSortDirection("asc");
      return field;
    });
  }, []);

  const getLotSortIndicator = useCallback(
    (field: LotSortField) => {
      if (lotSortField !== field) {
        return "↕";
      }
      return lotSortDirection === "asc" ? "↑" : "↓";
    },
    [lotSortDirection, lotSortField]
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold">Lots</h2>
          <p className="text-sm text-muted-foreground">
            {lotsLoading
              ? "Loading lots..."
              : `${lots.length} lot${lots.length === 1 ? "" : "s"} linked`}
          </p>
          <p className="text-xs text-slate-500 mt-1 mb-0">
            Use DXF import as the primary workflow.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8 px-2 text-xs"
            label={lotsPanelCollapsed ? "Show lots" : "Hide lots"}
            aria-expanded={!lotsPanelCollapsed}
            onClick={() => setLotsPanelCollapsed((value) => !value)}
          />
          {!lotsPanelCollapsed && (
            <>
              <Input
                value={lotFilter}
                onChange={(event) => setLotFilter(event.target.value)}
                placeholder="Filter by block number, address, block key, or zoning"
                className="min-w-[240px]"
              />
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-2 text-xs"
                label="Refresh"
                onClick={handleLoadLots}
                disabled={lotsLoading}
                loading={lotsLoading}
              />
            </>
          )}
          {!lotsPanelCollapsed && enableManualLotEntry && (
            <Button
              type="button"
              onClick={showLotForm ? closeLotForm : openNewLotForm}
              variant={showLotForm ? "outline" : "ghost"}
              className="h-8 px-2 text-xs"
              label={showLotForm ? "Close manual entry" : "Manual entry"}
            />
          )}
          {!lotsPanelCollapsed && canImportDxf && (
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2 text-xs"
              label="Import DXF"
              onClick={openDxfImport}
            />
          )}
          {!lotsPanelCollapsed && recomputeEstateDesignOnLot && (
            <Button
              type="button"
              variant="outline"
              className="h-8 px-2 text-xs"
              label="Recompute matches"
              onClick={handleManualRecompute}
              disabled={recomputeLoading}
              loading={recomputeLoading}
            />
          )}
          {!lotsPanelCollapsed && deleteAllLots && estateId && (
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2 text-xs border-red-200 text-red-700 hover:bg-red-600 hover:text-white focus-visible:bg-red-600 focus-visible:text-white"
              label="Delete all lots"
              onClick={handleDeleteAllLots}
              disabled={lotBulkDeleteLoading || lots.length === 0}
              loading={lotBulkDeleteLoading}
            />
          )}
        </div>
      </div>

      {lotsPanelCollapsed ? (
        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Lot editing is hidden. Use "Show lots" when you need to review,
          import, or edit the estate lot records.
        </div>
      ) : (
        <>
      {lotsErrorMessage && (
        <div className="mb-3 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {lotsErrorMessage}
        </div>
      )}
      {recomputeError && (
        <div className="mb-3 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {recomputeError}
        </div>
      )}
      {recomputeResult && (
        <div className="mb-3">
          <RecomputeSummaryCard
            summary={recomputeResult}
            title="Recompute summary"
          />
        </div>
      )}

      {showDxfImport && canImportDxf && (
        <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
            <div>
              <h3 className="font-semibold text-base">Import lots from DXF</h3>
              <p className="text-sm text-muted-foreground">
                Upload a DXF with lot boundaries. Geometry and side lengths are
                generated automatically.
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
            Please ensure the DXF only has valid lot boundaries.
          </p>
          <form onSubmit={handleDxfImport} className="grid gap-4">
            <div className="grid gap-2">
              <span className="text-sm font-medium">DXF File</span>
              <input
                type="file"
                accept=".dxf"
                onChange={handleDxfFileChange}
                className="w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm file:mr-3 file:rounded-sm file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Options set below will be defaults that will be applied
              to all imported lots.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <span className="text-sm font-medium">Zoning</span>
                <Input
                  value={dxfForm.zoning}
                  onChange={(event) =>
                    setDxfForm((prev) => ({
                      ...prev,
                      zoning: event.target.value,
                    }))
                  }
                  placeholder="R1"
                  className="w-full"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Lot type</span>
                <select
                  value={dxfForm.lotType}
                  onChange={(event) =>
                    setDxfForm((prev) => ({
                      ...prev,
                      lotType: event.target.value,
                    }))
                  }
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {LOT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Lifecycle stage</span>
                <select
                  value={dxfForm.lifecycleStage}
                  onChange={(event) =>
                    setDxfForm((prev) => ({
                      ...prev,
                      lifecycleStage: event.target.value,
                    }))
                  }
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">No default</option>
                  {LIFECYCLE_STAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex">
              <Button
                type="button"
                variant="outline"
                className="h-8 px-2 text-xs"
                label={
                  showAdvancedDxfOptions
                    ? "Hide advanced import options"
                    : "Show advanced import options"
                }
                onClick={() =>
                  setShowAdvancedDxfOptions((previous) => !previous)
                }
              />
            </div>
            {showAdvancedDxfOptions && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                  placeholder={createDefaultBlockKeyPrefix({
                    estateIdValue: estateId ?? '',
                    estateNameValue: normalizedEstateName || null,
                  })}
                  className="w-full"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">
                  Starting block number (optional)
                </span>
                <Input
                  value={dxfForm.blockNumber}
                  onChange={(event) =>
                    setDxfForm((prev) => ({
                      ...prev,
                      blockNumber: event.target.value,
                    }))
                  }
                  placeholder="1"
                  className="w-full"
                />
                <span className="text-xs text-slate-500">
                  Imported lots increment from this number (for example 1, 2,
                  3...). Leave blank to auto-start from the next available
                  block number for this estate.
                </span>
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
                  placeholder="5"
                  className="w-full"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Address</span>
                <Input
                  value={dxfForm.address}
                  onChange={(event) =>
                    setDxfForm((prev) => ({
                      ...prev,
                      address: event.target.value,
                    }))
                  }
                  placeholder="123 Main St"
                  className="w-full"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">District</span>
                <Input
                  value={dxfForm.district}
                  onChange={(event) =>
                    setDxfForm((prev) => ({
                      ...prev,
                      district: event.target.value,
                    }))
                  }
                  placeholder="North"
                  className="w-full"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Division</span>
                <Input
                  value={dxfForm.division}
                  onChange={(event) =>
                    setDxfForm((prev) => ({
                      ...prev,
                      division: event.target.value,
                    }))
                  }
                  placeholder="Section A"
                  className="w-full"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Layer</span>
                <Input
                  value={dxfForm.layer}
                  onChange={(event) =>
                    setDxfForm((prev) => ({
                      ...prev,
                      layer: event.target.value,
                    }))
                  }
                  placeholder="LOT-BOUNDARY"
                  className="w-full"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Minimum area</span>
                <Input
                  value={dxfForm.minArea}
                  onChange={(event) =>
                    setDxfForm((prev) => ({
                      ...prev,
                      minArea: event.target.value,
                    }))
                  }
                  placeholder="1"
                  className="w-full"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Source SRID</span>
                <Input
                  value={dxfForm.sourceSrid}
                  onChange={(event) =>
                    setDxfForm((prev) => ({
                      ...prev,
                      sourceSrid: event.target.value,
                    }))
                  }
                  placeholder="28355"
                  className="w-full"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Target SRID</span>
                <Input
                  value={dxfForm.targetSrid}
                  onChange={(event) =>
                    setDxfForm((prev) => ({
                      ...prev,
                      targetSrid: event.target.value,
                    }))
                  }
                  placeholder="4326"
                  className="w-full"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Drop largest</span>
                <select
                  value={dxfForm.dropLargest ? "true" : "false"}
                  onChange={(event) =>
                    setDxfForm((prev) => ({
                      ...prev,
                      dropLargest: event.target.value === "true",
                    }))
                  }
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                disabled={dxfImporting}
                loading={dxfImporting}
                label="Import DXF lots"
              />
              {dxfError && (
                <span className="text-sm text-destructive">{dxfError}</span>
              )}
              {dxfResult && (
                <span className="text-sm text-emerald-600">
                  Imported {dxfResult.created ?? 0} lot
                  {(dxfResult.created ?? 0) === 1 ? "" : "s"}
                  {dxfResult.recompute
                    ? `. Recompute: ${dxfResult.recompute.pass ?? 0} pass / ${
                        dxfResult.recompute.fail ?? 0
                      } fail / ${dxfResult.recompute.manualReview ?? 0} manual review.`
                    : "."}
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {showLotForm && (enableManualLotEntry || Boolean(editingLotId)) && (
        <div
          ref={lotFormCardRef}
          className="mb-4 rounded-lg border border-slate-100 bg-slate-50 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold text-base">
                {editingLotId ? "Edit lot" : "Manual lot entry"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {editingLotId
                  ? "Update this lot's details."
                  : "Use this for one-off exceptions. DXF import is recommended for normal onboarding."}
              </p>
            </div>
            {enableManualLotEntry && (
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
              variant="outline"
              className="h-8 px-2 text-xs"
              label="Close"
              onClick={closeLotForm}
            />
          </div>

          <form onSubmit={handleSaveLot} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                  placeholder="NE-12-3"
                  className="w-full"
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
                  placeholder="1"
                  className="w-full"
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
                  placeholder="450"
                  className="w-full"
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
                  placeholder="R1"
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
                  placeholder="Lot 1, Main St"
                  className="w-full"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Lot type *</span>
                <select
                  value={lotForm.lotType}
                  onChange={(event) =>
                    setLotForm((prev) => ({
                      ...prev,
                      lotType: event.target.value,
                    }))
                  }
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select lot type</option>
                  {LOT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                  {lotForm.lotType &&
                    !LOT_TYPE_OPTIONS.some(
                      (option) => option.value === lotForm.lotType
                    ) && <option value={lotForm.lotType}>{lotForm.lotType}</option>}
                </select>
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Lifecycle stage *</span>
                <select
                  value={lotForm.lifecycleStage}
                  onChange={(event) =>
                    setLotForm((prev) => ({
                      ...prev,
                      lifecycleStage: event.target.value,
                    }))
                  }
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select lifecycle stage</option>
                  {LIFECYCLE_STAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                  {lotForm.lifecycleStage &&
                    !LIFECYCLE_STAGE_OPTIONS.some(
                      (option) => option.value === lotForm.lifecycleStage
                    ) && (
                      <option value={lotForm.lifecycleStage}>
                        {lotForm.lifecycleStage}
                      </option>
                  )}
                </select>
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Sales mode *</span>
                <select
                  value={lotForm.salesMode}
                  onChange={(event) =>
                    setLotForm((prev) => ({
                      ...prev,
                      salesMode: event.target.value,
                      houseAndLandFloorPlanId:
                        normalizeLotSalesMode(event.target.value) ===
                        "house_and_land"
                          ? prev.houseAndLandFloorPlanId
                          : "",
                    }))
                  }
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {SALES_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {normalizeLotSalesMode(lotForm.salesMode) ===
                "house_and_land" && (
                <div className="grid gap-2 md:col-span-2 lg:col-span-2">
                  <span className="text-sm font-medium">
                    House &amp; Land floor plan *
                  </span>
                  <select
                    value={lotForm.houseAndLandFloorPlanId}
                    onChange={(event) =>
                      setLotForm((prev) => ({
                        ...prev,
                        houseAndLandFloorPlanId: event.target.value,
                      }))
                    }
                    disabled={!editingLotId || approvedFloorPlansLoading}
                    className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">
                      {approvedFloorPlansLoading
                        ? "Loading approved floor plans..."
                        : "Select approved floor plan"}
                    </option>
                    {lotForm.houseAndLandFloorPlanId &&
                      !approvedFloorPlanOptions.some(
                        (option) =>
                          option.floorPlanId === lotForm.houseAndLandFloorPlanId
                      ) && (
                        <option value={lotForm.houseAndLandFloorPlanId}>
                          Selected floor plan unavailable
                        </option>
                      )}
                    {approvedFloorPlanOptions.map((option) => (
                      <option key={option.floorPlanId} value={option.floorPlanId}>
                        {formatApprovedFloorPlanOption(option)}
                      </option>
                    ))}
                  </select>
                  {!editingLotId && (
                    <span className="text-xs text-slate-500">
                      Save the lot first, then choose from approved compatible
                      floor plans.
                    </span>
                  )}
                  {editingLotId &&
                    !approvedFloorPlansLoading &&
                    !approvedFloorPlansError &&
                    approvedFloorPlanOptions.length === 0 && (
                      <span className="text-xs text-amber-700">
                        No approved compatible floor plans are available for
                        this lot.
                      </span>
                    )}
                  {approvedFloorPlansError && (
                    <span className="text-xs text-red-600">
                      {approvedFloorPlansError}
                    </span>
                  )}
                </div>
              )}
              <div className="grid gap-2">
                <span className="text-sm font-medium">Price</span>
                <Input
                  value={lotForm.price}
                  onChange={(event) =>
                    setLotForm((prev) => ({
                      ...prev,
                      price: event.target.value,
                    }))
                  }
                  placeholder="650000"
                  className="w-full"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Road facing</span>
                <Input
                  value={lotForm.roadFacing}
                  onChange={(event) =>
                    setLotForm((prev) => ({
                      ...prev,
                      roadFacing: event.target.value,
                    }))
                  }
                  placeholder="Street name"
                  className="w-full"
                />
              </div>
              <div className="grid gap-2 md:col-span-2 lg:col-span-2">
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
                  placeholder="Flood, Heritage"
                  className="w-full"
                />
                <span className="text-xs text-slate-500">
                  Leave blank if no overlays apply.
                </span>
              </div>
            </div>
            {editingLotId && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 px-2 text-xs"
                  label={
                    showAdvancedLotFields
                      ? "Hide advanced fields"
                      : "Show advanced fields"
                  }
                  onClick={() =>
                    setShowAdvancedLotFields((previous) => !previous)
                  }
                />
                <span className="text-xs text-slate-500">
                  Show or hide full lot metadata and geometry fields.
                </span>
              </div>
            )}
            {showAllLotFields && (
              <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                  placeholder="5"
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
                  placeholder="North"
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
                  placeholder="Section A"
                  className="w-full"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Width</span>
                <Input
                  value={lotForm.width}
                  onChange={(event) =>
                    setLotForm((prev) => ({
                      ...prev,
                      width: event.target.value,
                    }))
                  }
                  placeholder="14"
                  className="w-full"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Depth</span>
                <Input
                  value={lotForm.depth}
                  onChange={(event) =>
                    setLotForm((prev) => ({
                      ...prev,
                      depth: event.target.value,
                    }))
                  }
                  placeholder="30"
                  className="w-full"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">S1</span>
                <Input
                  value={lotForm.s1}
                  onChange={(event) =>
                    setLotForm((prev) => ({
                      ...prev,
                      s1: event.target.value,
                    }))
                  }
                  placeholder="0"
                  className="w-full"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">S2</span>
                <Input
                  value={lotForm.s2}
                  onChange={(event) =>
                    setLotForm((prev) => ({
                      ...prev,
                      s2: event.target.value,
                    }))
                  }
                  placeholder="0"
                  className="w-full"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">S3</span>
                <Input
                  value={lotForm.s3}
                  onChange={(event) =>
                    setLotForm((prev) => ({
                      ...prev,
                      s3: event.target.value,
                    }))
                  }
                  placeholder="0"
                  className="w-full"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">S4</span>
                <Input
                  value={lotForm.s4}
                  onChange={(event) =>
                    setLotForm((prev) => ({
                      ...prev,
                      s4: event.target.value,
                    }))
                  }
                  placeholder="0"
                  className="w-full"
                />
              </div>
              <div className="grid gap-2 md:col-span-2 lg:col-span-2">
                <span className="text-sm font-medium">Lot boundary preview</span>
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  {frontagePreview.error || !frontageEdges ? (
                    <p className="text-xs text-slate-500">
                      {frontagePreview.error || "Unable to render lot preview."}
                    </p>
                  ) : (
                    <svg
                      width={frontageEdges.viewWidth}
                      height={frontageEdges.viewHeight}
                      viewBox={`0 0 ${frontageEdges.viewWidth} ${frontageEdges.viewHeight}`}
                      className="mx-auto pointer-events-auto"
                    >
                      <polygon
                        points={frontageEdges.polygonPoints}
                        fill="#E2E8F0"
                        stroke="#94A3B8"
                        strokeWidth={1.5}
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
                            stroke={selected ? "#0F766E" : "#64748B"}
                            strokeWidth={selected ? 4 : 2}
                            strokeLinecap="round"
                            className="cursor-pointer pointer-events-auto"
                            onClick={(event) => {
                              if (!frontageEdges) {
                                return;
                              }
                              const nextLine = event.shiftKey
                                ? extendFrontageLine(frontageLine, edge)
                                : [edge[0], edge[1]];
                              const payload = JSON.stringify(
                                {
                                  type: "LineString",
                                  coordinates: nextLine,
                                },
                                null,
                                2
                              );
                              setLotForm((prev) => ({
                                ...prev,
                                frontageCoordinate: payload,
                              }));
                            }}
                          />
                        );
                      })}
                    </svg>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Click an edge to set the frontage line. Shift-click to extend
                  the current line.
                </p>
                <div>
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
              <div className="grid gap-2 md:col-span-2 lg:col-span-1">
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="grid gap-2">
                <span className="text-sm font-medium">Frontage (m)</span>
                <Input
                  value={lotForm.frontageM}
                  onChange={(event) =>
                    setLotForm((prev) => ({
                      ...prev,
                      frontageM: event.target.value,
                    }))
                  }
                  type="number"
                  step="0.1"
                  placeholder="18.2"
                  className="w-full"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Precinct</span>
                <Input
                  value={lotForm.precinct}
                  onChange={(event) =>
                    setLotForm((prev) => ({
                      ...prev,
                      precinct: event.target.value,
                    }))
                  }
                  placeholder="Stage 1"
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
                <span className="text-sm font-medium">
                  Side yard setback (min)
                </span>
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
                <span className="text-sm font-medium">
                  Rear yard setback (min)
                </span>
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
              </>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                disabled={lotSaving}
                loading={lotSaving}
                label={editingLotId ? "Save changes" : "Create lot"}
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
                <span className="text-sm text-destructive">{lotFormError}</span>
              )}
              {lotFormSuccess && (
                <span className="text-sm text-emerald-600">
                  {lotFormSuccess}
                </span>
              )}
              {lotFormSuccess && recomputeEstateDesignOnLot && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 px-2 text-xs"
                  label="Recompute now"
                  onClick={handleManualRecompute}
                  disabled={recomputeLoading}
                  loading={recomputeLoading}
                />
              )}
            </div>
            {lotSaveRecompute && (
              <RecomputeSummaryCard
                summary={lotSaveRecompute}
                title="Lot save recompute summary"
              />
            )}
            {editingLotId && (
              <div className="md:col-span-2 rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-sm font-semibold m-0">Lot Constraints</h3>
                    <p className="text-xs text-slate-500 mt-1 mb-0">
                      Manage formal S88B-style constraints for this lot.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 px-2 text-xs"
                      label={showLotConstraints ? "Hide" : "Manage"}
                      onClick={() => setShowLotConstraints((prev) => !prev)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 px-2 text-xs"
                      label="Refresh"
                      onClick={() => loadLotConstraintContext(editingLotId)}
                      disabled={lotConstraintsLoading}
                      loading={lotConstraintsLoading}
                    />
                  </div>
                </div>

                {lotConstraintsError && (
                  <div className="mb-3 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-600">
                    {lotConstraintsError}
                  </div>
                )}

                {showLotConstraints && (
                  <div className="grid gap-4">
                    <div className="overflow-auto border rounded-lg bg-white">
                      <table className="w-full border-collapse min-w-[620px]">
                        <thead>
                          <tr className="bg-slate-100 text-left">
                            <th className="p-2 border-b text-xs font-medium text-slate-700">
                              Name
                            </th>
                            <th className="p-2 border-b text-xs font-medium text-slate-700">
                              Active
                            </th>
                            <th className="p-2 border-b text-xs font-medium text-slate-700">
                              Rule Set
                            </th>
                            <th className="p-2 border-b text-xs font-medium text-slate-700">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {lotConstraints.map((item) => (
                            <tr key={item.id}>
                              <td className="p-2 border-b border-slate-100 text-sm">
                                {item.name ?? "--"}
                              </td>
                              <td className="p-2 border-b border-slate-100 text-sm">
                                {typeof item.isActive === "boolean"
                                  ? String(item.isActive)
                                  : "--"}
                              </td>
                              <td className="p-2 border-b border-slate-100 text-xs font-mono">
                                {item.estateRuleSetId ?? "--"}
                              </td>
                              <td className="p-2 border-b border-slate-100 text-sm">
                                <div className="flex flex-wrap gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs"
                                    label="Edit"
                                    onClick={() => handleEditConstraint(item)}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs text-destructive hover:bg-red-50 hover:text-destructive"
                                    label="Delete"
                                    onClick={() => handleDeleteConstraint(item.id)}
                                    disabled={constraintDeleteId === item.id}
                                    loading={constraintDeleteId === item.id}
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                          {lotConstraints.length === 0 && (
                            <tr>
                              <td
                                colSpan={4}
                                className="p-3 text-center text-sm text-muted-foreground"
                              >
                                No constraints for this lot.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid gap-3">
                      <div className="flex flex-wrap gap-2">
                        {editingConstraintId && (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 px-2 text-xs"
                            label="Cancel edit"
                            onClick={resetConstraintForm}
                          />
                        )}
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="grid gap-2">
                          <span className="text-sm font-medium">Constraint name *</span>
                          <Input
                            value={constraintName}
                            onChange={(event) =>
                              setConstraintName(event.target.value)
                            }
                            className="w-full"
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <span className="text-sm font-medium">Active</span>
                          <select
                            value={constraintActive ? "true" : "false"}
                            onChange={(event) =>
                              setConstraintActive(event.target.value === "true")
                            }
                            className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        </div>
                        <div className="grid gap-2 md:col-span-2">
                          <span className="text-sm font-medium">Estate rule set</span>
                          <select
                            value={constraintEstateRuleSetId}
                            onChange={(event) =>
                              setConstraintEstateRuleSetId(event.target.value)
                            }
                            className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="">(none)</option>
                            {constraintRuleSetOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {`${option.name ?? "Unnamed"} v${option.version ?? "--"}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <span className="text-sm font-medium">Rules JSON *</span>
                        <RuleLayerEditor
                          value={constraintRulesJson}
                          onChange={setConstraintRulesJson}
                          idPrefix={`lot-constraint-${editingLotId}`}
                        />
                      </div>
                      <div className="grid gap-2">
                        <span className="text-sm font-medium">Notes</span>
                        <Input
                          value={constraintNotes}
                          onChange={(event) =>
                            setConstraintNotes(event.target.value)
                          }
                          className="w-full"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          onClick={handleSaveConstraint}
                          disabled={constraintSaving}
                          loading={constraintSaving}
                          label={
                            editingConstraintId
                              ? "Update lot constraint"
                              : "Create lot constraint"
                          }
                        />
                        {constraintErrorMessage && (
                          <span className="text-sm text-destructive">
                            {constraintErrorMessage}
                          </span>
                        )}
                        {constraintSuccessMessage && (
                          <span className="text-sm text-emerald-600">
                            {constraintSuccessMessage}
                          </span>
                        )}
                      </div>
                      {constraintRecompute && (
                        <RecomputeSummaryCard
                          summary={constraintRecompute}
                          title="Constraint recompute summary"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      )}

      <div className="overflow-auto border rounded-lg">
        <table className="w-full border-collapse min-w-[960px]">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="p-3 border-b font-medium text-sm text-slate-700">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-medium hover:text-slate-900"
                  onClick={() => toggleLotSort("blockKey")}
                >
                  <span>Block Key</span>
                  <span aria-hidden="true">{getLotSortIndicator("blockKey")}</span>
                </button>
              </th>
              <th className="p-3 border-b font-medium text-sm text-slate-700">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-medium hover:text-slate-900"
                  onClick={() => toggleLotSort("blockNumber")}
                >
                  <span>Block Number</span>
                  <span aria-hidden="true">{getLotSortIndicator("blockNumber")}</span>
                </button>
              </th>
              <th className="p-3 border-b font-medium text-sm text-slate-700">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-medium hover:text-slate-900"
                  onClick={() => toggleLotSort("address")}
                >
                  <span>Address</span>
                  <span aria-hidden="true">{getLotSortIndicator("address")}</span>
                </button>
              </th>
              <th className="p-3 border-b font-medium text-sm text-slate-700">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-medium hover:text-slate-900"
                  onClick={() => toggleLotSort("stage")}
                >
                  <span>Stage</span>
                  <span aria-hidden="true">{getLotSortIndicator("stage")}</span>
                </button>
              </th>
              <th className="p-3 border-b font-medium text-sm text-slate-700">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-medium hover:text-slate-900"
                  onClick={() => toggleLotSort("salesMode")}
                >
                  <span>Sales Mode</span>
                  <span aria-hidden="true">{getLotSortIndicator("salesMode")}</span>
                </button>
              </th>
              <th className="p-3 border-b font-medium text-sm text-slate-700">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-medium hover:text-slate-900"
                  onClick={() => toggleLotSort("price")}
                >
                  <span>Price</span>
                  <span aria-hidden="true">{getLotSortIndicator("price")}</span>
                </button>
              </th>
              <th className="p-3 border-b font-medium text-sm text-slate-700">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-medium hover:text-slate-900"
                  onClick={() => toggleLotSort("zoning")}
                >
                  <span>Zoning</span>
                  <span aria-hidden="true">{getLotSortIndicator("zoning")}</span>
                </button>
              </th>
              <th className="p-3 border-b font-medium text-sm text-slate-700">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-medium hover:text-slate-900"
                  onClick={() => toggleLotSort("areaSqm")}
                >
                  <span>Area (sqm)</span>
                  <span aria-hidden="true">{getLotSortIndicator("areaSqm")}</span>
                </button>
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
                  {getLotBlockNumber(lot)}
                </td>
                <td className="p-3 border-b border-slate-100 text-sm">
                  {getLotAddress(lot)}
                </td>
                <td className="p-3 border-b border-slate-100 text-sm">
                  {getLotStage(lot)}
                </td>
                <td className="p-3 border-b border-slate-100 text-sm">
                  {getLotSalesMode(lot)}
                </td>
                <td className="p-3 border-b border-slate-100 text-sm">
                  {getLotPrice(lot)}
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
                        lotSaving || lotDeleteId === String(lot.id ?? "")
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
                  colSpan={9}
                  className="p-4 text-center text-muted-foreground"
                >
                  No lots match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
        </>
      )}
    </div>
  );
};

export default EstateLotsCrud;
