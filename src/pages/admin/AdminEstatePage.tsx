import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminUploadField } from "@/components/admin/AdminUploadField";
import {
  EstateLotsCrud,
  type EstateLotRecord,
} from "@/components/admin/estates/EstateLotsCrud";
import { EstateBackgroundPlacementCard } from "@/components/admin/estates/EstateBackgroundPlacementCard";
import {
  ESTATE_ACCESS_STATUSES,
  type EstateAccessStatus,
} from "@/components/admin/estates/types";
import { EstatePerformancePanel } from "@/components/admin/estates/EstatePerformancePanel";
import { EstateRuleLayersCrud } from "@/components/admin/estates/EstateRuleLayersCrud";
import { EstateEmbedPanel } from "@/components/embed/EstateEmbedPanel";
import { adminApi } from "@/lib/api/adminApi";
import {
  JURISDICTIONS,
  type Jurisdiction,
} from "@/lib/api/adminModels";
import { adminAuth } from "@/lib/auth/adminAuth";
import { useAdminSession } from "@/lib/admin/adminSession";
import {
  formatDateForCell,
  formatDateTimeForTooltip,
} from "@/lib/utils/dateTime";
import { normalizeIdList } from "@/lib/utils/ids";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type AdminEstate = {
  id: string;
  name?: string | null;
  jurisdiction?: Jurisdiction | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  backgroundImageUrl?: string | null;
  backgroundImageNorth?: number | null;
  backgroundImageSouth?: number | null;
  backgroundImageEast?: number | null;
  backgroundImageWest?: number | null;
  isPrototype?: boolean | null;
  status?: EstateAccessStatus | null;
  hasAccessPassword?: boolean | null;
  brandSetting?:
    | {
        guid?: string | null;
        name?: string | null;
        title?: string | null;
      }
    | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
};

type AdminEstateSummary = {
  id: string;
  name?: string | null;
  [key: string]: unknown;
};

type EstateUser = {
  id: string;
  externalAuthId?: string | null;
  email?: string | null;
  displayName?: string | null;
  role?: string | null;
  status?: string | null;
  estates?: AdminEstateSummary[];
  [key: string]: unknown;
};

type EstateUserAssignment = {
  userId: string;
  estateId?: string | null;
  createdAt?: string | null;
  user?: EstateUser;
  [key: string]: unknown;
};

type AdminInvitationResponse = {
  invitation?: {
    invitedUserId?: string;
    inviteRedeemUrl?: string;
    [key: string]: unknown;
  };
  user?: EstateUser;
  [key: string]: unknown;
};

type BrandSettingOption = {
  guid: string;
  name?: string | null;
  title?: string | null;
  _count?: {
    estates?: number;
  } | null;
  [key: string]: unknown;
};

type EstateForm = {
  name: string;
  jurisdiction: Jurisdiction;
  address: string;
  email: string;
  phone: string;
  logoUrl: string;
  isPrototype: boolean;
  status: EstateAccessStatus;
  accessPassword: string;
};

const emptyForm: EstateForm = {
  name: "",
  jurisdiction: "NSW",
  address: "",
  email: "",
  phone: "",
  logoUrl: "",
  isPrototype: false,
  status: "LIVE",
  accessPassword: "",
};

const getEstateName = (estate: AdminEstate | null): string => {
  if (!estate) {
    return "";
  }
  return typeof estate.name === "string" && estate.name.trim()
    ? estate.name
    : estate.id;
};

const getUserContact = (user: EstateUser): string => {
  const email = typeof user.email === "string" ? user.email.trim() : "";
  if (email) {
    return email;
  }
  return user.externalAuthId ?? user.id;
};

const getUserName = (user: EstateUser): string =>
  user.displayName && user.displayName.trim() ? user.displayName : "(no name)";

const getBrandSettingLabel = (setting: BrandSettingOption): string => {
  const name = setting.name?.trim();
  const title = setting.title?.trim();
  if (name && title && name !== title) {
    return `${name} (${title})`;
  }
  return name || title || setting.guid;
};

const normalizeOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeJurisdiction = (value: unknown): Jurisdiction =>
  typeof value === "string" &&
  JURISDICTIONS.includes(value as Jurisdiction)
    ? (value as Jurisdiction)
    : "NSW";

const normalizeBoolean = (value: unknown): boolean =>
  value === true ||
  value === 1 ||
  value === "1" ||
  (typeof value === "string" && value.toLowerCase() === "true");

const normalizeAccessStatus = (value: unknown): EstateAccessStatus =>
  value === "GATED" ? "GATED" : "LIVE";

const inviteRedirectUrl =
  typeof window !== "undefined"
    ? `${window.location.origin}/dashboard`
    : "/dashboard";

const formatMetaValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return "--";
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return JSON.stringify(value);
};

const getMetaDateValue = (label: string, value: unknown): string | null => {
  if (label !== "Created" && label !== "Updated") {
    return null;
  }
  return typeof value === "string" ? value : null;
};

const AdminEstatePage = () => {
  const { estateId } = useParams();
  const { role } = useAdminSession();
  const isAdmin = role === "ADMIN";
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
  const [themes, setThemes] = useState<BrandSettingOption[]>([]);
  const [themesLoading, setThemesLoading] = useState(false);
  const [themesErrorMessage, setThemesErrorMessage] = useState<string | null>(
    null
  );
  const [selectedThemeGuid, setSelectedThemeGuid] = useState("");
  const [initialThemeGuid, setInitialThemeGuid] = useState("");

  const [users, setUsers] = useState<EstateUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersErrorMessage, setUsersErrorMessage] = useState<string | null>(
    null
  );
  const [teamMembers, setTeamMembers] = useState<EstateUserAssignment[]>([]);
  const [teamMembersLoading, setTeamMembersLoading] = useState(false);
  const [teamMembersErrorMessage, setTeamMembersErrorMessage] = useState<
    string | null
  >(null);
  const [userFilter, setUserFilter] = useState("");
  const [showAddPanel, setShowAddPanel] = useState(false);

  const [teamAction, setTeamAction] = useState<
    "add" | "remove" | "invite" | null
  >(null);
  const [teamActionUserId, setTeamActionUserId] = useState<string | null>(null);
  const [teamErrorMessage, setTeamErrorMessage] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteErrorMessage, setInviteErrorMessage] = useState<string | null>(
    null
  );

  const applyEstate = useCallback((data: AdminEstate) => {
    setEstate(data);
    const nextForm: EstateForm = {
      name: data.name ?? "",
      jurisdiction: normalizeJurisdiction(data.jurisdiction),
      address: data.address ?? "",
      email: data.email ?? "",
      phone: data.phone ?? "",
      logoUrl: data.logoUrl ?? "",
      isPrototype: normalizeBoolean(data.isPrototype),
      status: normalizeAccessStatus(data.status),
      accessPassword: "",
    };
    setForm(nextForm);
    setInitialForm(nextForm);
    const linkedThemeGuid = data.brandSetting?.guid?.trim() ?? "";
    setSelectedThemeGuid(linkedThemeGuid);
    setInitialThemeGuid(linkedThemeGuid);
  }, []);

  const loadThemes = useCallback(async () => {
    setThemesLoading(true);
    setThemesErrorMessage(null);
    try {
      const data = await adminApi.getBrandSettings<BrandSettingOption>();
      setThemes(data);
    } catch (error) {
      setThemes([]);
      setThemesErrorMessage(
        error instanceof Error ? error.message : "Failed to load themes."
      );
    } finally {
      setThemesLoading(false);
    }
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

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersErrorMessage(null);
    try {
      const data = await adminApi.getUsers<EstateUser>();
      const hasEstateInfo = data.some((user) => Array.isArray(user.estates));
      if (!hasEstateInfo && data.length > 0) {
        const hydrated = await Promise.all(
          data.map(async (user) => {
            try {
              return await adminApi.getUserById<EstateUser>(user.id);
            } catch (error) {
              return user;
            }
          })
        );
        setUsers(hydrated);
        return;
      }
      setUsers(data);
    } catch (error) {
      setUsersErrorMessage(
        error instanceof Error ? error.message : "Failed to load users."
      );
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadTeamMembers = useCallback(async () => {
    if (!estateId) {
      setTeamMembers([]);
      setTeamMembersLoading(false);
      return;
    }
    setTeamMembersLoading(true);
    setTeamMembersErrorMessage(null);
    try {
      const data = await adminApi.getEstateUsers<EstateUserAssignment>(estateId);
      setTeamMembers(data);
    } catch (error) {
      setTeamMembers([]);
      setTeamMembersErrorMessage(
        error instanceof Error ? error.message : "Failed to load team members."
      );
    } finally {
      setTeamMembersLoading(false);
    }
  }, [estateId]);

  useEffect(() => {
    loadEstate();
  }, [loadEstate]);

  useEffect(() => {
    if (isAdmin) {
      loadThemes();
    }
  }, [isAdmin, loadThemes]);

  useEffect(() => {
    loadTeamMembers();
  }, [loadTeamMembers]);

  useEffect(() => {
    if (showAddPanel && users.length === 0 && !usersLoading) {
      loadUsers();
    }
  }, [loadUsers, showAddPanel, users.length, usersLoading]);

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
    const nextAccessPassword = form.accessPassword.trim();
    if (
      form.status === "GATED" &&
      !estate?.hasAccessPassword &&
      !nextAccessPassword
    ) {
      setSaveErrorMessage("Password is required when status is Gated.");
      setSaving(false);
      return;
    }
    const payload: Record<string, unknown> = {};
    if (trimmedName !== initialForm.name.trim()) {
      payload.name = trimmedName;
    }
    if (form.jurisdiction !== initialForm.jurisdiction) {
      payload.jurisdiction = form.jurisdiction;
    }
    if (form.status !== initialForm.status) {
      payload.status = form.status;
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

    if (isAdmin && form.isPrototype !== initialForm.isPrototype) {
      payload.isPrototype = form.isPrototype;
    }

    if (nextAccessPassword) {
      payload.accessPassword = nextAccessPassword;
    }

    const themeChanged = selectedThemeGuid !== initialThemeGuid;
    if (themeChanged) {
      payload.brandGuid = selectedThemeGuid || null;
    }

    if (Object.keys(payload).length === 0) {
      setSaveSuccessMessage("No changes to save.");
      setSaving(false);
      return;
    }
    try {
      await adminApi.updateEstate(estateId, payload);
      await Promise.all([loadEstate(), loadThemes()]);
      setSaveSuccessMessage("Estate updated.");
    } catch (error) {
      setSaveErrorMessage(
        error instanceof Error ? error.message : "Failed to update estate."
      );
    } finally {
      setSaving(false);
    }
  };

  const teamUserIds = useMemo(
    () => new Set(teamMembers.map((member) => member.userId)),
    [teamMembers]
  );

  const availableUsers = useMemo(
    () => users.filter((user) => !teamUserIds.has(user.id)),
    [teamUserIds, users]
  );

  const filteredAvailableUsers = useMemo(() => {
    const needle = userFilter.trim().toLowerCase();
    if (!needle) {
      return availableUsers;
    }
    return availableUsers.filter((user) => {
      const name = getUserName(user).toLowerCase();
      const contact = getUserContact(user).toLowerCase();
      return name.includes(needle) || contact.includes(needle);
    });
  }, [availableUsers, userFilter]);

  const handleAddMember = async (userId: string) => {
    if (!estateId) {
      return;
    }
    setTeamAction("add");
    setTeamActionUserId(userId);
    setTeamErrorMessage(null);
    try {
      const user = await adminApi.getUserById<EstateUser>(userId);
      const estates = Array.isArray(user.estates) ? user.estates : [];
      const existingIds = normalizeIdList(estates);
      const nextEstateIds = existingIds.includes(estateId)
        ? existingIds
        : [...existingIds, estateId];
      await adminApi.updateUserEstates(userId, nextEstateIds);
      await loadTeamMembers();
      if (showAddPanel) {
        await loadUsers();
      }
    } catch (error) {
      setTeamErrorMessage(
        error instanceof Error ? error.message : "Failed to add team member."
      );
    } finally {
      setTeamAction(null);
      setTeamActionUserId(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!estateId) {
      return;
    }
    const confirmed = window.confirm("Remove this team member?");
    if (!confirmed) {
      return;
    }
    setTeamAction("remove");
    setTeamActionUserId(userId);
    setTeamErrorMessage(null);
    try {
      const user = await adminApi.getUserById<EstateUser>(userId);
      const estates = Array.isArray(user.estates) ? user.estates : [];
      const existingIds = normalizeIdList(estates);
      const nextEstateIds = existingIds.filter((id) => id !== estateId);
      await adminApi.updateUserEstates(userId, nextEstateIds);
      await loadTeamMembers();
      if (showAddPanel) {
        await loadUsers();
      }
    } catch (error) {
      setTeamErrorMessage(
        error instanceof Error ? error.message : "Failed to remove team member."
      );
    } finally {
      setTeamAction(null);
      setTeamActionUserId(null);
    }
  };

  const handleInviteMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!estateId) {
      return;
    }
    const email = inviteEmail.trim();
    const displayName = inviteName.trim();
    if (!email || !displayName) {
      setInviteErrorMessage("Email and name are required.");
      return;
    }
    setTeamAction("invite");
    setInviteErrorMessage(null);
    setTeamErrorMessage(null);
    try {
      const estateName = getEstateName(estate) || "your estate";
      await adminApi.inviteUser<AdminInvitationResponse>({
        email,
        displayName,
        role: "USER",
        status: "ACTIVE",
        estateIds: [estateId],
        redirectUrl: inviteRedirectUrl,
        inviteContext: {
          scenario: "estate-team",
          estateName,
        },
      });
      await loadTeamMembers();
      if (showAddPanel) {
        await loadUsers();
      }
      setInviteEmail("");
      setInviteName("");
    } catch (error) {
      setInviteErrorMessage(
        error instanceof Error ? error.message : "Failed to invite user."
      );
    } finally {
      setTeamAction(null);
    }
  };

  const handleLogout = async () => {
    await adminAuth.logout();
  };

  const previewThemeGuid = selectedThemeGuid || initialThemeGuid || null;

  const handleBackgroundUpdated = useCallback(
    (updated: {
      backgroundImageUrl?: string | null;
      backgroundImageNorth?: number | null;
      backgroundImageSouth?: number | null;
      backgroundImageEast?: number | null;
      backgroundImageWest?: number | null;
    }) => {
      setEstate((prev) => (prev ? { ...prev, ...updated } : prev));
    },
    []
  );

  const themeOptions = useMemo(
    () =>
      [...themes].sort((left, right) =>
        getBrandSettingLabel(left).localeCompare(getBrandSettingLabel(right))
      ),
    [themes]
  );

  const metaEntries = useMemo(() => {
    if (!estate) {
      return [];
    }
    return [
      { label: "Estate ID", value: estate.id },
      ...(estate.createdAt ? [{ label: "Created", value: estate.createdAt }] : []),
      ...(estate.updatedAt ? [{ label: "Updated", value: estate.updatedAt }] : []),
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
        {estateId && <EstatePerformancePanel estateId={estateId} />}

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
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
                <span className="text-sm font-medium">Jurisdiction *</span>
                <select
                  value={form.jurisdiction}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      jurisdiction: event.target.value as Jurisdiction,
                    }))
                  }
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  required
                >
                  {JURISDICTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <span className="text-sm font-medium">Status *</span>
                <select
                  value={form.status}
                  onChange={(event) => {
                    const nextStatus = event.target.value as EstateAccessStatus;
                    setForm((prev) => ({
                      ...prev,
                      status: nextStatus,
                      accessPassword:
                        nextStatus === "GATED" ? prev.accessPassword : "",
                    }));
                  }}
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  required
                >
                  {ESTATE_ACCESS_STATUSES.map((option) => (
                    <option key={option} value={option}>
                      {option === "LIVE" ? "Live" : "Gated"}
                    </option>
                  ))}
                </select>
              </div>

              {form.status === "GATED" && (
                <div className="grid gap-2">
                  <span className="text-sm font-medium">
                    Password{estate?.hasAccessPassword ? "" : " *"}
                  </span>
                  <Input
                    value={form.accessPassword}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        accessPassword: event.target.value,
                      }))
                    }
                    placeholder={
                      estate?.hasAccessPassword
                        ? "Leave blank to keep the current password"
                        : "Enter embed password"
                    }
                    type="password"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground m-0">
                    {estate?.hasAccessPassword
                      ? "Leave blank to keep the current embed password."
                      : "This password will be required before the embed renders."}
                  </p>
                </div>
              )}

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
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  helperText="Accepted formats: PNG, SVG, JPG, or WEBP. Minimum 200px wide. Square or horizontal format preferred."
                />
              </div>

              {isAdmin && (
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Prototype estate</span>
                  <label className="inline-flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.isPrototype}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          isPrototype: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    />
                    <span>Use this estate as the default for `/prototype`</span>
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Only one estate should be flagged as prototype.
                  </p>
                </div>
              )}

              {metaEntries.length > 0 && (
                <div className="grid gap-2 rounded-md border border-slate-100 bg-slate-50 p-3 text-sm">
                  {metaEntries.map((entry) => {
                    const metaDateValue = getMetaDateValue(
                      entry.label,
                      entry.value
                    );
                    return (
                      <div key={entry.label} className="flex gap-2">
                        <span className="text-slate-500 min-w-[90px]">
                          {entry.label}
                        </span>
                        <span
                          className="font-mono text-slate-700"
                          title={formatDateTimeForTooltip(metaDateValue)}
                        >
                          {metaDateValue
                            ? formatDateForCell(metaDateValue)
                            : formatMetaValue(entry.value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  disabled={saving}
                  loading={saving}
                  label="Save changes"
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

          <div className="grid gap-6">
            <div className="border rounded-lg p-6 bg-white shadow-sm h-fit">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className="text-xl font-bold mt-0 mb-0">Team Members</h2>
                <Button
                  onClick={() => setShowAddPanel((prev) => !prev)}
                  variant="outline"
                  className="h-8 text-xs"
                  label={showAddPanel ? "Close add members" : "Add members"}
                />
              </div>
              {teamErrorMessage && (
                <p className="text-destructive mb-3 text-sm">
                  {teamErrorMessage}
                </p>
              )}
              {teamMembersLoading && (
                <p className="text-sm text-muted-foreground">
                  Loading team members...
                </p>
              )}
              {teamMembersErrorMessage && (
                <p className="text-destructive mb-3 text-sm">
                  {teamMembersErrorMessage}
                </p>
              )}
              {!teamMembersLoading && teamMembers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No team members assigned.
                </p>
              )}
              {!teamMembersLoading && teamMembers.length > 0 && (
                <div className="overflow-auto border rounded-lg">
                  <table className="w-full border-collapse min-w-[520px]">
                    <thead>
                      <tr className="bg-slate-100 text-left">
                        <th className="p-3 border-b font-medium text-sm text-slate-700">
                          Name
                        </th>
                        <th className="p-3 border-b font-medium text-sm text-slate-700">
                          Email
                        </th>
                        {isAdmin && (
                          <th className="p-3 border-b font-medium text-sm text-slate-700">
                            Role
                          </th>
                        )}
                        <th className="p-3 border-b font-medium text-sm text-slate-700">
                          Status
                        </th>
                        <th className="p-3 border-b font-medium text-sm text-slate-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers.map((member) => {
                        const user = member.user;
                        const name = user ? getUserName(user) : "(unknown)";
                        const contact = user
                          ? getUserContact(user)
                          : member.userId;
                        return (
                          <tr key={member.userId}>
                            <td className="p-3 border-b border-slate-100 text-sm">
                              {name}
                            </td>
                            <td className="p-3 border-b border-slate-100 text-sm">
                              {contact}
                            </td>
                            {isAdmin && (
                              <td className="p-3 border-b border-slate-100 text-sm">
                                {user?.role ?? "--"}
                              </td>
                            )}
                            <td className="p-3 border-b border-slate-100 text-sm">
                              {user?.status ?? "--"}
                            </td>
                            <td className="p-3 border-b border-slate-100 text-sm">
                              <Button
                                onClick={() => handleRemoveMember(member.userId)}
                                disabled={teamAction !== null}
                                loading={
                                  teamAction === "remove" &&
                                  teamActionUserId === member.userId
                                }
                                variant="ghost"
                                className="h-7 px-2 text-xs text-destructive hover:bg-red-50 hover:text-destructive"
                                label="Remove"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {usersErrorMessage && (
                <p className="text-destructive mt-3 text-sm">
                  {usersErrorMessage}
                </p>
              )}
              {showAddPanel && (
                <div className="mt-4 pt-4 border-t border-slate-100 grid gap-6">
                  <div className="border rounded-lg p-6 bg-slate-50">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-lg m-0">
                        Add Existing User
                      </h3>
                      <Button
                        onClick={loadUsers}
                        disabled={usersLoading}
                        loading={usersLoading}
                        variant="outline"
                        className="h-7 text-xs"
                        label={usersLoading ? "Loading..." : "Reload users"}
                      />
                    </div>
                    <Input
                      value={userFilter}
                      onChange={(event) => setUserFilter(event.target.value)}
                      placeholder="Search by name or email"
                      className="w-full mb-3"
                    />
                    {usersErrorMessage && (
                      <p className="text-destructive text-sm mb-2">
                        {usersErrorMessage}
                      </p>
                    )}
                    <div className="max-h-[280px] overflow-auto border rounded-lg bg-white">
                      <table className="w-full border-collapse min-w-[420px]">
                        <thead>
                          <tr className="bg-slate-50 text-left">
                            <th className="p-2 border-b font-medium text-xs text-slate-500">
                              Name
                            </th>
                          <th className="p-2 border-b font-medium text-xs text-slate-500">
                            Email
                          </th>
                          {isAdmin && (
                            <th className="p-2 border-b font-medium text-xs text-slate-500">
                              Role
                            </th>
                          )}
                          <th className="p-2 border-b font-medium text-xs text-slate-500">
                            Actions
                          </th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersLoading && (
                            <tr>
                              <td
                                colSpan={isAdmin ? 4 : 3}
                                className="p-3 text-center text-sm text-muted-foreground"
                              >
                                Loading users...
                              </td>
                            </tr>
                          )}
                          {!usersLoading &&
                            filteredAvailableUsers.map((user) => (
                              <tr key={user.id}>
                                <td className="p-2 border-b border-slate-50 text-sm">
                                  {getUserName(user)}
                                </td>
                                <td className="p-2 border-b border-slate-50 text-sm">
                                  {getUserContact(user)}
                                </td>
                                {isAdmin && (
                                  <td className="p-2 border-b border-slate-50 text-sm">
                                    {user.role ?? "--"}
                                  </td>
                                )}
                                <td className="p-2 border-b border-slate-50 text-sm">
                                  <Button
                                    onClick={() => handleAddMember(user.id)}
                                    disabled={teamAction !== null}
                                    loading={
                                      teamAction === "add" &&
                                      teamActionUserId === user.id
                                    }
                                    variant="ghost"
                                    className="h-7 px-2 text-xs"
                                    label="Add"
                                  />
                                </td>
                              </tr>
                            ))}
                          {!usersLoading && filteredAvailableUsers.length === 0 && (
                            <tr>
                              <td
                                colSpan={isAdmin ? 4 : 3}
                                className="p-3 text-center text-sm text-muted-foreground"
                              >
                                No available users match the filter.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="border rounded-lg p-6 bg-slate-50">
                    <h3 className="font-semibold text-lg m-0 mb-3">
                      Invite & Add User
                    </h3>
                    <form onSubmit={handleInviteMember} className="grid gap-4">
                      <div className="grid gap-2">
                        <span className="text-sm font-medium">Email</span>
                        <Input
                          value={inviteEmail}
                          onChange={(event) => setInviteEmail(event.target.value)}
                          type="email"
                          className="w-full"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <span className="text-sm font-medium">Name</span>
                        <Input
                          value={inviteName}
                          onChange={(event) => setInviteName(event.target.value)}
                          className="w-full"
                          required
                        />
                      </div>
                      <div className="flex gap-2 items-center mt-2">
                        <Button
                          type="submit"
                          disabled={teamAction !== null}
                          loading={teamAction === "invite"}
                          label="Send invite & add"
                        />
                        {inviteErrorMessage && (
                          <span className="text-destructive text-sm">
                            {inviteErrorMessage}
                          </span>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>

            <div className="border rounded-lg p-6 bg-white shadow-sm h-fit">
              <h2 className="text-xl font-bold mt-0 mb-1">Embed Settings</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Choose the theme for this estate, then use the preview and embed
                details below.
              </p>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Theme</span>
                <select
                  value={selectedThemeGuid}
                  onChange={(event) => setSelectedThemeGuid(event.target.value)}
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  disabled={themesLoading}
                >
                  <option value="">No theme selected</option>
                  {themeOptions.map((theme) => {
                    const estateCount = theme._count?.estates ?? 0;
                    return (
                      <option key={theme.guid} value={theme.guid}>
                        {estateCount > 0
                          ? `${getBrandSettingLabel(theme)} - used by ${estateCount} estate${estateCount === 1 ? "" : "s"}`
                          : getBrandSettingLabel(theme)}
                      </option>
                    );
                  })}
                </select>
                <p className="text-xs text-muted-foreground">
                  Theme changes are saved when you use Save changes in Estate
                  properties.
                </p>
                {selectedThemeGuid === "" && initialThemeGuid !== "" && (
                  <p className="text-xs text-amber-700">
                    Save changes to remove the currently linked theme from this
                    estate.
                  </p>
                )}
                {themesErrorMessage && (
                  <p className="text-xs text-destructive">{themesErrorMessage}</p>
                )}
              </div>

              {estateId && (
                <EstateEmbedPanel
                  className="mt-4"
                  estateId={estateId}
                  themeGuid={previewThemeGuid}
                />
              )}
            </div>

            {estateId && (
              <EstateRuleLayersCrud
                estateId={estateId}
                mode="builderApprovals"
                estateName={getEstateName(estate)}
              />
            )}
          </div>
        </div>

        {estateId && (
          <EstateBackgroundPlacementCard
            estateId={estateId}
            initialValue={{
              backgroundImageUrl: estate?.backgroundImageUrl ?? null,
              backgroundImageNorth: estate?.backgroundImageNorth ?? null,
              backgroundImageSouth: estate?.backgroundImageSouth ?? null,
              backgroundImageEast: estate?.backgroundImageEast ?? null,
              backgroundImageWest: estate?.backgroundImageWest ?? null,
            }}
            onUpdated={handleBackgroundUpdated}
          />
        )}

        {estateId && (
          <EstateRuleLayersCrud
            estateId={estateId}
            mode="ruleSet"
            estateName={getEstateName(estate)}
          />
        )}

        <EstateLotsCrud
          estateId={estateId}
          estateName={form.name}
          estateAddress={form.address}
          loadLots={(id) => adminApi.getLots<EstateLotRecord>({ estateId: id })}
          createLot={(payload) => adminApi.createLot(payload)}
          updateLot={(id, payload) => adminApi.updateLot(id, payload)}
          deleteLot={(id) => adminApi.deleteLot(id)}
          deleteAllLots={
            isAdmin ? (id) => adminApi.deleteEstateLots(id) : undefined
          }
          importLotsDxf={(id, payload) =>
            adminApi.importEstateLotsDxf(id, payload)
          }
          recomputeEstateDesignOnLot={(id) =>
            adminApi.recomputeEstateDesignOnLot(id)
          }
        />
      </section>
    </div>
  );
};

export default AdminEstatePage;
