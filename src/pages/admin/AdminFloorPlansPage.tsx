import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminUploadField } from "@/components/admin/AdminUploadField";
import { adminApi } from "@/lib/api/adminApi";
import { adminAuth } from "@/lib/auth/adminAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";

type AdminFloorPlan = {
  id: string;
  name?: string | null;
  floorplanUrl?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  garages?: number | null;
  areaSqm?: number | null;
  minLotWidth?: number | null;
  minLotDepth?: number | null;
  rumpus?: boolean | null;
  alfresco?: boolean | null;
  pergola?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type FloorPlanForm = {
  name: string;
  floorplanUrl: string;
  bedrooms: string;
  bathrooms: string;
  garages: string;
  areaSqm: string;
  minLotWidth: string;
  minLotDepth: string;
  rumpus: boolean;
  alfresco: boolean;
  pergola: boolean;
};

const emptyForm: FloorPlanForm = {
  name: "",
  floorplanUrl: "",
  bedrooms: "",
  bathrooms: "",
  garages: "",
  areaSqm: "",
  minLotWidth: "",
  minLotDepth: "",
  rumpus: false,
  alfresco: false,
  pergola: false,
};

const toNumber = (value: string): number | null => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const AdminFloorPlansPage = () => {
  const [floorPlans, setFloorPlans] = useState<AdminFloorPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");

  const [form, setForm] = useState<FloorPlanForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(
    null
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadFloorPlans = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminApi.getFloorPlans<AdminFloorPlan>();
      setFloorPlans(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load floor plans."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFloorPlans();
  }, [loadFloorPlans]);

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

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormErrorMessage(null);
    setFormSuccessMessage(null);
  };

  const startEdit = (plan: AdminFloorPlan) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name ?? "",
      floorplanUrl: plan.floorplanUrl ?? "",
      bedrooms: plan.bedrooms?.toString() ?? "",
      bathrooms: plan.bathrooms?.toString() ?? "",
      garages: plan.garages?.toString() ?? "",
      areaSqm: plan.areaSqm?.toString() ?? "",
      minLotWidth: plan.minLotWidth?.toString() ?? "",
      minLotDepth: plan.minLotDepth?.toString() ?? "",
      rumpus: Boolean(plan.rumpus),
      alfresco: Boolean(plan.alfresco),
      pergola: Boolean(plan.pergola),
    });
    setFormErrorMessage(null);
    setFormSuccessMessage(null);
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
    const minLotWidth = toNumber(form.minLotWidth);
    const minLotDepth = toNumber(form.minLotDepth);

    if (!name || !floorplanUrl) {
      setFormErrorMessage("Name and floorplan URL are required.");
      return;
    }
    if (
      bedrooms === null ||
      bathrooms === null ||
      garages === null ||
      areaSqm === null ||
      minLotWidth === null ||
      minLotDepth === null
    ) {
      setFormErrorMessage("All numeric fields are required.");
      return;
    }

    const payload = {
      name,
      floorplanUrl,
      bedrooms,
      bathrooms,
      garages,
      areaSqm,
      minLotWidth,
      minLotDepth,
      rumpus: form.rumpus,
      alfresco: form.alfresco,
      pergola: form.pergola,
    };

    setSaving(true);
    try {
      if (editingId) {
        await adminApi.updateFloorPlan(editingId, payload);
        setFormSuccessMessage("Floor plan updated.");
      } else {
        await adminApi.createFloorPlan(payload);
        setFormSuccessMessage("Floor plan created.");
      }
      await loadFloorPlans();
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
      await adminApi.deleteFloorPlan(id);
      await loadFloorPlans();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete floor plan."
      );
    } finally {
      setDeleteId(null);
    }
  };

  const handleLogout = async () => {
    await adminAuth.logout();
  };

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Floor Plans</h1>
      <AdminNav />
      <div className="flex flex-wrap gap-2 mb-6 mt-4">
        <Button
          onClick={loadFloorPlans}
          disabled={loading}
          label="Refresh"
          loading={loading}
        />
        <Button onClick={handleLogout} variant="outline" label="Sign out" />
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md border border-red-100">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold">Existing Floor Plans</h2>
            <Input
              value={filterText}
              onChange={(event) => setFilterText(event.target.value)}
              placeholder="Filter by name or id"
              className="max-w-sm"
            />
          </div>

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
                    <th className="p-2 border-b">Min Lot (W x D)</th>
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
                        {plan.minLotWidth ?? "--"} x {plan.minLotDepth ?? "--"}
                      </td>
                      <td className="p-2 border-b border-slate-100">
                        {[plan.rumpus ? "R" : null, plan.alfresco ? "A" : null, plan.pergola ? "P" : null]
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

        <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? "Edit Floor Plan" : "Create Floor Plan"}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-4">
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
                <span className="text-sm font-medium">Min Lot Width</span>
                <Input
                  type="number"
                  step="0.1"
                  value={form.minLotWidth}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      minLotWidth: event.target.value,
                    }))
                  }
                  className="w-full"
                  required
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Min Lot Depth</span>
                <Input
                  type="number"
                  step="0.1"
                  value={form.minLotDepth}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      minLotDepth: event.target.value,
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

            {formErrorMessage && (
              <div className="text-sm text-red-600">{formErrorMessage}</div>
            )}
            {formSuccessMessage && (
              <div className="text-sm text-emerald-600">
                {formSuccessMessage}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
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
          </form>
        </section>
      </div>
    </div>
  );
};

export default AdminFloorPlansPage;
