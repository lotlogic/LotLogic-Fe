import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminUploadField } from "@/components/admin/AdminUploadField";
import { adminApi } from "@/lib/api/adminApi";
import { adminAuth } from "@/lib/auth/adminAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type AdminFacade = {
  id: string;
  label?: string | null;
  imageUrl?: string | null;
  floorPlanId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type FacadeForm = {
  label: string;
  imageUrl: string;
  floorPlanId: string;
};

const emptyForm: FacadeForm = {
  label: "",
  imageUrl: "",
  floorPlanId: "",
};

const AdminFacadesPage = () => {
  const [facades, setFacades] = useState<AdminFacade[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");

  const [form, setForm] = useState<FacadeForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(
    null
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadFacades = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminApi.getFacades<AdminFacade>();
      setFacades(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load facades."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFacades();
  }, [loadFacades]);

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

  const startEdit = (facade: AdminFacade) => {
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
    const floorPlanId = form.floorPlanId.trim();

    if (!label || !imageUrl || !floorPlanId) {
      setFormErrorMessage("Label, image URL, and floor plan id are required.");
      return;
    }

    const payload = {
      label,
      imageUrl,
      floorPlanId,
    };

    setSaving(true);
    try {
      if (editingId) {
        await adminApi.updateFacade(editingId, payload);
        setFormSuccessMessage("Facade updated.");
      } else {
        await adminApi.createFacade(payload);
        setFormSuccessMessage("Facade created.");
      }
      await loadFacades();
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
      await adminApi.deleteFacade(id);
      await loadFacades();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete facade."
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
      <h1 className="text-3xl font-bold mb-6">Facades</h1>
      <AdminNav />
      <div className="flex flex-wrap gap-2 mb-6 mt-4">
        <Button
          onClick={loadFacades}
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
            <h2 className="text-lg font-semibold">Existing Facades</h2>
            <Input
              value={filterText}
              onChange={(event) => setFilterText(event.target.value)}
              placeholder="Filter by label, id, or floor plan id"
              className="max-w-sm"
            />
          </div>

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
    </div>
  );
};

export default AdminFacadesPage;
