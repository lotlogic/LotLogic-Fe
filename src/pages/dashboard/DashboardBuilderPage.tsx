import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FloorPlanCrud,
  type FloorPlanPayload,
  type FloorPlanRecord,
} from "@/components/admin/floorplans/FloorPlanCrud";
import {
  FacadeCrud,
  type FacadePayload,
  type FacadeRecord,
} from "@/components/admin/facades/FacadeCrud";
import type {
  AdminUser,
  BuilderRecord,
  BuilderUser,
} from "@/components/admin/builders/types";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { adminApi } from "@/lib/api/adminApi";
import { getAdminApiErrorMessage } from "@/lib/api/adminApiErrors";
import { useAdminSession } from "@/lib/admin/adminSession";
import { resolveDashboardAccess } from "@/lib/dashboard/dashboardAccess";

type BuilderForm = {
  name: string;
  email: string;
  phone: string;
};

type AdminInvitationResponse = {
  invitation?: {
    invitedUserId?: string;
    inviteRedeemUrl?: string;
    [key: string]: unknown;
  };
  user?: AdminUser;
  [key: string]: unknown;
};

type FacadePanelProps = {
  floorPlanId: string;
  floorPlanOptions: Array<{ id: string; label: string }>;
  loadFacades: (floorPlanId: string) => Promise<FacadeRecord[]>;
  createFacade: (floorPlanId: string, payload: FacadePayload) => Promise<unknown>;
  updateFacade: (
    floorPlanId: string,
    id: string,
    payload: FacadePayload
  ) => Promise<unknown>;
  deleteFacade: (floorPlanId: string, id: string) => Promise<unknown>;
};

const FacadePanel = ({
  floorPlanId,
  floorPlanOptions,
  loadFacades,
  createFacade,
  updateFacade,
  deleteFacade,
}: FacadePanelProps) => {
  const [showFacades, setShowFacades] = useState(false);

  useEffect(() => {
    setShowFacades(false);
  }, [floorPlanId]);

  const option =
    floorPlanOptions.find((item) => item.id === floorPlanId) ?? {
      id: floorPlanId,
      label: floorPlanId,
    };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold m-0">Facades</h3>
          <p className="text-sm text-muted-foreground m-0">
            Manage facades for a selected floor plan.
          </p>
        </div>
        <Button
          onClick={() => setShowFacades((prev) => !prev)}
          variant="outline"
          className="h-8 text-xs"
          label={showFacades ? "Hide facades" : "Manage facades"}
        />
      </div>
      {showFacades && (
        <FacadeCrud
          loadFacades={loadFacades}
          createFacade={createFacade}
          updateFacade={updateFacade}
          deleteFacade={deleteFacade}
          floorPlanOptions={[option]}
          initialFloorPlanId={floorPlanId}
          filterPlaceholder="Filter by label or id"
        />
      )}
    </div>
  );
};

const emptyForm: BuilderForm = {
  name: "",
  email: "",
  phone: "",
};

const normalizeOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const getUserContact = (user: AdminUser): string => {
  const email = typeof user.email === "string" ? user.email.trim() : "";
  if (email) {
    return email;
  }
  return user.externalAuthId ?? user.id;
};

const getUserName = (user: AdminUser): string =>
  user.displayName && user.displayName.trim() ? user.displayName : "(no name)";

const getBuilderName = (builder: BuilderRecord | null): string => {
  if (!builder) {
    return "";
  }
  return typeof builder.name === "string" && builder.name.trim()
    ? builder.name
    : builder.id;
};

const inviteRedirectUrl =
  import.meta.env.VITE_ENTRA_INVITE_REDIRECT_URL ||
  import.meta.env.VITE_AAD_INVITE_REDIRECT_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

const DashboardBuilderPage = () => {
  const { builderId } = useParams();
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
    builderId && access.builderIds.includes(builderId)
  );
  const hasAccess = hasAssignments && isAssigned;

  const [builder, setBuilder] = useState<BuilderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [form, setForm] = useState<BuilderForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(
    null
  );

  const [deleteAction, setDeleteAction] = useState(false);

  const [teamAction, setTeamAction] = useState<
    "add" | "remove" | "invite" | null
  >(null);
  const [teamActionUserId, setTeamActionUserId] = useState<string | null>(null);
  const [teamErrorMessage, setTeamErrorMessage] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<BuilderUser[]>([]);
  const [teamMembersLoading, setTeamMembersLoading] = useState(false);
  const [teamMembersErrorMessage, setTeamMembersErrorMessage] = useState<
    string | null
  >(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersErrorMessage, setUsersErrorMessage] = useState<string | null>(
    null
  );
  const [userFilter, setUserFilter] = useState("");
  const [showAddPanel, setShowAddPanel] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteErrorMessage, setInviteErrorMessage] = useState<string | null>(
    null
  );

  const [floorPlans, setFloorPlans] = useState<FloorPlanRecord[]>([]);

  const applyBuilder = useCallback((data: BuilderRecord) => {
    setBuilder(data);
    setForm({
      name: data.name ?? "",
      email: data.email ?? "",
      phone: data.phone ?? "",
    });
  }, []);

  const loadBuilder = useCallback(async () => {
    if (!builderId) {
      setErrorMessage("Builder ID is missing.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminApi.getBuilderById<BuilderRecord>(builderId);
      applyBuilder(data);
    } catch (error) {
      setBuilder(null);
      setErrorMessage(
        getAdminApiErrorMessage(error, "Failed to load builder.")
      );
    } finally {
      setLoading(false);
    }
  }, [applyBuilder, builderId]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersErrorMessage(null);
    try {
      const data = await adminApi.getUsers<AdminUser>();
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
    if (!builderId) {
      setTeamMembers([]);
      setTeamMembersLoading(false);
      return;
    }
    setTeamMembersLoading(true);
    setTeamMembersErrorMessage(null);
    try {
      const data = await adminApi.getBuilderUsers<BuilderUser>(builderId);
      setTeamMembers(data);
    } catch (error) {
      setTeamMembers([]);
      setTeamMembersErrorMessage(
        getAdminApiErrorMessage(error, "Failed to load team members.")
      );
    } finally {
      setTeamMembersLoading(false);
    }
  }, [builderId]);

  const loadFloorPlans = useCallback(async (): Promise<FloorPlanRecord[]> => {
    if (!builderId) {
      setFloorPlans([]);
      return [];
    }
    try {
      const data = await adminApi.getFloorPlans<FloorPlanRecord>({ builderId });
      const scoped = data.filter(
        (plan) => String(plan.builderId ?? "") === builderId
      );
      setFloorPlans(scoped);
      return scoped;
    } catch (error) {
      setFloorPlans([]);
      throw new Error(
        getAdminApiErrorMessage(error, "Failed to load floor plans.")
      );
    }
  }, [builderId]);

  const createFloorPlan = useCallback(
    async (payload: FloorPlanPayload) => {
      try {
        return await adminApi.createFloorPlan(payload);
      } catch (error) {
        throw new Error(
          getAdminApiErrorMessage(error, "Failed to create floor plan.")
        );
      }
    },
    []
  );

  const updateFloorPlan = useCallback(
    async (id: string, payload: FloorPlanPayload) => {
      try {
        return await adminApi.updateFloorPlan(id, payload);
      } catch (error) {
        throw new Error(
          getAdminApiErrorMessage(error, "Failed to update floor plan.")
        );
      }
    },
    []
  );

  const deleteFloorPlan = useCallback(
    async (id: string) => {
      try {
        return await adminApi.deleteFloorPlan(id);
      } catch (error) {
        throw new Error(
          getAdminApiErrorMessage(error, "Failed to delete floor plan.")
        );
      }
    },
    []
  );

  const loadFacades = useCallback(async (floorPlanId: string) => {
    try {
      return await adminApi.getFacades<FacadeRecord>(floorPlanId);
    } catch (error) {
      throw new Error(
        getAdminApiErrorMessage(error, "Failed to load facades.")
      );
    }
  }, []);

  const createFacade = useCallback(
    async (floorPlanId: string, payload: FacadePayload) => {
      try {
        return await adminApi.createFacade(floorPlanId, payload);
      } catch (error) {
        throw new Error(
          getAdminApiErrorMessage(error, "Failed to create facade.")
        );
      }
    },
    []
  );

  const updateFacade = useCallback(
    async (floorPlanId: string, id: string, payload: FacadePayload) => {
      try {
        return await adminApi.updateFacade(floorPlanId, id, payload);
      } catch (error) {
        throw new Error(
          getAdminApiErrorMessage(error, "Failed to update facade.")
        );
      }
    },
    []
  );

  const deleteFacade = useCallback(
    async (floorPlanId: string, id: string) => {
      try {
        return await adminApi.deleteFacade(floorPlanId, id);
      } catch (error) {
        throw new Error(
          getAdminApiErrorMessage(error, "Failed to delete facade.")
        );
      }
    },
    []
  );

  useEffect(() => {
    if (!hasAccess) {
      setLoading(false);
      return;
    }
    loadBuilder();
  }, [hasAccess, loadBuilder]);

  useEffect(() => {
    if (showAddPanel && isAdmin && users.length === 0 && !usersLoading) {
      loadUsers();
    }
  }, [isAdmin, loadUsers, showAddPanel, users.length, usersLoading]);

  useEffect(() => {
    if (!hasAccess) {
      setTeamMembers([]);
      setTeamMembersLoading(false);
      return;
    }
    loadTeamMembers();
  }, [hasAccess, loadTeamMembers]);

  useEffect(() => {
    if (!hasAccess) {
      setFloorPlans([]);
      return;
    }
    loadFloorPlans();
  }, [hasAccess, loadFloorPlans]);

  const floorPlanOptions = useMemo(
    () =>
      floorPlans.map((plan) => {
        const name =
          typeof plan.name === "string" && plan.name.trim()
            ? plan.name.trim()
            : "Untitled";
        return {
          id: plan.id,
          label: `${name} (${plan.id})`,
        };
      }),
    [floorPlans]
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

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!builderId) {
      return;
    }
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setSaveErrorMessage("Name is required.");
      return;
    }
    setSaving(true);
    setSaveErrorMessage(null);
    setSaveSuccessMessage(null);
    try {
      await adminApi.updateBuilder(builderId, {
        name: trimmedName,
        email: normalizeOptional(form.email),
        phone: normalizeOptional(form.phone),
      });
      await loadBuilder();
      setSaveSuccessMessage("Builder updated.");
    } catch (error) {
      setSaveErrorMessage(
        getAdminApiErrorMessage(error, "Failed to update builder.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!builderId) {
      return;
    }
    const confirmed = window.confirm(
      "Delete this builder? This cannot be undone."
    );
    if (!confirmed) {
      return;
    }
    setDeleteAction(true);
    setSaveErrorMessage(null);
    try {
      await adminApi.deleteBuilder(builderId);
      await reloadWhoAmI();
      navigate("/dashboard");
    } catch (error) {
      setSaveErrorMessage(
        getAdminApiErrorMessage(error, "Failed to delete builder.")
      );
    } finally {
      setDeleteAction(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!builderId) {
      return;
    }
    setTeamAction("add");
    setTeamActionUserId(userId);
    setTeamErrorMessage(null);
    try {
      await adminApi.addBuilderUsers(builderId, [userId]);
      await loadTeamMembers();
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
    if (!builderId) {
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
      await adminApi.removeBuilderUser(builderId, userId);
      await loadTeamMembers();
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
    if (!builderId) {
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
      const result = await adminApi.inviteUser<AdminInvitationResponse>({
        email,
        displayName,
        role: "USER",
        status: "ACTIVE",
        estateIds: [],
        redirectUrl: inviteRedirectUrl,
      });
      const invitedUserId =
        result.user?.id ?? result.invitation?.invitedUserId ?? null;
      if (!invitedUserId) {
        throw new Error("Invitation created but no user id was returned.");
      }
      await adminApi.addBuilderUsers(builderId, [invitedUserId]);
      await loadTeamMembers();
      await loadUsers();
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
      onClick={loadBuilder}
      disabled={loading || sessionLoading || !hasAccess}
      loading={loading && !sessionLoading}
      label="Refresh"
    />
  );

  if (sessionLoading) {
    return (
      <DashboardLayout
        title="Builder"
        subtitle="Loading access..."
        actions={actions}
      >
        <p className="text-muted-foreground">Checking access...</p>
      </DashboardLayout>
    );
  }

  if (!builderId) {
    return (
      <DashboardLayout
        title="Builder"
        subtitle="Missing builder id."
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
        title="Builder"
        subtitle="Assignments are not available yet."
        actions={actions}
      >
        <p className="text-muted-foreground">
          Ask an admin to enable builder assignments for your account.
        </p>
      </DashboardLayout>
    );
  }

  if (!hasAccess) {
    return (
      <DashboardLayout
        title="Builder"
        subtitle="You don't have access to this builder."
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
      title={loading ? "Loading builder..." : getBuilderName(builder)}
      subtitle={`Builder ID: ${builderId}`}
      actions={actions}
    >
      {errorMessage && (
        <div className="mb-4 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      <section className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Builder details</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Update the builder contact details below.
          </p>

          {loading && (
            <p className="text-sm text-muted-foreground">Loading builder...</p>
          )}

          {!loading && builder && (
            <form onSubmit={handleSave} className="grid gap-4">
              <div className="grid gap-2">
                <span className="text-sm font-medium">Name *</span>
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Builder name"
                  className="w-full"
                  required
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Email</span>
                <Input
                  value={form.email}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  placeholder="contact@example.com"
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
                  label="Delete builder"
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
            <p className="text-destructive mb-3 text-sm">{teamErrorMessage}</p>
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

      <section className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-bold m-0">Floor Plans</h2>
            <p className="text-sm text-muted-foreground m-0">
              Manage floor plans for this builder.
            </p>
          </div>
        </div>
        <FloorPlanCrud
          loadFloorPlans={loadFloorPlans}
          createFloorPlan={createFloorPlan}
          updateFloorPlan={updateFloorPlan}
          deleteFloorPlan={deleteFloorPlan}
          builderId={builderId}
          renderEditPanel={(floorPlanId) => (
            <FacadePanel
              floorPlanId={floorPlanId}
              floorPlanOptions={floorPlanOptions}
              loadFacades={loadFacades}
              createFacade={createFacade}
              updateFacade={updateFacade}
              deleteFacade={deleteFacade}
            />
          )}
        />
      </section>
    </DashboardLayout>
  );
};

export default DashboardBuilderPage;
