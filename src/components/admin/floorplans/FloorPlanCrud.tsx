import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { AdminUploadField } from "@/components/admin/AdminUploadField";
import { Button } from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";

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
      </div>

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
                <span className="text-sm font-medium">Design Width</span>
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
