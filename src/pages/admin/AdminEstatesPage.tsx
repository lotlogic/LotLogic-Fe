import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminNav } from "@/components/admin/AdminNav";
import { adminApi } from "@/lib/api/adminApi";
import { adminAuth } from "@/lib/auth/adminAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type AdminEstate = {
  id: string;
  name?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  themeColor?: string | null;
  status?: string | null;
  [key: string]: unknown;
};

const getEstateName = (estate: AdminEstate): string =>
  typeof estate.name === "string" && estate.name.trim()
    ? estate.name
    : estate.id;

const AdminEstatesPage = () => {
  const navigate = useNavigate();
  const [estates, setEstates] = useState<AdminEstate[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addAddress, setAddAddress] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addLogoUrl, setAddLogoUrl] = useState("");
  const [addThemeColor, setAddThemeColor] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addErrorMessage, setAddErrorMessage] = useState<string | null>(null);
  const [addSuccessMessage, setAddSuccessMessage] = useState<string | null>(
    null
  );
  const [lastCreatedEstateId, setLastCreatedEstateId] = useState<string | null>(
    null
  );

  const loadEstates = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminApi.getEstates<AdminEstate>();
      setEstates(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load estates."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEstates();
  }, [loadEstates]);

  const filteredEstates = useMemo(() => {
    const needle = filterText.trim().toLowerCase();
    if (!needle) {
      return estates;
    }
    return estates.filter((estate) => {
      const name = getEstateName(estate).toLowerCase();
      const id = estate.id.toLowerCase();
      return name.includes(needle) || id.includes(needle);
    });
  }, [estates, filterText]);

  const handleCreateEstate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = addName.trim();
    const trimmedAddress = addAddress.trim();
    const trimmedEmail = addEmail.trim();
    const trimmedPhone = addPhone.trim();
    const trimmedLogoUrl = addLogoUrl.trim();
    const trimmedThemeColor = addThemeColor.trim();
    setAddSaving(true);
    setAddErrorMessage(null);
    setAddSuccessMessage(null);
    setLastCreatedEstateId(null);

    if (!trimmedName) {
      setAddErrorMessage("Name is required.");
      setAddSaving(false);
      return;
    }

    const payload: Record<string, unknown> = {
      name: trimmedName,
    };
    if (trimmedAddress) {
      payload.address = trimmedAddress;
    }
    if (trimmedEmail) {
      payload.email = trimmedEmail;
    }
    if (trimmedPhone) {
      payload.phone = trimmedPhone;
    }
    if (trimmedLogoUrl) {
      payload.logoUrl = trimmedLogoUrl;
    }
    if (trimmedThemeColor) {
      payload.themeColor = trimmedThemeColor;
    }

    try {
      const created = await adminApi.createEstate<AdminEstate>(payload);
      await loadEstates();
      setAddName("");
      setAddAddress("");
      setAddEmail("");
      setAddPhone("");
      setAddLogoUrl("");
      setAddThemeColor("");
      setAddSuccessMessage("Estate created.");
      if (created?.id) {
        setLastCreatedEstateId(created.id);
      }
    } catch (error) {
      setAddErrorMessage(
        error instanceof Error ? error.message : "Failed to create estate."
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
      <h1 className="text-3xl font-bold mb-6">Estates</h1>
      <AdminNav />
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <Button
          onClick={loadEstates}
          disabled={loading}
          label="Refresh estates"
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
                setLastCreatedEstateId(null);
              }
              return next;
            })
          }
          label={showAddForm ? "Cancel" : "Add estate"}
          variant={showAddForm ? "outline" : "primary"}
          className="ml-auto"
        />
      </div>

      {showAddForm && (
        <form
          onSubmit={handleCreateEstate}
          className="grid gap-4 p-4 border rounded-lg mb-4 bg-slate-50"
        >
          <h3 className="font-semibold text-lg">New Estate</h3>
          <div className="grid gap-2">
            <span className="text-sm font-medium w-full">Name *</span>
            <Input
              className="w-full"
              value={addName}
              onChange={(event) => setAddName(event.target.value)}
              placeholder="Estate name"
              required
            />
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Address</span>
            <Input
              className="w-full"
              value={addAddress}
              onChange={(event) => setAddAddress(event.target.value)}
              placeholder="123 Main St"
            />
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Email</span>
            <Input
              className="w-full"
              value={addEmail}
              onChange={(event) => setAddEmail(event.target.value)}
              placeholder="sales@example.com"
              type="email"
            />
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Phone</span>
            <Input
              className="w-full"
              value={addPhone}
              onChange={(event) => setAddPhone(event.target.value)}
              placeholder="+61 2 5555 5555"
            />
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Logo URL</span>
            <Input
              className="w-full"
              value={addLogoUrl}
              onChange={(event) => setAddLogoUrl(event.target.value)}
              placeholder="https://cdn.example.com/logo.png"
            />
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Theme color</span>
            <Input
              className="w-full"
              value={addThemeColor}
              onChange={(event) => setAddThemeColor(event.target.value)}
              placeholder="#0F766E"
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center mt-2">
            <Button
              type="submit"
              disabled={addSaving}
              loading={addSaving}
              label="Create estate"
            />
            {addErrorMessage && (
              <span className="text-destructive text-sm">
                {addErrorMessage}
              </span>
            )}
            {addSuccessMessage && (
              <span className="text-emerald-600 text-sm flex items-center gap-2">
                {addSuccessMessage}
                {lastCreatedEstateId && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    label="Open"
                    onClick={() =>
                      navigate(`/admin/estates/${lastCreatedEstateId}`)
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
          placeholder="Filter estates by name or id"
          className="flex-1 min-w-[220px]"
        />
      </div>

      {loading && (
        <p className="text-muted-foreground p-4 text-center">
          Loading estates...
        </p>
      )}
      {errorMessage && <p className="text-destructive p-4">{errorMessage}</p>}
      {!loading && !errorMessage && (
        <div className="overflow-auto border rounded-lg">
          <table className="w-full border-collapse min-w-[520px]">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Estate
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Status
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
              {filteredEstates.map((estate) => (
                <tr key={estate.id}>
                  <td className="p-3 border-b border-slate-100 text-sm">
                    {getEstateName(estate)}
                  </td>
                  <td className="p-3 border-b border-slate-100 text-sm">
                    {estate.status ?? "--"}
                  </td>
                  <td className="p-3 border-b border-slate-100 text-xs text-slate-400 font-mono">
                    {estate.id}
                  </td>
                  <td className="p-3 border-b border-slate-100 text-sm">
                    <Button
                      onClick={() => navigate(`/admin/estates/${estate.id}`)}
                      variant="ghost"
                      className="h-8 px-2 text-xs"
                      label="Edit"
                    />
                  </td>
                </tr>
              ))}
              {!loading && filteredEstates.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="p-4 text-center text-muted-foreground"
                  >
                    No estates match the current filter.
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

export default AdminEstatesPage;
