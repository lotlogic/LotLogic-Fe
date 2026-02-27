import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

const mapSettingsToForm = (settings: BrandSettings | null): BrandSettingsForm => ({
  name: settings?.name ?? "",
  title: settings?.title ?? "",
  logoUrl: settings?.logoUrl ?? "",
  primaryColor: settings?.primaryColor ?? "",
  secondaryColor: settings?.secondaryColor ?? "",
  bgPrimaryColor: settings?.bgPrimaryColor ?? "",
  bgSecondaryColor: settings?.bgSecondaryColor ?? "",
  textPrimaryColor: settings?.textPrimaryColor ?? "",
  textSecondaryColor: settings?.textSecondaryColor ?? "",
  fontFamilyPrimary: settings?.fontFamilyPrimary ?? "",
  fontFamilySecondary: settings?.fontFamilySecondary ?? "",
  estateId: settings?.estateId ?? "",
});

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

const AdminBrandSettingPage = () => {
  const { guid } = useParams();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<BrandSettings | null>(null);
  const [form, setForm] = useState<BrandSettingsForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(
    null
  );

  const [estates, setEstates] = useState<AdminEstate[]>([]);
  const [estatesLoading, setEstatesLoading] = useState(false);
  const [estatesErrorMessage, setEstatesErrorMessage] = useState<string | null>(
    null
  );

  const loadSettings = useCallback(async () => {
    if (!guid) {
      setErrorMessage("Brand settings GUID is missing.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminApi.getBrandSettingByGuid<BrandSettings>(guid);
      setSettings(data);
      setForm(mapSettingsToForm(data));
    } catch (error) {
      setSettings(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load brand settings."
      );
    } finally {
      setLoading(false);
    }
  }, [guid]);

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

  const updateField =
    <K extends keyof BrandSettingsForm>(key: K) =>
    (value: string) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!guid) {
      return;
    }
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
      await adminApi.updateBrandSetting(guid, payload);
      await loadSettings();
      setSaveSuccessMessage("Brand settings updated.");
    } catch (error) {
      setSaveErrorMessage(
        error instanceof Error ? error.message : "Failed to save brand settings."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!guid) {
      return;
    }
    const confirmed = window.confirm(
      "Delete these brand settings? This cannot be undone."
    );
    if (!confirmed) {
      return;
    }
    setSaving(true);
    setSaveErrorMessage(null);
    setSaveSuccessMessage(null);
    try {
      await adminApi.deleteBrandSetting(guid);
      navigate("/admin/brand-settings");
    } catch (error) {
      setSaveErrorMessage(
        error instanceof Error ? error.message : "Failed to delete brand settings."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(mapSettingsToForm(settings));
    setSaveErrorMessage(null);
    setSaveSuccessMessage(null);
  };

  const handleLogout = async () => {
    await adminAuth.logout();
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading brand settings...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="container py-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Brand Settings</h1>
        <AdminNav />
        <p className="text-destructive mb-4">{errorMessage}</p>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate("/admin/brand-settings")}
            variant="outline"
            label="Back to list"
          />
          <Button onClick={handleLogout} label="Sign out" />
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="container py-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Brand Settings</h1>
        <AdminNav />
        <p className="text-muted-foreground">Brand settings not found.</p>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Brand Settings</h1>
      <AdminNav />
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <Button
          onClick={() => navigate("/admin/brand-settings")}
          variant="outline"
          label="Back to list"
        />
        <Button onClick={loadSettings} label="Refresh settings" />
        <Button onClick={handleLogout} variant="outline" label="Sign out" />
      </div>

      <section className="grid gap-6 grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <h2 className="text-xl font-bold mb-4 mt-0">Edit Brand Settings</h2>
          <form onSubmit={handleSave} className="grid gap-5">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <span className="text-sm font-medium">Name *</span>
                <Input
                  value={form.name}
                  onChange={(event) => updateField("name")(event.target.value)}
                  className="w-full"
                  required
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Title *</span>
                <Input
                  value={form.title}
                  onChange={(event) => updateField("title")(event.target.value)}
                  className="w-full"
                  required
                />
              </div>
              <div className="grid gap-2">
                <AdminUploadField
                  label="Logo URL *"
                  value={form.logoUrl}
                  onChange={updateField("logoUrl")}
                  required
                  folder="logos"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  helperText="Accepted formats: PNG, SVG, JPG, or WEBP. Minimum 200px wide. Square or horizontal format preferred."
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
                  <span className="text-sm font-medium">
                    Primary font family
                  </span>
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
                label="Save changes"
              />
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={handleReset}
                label="Reset"
              />
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={handleDelete}
                className="text-destructive hover:bg-red-50 hover:text-destructive"
                label="Delete"
              />
              {saveErrorMessage && (
                <span className="text-destructive text-sm">
                  {saveErrorMessage}
                </span>
              )}
              {saveSuccessMessage && (
                <span className="text-emerald-600 text-sm">
                  {saveSuccessMessage}
                </span>
              )}
            </div>
          </form>
        </div>

        <aside className="border rounded-lg p-6 bg-slate-50 h-fit">
          <h2 className="text-lg font-semibold mb-3">Current Info</h2>
          <div className="grid gap-3 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">
                ID
              </div>
              <div className="font-mono text-slate-700">{settings.id}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">
                GUID
              </div>
              <div className="font-mono text-slate-700">{settings.guid}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Estate
              </div>
              <div>
                {settings.estateId
                  ? getEstateName(estateLookup.get(settings.estateId))
                  : "--"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Updated
              </div>
              <div title={formatDateTimeForTooltip(settings.updatedAt)}>
                {formatDateForCell(settings.updatedAt)}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Created
              </div>
              <div title={formatDateTimeForTooltip(settings.createdAt)}>
                {formatDateForCell(settings.createdAt)}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                Logo Preview
              </div>
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt="Brand logo"
                  className="max-h-24 object-contain bg-white border rounded-md p-2"
                />
              ) : (
                <div className="text-xs text-slate-500">No logo set.</div>
              )}
            </div>
          </div>
          <div className="mt-4">
            <Button
              onClick={loadEstates}
              disabled={estatesLoading}
              loading={estatesLoading}
              variant="outline"
              className="h-8 text-xs"
              label="Reload estates"
            />
          </div>
        </aside>
      </section>
    </div>
  );
};

export default AdminBrandSettingPage;
