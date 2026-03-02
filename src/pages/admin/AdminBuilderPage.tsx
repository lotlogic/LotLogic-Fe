import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminNav } from "@/components/admin/AdminNav";
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
import { BuilderPerformancePanel } from "@/components/admin/builders/BuilderPerformancePanel";
import { BuilderLeadsPanel } from "@/components/admin/builders/BuilderLeadsPanel";
import { adminApi } from "@/lib/api/adminApi";
import { adminAuth } from "@/lib/auth/adminAuth";
import { useAdminSession } from "@/lib/admin/adminSession";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type AdminUser = {
  id: string;
  externalAuthId?: string | null;
  email?: string | null;
  displayName?: string | null;
  role?: string | null;
  status?: string | null;
  [key: string]: unknown;
};

type BuilderUser = {
  userId: string;
  builderId?: string;
  createdAt?: string | null;
  user?: AdminUser;
  [key: string]: unknown;
};

type AdminBuilder = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  builderUsers?: BuilderUser[];
  [key: string]: unknown;
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


const getBuilderName = (builder: AdminBuilder): string =>
  typeof builder.name === "string" && builder.name.trim()
    ? builder.name
    : builder.id;

const getUserContact = (user: AdminUser): string => {
  const email = typeof user.email === "string" ? user.email.trim() : "";
  if (email) {
    return email;
  }
  return user.externalAuthId ?? user.id;
};

const getUserName = (user: AdminUser): string =>
  user.displayName && user.displayName.trim() ? user.displayName : "(no name)";

const normalizeOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const inviteRedirectUrl =
  typeof window !== "undefined"
    ? `${window.location.origin}/dashboard`
    : "/dashboard";

const AdminBuilderPage = () => {
  const { builderId } = useParams();
  const navigate = useNavigate();
  const { role } = useAdminSession();
  const isAdmin = role === "ADMIN";

  const [builder, setBuilder] = useState<AdminBuilder | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAction, setEditAction] = useState<"save" | "delete" | null>(null);
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);

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
  const [usersErrorMessage, setUsersErrorMessage] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState("");
  const [showAddPanel, setShowAddPanel] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteErrorMessage, setInviteErrorMessage] = useState<string | null>(
    null
  );

  const [floorPlans, setFloorPlans] = useState<FloorPlanRecord[]>([]);

  const loadBuilder = useCallback(async () => {
    if (!builderId) {
      setErrorMessage("Builder ID is missing.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminApi.getBuilderById<AdminBuilder>(builderId);
      setBuilder(data);
      setEditName(data.name ?? "");
      setEditEmail(data.email ?? "");
      setEditPhone(data.phone ?? "");
    } catch (error) {
      setBuilder(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load builder."
      );
    } finally {
      setLoading(false);
    }
  }, [builderId]);

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
        error instanceof Error ? error.message : "Failed to load team members."
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
      throw error;
    }
  }, [builderId]);

  const createFloorPlan = useCallback(
    async (payload: FloorPlanPayload) => adminApi.createFloorPlan(payload),
    []
  );

  const updateFloorPlan = useCallback(
    async (id: string, payload: FloorPlanPayload) =>
      adminApi.updateFloorPlan(id, payload),
    []
  );

  const deleteFloorPlan = useCallback(
    async (id: string) => adminApi.deleteFloorPlan(id),
    []
  );

  const loadFacades = useCallback(async (floorPlanId: string) => {
    return adminApi.getFacades<FacadeRecord>(floorPlanId);
  }, []);

  const createFacade = useCallback(
    async (floorPlanId: string, payload: FacadePayload) =>
      adminApi.createFacade(floorPlanId, payload),
    []
  );

  const updateFacade = useCallback(
    async (floorPlanId: string, id: string, payload: FacadePayload) =>
      adminApi.updateFacade(floorPlanId, id, payload),
    []
  );

  const deleteFacade = useCallback(
    async (floorPlanId: string, id: string) =>
      adminApi.deleteFacade(floorPlanId, id),
    []
  );

  useEffect(() => {
    loadBuilder();
  }, [loadBuilder]);

  useEffect(() => {
    if (showAddPanel && users.length === 0 && !usersLoading) {
      loadUsers();
    }
  }, [loadUsers, showAddPanel, users.length, usersLoading]);

  useEffect(() => {
    loadTeamMembers();
  }, [loadTeamMembers]);


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

  const handleSaveBuilder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!builderId) {
      return;
    }
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditErrorMessage("Name is required.");
      return;
    }
    setEditAction("save");
    setEditErrorMessage(null);
    try {
      await adminApi.updateBuilder(builderId, {
        name: trimmedName,
        email: normalizeOptional(editEmail),
        phone: normalizeOptional(editPhone),
      });
      await loadBuilder();
    } catch (error) {
      setEditErrorMessage(
        error instanceof Error ? error.message : "Failed to update builder."
      );
    } finally {
      setEditAction(null);
    }
  };

  const handleDeleteBuilder = async () => {
    if (!builderId) {
      return;
    }
    const confirmed = window.confirm(
      "Delete this builder? This cannot be undone."
    );
    if (!confirmed) {
      return;
    }
    setEditAction("delete");
    setEditErrorMessage(null);
    try {
      await adminApi.deleteBuilder(builderId);
      navigate("/admin/builders");
    } catch (error) {
      setEditErrorMessage(
        error instanceof Error ? error.message : "Failed to delete builder."
      );
    } finally {
      setEditAction(null);
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
        error instanceof Error ? error.message : "Failed to add team member."
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
        error instanceof Error ? error.message : "Failed to remove team member."
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
        error instanceof Error ? error.message : "Failed to invite user."
      );
    } finally {
      setTeamAction(null);
    }
  };

  const handleLogout = async () => {
    await adminAuth.logout();
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading builder...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="container py-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Builder</h1>
        <AdminNav />
        <p className="text-destructive mb-4">{errorMessage}</p>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate("/admin/builders")}
            variant="outline"
            label="Back to builders"
          />
          <Button onClick={handleLogout} label="Sign out" />
        </div>
      </div>
    );
  }

  if (!builder) {
    return (
      <div className="container py-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Builder</h1>
        <AdminNav />
        <p className="text-muted-foreground">Builder not found.</p>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        Builder: {getBuilderName(builder)}
      </h1>
      <AdminNav />
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <Button
          onClick={() => navigate("/admin/builders")}
          variant="outline"
          label="Back to builders"
        />
        <Button onClick={loadBuilder} label="Refresh builder" />
        <Button onClick={handleLogout} variant="outline" label="Sign out" />
      </div>

      <section className="grid gap-6 grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
        <div className="border rounded-lg p-6 bg-white shadow-sm h-fit">
          <h2 className="text-xl font-bold mb-4 mt-0">Builder Details</h2>
          <form onSubmit={handleSaveBuilder} className="grid gap-4">
            <div className="grid gap-2">
              <span className="text-sm font-medium">Name *</span>
              <Input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className="w-full"
                required
              />
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Email</span>
              <Input
                value={editEmail}
                onChange={(event) => setEditEmail(event.target.value)}
                type="email"
                className="w-full"
              />
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Phone</span>
              <Input
                value={editPhone}
                onChange={(event) => setEditPhone(event.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2 flex-wrap items-center mt-2">
              <Button
                type="submit"
                disabled={editAction !== null}
                loading={editAction === "save"}
                label="Save builder"
              />
              <Button
                type="button"
                onClick={handleDeleteBuilder}
                disabled={editAction !== null}
                loading={editAction === "delete"}
                variant="ghost"
                className="text-destructive hover:bg-red-50 hover:text-destructive"
                label="Delete builder"
              />
              {editErrorMessage && (
                <span className="text-destructive text-sm">
                  {editErrorMessage}
                </span>
              )}
            </div>
          </form>
        </div>

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
      </section>

      <section className="mt-10">
        <BuilderPerformancePanel
          builderId={builderId}
          title="Design View Performance"
          subtitle="View data for this builder's house designs."
        />
      </section>

      <section className="mt-10">
        <BuilderLeadsPanel
          builderId={builderId}
          title="Builder Enquiries"
          subtitle="Review submitted leads and recent enquiry activity."
        />
      </section>

      <section className="mt-10">
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
    </div>
  );
};

export default AdminBuilderPage;
