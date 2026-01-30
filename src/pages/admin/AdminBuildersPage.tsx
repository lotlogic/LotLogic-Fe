import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminNav } from "@/components/admin/AdminNav";
import { adminApi } from "@/lib/api/adminApi";
import { adminAuth } from "@/lib/auth/adminAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type AdminUser = {
  id: string;
  email?: string | null;
  displayName?: string | null;
  role?: string | null;
  status?: string | null;
  [key: string]: unknown;
};

type BuilderUser = {
  userId: string;
  builderId?: string;
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

const getBuilderName = (builder: AdminBuilder): string =>
  typeof builder.name === "string" && builder.name.trim()
    ? builder.name
    : builder.id;

const getBuilderTeamCount = (builder: AdminBuilder): number =>
  builder.builderUsers?.length ?? 0;

const AdminBuildersPage = () => {
  const navigate = useNavigate();
  const [builders, setBuilders] = useState<AdminBuilder[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addErrorMessage, setAddErrorMessage] = useState<string | null>(null);
  const [addSuccessMessage, setAddSuccessMessage] = useState<string | null>(null);
  const [lastCreatedBuilderId, setLastCreatedBuilderId] = useState<
    string | null
  >(null);

  const loadBuilders = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminApi.getBuilders<AdminBuilder>();
      setBuilders(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load builders."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBuilders();
  }, [loadBuilders]);

  const filteredBuilders = useMemo(() => {
    const needle = filterText.trim().toLowerCase();
    if (!needle) {
      return builders;
    }
    return builders.filter((builder) => {
      const name = getBuilderName(builder).toLowerCase();
      const email = (builder.email ?? "").toLowerCase();
      const phone = (builder.phone ?? "").toLowerCase();
      const id = builder.id.toLowerCase();
      return (
        name.includes(needle) ||
        email.includes(needle) ||
        phone.includes(needle) ||
        id.includes(needle)
      );
    });
  }, [builders, filterText]);

  const handleCreateBuilder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = addName.trim();
    const trimmedEmail = addEmail.trim();
    const trimmedPhone = addPhone.trim();
    setAddSaving(true);
    setAddErrorMessage(null);
    setAddSuccessMessage(null);
    setLastCreatedBuilderId(null);

    if (!trimmedName) {
      setAddErrorMessage("Name is required.");
      setAddSaving(false);
      return;
    }

    const payload: Record<string, unknown> = {
      name: trimmedName,
    };
    if (trimmedEmail) {
      payload.email = trimmedEmail;
    }
    if (trimmedPhone) {
      payload.phone = trimmedPhone;
    }

    try {
      const created = await adminApi.createBuilder<AdminBuilder>(payload);
      await loadBuilders();
      setAddName("");
      setAddEmail("");
      setAddPhone("");
      setAddSuccessMessage("Builder created.");
      if (created?.id) {
        setLastCreatedBuilderId(created.id);
      }
    } catch (error) {
      setAddErrorMessage(
        error instanceof Error ? error.message : "Failed to create builder."
      );
    } finally {
      setAddSaving(false);
    }
  };

  const handleLogout = async () => {
    await adminAuth.logout();
  };

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Builders</h1>
      <AdminNav />
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <Button
          onClick={loadBuilders}
          disabled={loading}
          label="Refresh builders"
          loading={loading}
        />
        <Button onClick={handleLogout} variant="outline" label="Sign out" />
        <Button
          onClick={() =>
            setShowAddForm((prev) => {
              const next = !prev;
              if (next) {
                setAddErrorMessage(null);
                setAddSuccessMessage(null);
                setLastCreatedBuilderId(null);
              }
              return next;
            })
          }
          label={showAddForm ? "Cancel" : "Add builder"}
          variant={showAddForm ? "outline" : "primary"}
          className="ml-auto"
        />
      </div>

      {showAddForm && (
        <form
          onSubmit={handleCreateBuilder}
          className="grid gap-4 p-4 border rounded-lg mb-4 bg-slate-50"
        >
          <h3 className="font-semibold text-lg">New Builder</h3>
          <div className="grid gap-2">
            <span className="text-sm font-medium w-full">Name *</span>
            <Input
              className="w-full"
              value={addName}
              onChange={(event) => setAddName(event.target.value)}
              placeholder="Builder name"
              required
            />
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Email</span>
            <Input
              className="w-full"
              value={addEmail}
              onChange={(event) => setAddEmail(event.target.value)}
              placeholder="contact@example.com"
              type="email"
            />
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Phone</span>
            <Input
              className="w-full"
              value={addPhone}
              onChange={(event) => setAddPhone(event.target.value)}
              placeholder="+61 400 000 000"
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center mt-2">
            <Button
              type="submit"
              disabled={addSaving}
              loading={addSaving}
              label="Create builder"
            />
            {addErrorMessage && (
              <span className="text-destructive text-sm">
                {addErrorMessage}
              </span>
            )}
            {addSuccessMessage && (
              <span className="text-emerald-600 text-sm flex items-center gap-2">
                {addSuccessMessage}
                {lastCreatedBuilderId && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    label="Manage team"
                    onClick={() =>
                      navigate(`/admin/builders/${lastCreatedBuilderId}`)
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
          placeholder="Filter builders by name, email, phone, or id"
          className="flex-1 min-w-[220px]"
        />
      </div>

      {loading && (
        <p className="text-muted-foreground p-4 text-center">
          Loading builders...
        </p>
      )}
      {errorMessage && <p className="text-destructive p-4">{errorMessage}</p>}
      {!loading && !errorMessage && (
        <div className="overflow-auto border rounded-lg">
          <table className="w-full border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Builder
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Email
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Phone
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Team
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  ID
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBuilders.map((builder) => (
                <tr key={builder.id}>
                  <td className="p-3 border-b border-slate-100 text-sm">
                    {getBuilderName(builder)}
                  </td>
                  <td className="p-3 border-b border-slate-100 text-sm">
                    {builder.email ?? "--"}
                  </td>
                  <td className="p-3 border-b border-slate-100 text-sm">
                    {builder.phone ?? "--"}
                  </td>
                  <td className="p-3 border-b border-slate-100 text-sm">
                    {getBuilderTeamCount(builder)}
                  </td>
                  <td className="p-3 border-b border-slate-100 text-xs text-slate-400 font-mono">
                    {builder.id}
                  </td>
                  <td className="p-3 border-b border-slate-100 text-sm">
                    <Button
                      onClick={() => navigate(`/admin/builders/${builder.id}`)}
                      variant="ghost"
                      className="h-8 px-2 text-xs"
                      label="Manage Team"
                    />
                  </td>
                </tr>
              ))}
              {!loading && filteredBuilders.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-4 text-center text-muted-foreground"
                  >
                    No builders match the current filter.
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

export default AdminBuildersPage;
