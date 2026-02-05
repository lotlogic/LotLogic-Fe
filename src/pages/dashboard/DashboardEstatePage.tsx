import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AdminUploadField } from "@/components/admin/AdminUploadField";
import {
  EstateLotsCrud,
  type DxfImportResult,
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
import { normalizeIdList } from "@/lib/utils/ids";

type EstateForm = {
  name: string;
  address: string;
  email: string;
  phone: string;
  logoUrl: string;
  themeColor: string;
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

const getUserContact = (user: EstateUser): string => {
  const email = typeof user.email === "string" ? user.email.trim() : "";
  if (email) {
    return email;
  }
  return user.externalAuthId ?? user.id;
};

const getUserName = (user: EstateUser): string =>
  user.displayName && user.displayName.trim() ? user.displayName : "(no name)";

const inviteRedirectUrl =
  import.meta.env.VITE_ENTRA_INVITE_REDIRECT_URL ||
  import.meta.env.VITE_AAD_INVITE_REDIRECT_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

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
  const {
    whoAmI,
    loading: sessionLoading,
    reloadWhoAmI,
    role,
  } = useAdminSession();

  const { access, hasAssignments } = useMemo(
    () => resolveDashboardAccess(whoAmI),
    [whoAmI]
  );
  const isAdmin = role === "ADMIN";
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
    if (!hasAccess) {
      setLoading(false);
      return;
    }
    loadEstate();
  }, [hasAccess, loadEstate]);

  useEffect(() => {
    if (!hasAccess) {
      setUsers([]);
      setUsersLoading(false);
      setTeamMembers([]);
      setTeamMembersLoading(false);
      return;
    }
    loadTeamMembers();
  }, [hasAccess, loadTeamMembers]);

  useEffect(() => {
    if (!hasAccess) {
      return;
    }
    if (showAddPanel && isAdmin && users.length === 0 && !usersLoading) {
      loadUsers();
    }
  }, [hasAccess, isAdmin, loadUsers, showAddPanel, users.length, usersLoading]);

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
    async (id: string, payload: FormData): Promise<DxfImportResult> => {
      try {
        return await adminApi.importEstateLotsDxf<DxfImportResult>(id, payload);
      } catch (error) {
        throw new Error(
          getAdminApiErrorMessage(error, "Failed to import lots.")
        );
      }
    },
    []
  );

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
      if (showAddPanel && isAdmin) {
        await loadUsers();
      }
    } catch (error) {
      setTeamErrorMessage(
        getAdminApiErrorMessage(error, "Failed to add team member.")
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
      if (showAddPanel && isAdmin) {
        await loadUsers();
      }
    } catch (error) {
      setTeamErrorMessage(
        getAdminApiErrorMessage(error, "Failed to remove team member.")
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
      await adminApi.inviteUser<AdminInvitationResponse>({
        email,
        displayName,
        role: "USER",
        status: "ACTIVE",
        estateIds: [estateId],
        redirectUrl: inviteRedirectUrl,
      });
      await loadTeamMembers();
      if (showAddPanel && isAdmin) {
        await loadUsers();
      }
      setInviteEmail("");
      setInviteName("");
    } catch (error) {
      setInviteErrorMessage(
        getAdminApiErrorMessage(error, "Failed to invite user.")
      );
    } finally {
      setTeamAction(null);
    }
  };

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

      <section className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
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

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm h-fit">
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
                    <th className="p-3 border-b font-medium text-sm text-slate-700">
                      Role
                    </th>
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
                        <td className="p-3 border-b border-slate-100 text-sm">
                          {user?.role ?? "--"}
                        </td>
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
            <div
              className={`mt-4 pt-4 border-t border-slate-100 grid gap-6${isAdmin ? " lg:grid-cols-[1.1fr_1fr]" : ""}`}
            >
              {isAdmin && (
                <div className="border rounded-lg p-6 bg-white shadow-sm">
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
                          <th className="p-2 border-b font-medium text-xs text-slate-500">
                            Role
                          </th>
                          <th className="p-2 border-b font-medium text-xs text-slate-500">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersLoading && (
                          <tr>
                            <td
                              colSpan={4}
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
                              <td className="p-2 border-b border-slate-50 text-sm">
                                {user.role ?? "--"}
                              </td>
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
                              colSpan={4}
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
              )}

              <div className="border rounded-lg p-6 bg-white shadow-sm">
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
      </section>

      <EstateLotsCrud
        estateId={estateId}
        loadLots={loadLots}
        createLot={createLot}
        updateLot={updateLot}
        deleteLot={deleteLot}
        importLotsDxf={importLotsDxf}
      />
    </DashboardLayout>
  );
};

export default DashboardEstatePage;
