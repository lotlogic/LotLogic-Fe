import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AdminUploadField } from "@/components/admin/AdminUploadField";
import {
  EstateLotsCrud,
  type EstateLotRecord,
} from "@/components/admin/estates/EstateLotsCrud";
import type { EstateRecord } from "@/components/admin/estates/types";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { adminApi, type CreateLotInput } from "@/lib/api/adminApi";
import { getAdminApiErrorMessage } from "@/lib/api/adminApiErrors";
import { useAdminSession } from "@/lib/admin/adminSession";
import { resolveDashboardAccess } from "@/lib/dashboard/dashboardAccess";

type EstateForm = {
  name: string;
  address: string;
  email: string;
  phone: string;
  logoUrl: string;
  themeColor: string;
};

const emptyForm: EstateForm = {
  name: "",
  address: "",
  email: "",
  phone: "",
  logoUrl: "",
  themeColor: "",
};

const normalizeOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const getEstateName = (estate: EstateRecord | null): string => {
  if (!estate) {
    return "";
  }
  return typeof estate.name === "string" && estate.name.trim()
    ? estate.name
    : estate.id;
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

const DashboardEstatePage = () => {
  const { estateId } = useParams();
  const navigate = useNavigate();
  const { whoAmI, loading: sessionLoading, reloadWhoAmI } = useAdminSession();

  const { access, hasAssignments } = useMemo(
    () => resolveDashboardAccess(whoAmI),
    [whoAmI]
  );
  const isAssigned = Boolean(
    estateId && access.estateIds.includes(estateId)
  );
  const hasAccess = hasAssignments && isAssigned;

  const [estate, setEstate] = useState<EstateRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [form, setForm] = useState<EstateForm>(emptyForm);
  const [initialForm, setInitialForm] = useState<EstateForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(
    null
  );
  const [deleteAction, setDeleteAction] = useState(false);

  const applyEstate = useCallback((data: EstateRecord) => {
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
      const data = await adminApi.getEstateById<EstateRecord>(estateId);
      applyEstate(data);
    } catch (error) {
      setEstate(null);
      setErrorMessage(
        getAdminApiErrorMessage(error, "Failed to load estate.")
      );
    } finally {
      setLoading(false);
    }
  }, [applyEstate, estateId]);

  useEffect(() => {
    if (!hasAccess) {
      setLoading(false);
      return;
    }
    loadEstate();
  }, [hasAccess, loadEstate]);

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
        getAdminApiErrorMessage(error, "Failed to update estate.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!estateId) {
      return;
    }
    const confirmed = window.confirm(
      "Delete this estate? This cannot be undone."
    );
    if (!confirmed) {
      return;
    }
    setDeleteAction(true);
    setSaveErrorMessage(null);
    try {
      await adminApi.deleteEstate(estateId);
      await reloadWhoAmI();
      navigate("/dashboard");
    } catch (error) {
      setSaveErrorMessage(
        getAdminApiErrorMessage(error, "Failed to delete estate.")
      );
    } finally {
      setDeleteAction(false);
    }
  };

  const loadLots = useCallback(async (id: string) => {
    try {
      return await adminApi.getLots<EstateLotRecord>({ estateId: id });
    } catch (error) {
      throw new Error(getAdminApiErrorMessage(error, "Failed to load lots."));
    }
  }, []);

  const createLot = useCallback(async (payload: CreateLotInput) => {
    try {
      return await adminApi.createLot(payload);
    } catch (error) {
      throw new Error(getAdminApiErrorMessage(error, "Failed to create lot."));
    }
  }, []);

  const updateLot = useCallback(
    async (id: string, payload: Record<string, unknown>) => {
      try {
        return await adminApi.updateLot(id, payload);
      } catch (error) {
        throw new Error(
          getAdminApiErrorMessage(error, "Failed to update lot.")
        );
      }
    },
    []
  );

  const deleteLot = useCallback(async (id: string) => {
    try {
      return await adminApi.deleteLot(id);
    } catch (error) {
      throw new Error(getAdminApiErrorMessage(error, "Failed to delete lot."));
    }
  }, []);

  const importLotsDxf = useCallback(
    async (id: string, payload: FormData) => {
      try {
        return await adminApi.importEstateLotsDxf(id, payload);
      } catch (error) {
        throw new Error(
          getAdminApiErrorMessage(error, "Failed to import lots.")
        );
      }
    },
    []
  );

  const metaEntries = useMemo(() => {
    if (!estate) {
      return [];
    }
    const createdAt =
      typeof estate.createdAt === "string" ? estate.createdAt : null;
    const updatedAt =
      typeof estate.updatedAt === "string" ? estate.updatedAt : null;
    const entries = [
      { label: "Estate ID", value: estate.id },
      ...(createdAt ? [{ label: "Created", value: createdAt }] : []),
      ...(updatedAt ? [{ label: "Updated", value: updatedAt }] : []),
    ];
    return entries;
  }, [estate]);

  const actions = (
    <Button
      onClick={loadEstate}
      disabled={loading || sessionLoading || !hasAccess}
      loading={loading && !sessionLoading}
      label="Refresh"
    />
  );

  if (sessionLoading) {
    return (
      <DashboardLayout
        title="Estate"
        subtitle="Loading access..."
        actions={actions}
      >
        <p className="text-muted-foreground">Checking access...</p>
      </DashboardLayout>
    );
  }

  if (!estateId) {
    return (
      <DashboardLayout
        title="Estate"
        subtitle="Missing estate id."
        actions={actions}
      >
        <p className="text-muted-foreground">
          Return to <Link to="/dashboard">dashboard</Link>.
        </p>
      </DashboardLayout>
    );
  }

  if (!hasAssignments) {
    return (
      <DashboardLayout
        title="Estate"
        subtitle="Assignments are not available yet."
        actions={actions}
      >
        <p className="text-muted-foreground">
          Ask an admin to enable estate assignments for your account.
        </p>
      </DashboardLayout>
    );
  }

  if (!hasAccess) {
    return (
      <DashboardLayout
        title="Estate"
        subtitle="You don't have access to this estate."
        actions={actions}
      >
        <p className="text-muted-foreground">
          Return to <Link to="/dashboard">dashboard</Link>.
        </p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={loading ? "Loading estate..." : getEstateName(estate)}
      subtitle={`Estate ID: ${estateId}`}
      actions={actions}
    >
      {errorMessage && (
        <div className="mb-4 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      <section className="grid gap-6">
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
                    setForm((prev) => ({
                      ...prev,
                      address: event.target.value,
                    }))
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
                    setForm((prev) => ({
                      ...prev,
                      themeColor: event.target.value,
                    }))
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
                <Button
                  type="submit"
                  disabled={saving}
                  loading={saving}
                  label="Save changes"
                />
                <Button
                  type="button"
                  variant="outline"
                  label="Delete estate"
                  onClick={handleDelete}
                  disabled={deleteAction}
                  loading={deleteAction}
                />
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

        <EstateLotsCrud
          estateId={estateId}
          loadLots={loadLots}
          createLot={createLot}
          updateLot={updateLot}
          deleteLot={deleteLot}
          importLotsDxf={importLotsDxf}
        />
      </section>
    </DashboardLayout>
  );
};

export default DashboardEstatePage;
