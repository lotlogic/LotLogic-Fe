import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminUploadField } from "@/components/admin/AdminUploadField";
import { adminApi } from "@/lib/api/adminApi";
import { adminAuth } from "@/lib/auth/adminAuth";
import {
  formatDateForCell,
  formatDateTimeForTooltip,
} from "@/lib/utils/dateTime";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type AdminEstate = {
  id: string;
  name?: string | null;
  [key: string]: unknown;
};

type BrandSettings = {
  id: string;
  guid: string;
  name?: string | null;
  title?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  bgPrimaryColor?: string | null;
  bgSecondaryColor?: string | null;
  textPrimaryColor?: string | null;
  textSecondaryColor?: string | null;
  fontFamilyPrimary?: string | null;
  fontFamilySecondary?: string | null;
  estateId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
};

type BrandSettingsForm = {
  name: string;
  title: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  bgPrimaryColor: string;
  bgSecondaryColor: string;
  textPrimaryColor: string;
  textSecondaryColor: string;
  fontFamilyPrimary: string;
  fontFamilySecondary: string;
  estateId: string;
};

const emptyForm: BrandSettingsForm = {
  name: "",
  title: "",
  logoUrl: "",
  primaryColor: "",
  secondaryColor: "",
  bgPrimaryColor: "",
  bgSecondaryColor: "",
  textPrimaryColor: "",
  textSecondaryColor: "",
  fontFamilyPrimary: "",
  fontFamilySecondary: "",
  estateId: "",
};

const normalizeOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeRequired = (value: string) => value.trim();

const getEstateName = (estate: AdminEstate | undefined) =>
  typeof estate?.name === "string" && estate.name.trim()
    ? estate.name
    : estate?.id ?? "--";

type ColorFieldProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
};

const ColorField = ({ label, value, onChange, placeholder }: ColorFieldProps) => {
  const previewValue = useMemo(() => {
    if (!value) {
      return "#111827";
    }
    const trimmed = value.trim();
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)
      ? trimmed
      : "#111827";
  }, [value]);

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={previewValue}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-12 rounded-md border border-slate-200 bg-white p-1 shadow-sm"
          aria-label={`${label} color picker`}
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full font-mono"
        />
      </div>
    </div>
  );
};

const AdminBrandSettingsPage = () => {
  const navigate = useNavigate();
  const [settingsList, setSettingsList] = useState<BrandSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");

  const [estates, setEstates] = useState<AdminEstate[]>([]);
  const [estatesLoading, setEstatesLoading] = useState(false);
  const [estatesErrorMessage, setEstatesErrorMessage] = useState<string | null>(
    null
  );

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<BrandSettingsForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(
    null
  );
  const [lastCreatedGuid, setLastCreatedGuid] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminApi.getBrandSettings<BrandSettings>();
      setSettingsList(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load brand settings."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEstates = useCallback(async () => {
    setEstatesLoading(true);
    setEstatesErrorMessage(null);
    try {
      const data = await adminApi.getEstates<AdminEstate>();
      setEstates(data);
    } catch (error) {
      setEstatesErrorMessage(
        error instanceof Error ? error.message : "Failed to load estates."
      );
    } finally {
      setEstatesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadEstates();
  }, [loadSettings, loadEstates]);

  const estateLookup = useMemo(() => {
    const map = new Map<string, AdminEstate>();
    estates.forEach((estate) => map.set(estate.id, estate));
    return map;
  }, [estates]);

  const filteredSettings = useMemo(() => {
    const needle = filterText.trim().toLowerCase();
    if (!needle) {
      return settingsList;
    }
    return settingsList.filter((setting) => {
      const name = (setting.name ?? "").toLowerCase();
      const title = (setting.title ?? "").toLowerCase();
      const guid = setting.guid.toLowerCase();
      const estateId = (setting.estateId ?? "").toLowerCase();
      return (
        name.includes(needle) ||
        title.includes(needle) ||
        guid.includes(needle) ||
        estateId.includes(needle)
      );
    });
  }, [filterText, settingsList]);

  const updateField =
    <K extends keyof BrandSettingsForm>(key: K) =>
    (value: string) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = normalizeRequired(form.name);
    const title = normalizeRequired(form.title);
    const logoUrl = normalizeRequired(form.logoUrl);
    if (!name || !title || !logoUrl) {
      setSaveErrorMessage("Name, title, and logo URL are required.");
      setSaveSuccessMessage(null);
      return;
    }

    setSaving(true);
    setSaveErrorMessage(null);
    setSaveSuccessMessage(null);
    setLastCreatedGuid(null);

    const payload = {
      name,
      title,
      logoUrl,
      primaryColor: normalizeOptional(form.primaryColor),
      secondaryColor: normalizeOptional(form.secondaryColor),
      bgPrimaryColor: normalizeOptional(form.bgPrimaryColor),
      bgSecondaryColor: normalizeOptional(form.bgSecondaryColor),
      textPrimaryColor: normalizeOptional(form.textPrimaryColor),
      textSecondaryColor: normalizeOptional(form.textSecondaryColor),
      fontFamilyPrimary: normalizeOptional(form.fontFamilyPrimary),
      fontFamilySecondary: normalizeOptional(form.fontFamilySecondary),
      estateId: normalizeOptional(form.estateId),
    };

    try {
      const created = await adminApi.createBrandSetting<BrandSettings>(payload);
      await loadSettings();
      setForm(emptyForm);
      setSaveSuccessMessage("Brand settings created.");
      if (created?.guid) {
        setLastCreatedGuid(created.guid);
      }
    } catch (error) {
      setSaveErrorMessage(
        error instanceof Error ? error.message : "Failed to create brand settings."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await adminAuth.logout();
  };

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Brand Settings</h1>
      <AdminNav />
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <Button
          onClick={loadSettings}
          disabled={loading}
          label="Refresh settings"
          loading={loading}
        />
        <Button onClick={handleLogout} variant="outline" label="Sign out" />
        <Button
          onClick={() =>
            setShowAddForm((prev) => {
              const next = !prev;
              if (next) {
                setSaveErrorMessage(null);
                setSaveSuccessMessage(null);
                setLastCreatedGuid(null);
              }
              return next;
            })
          }
          label={showAddForm ? "Cancel" : "Add brand settings"}
          variant={showAddForm ? "outline" : "primary"}
          className="ml-auto"
        />
      </div>

      {showAddForm && (
        <form
          onSubmit={handleCreate}
          className="grid gap-5 p-5 border rounded-lg mb-6 bg-slate-50"
        >
          <h2 className="text-lg font-semibold">New Brand Settings</h2>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <span className="text-sm font-medium">Name *</span>
              <Input
                value={form.name}
                onChange={(event) => updateField("name")(event.target.value)}
                className="w-full"
                placeholder="LotLogic"
                required
              />
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Title *</span>
              <Input
                value={form.title}
                onChange={(event) => updateField("title")(event.target.value)}
                className="w-full"
                placeholder="LotLogic Block Planner"
                required
              />
            </div>
            <div className="grid gap-2">
              <AdminUploadField
                label="Logo URL *"
                value={form.logoUrl}
                onChange={updateField("logoUrl")}
                placeholder="https://example.com/logo.png"
                required
                folder="logos"
                accept="image/*"
              />
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Estate (optional)</span>
              <select
                value={form.estateId}
                onChange={(event) => updateField("estateId")(event.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Unassigned</option>
                {estates.map((estate) => (
                  <option key={estate.id} value={estate.id}>
                    {getEstateName(estate)} ({estate.id})
                  </option>
                ))}
              </select>
              {estatesErrorMessage && (
                <span className="text-destructive text-sm">
                  {estatesErrorMessage}
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Colors
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <ColorField
                label="Primary"
                value={form.primaryColor}
                onChange={updateField("primaryColor")}
                placeholder="#1F6FEB"
              />
              <ColorField
                label="Secondary"
                value={form.secondaryColor}
                onChange={updateField("secondaryColor")}
                placeholder="#F59E0B"
              />
              <ColorField
                label="Background Primary"
                value={form.bgPrimaryColor}
                onChange={updateField("bgPrimaryColor")}
                placeholder="#F8FAFC"
              />
              <ColorField
                label="Background Secondary"
                value={form.bgSecondaryColor}
                onChange={updateField("bgSecondaryColor")}
                placeholder="#FFFFFF"
              />
              <ColorField
                label="Text Primary"
                value={form.textPrimaryColor}
                onChange={updateField("textPrimaryColor")}
                placeholder="#111827"
              />
              <ColorField
                label="Text Secondary"
                value={form.textSecondaryColor}
                onChange={updateField("textSecondaryColor")}
                placeholder="#6B7280"
              />
            </div>
          </div>

          <div className="grid gap-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Fonts
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <span className="text-sm font-medium">Primary font family</span>
                <Input
                  value={form.fontFamilyPrimary}
                  onChange={(event) =>
                    updateField("fontFamilyPrimary")(event.target.value)
                  }
                  className="w-full"
                  placeholder="Montserrat"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">
                  Secondary font family
                </span>
                <Input
                  value={form.fontFamilySecondary}
                  onChange={(event) =>
                    updateField("fontFamilySecondary")(event.target.value)
                  }
                  className="w-full"
                  placeholder="Source Sans Pro"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Button
              type="submit"
              disabled={saving}
              loading={saving}
              label="Create brand settings"
            />
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              label={estatesLoading ? "Loading estates..." : "Reload estates"}
              onClick={loadEstates}
            />
            {saveErrorMessage && (
              <span className="text-destructive text-sm">
                {saveErrorMessage}
              </span>
            )}
            {saveSuccessMessage && (
              <span className="text-emerald-600 text-sm flex items-center gap-2">
                {saveSuccessMessage}
                {lastCreatedGuid && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    label="Manage"
                    onClick={() =>
                      navigate(`/admin/brand-settings/${lastCreatedGuid}`)
                    }
                  />
                )}
              </span>
            )}
          </div>
        </form>
      )}

      <div className="flex items-center gap-3 mb-4">
        <Input
          value={filterText}
          onChange={(event) => setFilterText(event.target.value)}
          placeholder="Filter by name, title, guid, or estate id"
          className="flex-1 min-w-[220px]"
        />
      </div>

      {loading && (
        <p className="text-muted-foreground p-4 text-center">
          Loading brand settings...
        </p>
      )}
      {errorMessage && <p className="text-destructive p-4">{errorMessage}</p>}

      {!loading && !errorMessage && (
        <div className="overflow-auto border rounded-lg">
          <table className="w-full border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Name
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Title
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Estate
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  GUID
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Updated
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSettings.map((setting) => (
                <tr key={setting.guid}>
                  <td className="p-3 border-b border-slate-100 text-sm">
                    {setting.name ?? "--"}
                  </td>
                  <td className="p-3 border-b border-slate-100 text-sm">
                    {setting.title ?? "--"}
                  </td>
                  <td className="p-3 border-b border-slate-100 text-sm">
                    {setting.estateId
                      ? getEstateName(estateLookup.get(setting.estateId))
                      : "--"}
                  </td>
                  <td className="p-3 border-b border-slate-100 text-xs text-slate-400 font-mono">
                    {setting.guid}
                  </td>
                  <td className="p-3 border-b border-slate-100 text-sm">
                    <span title={formatDateTimeForTooltip(setting.updatedAt)}>
                      {formatDateForCell(setting.updatedAt)}
                    </span>
                  </td>
                  <td className="p-3 border-b border-slate-100 text-sm">
                    <Button
                      onClick={() =>
                        navigate(`/admin/brand-settings/${setting.guid}`)
                      }
                      variant="ghost"
                      className="h-8 px-2 text-xs"
                      label="Manage"
                    />
                  </td>
                </tr>
              ))}
              {!loading && filteredSettings.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-4 text-center text-muted-foreground"
                  >
                    No brand settings match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminBrandSettingsPage;
