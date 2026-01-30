import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { adminApi } from "@/lib/api/adminApi";
import { adminAuth } from "@/lib/auth/adminAuth";
import { useAdminSession } from "@/lib/admin/adminSession";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type AdminEstate = {
  id: string;
  name?: string | null;
  [key: string]: unknown;
};

type AdminUser = {
  id: string;
  externalAuthId?: string | null;
  email?: string | null;
  displayName?: string | null;
  role?: string | null;
  status?: string | null;
  estates?: AdminEstate[];
  [key: string]: unknown;
};

type AdminInvitationResponse = {
  invitation?: {
    invitedUserId?: string;
    inviteRedeemUrl?: string;
    [key: string]: unknown;
  };
  user?: AdminUser;
  estates?: AdminEstate[];
  [key: string]: unknown;
};

const roleOptions = ["ADMIN", "USER"] as const;

const getUserContact = (user: AdminUser): string => {
  const email = typeof user.email === "string" ? user.email.trim() : "";
  if (email) {
    return email;
  }
  return user.externalAuthId ?? user.id;
};

const getUserName = (user: AdminUser): string =>
  user.displayName && user.displayName.trim() ? user.displayName : "(no name)";

const getEstateName = (estate: AdminEstate): string =>
  typeof estate.name === "string" && estate.name.trim()
    ? estate.name
    : estate.id;

const inviteRedirectUrl =
  import.meta.env.VITE_ENTRA_INVITE_REDIRECT_URL ||
  import.meta.env.VITE_AAD_INVITE_REDIRECT_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

const AdminUsersPage = () => {
  const {
    role,
    whoAmI,
    loading: sessionLoading,
    errorMessage: sessionErrorMessage,
    reloadWhoAmI,
  } = useAdminSession();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");

  const [showWhoAmI, setShowWhoAmI] = useState(false);
  const [whoAmIRefreshing, setWhoAmIRefreshing] = useState(false);
  const [whoAmIErrorMessage, setWhoAmIErrorMessage] = useState<string | null>(
    null,
  );

  const [showAddForm, setShowAddForm] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addRole, setAddRole] =
    useState<(typeof roleOptions)[number]>("USER");
  const [addSaving, setAddSaving] = useState(false);
  const [addErrorMessage, setAddErrorMessage] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedErrorMessage, setSelectedErrorMessage] = useState<
    string | null
  >(null);

  const [editEmail, setEditEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] =
    useState<(typeof roleOptions)[number]>("USER");
  const [editAction, setEditAction] = useState<
    "save" | "delete" | "disable" | "enable" | null
  >(null);
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);

  const [showMapPanel, setShowMapPanel] = useState(false);
  const [allEstates, setAllEstates] = useState<AdminEstate[]>([]);
  const [estatesLoading, setEstatesLoading] = useState(false);
  const [estatesErrorMessage, setEstatesErrorMessage] = useState<string | null>(
    null,
  );
  const [selectedEstateIds, setSelectedEstateIds] = useState<string[]>([]);
  const [mapSaving, setMapSaving] = useState(false);
  const [mapErrorMessage, setMapErrorMessage] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminApi.getUsers<AdminUser>();
      setUsers(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load users.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSelectedUser = useCallback(async (userId: string) => {
    setSelectedLoading(true);
    setSelectedErrorMessage(null);
    try {
      const data = await adminApi.getUserById<AdminUser>(userId);
      setSelectedUser(data);
      setEditEmail(data.email ?? "");
      setEditName(data.displayName ?? "");
      setEditRole((data.role as (typeof roleOptions)[number]) ?? "USER");
      const estateIds = (data.estates ?? []).map((estate) => estate.id);
      setSelectedEstateIds(estateIds);
      return data;
    } catch (error) {
      setSelectedUser(null);
      setSelectedEstateIds([]);
      setSelectedErrorMessage(
        error instanceof Error ? error.message : "Failed to load user.",
      );
      return null;
    } finally {
      setSelectedLoading(false);
    }
  }, []);

  const loadEstates = useCallback(async () => {
    setEstatesLoading(true);
    setEstatesErrorMessage(null);
    try {
      const data = await adminApi.getEstates<AdminEstate>();
      setAllEstates(data);
      return data;
    } catch (error) {
      setEstatesErrorMessage(
        error instanceof Error ? error.message : "Failed to load estates.",
      );
      return [];
    } finally {
      setEstatesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role !== "ADMIN") {
      setLoading(false);
      return;
    }
    loadUsers();
  }, [loadUsers, role]);

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUser(null);
      setShowMapPanel(false);
      setSelectedEstateIds([]);
      setEditEmail("");
      setEditName("");
      return;
    }
    loadSelectedUser(selectedUserId);
  }, [loadSelectedUser, selectedUserId]);

  const filteredUsers = useMemo(() => {
    const needle = filterText.trim().toLowerCase();
    if (!needle) {
      return users;
    }
    return users.filter((user) => {
      const contact = getUserContact(user).toLowerCase();
      const name = getUserName(user).toLowerCase();
      return contact.includes(needle) || name.includes(needle);
    });
  }, [filterText, users]);

  const editBusy = editAction !== null;
  const selectedUserStatusLabel = selectedUser?.status ?? "(unknown)";
  const selectedUserStatus = selectedUserStatusLabel.toUpperCase();
  const isSelectedUserDisabled = selectedUserStatus === "DISABLED";

  const handleRefreshWhoAmI = async () => {
    setWhoAmIRefreshing(true);
    setWhoAmIErrorMessage(null);
    try {
      const refreshed = await reloadWhoAmI();
      if (!refreshed) {
        setWhoAmIErrorMessage("whoami is unavailable.");
      }
    } finally {
      setWhoAmIRefreshing(false);
    }
  };

  const handleInviteUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = addEmail.trim();
    const displayName = addName.trim();
    if (!email || !displayName) {
      setAddErrorMessage("Email and name are required.");
      return;
    }
    setAddSaving(true);
    setAddErrorMessage(null);
    try {
      const result = await adminApi.inviteUser<AdminInvitationResponse>({
        email,
        displayName,
        role: addRole,
        status: "ACTIVE",
        estateIds: [],
        redirectUrl: inviteRedirectUrl,
      });
      await loadUsers();
      setShowAddForm(false);
      setAddEmail("");
      setAddName("");
      setAddRole("USER");
      if (result.user?.id) {
        setSelectedUserId(result.user.id);
      }
    } catch (error) {
      setAddErrorMessage(
        error instanceof Error ? error.message : "Failed to invite user.",
      );
    } finally {
      setAddSaving(false);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setSelectedErrorMessage(null);
    setEditErrorMessage(null);
    setMapErrorMessage(null);
  };

  const handleSaveUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUserId) {
      return;
    }
    setEditAction("save");
    setEditErrorMessage(null);
    try {
      await adminApi.updateUser(selectedUserId, {
        email: editEmail.trim(),
        role: editRole,
        displayName: editName.trim(),
      });
      await loadSelectedUser(selectedUserId);
      await loadUsers();
    } catch (error) {
      setEditErrorMessage(
        error instanceof Error ? error.message : "Failed to update user.",
      );
    } finally {
      setEditAction(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUserId) {
      return;
    }
    const confirmed = window.confirm(
      "Delete this user? This cannot be undone.",
    );
    if (!confirmed) {
      return;
    }
    setEditAction("delete");
    setEditErrorMessage(null);
    try {
      await adminApi.deleteUser(selectedUserId);
      setSelectedUserId(null);
      setSelectedUser(null);
      await loadUsers();
    } catch (error) {
      setEditErrorMessage(
        error instanceof Error ? error.message : "Failed to delete user.",
      );
    } finally {
      setEditAction(null);
    }
  };

  const handleDisableUser = async () => {
    if (!selectedUserId) {
      return;
    }
    const confirmed = window.confirm(
      "Disable this user? They will not be able to sign in.",
    );
    if (!confirmed) {
      return;
    }
    setEditAction("disable");
    setEditErrorMessage(null);
    try {
      await adminApi.disableUser(selectedUserId);
      await loadSelectedUser(selectedUserId);
      await loadUsers();
    } catch (error) {
      setEditErrorMessage(
        error instanceof Error ? error.message : "Failed to disable user.",
      );
    } finally {
      setEditAction(null);
    }
  };

  const handleEnableUser = async () => {
    if (!selectedUserId) {
      return;
    }
    setEditAction("enable");
    setEditErrorMessage(null);
    try {
      await adminApi.enableUser(selectedUserId);
      await loadSelectedUser(selectedUserId);
      await loadUsers();
    } catch (error) {
      setEditErrorMessage(
        error instanceof Error ? error.message : "Failed to enable user.",
      );
    } finally {
      setEditAction(null);
    }
  };

  const handleToggleMapPanel = async () => {
    const next = !showMapPanel;
    setShowMapPanel(next);
    setMapErrorMessage(null);
    if (next && allEstates.length === 0) {
      await loadEstates();
    }
  };

  const handleEstateToggle = (estateId: string) => {
    setSelectedEstateIds((prev) =>
      prev.includes(estateId)
        ? prev.filter((id) => id !== estateId)
        : [...prev, estateId],
    );
  };

  const handleSaveEstates = async () => {
    if (!selectedUserId) {
      return;
    }
    setMapSaving(true);
    setMapErrorMessage(null);
    try {
      await adminApi.updateUserEstates(selectedUserId, selectedEstateIds);
      await loadSelectedUser(selectedUserId);
      await loadUsers();
      setShowMapPanel(false);
    } catch (error) {
      setMapErrorMessage(
        error instanceof Error ? error.message : "Failed to map estates.",
      );
    } finally {
      setMapSaving(false);
    }
  };

  const handleLogout = async () => {
    await adminAuth.logout();
  };

  if (sessionLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading admin session...
      </div>
    );
  }

  if (role !== "ADMIN") {
    return (
      <div className="container py-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Admin Users</h1>
        <AdminNav />
        <p className="mb-4">You must be an ADMIN to view users.</p>
        <Button onClick={handleLogout} label="Sign out" />
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Users</h1>
      <AdminNav />
      <div className="flex gap-3 mb-6 items-center">
        <Button
          onClick={loadUsers}
          disabled={loading}
          label="Refresh Users"
          loading={loading}
        />
        <Button onClick={handleLogout} variant="outline" label="Sign out" />
        <Button
          onClick={() => setShowWhoAmI((prev) => !prev)}
          variant="ghost"
          label={showWhoAmI ? "Hide whoami debug" : "Show whoami debug"}
          className="ml-auto"
        />
      </div>

      {showWhoAmI && (
        <section className="mb-6 p-4 border rounded-lg bg-slate-50 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <strong>/api/admin/whoami</strong>
            <Button
              onClick={handleRefreshWhoAmI}
              disabled={whoAmIRefreshing}
              loading={whoAmIRefreshing}
              label="Refresh whoami"
              variant="outline"
              className="h-7 px-2 text-xs"
            />
          </div>
          {sessionErrorMessage && (
            <p className="text-destructive mb-2">{sessionErrorMessage}</p>
          )}
          {whoAmIErrorMessage && (
            <p className="text-destructive mb-2">{whoAmIErrorMessage}</p>
          )}
          <pre className="whitespace-pre-wrap m-0 font-mono text-xs">
            {JSON.stringify(whoAmI, null, 2)}
          </pre>
        </section>
      )}

      <section className="grid gap-6 grid-cols-1 lg:grid-cols-[1fr_420px]">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <Button
              onClick={() => setShowAddForm((prev) => !prev)}
              label={showAddForm ? "Cancel" : "Invite user"}
              variant={showAddForm ? "outline" : "primary"}
            />
            <Input
              value={filterText}
              onChange={(event) => setFilterText(event.target.value)}
              placeholder="Filter by email, externalAuthId, or name"
              className="flex-1 min-w-[200px]"
            />
          </div>

          {showAddForm && (
            <form
              onSubmit={handleInviteUser}
              className="grid gap-4 p-4 border rounded-lg mb-4 bg-slate-50"
            >
              <h3 className="font-semibold text-lg">Invite User</h3>
              <div className="grid gap-2">
                <span className="text-sm font-medium w-full">Email</span>
                <Input
                  className="w-full"
                  value={addEmail}
                  onChange={(event) => setAddEmail(event.target.value)}
                  type="email"
                  required
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium w-full">Name</span>
                <Input
                  className="w-full"
                  value={addName}
                  onChange={(event) => setAddName(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Role</span>
                <select
                  value={addRole}
                  onChange={(event) =>
                    setAddRole(
                      event.target.value as (typeof roleOptions)[number],
                    )
                  }
                  className="flex h-9 w-fit rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {roleOptions.map((roleOption) => (
                    <option key={roleOption} value={roleOption}>
                      {roleOption}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 items-center mt-2">
                <Button
                  type="submit"
                  disabled={addSaving}
                  loading={addSaving}
                  label="Send invitation"
                />
                {addErrorMessage && (
                  <span className="text-destructive text-sm">
                    {addErrorMessage}
                  </span>
                )}
              </div>
            </form>
          )}

          {loading && (
            <p className="text-muted-foreground p-4 text-center">
              Loading users...
            </p>
          )}
          {errorMessage && (
            <p className="text-destructive p-4">{errorMessage}</p>
          )}
          {!loading && !errorMessage && (
            <div className="overflow-auto border rounded-lg">
              <table className="w-full border-collapse min-w-[520px]">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    <th className="p-3 border-b font-medium text-sm text-slate-700">
                      Email / External ID
                    </th>
                    <th className="p-3 border-b font-medium text-sm text-slate-700">
                      Name
                    </th>
                    <th className="p-3 border-b font-medium text-sm text-slate-700">
                      Role
                    </th>
                    <th className="p-3 border-b font-medium text-sm text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const isSelected = selectedUserId === user.id;
                    return (
                      <tr
                        key={user.id}
                        className={isSelected ? "bg-indigo-50" : undefined}
                      >
                        <td className="p-3 border-b border-slate-100 text-sm">
                          {getUserContact(user)}
                        </td>
                        <td className="p-3 border-b border-slate-100 text-sm">
                          {getUserName(user)}
                        </td>
                        <td className="p-3 border-b border-slate-100 text-sm">
                          {user.role ?? "(unknown)"}
                        </td>
                        <td className="p-3 border-b border-slate-100 text-sm">
                          <Button
                            onClick={() => handleSelectUser(user.id)}
                            variant="ghost"
                            className="h-8 px-2 text-xs"
                            label="Edit"
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && filteredUsers.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-4 text-center text-muted-foreground"
                      >
                        No users match the current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border rounded-lg p-6 bg-white shadow-sm h-fit">
          <h2 className="text-xl font-bold mb-4 mt-0">Edit User</h2>
          {!selectedUserId && (
            <p className="text-muted-foreground">Select a user to edit.</p>
          )}
          {selectedLoading && (
            <p className="text-muted-foreground">Loading user...</p>
          )}
          {selectedErrorMessage && (
            <p className="text-destructive mb-2">{selectedErrorMessage}</p>
          )}
          {selectedUser && !selectedLoading && (
            <>
              <form onSubmit={handleSaveUser} className="grid gap-4">
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
                  <span className="text-sm font-medium">Name</span>
                  <Input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Role</span>
                  <select
                    value={editRole}
                    onChange={(event) =>
                      setEditRole(
                        event.target.value as (typeof roleOptions)[number],
                      )
                    }
                    className="flex h-9 w-fit rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {roleOptions.map((roleOption) => (
                      <option key={roleOption} value={roleOption}>
                        {roleOption}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Status</span>
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className={
                        isSelectedUserDisabled ? "text-amber-700" : "text-emerald-700"
                      }
                    >
                      {selectedUserStatusLabel}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap items-center mt-2">
                  <Button
                    type="submit"
                    disabled={editBusy}
                    loading={editAction === "save"}
                    label="Save"
                  />
                  {isSelectedUserDisabled ? (
                    <Button
                      type="button"
                      onClick={handleEnableUser}
                      disabled={editBusy}
                      loading={editAction === "enable"}
                      variant="outline"
                      className="hover:bg-emerald-600 hover:border-emerald-600"
                      label="Enable"
                    />
                  ) : (
                    <Button
                      type="button"
                      onClick={handleDisableUser}
                      disabled={editBusy}
                      loading={editAction === "disable"}
                      variant="outline"
                      className="text-destructive hover:bg-red-50 hover:text-destructive hover:border-red-200"
                      label="Disable"
                    />
                  )}
                  <Button
                    type="button"
                    onClick={handleDeleteUser}
                    disabled={editBusy}
                    loading={editAction === "delete"}
                    variant="ghost"
                    className="text-destructive hover:bg-red-50 hover:text-destructive"
                    label="Delete"
                  />
                  {editErrorMessage && (
                    <span className="text-destructive text-sm">
                      {editErrorMessage}
                    </span>
                  )}
                </div>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-3 justify-between">
                  <strong className="text-sm font-semibold">
                    Assigned Estates
                  </strong>
                  <Button
                    onClick={handleToggleMapPanel}
                    type="button"
                    variant="outline"
                    className="h-7 text-xs"
                    label={showMapPanel ? "Close map estate" : "Map estate"}
                  />
                </div>

                {(selectedUser.estates ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No estates assigned.
                  </p>
                )}
                {(selectedUser.estates ?? []).length > 0 && (
                  <div className="overflow-auto border rounded-md">
                    <table className="w-full border-collapse min-w-[280px]">
                      <thead>
                        <tr className="bg-slate-50 text-left">
                          <th className="p-2 border-b font-medium text-xs text-slate-500">
                            Estate
                          </th>
                          <th className="p-2 border-b font-medium text-xs text-slate-500">
                            ID
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedUser.estates ?? []).map((estate) => (
                          <tr key={estate.id}>
                            <td className="p-2 border-b border-slate-50 text-sm">
                              {getEstateName(estate)}
                            </td>
                            <td className="p-2 border-b border-slate-50 text-xs text-slate-400 font-mono">
                              {estate.id}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {showMapPanel && (
                  <div className="mt-4 p-3 border rounded-lg bg-slate-50 grid gap-3">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={loadEstates}
                        disabled={estatesLoading}
                        variant="secondary"
                        className="h-8 text-xs"
                        label={estatesLoading ? "Loading..." : "Reload estates"}
                      />
                      <Button
                        type="button"
                        onClick={handleSaveEstates}
                        disabled={mapSaving || estatesLoading}
                        className="h-8 text-xs"
                        label={mapSaving ? "Saving..." : "Save estates"}
                      />
                    </div>
                    {estatesErrorMessage && (
                      <p className="text-destructive text-sm">
                        {estatesErrorMessage}
                      </p>
                    )}
                    {mapErrorMessage && (
                      <p className="text-destructive text-sm">
                        {mapErrorMessage}
                      </p>
                    )}
                    <div className="max-h-[220px] overflow-auto border rounded bg-white p-2">
                      {allEstates.map((estate) => {
                        const checked = selectedEstateIds.includes(estate.id);
                        return (
                          <label
                            key={estate.id}
                            className="flex items-center gap-2 p-1.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleEstateToggle(estate.id)}
                              className="rounded border-slate-300 text-primary focus:ring-primary"
                            />
                            <span>{getEstateName(estate)}</span>
                            <span className="text-slate-400 text-xs font-mono">
                              ({estate.id})
                            </span>
                          </label>
                        );
                      })}
                      {!estatesLoading && allEstates.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No estates found.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminUsersPage;
