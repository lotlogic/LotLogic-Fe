import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { AdminUploadField } from "@/components/admin/AdminUploadField";
import { Button } from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { adminApi } from "@/lib/api/adminApi";

export type FloorPlanRecord = {
  id: string;
  name?: string | null;
  floorplanUrl?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  garages?: number | null;
  areaSqm?: number | null;
  width?: number | null;
  depth?: number | null;
  rumpus?: boolean | null;
  alfresco?: boolean | null;
  pergola?: boolean | null;
  storeys?: number | null;
  buildingHeight_m?: number | null;
  roofPitch_deg?: number | null;
  architecturalStyle?: string | null;
  hasFrontFacingServiceAreas?: boolean | null;
  builderId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type FloorPlanPayload = {
  name: string;
  floorplanUrl: string;
  bedrooms: number;
  bathrooms: number;
  garages: number;
  areaSqm: number;
  width: number;
  depth: number;
  rumpus: boolean;
  alfresco: boolean;
  pergola: boolean;
  storeys?: number;
  buildingHeight_m?: number;
  roofPitch_deg?: number;
  architecturalStyle?: string;
  hasFrontFacingServiceAreas?: boolean;
  builderId?: string;
};

type FloorPlanForm = {
  name: string;
  floorplanUrl: string;
  bedrooms: string;
  bathrooms: string;
  garages: string;
  areaSqm: string;
  width: string;
  depth: string;
  rumpus: boolean;
  alfresco: boolean;
  pergola: boolean;
  storeys: string;
  buildingHeight_m: string;
  roofPitch_deg: string;
  architecturalStyle: string;
  hasFrontFacingServiceAreas: "" | "true" | "false";
};

const emptyForm: FloorPlanForm = {
  name: "",
  floorplanUrl: "",
  bedrooms: "",
  bathrooms: "",
  garages: "",
  areaSqm: "",
  width: "",
  depth: "",
  rumpus: false,
  alfresco: false,
  pergola: false,
  storeys: "",
  buildingHeight_m: "",
  roofPitch_deg: "",
  architecturalStyle: "",
  hasFrontFacingServiceAreas: "",
};

const ARCHITECTURAL_STYLE_OPTIONS = [
  "Contemporary",
  "Modern",
  "Hamptons",
  "Traditional Australian",
  "Coastal",
  "Farmhouse",
  "Minimalist",
  "Classic",
  "Industrial",
  "Other",
] as const;

const toNumber = (value: string): number | null => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const parseOptionalNumberField = (
  value: string
): { ok: true; value?: number } | { ok: false } => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true, value: undefined };
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return { ok: false };
  }
  return { ok: true, value: parsed };
};

type CsvImportDefaults = {
  storeys: string;
  roofPitch_deg: string;
  architecturalStyle: string;
  hasFrontFacingServiceAreas: "" | "true" | "false";
};

type CsvImportError = {
  rowNumber: number;
  rowLabel: string;
  message: string;
};

type CsvImportResult = {
  created: number;
  updated: number;
  facadesCreated: number;
  failed: number;
  errors: CsvImportError[];
};

const CSV_IMPORT_TEMPLATE = `id,name,floorplanUrl,bedrooms,bathrooms,garages,areaSqm,width,depth,rumpus,alfresco,pergola,storeys,buildingHeight_m,roofPitch_deg,architecturalStyle,hasFrontFacingServiceAreas,facades
,Acacia 21,https://cdn.example.com/floorplans/acacia-21.pdf,4,2,2,210,12.5,18.2,true,true,false,1,8.9,22.5,Contemporary,false,"https://cdn.example.com/facades/acacia-modern.jpg,https://cdn.example.com/facades/acacia-classic.jpg"`;

const parseCsvRecords = (text: string): Record<string, string>[] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) =>
    header.replace(/^\uFEFF/, "").trim().toLowerCase()
  );

  return rows
    .slice(1)
    .filter((row) => row.some((value) => value.trim().length > 0))
    .map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((header, columnIndex) => {
        if (!header) {
          return;
        }
        record[header] = (row[columnIndex] ?? "").trim();
      });
      return record;
    });
};

const parseBooleanField = (
  rawValue: string
): { ok: true; value?: boolean } | { ok: false } => {
  const normalized = rawValue.trim().toLowerCase();
  if (!normalized) {
    return { ok: true, value: undefined };
  }
  if (["true", "1", "yes", "y"].includes(normalized)) {
    return { ok: true, value: true };
  }
  if (["false", "0", "no", "n"].includes(normalized)) {
    return { ok: true, value: false };
  }
  return { ok: false };
};

const resolveArchitecturalStyle = (
  rawValue: string
): { ok: true; value: string } | { ok: false } => {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return { ok: true, value: "" };
  }
  const matched = ARCHITECTURAL_STYLE_OPTIONS.find(
    (option) => option.toLowerCase() === trimmed.toLowerCase()
  );
  if (!matched) {
    return { ok: false };
  }
  return { ok: true, value: matched };
};

const splitFacadeUrls = (rawValue: string): string[] => {
  if (!rawValue.trim()) {
    return [];
  }
  const unique = new Set<string>();
  rawValue
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((url) => unique.add(url));
  return Array.from(unique);
};

const resolveFacadeLabelFromUrl = (url: string): string => {
  const fallback = "Facade";
  const trimmed = url.trim();
  if (!trimmed) {
    return fallback;
  }

  let fileName = "";
  try {
    const parsed = new URL(trimmed);
    fileName = parsed.pathname.split("/").filter(Boolean).pop() ?? "";
  } catch {
    const withoutQuery = trimmed.split(/[?#]/)[0] ?? "";
    fileName = withoutQuery.split("/").filter(Boolean).pop() ?? "";
  }

  const decoded = decodeURIComponent(fileName).trim();
  const withoutExtension = decoded.replace(/\.[^.]+$/, "").trim();
  const normalized = withoutExtension.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return normalized || withoutExtension || decoded || fallback;
};

const resolveFloorPlanIdFromResponse = (
  value: unknown
): string | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.id === "string" && record.id.trim()) {
    return record.id.trim();
  }
  const nestedFloorPlan = record.floorPlan;
  if (nestedFloorPlan && typeof nestedFloorPlan === "object") {
    const nestedId = (nestedFloorPlan as Record<string, unknown>).id;
    if (typeof nestedId === "string" && nestedId.trim()) {
      return nestedId.trim();
    }
  }
  return null;
};

type FloorPlanCrudProps = {
  loadFloorPlans: () => Promise<FloorPlanRecord[]>;
  createFloorPlan: (payload: FloorPlanPayload) => Promise<unknown>;
  updateFloorPlan: (id: string, payload: FloorPlanPayload) => Promise<unknown>;
  deleteFloorPlan: (id: string) => Promise<unknown>;
  builderId?: string | null;
  showRefresh?: boolean;
  filterPlaceholder?: string;
  renderEditPanel?: (floorPlanId: string) => ReactNode;
};

export const FloorPlanCrud = ({
  loadFloorPlans,
  createFloorPlan,
  updateFloorPlan,
  deleteFloorPlan,
  builderId,
  showRefresh = true,
  filterPlaceholder = "Filter by name or id",
  renderEditPanel,
}: FloorPlanCrudProps) => {
  const formId = useId();
  const [floorPlans, setFloorPlans] = useState<FloorPlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState<FloorPlanForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(
    null
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvImportError, setCsvImportError] = useState<string | null>(null);
  const [csvImportResult, setCsvImportResult] = useState<CsvImportResult | null>(
    null
  );
  const [csvDefaults, setCsvDefaults] = useState<CsvImportDefaults>({
    storeys: "",
    roofPitch_deg: "",
    architecturalStyle: "",
    hasFrontFacingServiceAreas: "",
  });

  const handleLoad = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await loadFloorPlans();
      setFloorPlans(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load floor plans."
      );
    } finally {
      setLoading(false);
    }
  }, [loadFloorPlans]);

  useEffect(() => {
    handleLoad();
  }, [handleLoad]);

  const filteredFloorPlans = useMemo(() => {
    const needle = filterText.trim().toLowerCase();
    if (!needle) {
      return floorPlans;
    }
    return floorPlans.filter((plan) => {
      const name = (plan.name ?? "").toLowerCase();
      const id = plan.id?.toLowerCase?.() ?? "";
      return name.includes(needle) || id.includes(needle);
    });
  }, [floorPlans, filterText]);

  const architecturalStyleOptions = useMemo(() => {
    const base = [...ARCHITECTURAL_STYLE_OPTIONS];
    const currentStyle = form.architecturalStyle.trim();
    if (!currentStyle) {
      return base;
    }
    const exists = base.some(
      (option) => option.toLowerCase() === currentStyle.toLowerCase()
    );
    return exists ? base : [...base, currentStyle];
  }, [form.architecturalStyle]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormErrorMessage(null);
    setFormSuccessMessage(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const handleDownloadCsvTemplate = () => {
    const blob = new Blob([CSV_IMPORT_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "floor-plan-import-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvImport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!csvFile) {
      setCsvImportError("Select a CSV file to import.");
      return;
    }

    const defaultStoreys = parseOptionalNumberField(csvDefaults.storeys);
    if (!defaultStoreys.ok) {
      setCsvImportError("Default storeys must be numeric.");
      return;
    }
    const defaultRoofPitch = parseOptionalNumberField(csvDefaults.roofPitch_deg);
    if (!defaultRoofPitch.ok) {
      setCsvImportError("Default roof pitch must be numeric.");
      return;
    }
    const defaultFrontService = parseBooleanField(
      csvDefaults.hasFrontFacingServiceAreas
    );
    if (!defaultFrontService.ok) {
      setCsvImportError(
        "Default front service visibility must be true/false, yes/no, or 1/0."
      );
      return;
    }

    setCsvImporting(true);
    setCsvImportError(null);
    setCsvImportResult(null);

    try {
      const csvText = await csvFile.text();
      const rows = parseCsvRecords(csvText);
      if (rows.length === 0) {
        setCsvImportError("No data rows found in CSV.");
        setCsvImporting(false);
        return;
      }

      const plansById = new Map(floorPlans.map((plan) => [plan.id, plan]));
      const existingPlansByName = new Map<string, FloorPlanRecord>();
      const existingPlansByUrl = new Map<string, FloorPlanRecord>();
      const createdNameKeys = new Set<string>();
      const createdUrlKeys = new Set<string>();
      const facadeImageUrlsByFloorPlan = new Map<string, Set<string>>();
      const errors: CsvImportError[] = [];
      let created = 0;
      let updated = 0;
      let facadesCreated = 0;

      const toIdentityKey = (value: string | null | undefined) =>
        String(value ?? "").trim().toLowerCase();

      floorPlans.forEach((plan) => {
        const nameKey = toIdentityKey(plan.name);
        const urlKey = toIdentityKey(plan.floorplanUrl);
        if (nameKey && !existingPlansByName.has(nameKey)) {
          existingPlansByName.set(nameKey, plan);
        }
        if (urlKey && !existingPlansByUrl.has(urlKey)) {
          existingPlansByUrl.set(urlKey, plan);
        }
      });

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const rowNumber = index + 2;
        const rowId = (row["id"] ?? "").trim();
        const existingPlan = rowId ? plansById.get(rowId) ?? null : null;
        const rowLabel = rowId || (row["name"] ?? "").trim() || `Row ${rowNumber}`;

        if (rowId && !existingPlan) {
          errors.push({
            rowNumber,
            rowLabel,
            message: `Floor plan id "${rowId}" was not found.`,
          });
          continue;
        }

        const pickString = (...values: Array<string | null | undefined>) => {
          for (const value of values) {
            const trimmed = String(value ?? "").trim();
            if (trimmed) {
              return trimmed;
            }
          }
          return "";
        };

        const pickRequiredNumber = (
          label: string,
          ...values: Array<string | number | null | undefined>
        ): { ok: true; value: number } | { ok: false; message: string } => {
          for (const value of values) {
            if (value === null || value === undefined || value === "") {
              continue;
            }
            const numeric =
              typeof value === "number" ? value : Number(String(value).trim());
            if (!Number.isFinite(numeric)) {
              return { ok: false, message: `${label} must be numeric.` };
            }
            return { ok: true, value: numeric };
          }
          return { ok: false, message: `${label} is required.` };
        };

        const pickOptionalNumber = (
          ...values: Array<string | number | null | undefined>
        ): { ok: true; value?: number } | { ok: false } => {
          for (const value of values) {
            if (value === null || value === undefined || value === "") {
              continue;
            }
            const numeric =
              typeof value === "number" ? value : Number(String(value).trim());
            if (!Number.isFinite(numeric)) {
              return { ok: false };
            }
            return { ok: true, value: numeric };
          }
          return { ok: true, value: undefined };
        };

        const pickOptionalBoolean = (
          ...values: Array<string | boolean | null | undefined>
        ): { ok: true; value?: boolean } | { ok: false } => {
          for (const value of values) {
            if (value === null || value === undefined || value === "") {
              continue;
            }
            if (typeof value === "boolean") {
              return { ok: true, value };
            }
            const parsed = parseBooleanField(String(value));
            if (!parsed.ok) {
              return { ok: false };
            }
            return { ok: true, value: parsed.value };
          }
          return { ok: true, value: undefined };
        };

        const payloadName = pickString(row["name"], existingPlan?.name);
        const payloadUrl = pickString(
          row["floorplanurl"],
          row["floorplan_url"],
          existingPlan?.floorplanUrl
        );

        const bedrooms = pickRequiredNumber(
          "Bedrooms",
          row["bedrooms"],
          existingPlan?.bedrooms
        );
        const bathrooms = pickRequiredNumber(
          "Bathrooms",
          row["bathrooms"],
          existingPlan?.bathrooms
        );
        const garages = pickRequiredNumber(
          "Garages",
          row["garages"],
          existingPlan?.garages
        );
        const areaSqm = pickRequiredNumber(
          "Area (sqm)",
          row["areasqm"],
          existingPlan?.areaSqm
        );
        const width = pickRequiredNumber(
          "Design width",
          row["width"],
          existingPlan?.width
        );
        const depth = pickRequiredNumber(
          "Building depth",
          row["depth"],
          existingPlan?.depth
        );

        if (!payloadName || !payloadUrl) {
          errors.push({
            rowNumber,
            rowLabel,
            message: "Name and floorplanUrl are required.",
          });
          continue;
        }
        const failedRequired =
          !bedrooms.ok
            ? bedrooms
            : !bathrooms.ok
              ? bathrooms
              : !garages.ok
                ? garages
                : !areaSqm.ok
                  ? areaSqm
                  : !width.ok
                    ? width
                    : !depth.ok
                      ? depth
                      : null;
        if (failedRequired && "message" in failedRequired) {
          errors.push({
            rowNumber,
            rowLabel,
            message: failedRequired.message,
          });
          continue;
        }

        if (
          !bedrooms.ok ||
          !bathrooms.ok ||
          !garages.ok ||
          !areaSqm.ok ||
          !width.ok ||
          !depth.ok
        ) {
          errors.push({
            rowNumber,
            rowLabel,
            message: "Missing required numeric values.",
          });
          continue;
        }

        const rumpusResult = pickOptionalBoolean(row["rumpus"], existingPlan?.rumpus);
        const alfrescoResult = pickOptionalBoolean(
          row["alfresco"],
          existingPlan?.alfresco
        );
        const pergolaResult = pickOptionalBoolean(
          row["pergola"],
          existingPlan?.pergola
        );
        if (!rumpusResult.ok || !alfrescoResult.ok || !pergolaResult.ok) {
          errors.push({
            rowNumber,
            rowLabel,
            message: "Feature fields (rumpus/alfresco/pergola) must be boolean.",
          });
          continue;
        }

        const storeysResult = pickOptionalNumber(
          row["storeys"],
          defaultStoreys.value,
          existingPlan?.storeys
        );
        const buildingHeightResult = pickOptionalNumber(
          row["buildingheight_m"],
          row["buildingheightm"],
          existingPlan?.buildingHeight_m
        );
        const roofPitchResult = pickOptionalNumber(
          row["roofpitch_deg"],
          row["roofpitchdeg"],
          defaultRoofPitch.value,
          existingPlan?.roofPitch_deg
        );
        if (!storeysResult.ok || !buildingHeightResult.ok || !roofPitchResult.ok) {
          errors.push({
            rowNumber,
            rowLabel,
            message:
              "Storeys, buildingHeight_m, and roofPitch_deg must be numeric when provided.",
          });
          continue;
        }

        const frontServiceResult = pickOptionalBoolean(
          row["hasfrontfacingserviceareas"],
          row["frontserviceareasvisiblefromstreet"],
          defaultFrontService.value,
          existingPlan?.hasFrontFacingServiceAreas
        );
        if (!frontServiceResult.ok) {
          errors.push({
            rowNumber,
            rowLabel,
            message: "hasFrontFacingServiceAreas must be boolean.",
          });
          continue;
        }

        const rowArchitecturalStyle = pickString(
          row["architecturalstyle"],
          csvDefaults.architecturalStyle
        );
        const architecturalStyleResult = resolveArchitecturalStyle(
          rowArchitecturalStyle
        );
        if (!architecturalStyleResult.ok) {
          errors.push({
            rowNumber,
            rowLabel,
            message: `architecturalStyle must be one of: ${ARCHITECTURAL_STYLE_OPTIONS.join(", ")}.`,
          });
          continue;
        }
        const architecturalStyle =
          architecturalStyleResult.value ||
          pickString(existingPlan?.architecturalStyle);
        const facadeUrls = splitFacadeUrls(
          pickString(row["facades"], row["facadeurls"], row["facade_urls"])
        );

        const payload: FloorPlanPayload = {
          name: payloadName,
          floorplanUrl: payloadUrl,
          bedrooms: bedrooms.value,
          bathrooms: bathrooms.value,
          garages: garages.value,
          areaSqm: areaSqm.value,
          width: width.value,
          depth: depth.value,
          rumpus: rumpusResult.value ?? false,
          alfresco: alfrescoResult.value ?? false,
          pergola: pergolaResult.value ?? false,
        };

        if (storeysResult.value !== undefined) {
          payload.storeys = storeysResult.value;
        }
        if (buildingHeightResult.value !== undefined) {
          payload.buildingHeight_m = buildingHeightResult.value;
        }
        if (roofPitchResult.value !== undefined) {
          payload.roofPitch_deg = roofPitchResult.value;
        }
        if (architecturalStyle) {
          payload.architecturalStyle = architecturalStyle;
        }
        if (frontServiceResult.value !== undefined) {
          payload.hasFrontFacingServiceAreas = frontServiceResult.value;
        }
        if (!rowId && builderId) {
          payload.builderId = builderId;
        }

        const payloadNameKey = toIdentityKey(payload.name);
        const payloadUrlKey = toIdentityKey(payload.floorplanUrl);
        if (!rowId) {
          const conflictingByName = payloadNameKey
            ? existingPlansByName.get(payloadNameKey) ?? null
            : null;
          const conflictingByUrl = payloadUrlKey
            ? existingPlansByUrl.get(payloadUrlKey) ?? null
            : null;
          if (conflictingByName || conflictingByUrl) {
            const conflictTarget = conflictingByName ?? conflictingByUrl;
            errors.push({
              rowNumber,
              rowLabel,
              message: `Row omitted id and matches existing floor plan "${conflictTarget?.id}". Provide id to update, or change name/floorplanUrl to create a new plan.`,
            });
            continue;
          }
          if (
            (payloadNameKey && createdNameKeys.has(payloadNameKey)) ||
            (payloadUrlKey && createdUrlKeys.has(payloadUrlKey))
          ) {
            errors.push({
              rowNumber,
              rowLabel,
              message:
                "Row omitted id and duplicates another new row in this import by name or floorplanUrl.",
            });
            continue;
          }
        }

        try {
          let importedFloorPlanId: string | null = existingPlan?.id ?? null;
          if (rowId && existingPlan) {
            await updateFloorPlan(existingPlan.id, payload);
            updated += 1;
            const updatedPlanRecord: FloorPlanRecord = {
              ...existingPlan,
              name: payload.name,
              floorplanUrl: payload.floorplanUrl,
            };
            if (payloadNameKey) {
              existingPlansByName.set(payloadNameKey, updatedPlanRecord);
            }
            if (payloadUrlKey) {
              existingPlansByUrl.set(payloadUrlKey, updatedPlanRecord);
            }
          } else {
            const createdFloorPlan = await createFloorPlan(payload);
            importedFloorPlanId = resolveFloorPlanIdFromResponse(createdFloorPlan);
            if (!importedFloorPlanId) {
              const matchedPlan = floorPlans.find(
                (plan) =>
                  String(plan.name ?? "").trim() === payload.name &&
                  String(plan.floorplanUrl ?? "").trim() === payload.floorplanUrl
              );
              importedFloorPlanId = matchedPlan?.id ?? null;
            }
            created += 1;
            if (payloadNameKey) {
              createdNameKeys.add(payloadNameKey);
              existingPlansByName.set(payloadNameKey, {
                id: importedFloorPlanId ?? `created-row-${rowNumber}`,
                name: payload.name,
                floorplanUrl: payload.floorplanUrl,
              });
            }
            if (payloadUrlKey) {
              createdUrlKeys.add(payloadUrlKey);
              existingPlansByUrl.set(payloadUrlKey, {
                id: importedFloorPlanId ?? `created-row-${rowNumber}`,
                name: payload.name,
                floorplanUrl: payload.floorplanUrl,
              });
            }
          }

          if (facadeUrls.length > 0) {
            if (!importedFloorPlanId) {
              errors.push({
                rowNumber,
                rowLabel,
                message:
                  "Floor plan imported but facade URLs were skipped because the floor plan id could not be resolved.",
              });
              continue;
            }

            let existingFacadeUrls = facadeImageUrlsByFloorPlan.get(
              importedFloorPlanId
            );
            if (!existingFacadeUrls) {
              const existingFacades = await adminApi.getFacades<{
                imageUrl?: string | null;
              }>(importedFloorPlanId);
              existingFacadeUrls = new Set(
                existingFacades
                  .map((facade) => String(facade.imageUrl ?? "").trim())
                  .filter(Boolean)
              );
              facadeImageUrlsByFloorPlan.set(
                importedFloorPlanId,
                existingFacadeUrls
              );
            }

            for (const facadeUrl of facadeUrls) {
              if (existingFacadeUrls.has(facadeUrl)) {
                continue;
              }
              await adminApi.createFacade(importedFloorPlanId, {
                label: resolveFacadeLabelFromUrl(facadeUrl),
                imageUrl: facadeUrl,
                floorPlanId: importedFloorPlanId,
              });
              existingFacadeUrls.add(facadeUrl);
              facadesCreated += 1;
            }
          }
        } catch (error) {
          errors.push({
            rowNumber,
            rowLabel,
            message:
              error instanceof Error ? error.message : "Failed to import row.",
          });
        }
      }

      const failed = errors.length;
      setCsvImportResult({ created, updated, facadesCreated, failed, errors });
      if (created > 0 || updated > 0) {
        await handleLoad();
      }
    } catch (error) {
      setCsvImportError(
        error instanceof Error ? error.message : "Failed to import CSV."
      );
    } finally {
      setCsvImporting(false);
    }
  };

  const startEdit = (plan: FloorPlanRecord) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name ?? "",
      floorplanUrl: plan.floorplanUrl ?? "",
      bedrooms: plan.bedrooms?.toString() ?? "",
      bathrooms: plan.bathrooms?.toString() ?? "",
      garages: plan.garages?.toString() ?? "",
      areaSqm: plan.areaSqm?.toString() ?? "",
      width: plan.width?.toString() ?? "",
      depth: plan.depth?.toString() ?? "",
      rumpus: Boolean(plan.rumpus),
      alfresco: Boolean(plan.alfresco),
      pergola: Boolean(plan.pergola),
      storeys: plan.storeys?.toString() ?? "",
      buildingHeight_m: plan.buildingHeight_m?.toString() ?? "",
      roofPitch_deg: plan.roofPitch_deg?.toString() ?? "",
      architecturalStyle: plan.architecturalStyle ?? "",
      hasFrontFacingServiceAreas:
        typeof plan.hasFrontFacingServiceAreas === "boolean"
          ? plan.hasFrontFacingServiceAreas
            ? "true"
            : "false"
          : "",
    });
    setFormErrorMessage(null);
    setFormSuccessMessage(null);
    setShowForm(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormErrorMessage(null);
    setFormSuccessMessage(null);

    const name = form.name.trim();
    const floorplanUrl = form.floorplanUrl.trim();
    const bedrooms = toNumber(form.bedrooms);
    const bathrooms = toNumber(form.bathrooms);
    const garages = toNumber(form.garages);
    const areaSqm = toNumber(form.areaSqm);
    const width = toNumber(form.width);
    const depth = toNumber(form.depth);

    if (!name || !floorplanUrl) {
      setFormErrorMessage("Name and floorplan URL are required.");
      return;
    }
    if (
      bedrooms === null ||
      bathrooms === null ||
      garages === null ||
      areaSqm === null ||
      width === null ||
      depth === null
    ) {
      setFormErrorMessage("All numeric fields are required.");
      return;
    }

    const storeysResult = parseOptionalNumberField(form.storeys);
    if (!storeysResult.ok) {
      setFormErrorMessage("Storeys must be a number.");
      return;
    }
    const heightResult = parseOptionalNumberField(form.buildingHeight_m);
    if (!heightResult.ok) {
      setFormErrorMessage("Building height must be a number.");
      return;
    }
    const roofPitchResult = parseOptionalNumberField(form.roofPitch_deg);
    if (!roofPitchResult.ok) {
      setFormErrorMessage("Roof pitch must be a number.");
      return;
    }

    const payload: FloorPlanPayload = {
      name,
      floorplanUrl,
      bedrooms,
      bathrooms,
      garages,
      areaSqm,
      width,
      depth,
      rumpus: form.rumpus,
      alfresco: form.alfresco,
      pergola: form.pergola,
    };

    if (storeysResult.value !== undefined) {
      payload.storeys = storeysResult.value;
    }
    if (heightResult.value !== undefined) {
      payload.buildingHeight_m = heightResult.value;
    }
    if (roofPitchResult.value !== undefined) {
      payload.roofPitch_deg = roofPitchResult.value;
    }
    const trimmedStyle = form.architecturalStyle.trim();
    if (trimmedStyle) {
      payload.architecturalStyle = trimmedStyle;
    }
    if (form.hasFrontFacingServiceAreas !== "") {
      payload.hasFrontFacingServiceAreas =
        form.hasFrontFacingServiceAreas === "true";
    }

    if (!editingId && builderId) {
      payload.builderId = builderId;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateFloorPlan(editingId, payload);
        setFormSuccessMessage("Floor plan updated.");
      } else {
        await createFloorPlan(payload);
        setFormSuccessMessage("Floor plan created.");
      }
      await handleLoad();
      resetForm();
    } catch (error) {
      setFormErrorMessage(
        error instanceof Error ? error.message : "Failed to save floor plan."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) {
      return;
    }
    const confirmed = window.confirm(
      "Delete this floor plan? This cannot be undone."
    );
    if (!confirmed) {
      return;
    }
    setDeleteId(id);
    try {
      await deleteFloorPlan(id);
      await handleLoad();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete floor plan."
      );
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <>
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md border border-red-100">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Input
          value={filterText}
          onChange={(event) => setFilterText(event.target.value)}
          placeholder={filterPlaceholder}
          className="flex-1 min-w-[220px] max-w-sm"
        />
        {showRefresh && (
          <Button
            onClick={handleLoad}
            disabled={loading}
            label="Refresh"
            loading={loading}
          />
        )}
        <Button
          onClick={showForm ? closeForm : openCreateForm}
          label={showForm ? "Cancel" : "Add floor plan"}
          variant={showForm ? "outline" : "primary"}
          className="ml-auto"
        />
        <Button
          onClick={() => {
            setShowCsvImport((previous) => !previous);
            setCsvImportError(null);
            setCsvImportResult(null);
          }}
          label={showCsvImport ? "Close CSV import" : "Import CSV"}
          variant="outline"
        />
      </div>

      {showCsvImport && (
        <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-lg font-semibold m-0">Bulk CSV import</h2>
              <p className="text-sm text-muted-foreground m-0">
                Create and update many floor plans in one upload. Include
                <code className="mx-1 rounded bg-slate-100 px-1 py-0.5">id</code>
                to update an existing plan.
              </p>
              <p className="text-xs text-slate-500 mt-2 mb-0">
                Rows without <code className="mx-1 rounded bg-slate-100 px-1 py-0.5">id</code>{" "}
                are treated as create-only and will be rejected if name or
                floorplanUrl matches an existing plan.
              </p>
              <p className="text-xs text-slate-500 mt-1 mb-0">
                Optional <code className="mx-1 rounded bg-slate-100 px-1 py-0.5">facades</code>{" "}
                column accepts comma-separated image URLs. Wrap the value in
                quotes when multiple URLs are provided in one cell.
              </p>
              <p className="text-xs text-slate-500 mt-1 mb-0">
                <code className="mx-1 rounded bg-slate-100 px-1 py-0.5">architecturalStyle</code>{" "}
                must be one of: {ARCHITECTURAL_STYLE_OPTIONS.join(", ")}.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2 text-xs"
              label="Download template"
              onClick={handleDownloadCsvTemplate}
            />
          </div>

          <form onSubmit={handleCsvImport} className="grid gap-4">
            <div className="grid gap-2">
              <span className="text-sm font-medium">CSV file</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  setCsvFile(event.target.files?.[0] ?? null);
                  setCsvImportError(null);
                  setCsvImportResult(null);
                }}
                className="w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm file:mr-3 file:rounded-sm file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-700 mt-0 mb-3">
                Optional defaults for blank columns
              </p>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="grid gap-2">
                  <span className="text-xs text-slate-600">Storeys</span>
                  <Input
                    value={csvDefaults.storeys}
                    onChange={(event) =>
                      setCsvDefaults((previous) => ({
                        ...previous,
                        storeys: event.target.value,
                      }))
                    }
                    type="number"
                    min="1"
                    className="w-full"
                    placeholder="1"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-xs text-slate-600">Roof Pitch (deg)</span>
                  <Input
                    value={csvDefaults.roofPitch_deg}
                    onChange={(event) =>
                      setCsvDefaults((previous) => ({
                        ...previous,
                        roofPitch_deg: event.target.value,
                      }))
                    }
                    type="number"
                    step="0.1"
                    className="w-full"
                    placeholder="22.5"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-xs text-slate-600">
                    Architectural Style
                  </span>
                  <select
                    value={csvDefaults.architecturalStyle}
                    onChange={(event) =>
                      setCsvDefaults((previous) => ({
                        ...previous,
                        architecturalStyle: event.target.value,
                      }))
                    }
                    className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">No default</option>
                    {ARCHITECTURAL_STYLE_OPTIONS.map((style) => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <span className="text-xs text-slate-600">
                    Front service areas visible from street
                  </span>
                  <select
                    value={csvDefaults.hasFrontFacingServiceAreas}
                    onChange={(event) =>
                      setCsvDefaults((previous) => ({
                        ...previous,
                        hasFrontFacingServiceAreas: event.target
                          .value as CsvImportDefaults["hasFrontFacingServiceAreas"],
                      }))
                    }
                    className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">No default</option>
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                label="Run CSV import"
                loading={csvImporting}
                disabled={csvImporting}
              />
              {csvImportError && (
                <span className="text-sm text-destructive">{csvImportError}</span>
              )}
              {csvImportResult && (
                <span className="text-sm text-emerald-600">
                  Imported: {csvImportResult.created} created,{" "}
                  {csvImportResult.updated} updated,{" "}
                  {csvImportResult.facadesCreated} facades added,{" "}
                  {csvImportResult.failed} failed.
                </span>
              )}
            </div>
          </form>

          {csvImportResult && csvImportResult.errors.length > 0 && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="m-0 text-sm font-medium text-amber-900">
                Rows with errors
              </p>
              <ul className="mt-2 mb-0 list-disc pl-5 text-xs text-amber-900">
                {csvImportResult.errors.slice(0, 20).map((item) => (
                  <li key={`${item.rowNumber}-${item.rowLabel}`}>
                    Row {item.rowNumber} ({item.rowLabel}): {item.message}
                  </li>
                ))}
              </ul>
              {csvImportResult.errors.length > 20 && (
                <p className="mt-2 mb-0 text-xs text-amber-900">
                  Showing first 20 errors.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {showForm && (
        <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-lg font-semibold">
              {editingId ? "Edit Floor Plan" : "Add floor plan"}
            </h2>
            {editingId && (
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-2 text-xs"
                label="New floor plan"
                onClick={openCreateForm}
              />
            )}
          </div>
          <form id={formId} onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <span className="text-sm font-medium">Name</span>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="w-full"
                required
              />
            </div>
            <div className="grid gap-2">
              <AdminUploadField
                label="Floorplan URL"
                value={form.floorplanUrl}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, floorplanUrl: value }))
                }
                required
                folder="floorplans"
                accept="application/pdf,image/*"
                helperText="PDF or image files are supported."
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <span className="text-sm font-medium">Bedrooms</span>
                <Input
                  type="number"
                  value={form.bedrooms}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      bedrooms: event.target.value,
                    }))
                  }
                  className="w-full"
                  required
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Bathrooms</span>
                <Input
                  type="number"
                  value={form.bathrooms}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      bathrooms: event.target.value,
                    }))
                  }
                  className="w-full"
                  required
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Garages</span>
                <Input
                  type="number"
                  value={form.garages}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      garages: event.target.value,
                    }))
                  }
                  className="w-full"
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <span className="text-sm font-medium">Area (sqm)</span>
                <Input
                  type="number"
                  step="0.1"
                  value={form.areaSqm}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      areaSqm: event.target.value,
                    }))
                  }
                  className="w-full"
                  required
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Design Width (m)</span>
                <Input
                  type="number"
                  step="0.1"
                  value={form.width}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      width: event.target.value,
                    }))
                  }
                  className="w-full"
                  required
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Building Depth (m)</span>
                <Input
                  type="number"
                  step="0.1"
                  value={form.depth}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      depth: event.target.value,
                    }))
                  }
                  className="w-full"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Features</span>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.rumpus}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({
                        ...prev,
                        rumpus: Boolean(checked),
                      }))
                    }
                  />
                  Rumpus
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.alfresco}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({
                        ...prev,
                        alfresco: Boolean(checked),
                      }))
                    }
                  />
                  Alfresco
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.pergola}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({
                        ...prev,
                        pergola: Boolean(checked),
                      }))
                    }
                  />
                  Pergola
                </label>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <span className="text-sm font-medium">Storeys</span>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  value={form.storeys}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      storeys: event.target.value,
                    }))
                  }
                  className="w-full"
                  placeholder="2"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Building Height (m)</span>
                <Input
                  type="number"
                  step="0.1"
                  value={form.buildingHeight_m}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      buildingHeight_m: event.target.value,
                    }))
                  }
                  className="w-full"
                  placeholder="9.8"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Roof Pitch (deg)</span>
                <Input
                  type="number"
                  step="0.1"
                  value={form.roofPitch_deg}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      roofPitch_deg: event.target.value,
                    }))
                  }
                  className="w-full"
                  placeholder="22.5"
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <span className="text-sm font-medium">Architectural Style</span>
                <select
                  value={form.architecturalStyle}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      architecturalStyle: event.target.value,
                    }))
                  }
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select style</option>
                  {architecturalStyleOptions.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">
                  Front service areas visible from street
                </span>
                <select
                  value={form.hasFrontFacingServiceAreas}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      hasFrontFacingServiceAreas: event.target
                        .value as FloorPlanForm["hasFrontFacingServiceAreas"],
                    }))
                  }
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Not set</option>
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
            </div>
          </form>
          {editingId && renderEditPanel && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              {renderEditPanel(editingId)}
            </div>
          )}

          {formErrorMessage && (
            <div className="text-sm text-red-600 mt-4">{formErrorMessage}</div>
          )}
          {formSuccessMessage && (
            <div className="text-sm text-emerald-600 mt-4">
              {formSuccessMessage}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              type="submit"
              form={formId}
              label={editingId ? "Save changes" : "Create floor plan"}
              loading={saving}
              disabled={saving}
            />
            {editingId && (
              <Button
                type="button"
                variant="outline"
                label="Cancel edit"
                onClick={resetForm}
              />
            )}
          </div>
        </section>
      )}

      <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        {loading ? (
          <div className="p-6 text-center text-muted-foreground">
            Loading floor plans...
          </div>
        ) : filteredFloorPlans.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            No floor plans found.
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-700">
                  <th className="p-2 border-b">Name</th>
                  <th className="p-2 border-b">Beds/Baths/Garages</th>
                  <th className="p-2 border-b">Area (sqm)</th>
                  <th className="p-2 border-b">Design (W x D)</th>
                  <th className="p-2 border-b">Storeys / Height</th>
                  <th className="p-2 border-b">Features</th>
                  <th className="p-2 border-b text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFloorPlans.map((plan) => (
                  <tr key={plan.id}>
                    <td className="p-2 border-b border-slate-100">
                      <div className="font-medium text-slate-900">
                        {plan.name ?? "--"}
                      </div>
                      <div className="text-xs text-slate-500 truncate max-w-[220px]">
                        {plan.floorplanUrl ?? "--"}
                      </div>
                    </td>
                    <td className="p-2 border-b border-slate-100">
                      {plan.bedrooms ?? "--"} / {plan.bathrooms ?? "--"} /{" "}
                      {plan.garages ?? "--"}
                    </td>
                    <td className="p-2 border-b border-slate-100">
                      {plan.areaSqm ?? "--"}
                    </td>
                    <td className="p-2 border-b border-slate-100">
                      {plan.width ?? "--"} x {plan.depth ?? "--"}
                    </td>
                    <td className="p-2 border-b border-slate-100">
                      {plan.storeys ?? "--"} / {plan.buildingHeight_m ?? "--"}
                    </td>
                    <td className="p-2 border-b border-slate-100">
                      {[
                        plan.rumpus ? "R" : null,
                        plan.alfresco ? "A" : null,
                        plan.pergola ? "P" : null,
                      ]
                        .filter(Boolean)
                        .join(", ") || "--"}
                    </td>
                    <td className="p-2 border-b border-slate-100 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          label="Edit"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => startEdit(plan)}
                        />
                        <Button
                          label="Delete"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-red-600"
                          onClick={() => handleDelete(plan.id)}
                          disabled={deleteId === plan.id}
                          loading={deleteId === plan.id}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
};

export default FloorPlanCrud;
