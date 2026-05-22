import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminUploadField } from "@/components/admin/AdminUploadField";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export type FloorPlanDocumentRecord = {
  id: string;
  floorPlanId?: string | null;
  documentName?: string | null;
  fileName?: string | null;
  documentUrl?: string | null;
  fileSizeBytes?: number | null;
  mimeType?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type FloorPlanDocumentPayload = {
  documentName?: string | null;
  fileName: string;
  documentUrl: string;
  fileSizeBytes?: number | null;
  mimeType?: string | null;
  floorPlanId: string;
};

type DocumentForm = {
  documentName: string;
  fileName: string;
  documentUrl: string;
  fileSizeBytes: string;
  mimeType: string;
  floorPlanId: string;
};

type FloorPlanOption = {
  id: string;
  label: string;
};

const emptyForm: DocumentForm = {
  documentName: "",
  fileName: "",
  documentUrl: "",
  fileSizeBytes: "",
  mimeType: "",
  floorPlanId: "",
};

export const formatFileSize = (bytes: number | null | undefined) => {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) {
    return "";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const digits = value >= 10 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
};

export const getFloorPlanDocumentLabel = (
  document: Pick<FloorPlanDocumentRecord, "documentName" | "fileName">
) => {
  const documentName = String(document.documentName ?? "").trim();
  if (documentName) {
    return documentName;
  }
  const fileName = String(document.fileName ?? "").trim();
  return fileName || "Document";
};

type FloorPlanDocumentCrudProps = {
  loadDocuments: (floorPlanId: string) => Promise<FloorPlanDocumentRecord[]>;
  createDocument: (
    floorPlanId: string,
    payload: FloorPlanDocumentPayload
  ) => Promise<unknown>;
  updateDocument: (
    floorPlanId: string,
    id: string,
    payload: FloorPlanDocumentPayload
  ) => Promise<unknown>;
  deleteDocument: (floorPlanId: string, id: string) => Promise<unknown>;
  floorPlanOptions?: FloorPlanOption[];
  initialFloorPlanId?: string | null;
  showRefresh?: boolean;
  filterPlaceholder?: string;
};

export const FloorPlanDocumentCrud = ({
  loadDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  floorPlanOptions,
  initialFloorPlanId = null,
  showRefresh = true,
  filterPlaceholder = "Filter by name, file, id, or floor plan id",
}: FloorPlanDocumentCrudProps) => {
  const [documents, setDocuments] = useState<FloorPlanDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [selectedFloorPlanId, setSelectedFloorPlanId] = useState<string | null>(
    initialFloorPlanId
  );
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState<DocumentForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(
    null
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!floorPlanOptions || floorPlanOptions.length === 0) {
      return;
    }
    if (
      selectedFloorPlanId &&
      floorPlanOptions.some((option) => option.id === selectedFloorPlanId)
    ) {
      return;
    }
    setSelectedFloorPlanId(floorPlanOptions[0].id);
  }, [floorPlanOptions, selectedFloorPlanId]);

  const handleLoad = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (!selectedFloorPlanId) {
        setDocuments([]);
        return;
      }
      const data = await loadDocuments(selectedFloorPlanId);
      setDocuments(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load documents."
      );
    } finally {
      setLoading(false);
    }
  }, [loadDocuments, selectedFloorPlanId]);

  useEffect(() => {
    handleLoad();
  }, [handleLoad]);

  useEffect(() => {
    setForm(emptyForm);
    setEditingId(null);
    setFormErrorMessage(null);
    setFormSuccessMessage(null);
  }, [selectedFloorPlanId]);

  const filteredDocuments = useMemo(() => {
    const needle = filterText.trim().toLowerCase();
    if (!needle) {
      return documents;
    }
    return documents.filter((document) => {
      const label = getFloorPlanDocumentLabel(document).toLowerCase();
      const id = document.id?.toLowerCase?.() ?? "";
      const floorPlanId = (document.floorPlanId ?? "").toLowerCase();
      const url = (document.documentUrl ?? "").toLowerCase();
      return (
        label.includes(needle) ||
        id.includes(needle) ||
        floorPlanId.includes(needle) ||
        url.includes(needle)
      );
    });
  }, [documents, filterText]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormErrorMessage(null);
    setFormSuccessMessage(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const startEdit = (document: FloorPlanDocumentRecord) => {
    setEditingId(document.id);
    setForm({
      documentName: document.documentName ?? "",
      fileName: document.fileName ?? "",
      documentUrl: document.documentUrl ?? "",
      fileSizeBytes: document.fileSizeBytes?.toString() ?? "",
      mimeType: document.mimeType ?? "",
      floorPlanId: document.floorPlanId ?? "",
    });
    setFormErrorMessage(null);
    setFormSuccessMessage(null);
    setShowForm(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormErrorMessage(null);
    setFormSuccessMessage(null);

    const documentName = form.documentName.trim();
    const fileName = form.fileName.trim();
    const documentUrl = form.documentUrl.trim();
    const scopedFloorPlanId = floorPlanOptions ? selectedFloorPlanId : null;
    const floorPlanId = scopedFloorPlanId ?? form.floorPlanId.trim();
    const mimeType = form.mimeType.trim();
    const rawFileSize = form.fileSizeBytes.trim();
    const fileSizeBytes = rawFileSize ? Number(rawFileSize) : null;

    if (!fileName || !documentUrl || !floorPlanId) {
      setFormErrorMessage("File name, document URL, and floor plan id are required.");
      return;
    }
    if (
      rawFileSize &&
      (typeof fileSizeBytes !== "number" ||
        !Number.isFinite(fileSizeBytes) ||
        !Number.isInteger(fileSizeBytes) ||
        fileSizeBytes < 0)
    ) {
      setFormErrorMessage("File size must be a non-negative whole number.");
      return;
    }

    const payload: FloorPlanDocumentPayload = {
      documentName: documentName || null,
      fileName,
      documentUrl,
      fileSizeBytes,
      mimeType: mimeType || null,
      floorPlanId,
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateDocument(floorPlanId, editingId, payload);
        setFormSuccessMessage("Document updated.");
      } else {
        await createDocument(floorPlanId, payload);
        setFormSuccessMessage("Document created.");
      }
      await handleLoad();
      resetForm();
    } catch (error) {
      setFormErrorMessage(
        error instanceof Error ? error.message : "Failed to save document."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) {
      return;
    }
    const confirmed = window.confirm(
      "Delete this document? This cannot be undone."
    );
    if (!confirmed) {
      return;
    }
    const resolvedFloorPlanId =
      documents.find((document) => document.id === id)?.floorPlanId ??
      selectedFloorPlanId ??
      form.floorPlanId.trim() ??
      null;
    if (!resolvedFloorPlanId) {
      setErrorMessage("Select a floor plan before deleting a document.");
      return;
    }
    setDeleteId(id);
    try {
      await deleteDocument(resolvedFloorPlanId, id);
      await handleLoad();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete document."
      );
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <>
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md border border-red-100">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Input
          value={filterText}
          onChange={(event) => setFilterText(event.target.value)}
          placeholder={filterPlaceholder}
          className="flex-1 min-w-[220px] max-w-sm"
        />
        {showRefresh && (
          <Button
            onClick={handleLoad}
            disabled={loading}
            label="Refresh"
            loading={loading}
          />
        )}
        <Button
          onClick={showForm ? closeForm : openCreateForm}
          label={showForm ? "Cancel" : "Add document"}
          variant={showForm ? "outline" : "primary"}
          className="ml-auto"
        />
      </div>

      {showForm && (
        <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-lg font-semibold">
              {editingId ? "Edit Document" : "Add document"}
            </h2>
            {editingId && (
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-2 text-xs"
                label="New document"
                onClick={openCreateForm}
              />
            )}
          </div>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <span className="text-sm font-medium">Document name</span>
              <Input
                value={form.documentName}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    documentName: event.target.value,
                  }))
                }
                className="w-full"
                placeholder="Floor plan brochure"
              />
              <span className="text-xs text-muted-foreground">
                Used as the link label. If blank, the uploaded file name is shown.
              </span>
            </div>
            <div className="grid gap-2">
              <AdminUploadField
                label="Document URL"
                value={form.documentUrl}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, documentUrl: value }))
                }
                onUploaded={(metadata) =>
                  setForm((prev) => ({
                    ...prev,
                    fileName: metadata.fileName,
                    fileSizeBytes: metadata.fileSizeBytes.toString(),
                    mimeType: metadata.contentType,
                  }))
                }
                required
                folder="floorplan-documents"
                accept="application/pdf,.pdf"
                helperText="Upload PDF documents only."
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2 md:col-span-2">
                <span className="text-sm font-medium">Uploaded file name</span>
                <Input
                  value={form.fileName}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      fileName: event.target.value,
                    }))
                  }
                  className="w-full"
                  required
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">File size (bytes)</span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.fileSizeBytes}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      fileSizeBytes: event.target.value,
                    }))
                  }
                  className="w-full"
                />
              </div>
              <div className="grid gap-2 md:col-span-3">
                <span className="text-sm font-medium">MIME type</span>
                <Input
                  value={form.mimeType}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      mimeType: event.target.value,
                    }))
                  }
                  className="w-full"
                  placeholder="application/pdf"
                />
              </div>
            </div>
            {!floorPlanOptions && (
              <div className="grid gap-2">
                <span className="text-sm font-medium">Floor Plan ID</span>
                <Input
                  value={form.floorPlanId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      floorPlanId: event.target.value,
                    }))
                  }
                  className="w-full"
                  required
                />
              </div>
            )}

            {formErrorMessage && (
              <div className="text-sm text-red-600">{formErrorMessage}</div>
            )}
            {formSuccessMessage && (
              <div className="text-sm text-emerald-600">
                {formSuccessMessage}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                label={editingId ? "Save changes" : "Create document"}
                loading={saving}
                disabled={saving}
              />
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  label="Cancel edit"
                  onClick={resetForm}
                />
              )}
            </div>
          </form>
        </section>
      )}

      <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        {floorPlanOptions && floorPlanOptions.length > 1 && (
          <div className="mb-4 max-w-sm">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">Floor Plan</span>
              <select
                value={selectedFloorPlanId ?? ""}
                onChange={(event) =>
                  setSelectedFloorPlanId(event.target.value || null)
                }
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {floorPlanOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {loading ? (
          <div className="p-6 text-center text-muted-foreground">
            Loading documents...
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            No documents found.
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-700">
                  <th className="p-2 border-b">Document</th>
                  <th className="p-2 border-b">Floor Plan</th>
                  <th className="p-2 border-b">File</th>
                  <th className="p-2 border-b">Size</th>
                  <th className="p-2 border-b text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((document) => (
                  <tr key={document.id}>
                    <td className="p-2 border-b border-slate-100">
                      <div className="font-medium text-slate-900">
                        {getFloorPlanDocumentLabel(document)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {document.id}
                      </div>
                    </td>
                    <td className="p-2 border-b border-slate-100">
                      {document.floorPlanId ?? "--"}
                    </td>
                    <td className="p-2 border-b border-slate-100">
                      {document.documentUrl ? (
                        <a
                          href={document.documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {document.fileName ?? "Open document"}
                        </a>
                      ) : (
                        "--"
                      )}
                    </td>
                    <td className="p-2 border-b border-slate-100">
                      {formatFileSize(document.fileSizeBytes) || "--"}
                    </td>
                    <td className="p-2 border-b border-slate-100 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          label="Edit"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => startEdit(document)}
                        />
                        <Button
                          label="Delete"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-red-600"
                          onClick={() => handleDelete(document.id)}
                          disabled={deleteId === document.id}
                          loading={deleteId === document.id}
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
    </>
  );
};

export default FloorPlanDocumentCrud;
