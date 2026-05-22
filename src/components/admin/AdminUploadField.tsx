import type { ChangeEvent } from "react";
import { useRef, useState } from "react";
import { adminApi } from "@/lib/api/adminApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type UploadResponse = {
  uploadUrl: string;
  assetUrl: string;
  method?: string;
  headers?: Record<string, string>;
  maxBytes?: number;
};

export type AdminUploadMetadata = UploadResponse & {
  fileName: string;
  fileSizeBytes: number;
  contentType: string;
};

type AdminUploadFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onUploaded?: (metadata: AdminUploadMetadata) => void;
  placeholder?: string;
  required?: boolean;
  folder: string;
  accept?: string;
  disabled?: boolean;
  helperText?: string;
};

const defaultAccept = "image/*";

export const AdminUploadField = ({
  label,
  value,
  onChange,
  onUploaded,
  placeholder,
  required,
  folder,
  accept = defaultAccept,
  disabled = false,
  helperText,
}: AdminUploadFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handlePickFile = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    setErrorMessage(null);
    setSuccessMessage(null);
    setUploading(true);

    try {
      const contentType = file.type || "application/octet-stream";
      const payload = {
        fileName: file.name,
        contentType,
        size: file.size,
        folder,
      };
      const upload = await adminApi.createUpload<UploadResponse>(payload);

      if (upload.maxBytes && file.size > upload.maxBytes) {
        throw new Error(
          `File is too large. Max size is ${Math.round(
            upload.maxBytes / 1024 / 1024
          )}MB.`
        );
      }

      const headers = new Headers(upload.headers ?? {});
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", contentType);
      }

      const method = upload.method || "PUT";
      const uploadResponse = await fetch(upload.uploadUrl, {
        method,
        headers,
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(
          `Upload failed (${uploadResponse.status} ${uploadResponse.statusText}).`
        );
      }

      onChange(upload.assetUrl);
      onUploaded?.({
        ...upload,
        fileName: file.name,
        fileSizeBytes: file.size,
        contentType,
      });
      setSuccessMessage("Upload complete.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to upload file."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full"
        placeholder={placeholder}
        required={required}
        disabled={disabled}
      />
      {helperText && (
        <span className="text-xs text-muted-foreground">{helperText}</span>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled || uploading}
        />
        <Button
          type="button"
          label={uploading ? "Uploading..." : "Upload file"}
          onClick={handlePickFile}
          disabled={disabled || uploading}
          loading={uploading}
          className="h-8 px-3 text-xs"
        />
        {value && (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            Open current file
          </a>
        )}
      </div>
      {errorMessage && (
        <span className="text-sm text-destructive">{errorMessage}</span>
      )}
      {successMessage && (
        <span className="text-sm text-emerald-600">{successMessage}</span>
      )}
    </div>
  );
};

export default AdminUploadField;
