import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminUploadField } from "@/components/admin/AdminUploadField";
import { adminApi } from "@/lib/api/adminApi";
import { adminAuth } from "@/lib/auth/adminAuth";
import { Button } from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
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

type AdminFloorPlan = {
  id: string;
  name?: string | null;
  floorplanUrl?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  garages?: number | null;
  areaSqm?: number | null;
  minLotWidth?: number | null;
  minLotDepth?: number | null;
  rumpus?: boolean | null;
  alfresco?: boolean | null;
  pergola?: boolean | null;
  builderId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type FloorPlanForm = {
  name: string;
  floorplanUrl: string;
  bedrooms: string;
  bathrooms: string;
  garages: string;
  areaSqm: string;
  minLotWidth: string;
  minLotDepth: string;
  rumpus: boolean;
  alfresco: boolean;
  pergola: boolean;
};

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
};

const emptyFloorPlanForm: FloorPlanForm = {
  name: "",
  floorplanUrl: "",
  bedrooms: "",
  bathrooms: "",
  garages: "",
  areaSqm: "",
  minLotWidth: "",
  minLotDepth: "",
  rumpus: false,
  alfresco: false,
  pergola: false,
};

const emptyFacadeForm: FacadeForm = {
  label: "",
  imageUrl: "",
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

const toNumber = (value: string): number | null => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const inviteRedirectUrl =
  import.meta.env.VITE_ENTRA_INVITE_REDIRECT_URL ||
  import.meta.env.VITE_AAD_INVITE_REDIRECT_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

const AdminBuilderPage = () => {
  const { builderId } = useParams();
  const navigate = useNavigate();

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

  const [floorPlans, setFloorPlans] = useState<AdminFloorPlan[]>([]);
  const [floorPlansLoading, setFloorPlansLoading] = useState(false);
  const [floorPlansErrorMessage, setFloorPlansErrorMessage] = useState<
    string | null
  >(null);
  const [floorPlanFilter, setFloorPlanFilter] = useState("");

  const [floorPlanForm, setFloorPlanForm] =
    useState<FloorPlanForm>(emptyFloorPlanForm);
  const [floorPlanEditingId, setFloorPlanEditingId] = useState<string | null>(
    null
  );
  const [floorPlanSaving, setFloorPlanSaving] = useState(false);
  const [floorPlanFormErrorMessage, setFloorPlanFormErrorMessage] = useState<
    string | null
  >(null);
  const [floorPlanFormSuccessMessage, setFloorPlanFormSuccessMessage] = useState<
    string | null
  >(null);
  const [floorPlanDeleteId, setFloorPlanDeleteId] = useState<string | null>(
    null
  );

  const [selectedFloorPlanId, setSelectedFloorPlanId] = useState<string | null>(
    null
  );

  const [facades, setFacades] = useState<AdminFacade[]>([]);
  const [facadesLoading, setFacadesLoading] = useState(false);
  const [facadesErrorMessage, setFacadesErrorMessage] = useState<string | null>(
    null
  );
  const [facadeFilter, setFacadeFilter] = useState("");

  const [facadeForm, setFacadeForm] =
    useState<FacadeForm>(emptyFacadeForm);
  const [facadeEditingId, setFacadeEditingId] = useState<string | null>(null);
  const [facadeSaving, setFacadeSaving] = useState(false);
  const [facadeFormErrorMessage, setFacadeFormErrorMessage] = useState<
    string | null
  >(null);
  const [facadeFormSuccessMessage, setFacadeFormSuccessMessage] = useState<
    string | null
  >(null);
  const [facadeDeleteId, setFacadeDeleteId] = useState<string | null>(null);

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

  const loadFloorPlans = useCallback(async () => {
    if (!builderId) {
      setFloorPlans([]);
      return;
    }
    setFloorPlansLoading(true);
    setFloorPlansErrorMessage(null);
    try {
      const data = await adminApi.getFloorPlans<AdminFloorPlan>({ builderId });
      const scoped = data.filter(
        (plan) => String(plan.builderId ?? "") === builderId
      );
      setFloorPlans(scoped);
    } catch (error) {
      setFloorPlansErrorMessage(
        error instanceof Error ? error.message : "Failed to load floor plans."
      );
    } finally {
      setFloorPlansLoading(false);
    }
  }, [builderId]);

  const loadFacades = useCallback(async () => {
    if (!selectedFloorPlanId) {
      setFacades([]);
      return;
    }
    setFacadesLoading(true);
    setFacadesErrorMessage(null);
    try {
      const data = await adminApi.getFacades<AdminFacade>({
        floorPlanId: selectedFloorPlanId,
      });
      const scoped = data.filter(
        (facade) =>
          String(facade.floorPlanId ?? "") === selectedFloorPlanId
      );
      setFacades(scoped);
    } catch (error) {
      setFacadesErrorMessage(
        error instanceof Error ? error.message : "Failed to load facades."
      );
    } finally {
      setFacadesLoading(false);
    }
  }, [selectedFloorPlanId]);

  useEffect(() => {
    loadBuilder();
  }, [loadBuilder]);

  useEffect(() => {
    if (showAddPanel && users.length === 0 && !usersLoading) {
      loadUsers();
    }
  }, [loadUsers, showAddPanel, users.length, usersLoading]);

  useEffect(() => {
    loadFloorPlans();
  }, [loadFloorPlans]);

  useEffect(() => {
    if (floorPlans.length === 0) {
      setSelectedFloorPlanId(null);
      return;
    }
    if (
      !selectedFloorPlanId ||
      !floorPlans.some((plan) => plan.id === selectedFloorPlanId)
    ) {
      setSelectedFloorPlanId(floorPlans[0].id);
    }
  }, [floorPlans, selectedFloorPlanId]);

  useEffect(() => {
    loadFacades();
  }, [loadFacades]);

  useEffect(() => {
    setFacadeForm(emptyFacadeForm);
    setFacadeEditingId(null);
    setFacadeFormErrorMessage(null);
    setFacadeFormSuccessMessage(null);
  }, [selectedFloorPlanId]);

  const teamMembers = builder?.builderUsers ?? [];
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

  const filteredFloorPlans = useMemo(() => {
    const needle = floorPlanFilter.trim().toLowerCase();
    if (!needle) {
      return floorPlans;
    }
    return floorPlans.filter((plan) => {
      const name = (plan.name ?? "").toLowerCase();
      const id = plan.id?.toLowerCase?.() ?? "";
      return name.includes(needle) || id.includes(needle);
    });
  }, [floorPlanFilter, floorPlans]);

  const filteredFacades = useMemo(() => {
    const needle = facadeFilter.trim().toLowerCase();
    if (!needle) {
      return facades;
    }
    return facades.filter((facade) => {
      const label = (facade.label ?? "").toLowerCase();
      const id = facade.id?.toLowerCase?.() ?? "";
      return label.includes(needle) || id.includes(needle);
    });
  }, [facadeFilter, facades]);

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
      await loadBuilder();
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
      await loadBuilder();
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
      await loadBuilder();
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

  const resetFloorPlanForm = () => {
    setFloorPlanForm(emptyFloorPlanForm);
    setFloorPlanEditingId(null);
    setFloorPlanFormErrorMessage(null);
    setFloorPlanFormSuccessMessage(null);
  };

  const startEditFloorPlan = (plan: AdminFloorPlan) => {
    setFloorPlanEditingId(plan.id);
    setFloorPlanForm({
      name: plan.name ?? "",
      floorplanUrl: plan.floorplanUrl ?? "",
      bedrooms: plan.bedrooms?.toString() ?? "",
      bathrooms: plan.bathrooms?.toString() ?? "",
      garages: plan.garages?.toString() ?? "",
      areaSqm: plan.areaSqm?.toString() ?? "",
      minLotWidth: plan.minLotWidth?.toString() ?? "",
      minLotDepth: plan.minLotDepth?.toString() ?? "",
      rumpus: Boolean(plan.rumpus),
      alfresco: Boolean(plan.alfresco),
      pergola: Boolean(plan.pergola),
    });
    setFloorPlanFormErrorMessage(null);
    setFloorPlanFormSuccessMessage(null);
  };

  const handleSubmitFloorPlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!builderId) {
      setFloorPlanFormErrorMessage("Builder ID is missing.");
      return;
    }
    setFloorPlanFormErrorMessage(null);
    setFloorPlanFormSuccessMessage(null);

    const name = floorPlanForm.name.trim();
    const floorplanUrl = floorPlanForm.floorplanUrl.trim();
    const bedrooms = toNumber(floorPlanForm.bedrooms);
    const bathrooms = toNumber(floorPlanForm.bathrooms);
    const garages = toNumber(floorPlanForm.garages);
    const areaSqm = toNumber(floorPlanForm.areaSqm);
    const minLotWidth = toNumber(floorPlanForm.minLotWidth);
    const minLotDepth = toNumber(floorPlanForm.minLotDepth);

    if (!name || !floorplanUrl) {
      setFloorPlanFormErrorMessage("Name and floorplan URL are required.");
      return;
    }
    if (
      bedrooms === null ||
      bathrooms === null ||
      garages === null ||
      areaSqm === null ||
      minLotWidth === null ||
      minLotDepth === null
    ) {
      setFloorPlanFormErrorMessage("All numeric fields are required.");
      return;
    }

    const payload: Record<string, unknown> = {
      name,
      floorplanUrl,
      bedrooms,
      bathrooms,
      garages,
      areaSqm,
      minLotWidth,
      minLotDepth,
      rumpus: floorPlanForm.rumpus,
      alfresco: floorPlanForm.alfresco,
      pergola: floorPlanForm.pergola,
    };

    if (!floorPlanEditingId) {
      payload.builderId = builderId;
    }

    setFloorPlanSaving(true);
    try {
      if (floorPlanEditingId) {
        await adminApi.updateFloorPlan(floorPlanEditingId, payload);
        setFloorPlanFormSuccessMessage("Floor plan updated.");
      } else {
        await adminApi.createFloorPlan(payload);
        setFloorPlanFormSuccessMessage("Floor plan created.");
      }
      await loadFloorPlans();
      resetFloorPlanForm();
    } catch (error) {
      setFloorPlanFormErrorMessage(
        error instanceof Error ? error.message : "Failed to save floor plan."
      );
    } finally {
      setFloorPlanSaving(false);
    }
  };

  const handleDeleteFloorPlan = async (id: string) => {
    if (!id) {
      return;
    }
    const confirmed = window.confirm(
      "Delete this floor plan? This cannot be undone."
    );
    if (!confirmed) {
      return;
    }
    setFloorPlanDeleteId(id);
    try {
      await adminApi.deleteFloorPlan(id);
      await loadFloorPlans();
    } catch (error) {
      setFloorPlansErrorMessage(
        error instanceof Error ? error.message : "Failed to delete floor plan."
      );
    } finally {
      setFloorPlanDeleteId(null);
    }
  };

  const resetFacadeForm = () => {
    setFacadeForm(emptyFacadeForm);
    setFacadeEditingId(null);
    setFacadeFormErrorMessage(null);
    setFacadeFormSuccessMessage(null);
  };

  const startEditFacade = (facade: AdminFacade) => {
    setFacadeEditingId(facade.id);
    setFacadeForm({
      label: facade.label ?? "",
      imageUrl: facade.imageUrl ?? "",
    });
    setFacadeFormErrorMessage(null);
    setFacadeFormSuccessMessage(null);
  };

  const handleSubmitFacade = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFacadeFormErrorMessage(null);
    setFacadeFormSuccessMessage(null);

    if (!selectedFloorPlanId) {
      setFacadeFormErrorMessage("Select a floor plan first.");
      return;
    }

    const label = facadeForm.label.trim();
    const imageUrl = facadeForm.imageUrl.trim();

    if (!label || !imageUrl) {
      setFacadeFormErrorMessage("Label and image URL are required.");
      return;
    }

    const payload = {
      label,
      imageUrl,
      floorPlanId: selectedFloorPlanId,
    };

    setFacadeSaving(true);
    try {
      if (facadeEditingId) {
        await adminApi.updateFacade(facadeEditingId, payload);
        setFacadeFormSuccessMessage("Facade updated.");
      } else {
        await adminApi.createFacade(payload);
        setFacadeFormSuccessMessage("Facade created.");
      }
      await loadFacades();
      resetFacadeForm();
    } catch (error) {
      setFacadeFormErrorMessage(
        error instanceof Error ? error.message : "Failed to save facade."
      );
    } finally {
      setFacadeSaving(false);
    }
  };

  const handleDeleteFacade = async (id: string) => {
    if (!id) {
      return;
    }
    const confirmed = window.confirm(
      "Delete this facade? This cannot be undone."
    );
    if (!confirmed) {
      return;
    }
    setFacadeDeleteId(id);
    try {
      await adminApi.deleteFacade(id);
      await loadFacades();
    } catch (error) {
      setFacadesErrorMessage(
        error instanceof Error ? error.message : "Failed to delete facade."
      );
    } finally {
      setFacadeDeleteId(null);
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
          {teamMembers.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No team members assigned.
            </p>
          )}
          {teamMembers.length > 0 && (
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
        </div>
      </section>

      {showAddPanel && (
        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="border rounded-lg p-6 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-semibold text-lg m-0">Add Existing User</h3>
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
        </section>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-bold m-0">Floor Plans</h2>
            <p className="text-sm text-muted-foreground m-0">
              Manage floor plans for this builder.
            </p>
          </div>
          <Button
            onClick={loadFloorPlans}
            disabled={floorPlansLoading}
            loading={floorPlansLoading}
            variant="outline"
            label="Refresh floor plans"
          />
        </div>

        {floorPlansErrorMessage && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md border border-red-100">
            {floorPlansErrorMessage}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold">Existing Floor Plans</h3>
              <Input
                value={floorPlanFilter}
                onChange={(event) => setFloorPlanFilter(event.target.value)}
                placeholder="Filter by name or id"
                className="max-w-sm"
              />
            </div>

            {floorPlansLoading ? (
              <div className="p-6 text-center text-muted-foreground">
                Loading floor plans...
              </div>
            ) : filteredFloorPlans.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No floor plans found.
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-700">
                      <th className="p-2 border-b">Name</th>
                      <th className="p-2 border-b">Beds/Baths/Garages</th>
                      <th className="p-2 border-b">Area (sqm)</th>
                      <th className="p-2 border-b">Min Lot (W x D)</th>
                      <th className="p-2 border-b">Features</th>
                      <th className="p-2 border-b text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFloorPlans.map((plan) => (
                      <tr key={plan.id}>
                        <td className="p-2 border-b border-slate-100">
                          <div className="font-medium text-slate-900">
                            {plan.name ?? "--"}
                          </div>
                          <div className="text-xs text-slate-500 truncate max-w-[220px]">
                            {plan.floorplanUrl ?? "--"}
                          </div>
                        </td>
                        <td className="p-2 border-b border-slate-100">
                          {plan.bedrooms ?? "--"} / {plan.bathrooms ?? "--"} /{" "}
                          {plan.garages ?? "--"}
                        </td>
                        <td className="p-2 border-b border-slate-100">
                          {plan.areaSqm ?? "--"}
                        </td>
                        <td className="p-2 border-b border-slate-100">
                          {plan.minLotWidth ?? "--"} x {plan.minLotDepth ?? "--"}
                        </td>
                        <td className="p-2 border-b border-slate-100">
                          {[
                            plan.rumpus ? "R" : null,
                            plan.alfresco ? "A" : null,
                            plan.pergola ? "P" : null,
                          ]
                            .filter(Boolean)
                            .join(", ") || "--"}
                        </td>
                        <td className="p-2 border-b border-slate-100 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              label="Edit"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => startEditFloorPlan(plan)}
                            />
                            <Button
                              label="Delete"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-red-600"
                              onClick={() => handleDeleteFloorPlan(plan.id)}
                              disabled={floorPlanDeleteId === plan.id}
                              loading={floorPlanDeleteId === plan.id}
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
            <h3 className="text-lg font-semibold mb-4">
              {floorPlanEditingId ? "Edit Floor Plan" : "Create Floor Plan"}
            </h3>
            <form onSubmit={handleSubmitFloorPlan} className="grid gap-4">
              <div className="grid gap-2">
                <span className="text-sm font-medium">Name</span>
                <Input
                  value={floorPlanForm.name}
                  onChange={(event) =>
                    setFloorPlanForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  className="w-full"
                  required
                />
              </div>
              <div className="grid gap-2">
                <AdminUploadField
                  label="Floorplan URL"
                  value={floorPlanForm.floorplanUrl}
                  onChange={(value) =>
                    setFloorPlanForm((prev) => ({
                      ...prev,
                      floorplanUrl: value,
                    }))
                  }
                  required
                  folder="floorplans"
                  accept="application/pdf,image/*"
                  helperText="PDF or image files are supported."
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Bedrooms</span>
                  <Input
                    type="number"
                    value={floorPlanForm.bedrooms}
                    onChange={(event) =>
                      setFloorPlanForm((prev) => ({
                        ...prev,
                        bedrooms: event.target.value,
                      }))
                    }
                    className="w-full"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Bathrooms</span>
                  <Input
                    type="number"
                    value={floorPlanForm.bathrooms}
                    onChange={(event) =>
                      setFloorPlanForm((prev) => ({
                        ...prev,
                        bathrooms: event.target.value,
                      }))
                    }
                    className="w-full"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Garages</span>
                  <Input
                    type="number"
                    value={floorPlanForm.garages}
                    onChange={(event) =>
                      setFloorPlanForm((prev) => ({
                        ...prev,
                        garages: event.target.value,
                      }))
                    }
                    className="w-full"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Area (sqm)</span>
                  <Input
                    type="number"
                    step="0.1"
                    value={floorPlanForm.areaSqm}
                    onChange={(event) =>
                      setFloorPlanForm((prev) => ({
                        ...prev,
                        areaSqm: event.target.value,
                      }))
                    }
                    className="w-full"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Min Lot Width</span>
                  <Input
                    type="number"
                    step="0.1"
                    value={floorPlanForm.minLotWidth}
                    onChange={(event) =>
                      setFloorPlanForm((prev) => ({
                        ...prev,
                        minLotWidth: event.target.value,
                      }))
                    }
                    className="w-full"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Min Lot Depth</span>
                  <Input
                    type="number"
                    step="0.1"
                    value={floorPlanForm.minLotDepth}
                    onChange={(event) =>
                      setFloorPlanForm((prev) => ({
                        ...prev,
                        minLotDepth: event.target.value,
                      }))
                    }
                    className="w-full"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Features</span>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={floorPlanForm.rumpus}
                      onCheckedChange={(checked) =>
                        setFloorPlanForm((prev) => ({
                          ...prev,
                          rumpus: Boolean(checked),
                        }))
                      }
                    />
                    Rumpus
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={floorPlanForm.alfresco}
                      onCheckedChange={(checked) =>
                        setFloorPlanForm((prev) => ({
                          ...prev,
                          alfresco: Boolean(checked),
                        }))
                      }
                    />
                    Alfresco
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={floorPlanForm.pergola}
                      onCheckedChange={(checked) =>
                        setFloorPlanForm((prev) => ({
                          ...prev,
                          pergola: Boolean(checked),
                        }))
                      }
                    />
                    Pergola
                  </label>
                </div>
              </div>

              {floorPlanFormErrorMessage && (
                <div className="text-sm text-red-600">
                  {floorPlanFormErrorMessage}
                </div>
              )}
              {floorPlanFormSuccessMessage && (
                <div className="text-sm text-emerald-600">
                  {floorPlanFormSuccessMessage}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  label={
                    floorPlanEditingId ? "Save changes" : "Create floor plan"
                  }
                  loading={floorPlanSaving}
                  disabled={floorPlanSaving}
                />
                {floorPlanEditingId && (
                  <Button
                    type="button"
                    variant="outline"
                    label="Cancel edit"
                    onClick={resetFloorPlanForm}
                  />
                )}
              </div>
            </form>
          </section>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-bold m-0">Facades</h2>
            <p className="text-sm text-muted-foreground m-0">
              Manage facades for a selected floor plan.
            </p>
          </div>
          <Button
            onClick={loadFacades}
            disabled={!selectedFloorPlanId || facadesLoading}
            loading={facadesLoading}
            variant="outline"
            label="Refresh facades"
          />
        </div>

        {facadesErrorMessage && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md border border-red-100">
            {facadesErrorMessage}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <div className="flex flex-wrap items-end gap-4 mb-4">
              <div className="grid gap-2">
                <span className="text-sm font-medium">Floor Plan</span>
                <select
                  value={selectedFloorPlanId ?? ""}
                  onChange={(event) =>
                    setSelectedFloorPlanId(
                      event.target.value ? event.target.value : null
                    )
                  }
                  className="flex h-9 min-w-[240px] rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select a floor plan</option>
                  {floorPlans.map((plan) => {
                    const name =
                      typeof plan.name === "string" && plan.name.trim()
                        ? plan.name
                        : "Untitled";
                    return (
                      <option key={plan.id} value={plan.id}>
                        {name} ({plan.id})
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Filter</span>
                <Input
                  value={facadeFilter}
                  onChange={(event) => setFacadeFilter(event.target.value)}
                  placeholder="Filter by label or id"
                  className="max-w-sm"
                />
              </div>
            </div>

            {!selectedFloorPlanId ? (
              <div className="p-6 text-center text-muted-foreground">
                Select a floor plan to view facades.
              </div>
            ) : facadesLoading ? (
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
                              onClick={() => startEditFacade(facade)}
                            />
                            <Button
                              label="Delete"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-red-600"
                              onClick={() => handleDeleteFacade(facade.id)}
                              disabled={facadeDeleteId === facade.id}
                              loading={facadeDeleteId === facade.id}
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
            <h3 className="text-lg font-semibold mb-4">
              {facadeEditingId ? "Edit Facade" : "Create Facade"}
            </h3>
            {!selectedFloorPlanId ? (
              <p className="text-sm text-muted-foreground">
                Select a floor plan to add facades.
              </p>
            ) : (
              <form onSubmit={handleSubmitFacade} className="grid gap-4">
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Label</span>
                  <Input
                    value={facadeForm.label}
                    onChange={(event) =>
                      setFacadeForm((prev) => ({
                        ...prev,
                        label: event.target.value,
                      }))
                    }
                    className="w-full"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <AdminUploadField
                    label="Image URL"
                    value={facadeForm.imageUrl}
                    onChange={(value) =>
                      setFacadeForm((prev) => ({
                        ...prev,
                        imageUrl: value,
                      }))
                    }
                    required
                    folder="facades"
                    accept="image/*"
                  />
                </div>

                {facadeFormErrorMessage && (
                  <div className="text-sm text-red-600">
                    {facadeFormErrorMessage}
                  </div>
                )}
                {facadeFormSuccessMessage && (
                  <div className="text-sm text-emerald-600">
                    {facadeFormSuccessMessage}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    label={facadeEditingId ? "Save changes" : "Create facade"}
                    loading={facadeSaving}
                    disabled={facadeSaving}
                  />
                  {facadeEditingId && (
                    <Button
                      type="button"
                      variant="outline"
                      label="Cancel edit"
                      onClick={resetFacadeForm}
                    />
                  )}
                </div>
              </form>
            )}
          </section>
        </div>
      </section>
    </div>
  );
};

export default AdminBuilderPage;
