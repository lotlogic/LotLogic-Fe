import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { BuilderCreatePayload } from "./types";

type BuilderCreateFormProps = {
  onCreate: (payload: BuilderCreatePayload) => Promise<{ id?: string } | void>;
  onOpenCreated?: (builderId: string) => void;
  title?: string;
  submitLabel?: string;
  openLabel?: string;
};

export const BuilderCreateForm = ({
  onCreate,
  onOpenCreated,
  title = "New Builder",
  submitLabel = "Create builder",
  openLabel = "Manage team",
}: BuilderCreateFormProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    resetMessages();

    if (!trimmedName) {
      setErrorMessage("Name is required.");
      return;
    }

    const payload: BuilderCreatePayload = {
      name: trimmedName,
    };
    if (trimmedEmail) {
      payload.email = trimmedEmail;
    }
    if (trimmedPhone) {
      payload.phone = trimmedPhone;
    }

    setSaving(true);
    try {
      const created = await onCreate(payload);
      setName("");
      setEmail("");
      setPhone("");
      setSuccessMessage("Builder created.");
      if (created && typeof created === "object" && "id" in created) {
        const createdId = created?.id;
        if (createdId) {
          setLastCreatedId(String(createdId));
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create builder."
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
          placeholder="Builder name"
          required
        />
      </div>
      <div className="grid gap-2">
        <span className="text-sm font-medium">Email</span>
        <Input
          className="w-full"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="contact@example.com"
          type="email"
        />
      </div>
      <div className="grid gap-2">
        <span className="text-sm font-medium">Phone</span>
        <Input
          className="w-full"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+61 400 000 000"
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

export default BuilderCreateForm;
