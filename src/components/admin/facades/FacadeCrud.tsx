import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminUploadField } from "@/components/admin/AdminUploadField";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export type FacadeRecord = {
  id: string;
  label?: string | null;
  imageUrl?: string | null;
  floorPlanId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type FacadePayload = {
  label: string;
  imageUrl: string;
  floorPlanId: string;
};

type FacadeForm = {
  label: string;
  imageUrl: string;
  floorPlanId: string;
};

type FloorPlanOption = {
  id: string;
  label: string;
};

const emptyForm: FacadeForm = {
  label: "",
  imageUrl: "",
  floorPlanId: "",
};

type FacadeCrudProps = {
  loadFacades: (floorPlanId?: string | null) => Promise<FacadeRecord[]>;
  createFacade: (payload: FacadePayload) => Promise<unknown>;
  updateFacade: (id: string, payload: FacadePayload) => Promise<unknown>;
  deleteFacade: (id: string) => Promise<unknown>;
  floorPlanOptions?: FloorPlanOption[];
  initialFloorPlanId?: string | null;
  showRefresh?: boolean;
  filterPlaceholder?: string;
};

export const FacadeCrud = ({
  loadFacades,
  createFacade,
  updateFacade,
  deleteFacade,
  floorPlanOptions,
  initialFloorPlanId = null,
  showRefresh = true,
  filterPlaceholder = "Filter by label, id, or floor plan id",
}: FacadeCrudProps) => {
  const [facades, setFacades] = useState<FacadeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [selectedFloorPlanId, setSelectedFloorPlanId] = useState<string | null>(
    initialFloorPlanId
  );

  const [form, setForm] = useState<FacadeForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(
    null
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!floorPlanOptions || floorPlanOptions.length === 0) {
      return;
    }
    if (
      selectedFloorPlanId &&
      floorPlanOptions.some((option) => option.id === selectedFloorPlanId)
    ) {
      return;
    }
    setSelectedFloorPlanId(floorPlanOptions[0].id);
  }, [floorPlanOptions, selectedFloorPlanId]);

  const handleLoad = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (floorPlanOptions && !selectedFloorPlanId) {
        setFacades([]);
        return;
      }
      const data = await loadFacades(selectedFloorPlanId);
      setFacades(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load facades."
      );
    } finally {
      setLoading(false);
    }
  }, [floorPlanOptions, loadFacades, selectedFloorPlanId]);

  useEffect(() => {
    handleLoad();
  }, [handleLoad]);

  useEffect(() => {
    setForm(emptyForm);
    setEditingId(null);
    setFormErrorMessage(null);
    setFormSuccessMessage(null);
  }, [selectedFloorPlanId]);

  const filteredFacades = useMemo(() => {
    const needle = filterText.trim().toLowerCase();
    if (!needle) {
      return facades;
    }
    return facades.filter((facade) => {
      const label = (facade.label ?? "").toLowerCase();
      const id = facade.id?.toLowerCase?.() ?? "";
      const floorPlanId = (facade.floorPlanId ?? "").toLowerCase();
      return (
        label.includes(needle) ||
        id.includes(needle) ||
        floorPlanId.includes(needle)
      );
    });
  }, [facades, filterText]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormErrorMessage(null);
    setFormSuccessMessage(null);
  };

  const startEdit = (facade: FacadeRecord) => {
    setEditingId(facade.id);
    setForm({
      label: facade.label ?? "",
      imageUrl: facade.imageUrl ?? "",
      floorPlanId: facade.floorPlanId ?? "",
    });
    setFormErrorMessage(null);
    setFormSuccessMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormErrorMessage(null);
    setFormSuccessMessage(null);

    const label = form.label.trim();
    const imageUrl = form.imageUrl.trim();
    const scopedFloorPlanId = floorPlanOptions ? selectedFloorPlanId : null;
    const floorPlanId =
      scopedFloorPlanId ?? form.floorPlanId.trim();

    if (!label || !imageUrl || !floorPlanId) {
      setFormErrorMessage("Label, image URL, and floor plan id are required.");
      return;
    }

    const payload: FacadePayload = {
      label,
      imageUrl,
      floorPlanId,
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateFacade(editingId, payload);
        setFormSuccessMessage("Facade updated.");
      } else {
        await createFacade(payload);
        setFormSuccessMessage("Facade created.");
      }
      await handleLoad();
      resetForm();
    } catch (error) {
      setFormErrorMessage(
        error instanceof Error ? error.message : "Failed to save facade."
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
      "Delete this facade? This cannot be undone."
    );
    if (!confirmed) {
      return;
    }
    setDeleteId(id);
    try {
      await deleteFacade(id);
      await handleLoad();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete facade."
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold">Existing Facades</h2>
            {showRefresh && (
              <Button
                onClick={handleLoad}
                disabled={loading}
                label="Refresh"
                loading={loading}
              />
            )}
            <Input
              value={filterText}
              onChange={(event) => setFilterText(event.target.value)}
              placeholder={filterPlaceholder}
              className="max-w-sm"
            />
          </div>

          {floorPlanOptions && (
            <div className="mb-4 max-w-sm">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-slate-700">Floor Plan</span>
                <select
                  value={selectedFloorPlanId ?? ""}
                  onChange={(event) =>
                    setSelectedFloorPlanId(event.target.value || null)
                  }
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {floorPlanOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {loading ? (
            <div className="p-6 text-center text-muted-foreground">
              Loading facades...
            </div>
          ) : filteredFacades.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No facades found.
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-700">
                    <th className="p-2 border-b">Label</th>
                    <th className="p-2 border-b">Floor Plan</th>
                    <th className="p-2 border-b">Image</th>
                    <th className="p-2 border-b text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFacades.map((facade) => (
                    <tr key={facade.id}>
                      <td className="p-2 border-b border-slate-100">
                        <div className="font-medium text-slate-900">
                          {facade.label ?? "--"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {facade.id}
                        </div>
                      </td>
                      <td className="p-2 border-b border-slate-100">
                        {facade.floorPlanId ?? "--"}
                      </td>
                      <td className="p-2 border-b border-slate-100">
                        <div className="text-xs text-slate-500 truncate max-w-[220px]">
                          {facade.imageUrl ?? "--"}
                        </div>
                      </td>
                      <td className="p-2 border-b border-slate-100 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            label="Edit"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => startEdit(facade)}
                          />
                          <Button
                            label="Delete"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-red-600"
                            onClick={() => handleDelete(facade.id)}
                            disabled={deleteId === facade.id}
                            loading={deleteId === facade.id}
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
            {editingId ? "Edit Facade" : "Create Facade"}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <span className="text-sm font-medium">Label</span>
              <Input
                value={form.label}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, label: event.target.value }))
                }
                className="w-full"
                required
              />
            </div>
            <div className="grid gap-2">
              <AdminUploadField
                label="Image URL"
                value={form.imageUrl}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, imageUrl: value }))
                }
                required
                folder="facades"
                accept="image/*"
              />
            </div>
            {!floorPlanOptions && (
              <div className="grid gap-2">
                <span className="text-sm font-medium">Floor Plan ID</span>
                <Input
                  value={form.floorPlanId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      floorPlanId: event.target.value,
                    }))
                  }
                  className="w-full"
                  required
                />
              </div>
            )}

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
                label={editingId ? "Save changes" : "Create facade"}
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
    </>
  );
};

export default FacadeCrud;
