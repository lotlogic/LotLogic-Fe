import type { FormEvent } from "react";
import { useState } from "react";
import { AdminUploadField } from "@/components/admin/AdminUploadField";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  JURISDICTIONS,
  type Jurisdiction,
} from "@/lib/api/adminModels";
import {
  ESTATE_ACCESS_STATUSES,
  type EstateAccessStatus,
  type EstateCreatePayload,
} from "./types";

type EstateCreateFormProps = {
  onCreate: (payload: EstateCreatePayload) => Promise<{ id?: string } | void>;
  onOpenCreated?: (estateId: string) => void;
  title?: string;
  submitLabel?: string;
  openLabel?: string;
};

export const EstateCreateForm = ({
  onCreate,
  onOpenCreated,
  title = "New Estate",
  submitLabel = "Create estate",
  openLabel = "Open",
}: EstateCreateFormProps) => {
  const [name, setName] = useState("");
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("NSW");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [status, setStatus] = useState<EstateAccessStatus>("LIVE");
  const [accessPassword, setAccessPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);

  const resetMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLastCreatedId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedLogoUrl = logoUrl.trim();
    const trimmedAccessPassword = accessPassword.trim();

    resetMessages();

    if (!trimmedName) {
      setErrorMessage("Name is required.");
      return;
    }
    if (status === "GATED" && !trimmedAccessPassword) {
      setErrorMessage("Password is required when status is Gated.");
      return;
    }

    const payload: EstateCreatePayload = {
      name: trimmedName,
      jurisdiction,
      status,
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
    if (trimmedAccessPassword) {
      payload.accessPassword = trimmedAccessPassword;
    }

    setSaving(true);
    try {
      const created = await onCreate(payload);
      setName("");
      setJurisdiction("NSW");
      setAddress("");
      setEmail("");
      setPhone("");
      setLogoUrl("");
      setStatus("LIVE");
      setAccessPassword("");
      setSuccessMessage("Estate created.");
      if (created && typeof created === "object" && "id" in created) {
        const createdId = created?.id;
        if (createdId) {
          setLastCreatedId(String(createdId));
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create estate."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 p-4 border rounded-lg mb-4 bg-slate-50"
    >
      <h3 className="font-semibold text-lg">{title}</h3>
      <div className="grid gap-2">
        <span className="text-sm font-medium w-full">Name *</span>
        <Input
          className="w-full"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Estate name"
          required
        />
      </div>
      <div className="grid gap-2">
        <span className="text-sm font-medium">Jurisdiction *</span>
        <select
          value={jurisdiction}
          onChange={(event) =>
            setJurisdiction(event.target.value as Jurisdiction)
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
          value={status}
          onChange={(event) => {
            const nextStatus = event.target.value as EstateAccessStatus;
            setStatus(nextStatus);
            if (nextStatus !== "GATED") {
              setAccessPassword("");
            }
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
      {status === "GATED" && (
        <div className="grid gap-2">
          <span className="text-sm font-medium">Password *</span>
          <Input
            className="w-full"
            value={accessPassword}
            onChange={(event) => setAccessPassword(event.target.value)}
            placeholder="Enter embed password"
            type="password"
          />
          <p className="m-0 text-xs text-muted-foreground">
            This password will be required before the embed renders.
          </p>
        </div>
      )}
      <div className="grid gap-2">
        <span className="text-sm font-medium">Address</span>
        <Input
          className="w-full"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="123 Main St"
        />
      </div>
      <div className="grid gap-2">
        <span className="text-sm font-medium">Email</span>
        <Input
          className="w-full"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="sales@example.com"
          type="email"
        />
      </div>
      <div className="grid gap-2">
        <span className="text-sm font-medium">Phone</span>
        <Input
          className="w-full"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+61 2 5555 5555"
        />
      </div>
      <div className="grid gap-2">
        <AdminUploadField
          label="Logo URL"
          value={logoUrl}
          onChange={setLogoUrl}
          placeholder="https://cdn.example.com/logo.png"
          folder="logos"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          helperText="Accepted formats: PNG, SVG, JPG, or WEBP. Minimum 200px wide. Square or horizontal format preferred."
        />
      </div>
      <div className="flex flex-wrap gap-2 items-center mt-2">
        <Button
          type="submit"
          disabled={saving}
          loading={saving}
          label={submitLabel}
        />
        {errorMessage && (
          <span className="text-destructive text-sm">{errorMessage}</span>
        )}
        {successMessage && (
          <span className="text-emerald-600 text-sm flex items-center gap-2">
            {successMessage}
            {lastCreatedId && onOpenCreated && (
              <Button
                type="button"
                variant="ghost"
                className="h-7 px-2 text-xs"
                label={openLabel}
                onClick={() => onOpenCreated(lastCreatedId)}
              />
            )}
          </span>
        )}
      </div>
    </form>
  );
};

export default EstateCreateForm;
