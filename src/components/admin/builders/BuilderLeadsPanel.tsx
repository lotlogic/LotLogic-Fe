import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/api/adminApi";
import type {
  BuilderLeadEnquiry,
  BuilderLeadRecord,
  BuilderLeadsResponse,
  BuilderLeadStatus,
} from "@/lib/api/adminModels";
import {
  formatDateForCell,
  formatDateTimeForTooltip,
} from "@/lib/utils/dateTime";

type HotLeadFilter = "all" | "hot" | "standard";
type StatusFilter = "all" | "pending" | "processed";

type BuilderLeadsPanelProps = {
  builderId?: string;
  enabled?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const defaultStats = {
  totalSubmitted: 0,
  hotLeadSubmitted: 0,
  submittedLast7Days: 0,
  submittedLast30Days: 0,
  pendingSubmitted: 0,
  processedSubmitted: 0,
};

const toDisplayName = (enquiry?: BuilderLeadEnquiry | null): string => {
  if (!enquiry) {
    return "--";
  }
  const name = String(enquiry.name || "").trim();
  if (name) {
    return name;
  }
  const email = String(enquiry.email || "").trim();
  if (email) {
    return email;
  }
  return "--";
};

const toContact = (enquiry?: BuilderLeadEnquiry | null): string => {
  if (!enquiry) {
    return "--";
  }
  const email = String(enquiry.email || "").trim();
  const phone = String(enquiry.phone || "").trim();
  if (email && phone) {
    return `${email} • ${phone}`;
  }
  return email || phone || "--";
};

const toLotSummary = (enquiry?: BuilderLeadEnquiry | null): string => {
  if (!enquiry?.lot) {
    return "--";
  }
  const blockNumber = enquiry.lot.blockNumber;
  if (typeof blockNumber === "number") {
    return `Lot ${blockNumber}`;
  }
  const blockKey = String(enquiry.lot.blockKey || "").trim();
  if (blockKey) {
    return blockKey;
  }
  const address = String(enquiry.lot.address || "").trim();
  return address || "--";
};

const toEstateId = (enquiry?: BuilderLeadEnquiry | null): string => {
  if (!enquiry) {
    return "--";
  }
  const direct = String(enquiry.estateId || "").trim();
  if (direct) {
    return direct;
  }
  const fromLot = String(enquiry.lot?.estateId || "").trim();
  return fromLot || "--";
};

const toFloorPlanSummary = (enquiry?: BuilderLeadEnquiry | null): string => {
  if (!enquiry?.floorPlan) {
    return "--";
  }
  const name = String(enquiry.floorPlan.name || "").trim();
  if (name) {
    return name;
  }
  const id = String(enquiry.floorPlan.id || "").trim();
  return id || "--";
};

const toLeadStatus = (
  enquiry?: BuilderLeadEnquiry | null
): BuilderLeadStatus => {
  return enquiry?.status === "PROCESSED" ? "PROCESSED" : "PENDING";
};

const toStatusLabel = (status?: BuilderLeadStatus | null): string => {
  if (status === "PROCESSED") {
    return "Processed";
  }
  return "Pending";
};

const toStatusBadgeClass = (status?: BuilderLeadStatus | null): string => {
  if (status === "PROCESSED") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  return "bg-amber-50 text-amber-700 border-amber-200";
};

const toStatusParam = (statusFilter: StatusFilter): BuilderLeadStatus | undefined => {
  if (statusFilter === "pending") {
    return "PENDING";
  }
  if (statusFilter === "processed") {
    return "PROCESSED";
  }
  return undefined;
};

const triggerCsvDownload = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export const BuilderLeadsPanel = ({
  builderId,
  enabled = true,
  title = "Lead Enquiries",
  subtitle = "Track submitted leads for this builder.",
  className,
}: BuilderLeadsPanelProps) => {
  const [hotLeadFilter, setHotLeadFilter] = useState<HotLeadFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manageMessage, setManageMessage] = useState<string | null>(null);
  const [response, setResponse] = useState<BuilderLeadsResponse | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<BuilderLeadStatus>("PENDING");

  const hotLeadParam =
    hotLeadFilter === "all" ? undefined : hotLeadFilter === "hot";
  const statusParam = toStatusParam(statusFilter);

  const loadLeads = useCallback(async () => {
    if (!enabled || !builderId) {
      setResponse(null);
      setLoading(false);
      setErrorMessage(null);
      setManageMessage(null);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminApi.getBuilderLeads(builderId, {
        page,
        pageSize,
        hotLead: hotLeadParam,
        status: statusParam,
      });
      setResponse(data);
    } catch (error) {
      setResponse(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load leads."
      );
    } finally {
      setLoading(false);
    }
  }, [builderId, enabled, hotLeadParam, page, pageSize, statusParam]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const items = response?.items ?? [];
  const pagination = response?.pagination ?? {};
  const stats = response?.stats ?? defaultStats;
  const total = Number(pagination.total ?? 0);
  const totalPages = Number(pagination.totalPages ?? 0);

  const selectedLead = useMemo(
    () => items.find((item) => String(item.id) === selectedLeadId) ?? null,
    [items, selectedLeadId]
  );

  const selectedEnquiry = selectedLead?.enquiry ?? null;

  useEffect(() => {
    if (!selectedEnquiry) {
      return;
    }
    setSelectedStatus(toLeadStatus(selectedEnquiry));
  }, [selectedEnquiry]);

  const rangeLabel = useMemo(() => {
    if (total <= 0) {
      return "No leads";
    }
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `${start}-${end} of ${total}`;
  }, [page, pageSize, total]);

  const canGoBack = page > 1;
  const canGoNext = totalPages > 0 && page < totalPages;

  const handleExportCsv = async () => {
    if (!builderId || !enabled || exporting) {
      return;
    }
    setExporting(true);
    setErrorMessage(null);
    try {
      const blob = await adminApi.exportBuilderLeadsCsv(builderId, {
        hotLead: hotLeadParam,
        status: statusParam,
      });
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      triggerCsvDownload(blob, `builder-${builderId}-leads-${timestamp}.csv`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to export leads CSV."
      );
    } finally {
      setExporting(false);
    }
  };

  const handleManageLead = (row: BuilderLeadRecord) => {
    setSelectedLeadId(String(row.id));
    setManageMessage(null);
    setSelectedStatus(toLeadStatus(row.enquiry));
  };

  const handleSaveStatus = async () => {
    if (!builderId || !selectedLead || statusSaving) {
      return;
    }
    setStatusSaving(true);
    setErrorMessage(null);
    setManageMessage(null);
    try {
      await adminApi.updateBuilderLeadStatus(builderId, String(selectedLead.id), {
        status: selectedStatus,
      });
      setManageMessage("Lead status updated.");
      await loadLeads();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update lead status."
      );
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white p-6 shadow-sm ${className ?? ""}`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-xl font-semibold">{title}</h2>
          <p className="m-0 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportCsv}
            label={exporting ? "Exporting..." : "Export CSV"}
            variant="outline"
            className="h-8 text-xs"
            loading={exporting}
            disabled={exporting || !enabled || !builderId}
          />
          <Button
            onClick={loadLeads}
            label={loading ? "Refreshing..." : "Refresh leads"}
            variant="outline"
            className="h-8 text-xs"
            loading={loading}
            disabled={loading || !enabled || !builderId}
          />
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="m-0 text-xs uppercase tracking-wide text-slate-500">
            Total submitted
          </p>
          <p className="m-0 text-2xl font-semibold text-slate-900">
            {Number(stats.totalSubmitted ?? 0)}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="m-0 text-xs uppercase tracking-wide text-slate-500">
            Hot leads
          </p>
          <p className="m-0 text-2xl font-semibold text-slate-900">
            {Number(stats.hotLeadSubmitted ?? 0)}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="m-0 text-xs uppercase tracking-wide text-slate-500">
            Pending
          </p>
          <p className="m-0 text-2xl font-semibold text-slate-900">
            {Number(stats.pendingSubmitted ?? 0)}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="m-0 text-xs uppercase tracking-wide text-slate-500">
            Processed
          </p>
          <p className="m-0 text-2xl font-semibold text-slate-900">
            {Number(stats.processedSubmitted ?? 0)}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="m-0 text-xs uppercase tracking-wide text-slate-500">
            Last 7 days
          </p>
          <p className="m-0 text-2xl font-semibold text-slate-900">
            {Number(stats.submittedLast7Days ?? 0)}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="m-0 text-xs uppercase tracking-wide text-slate-500">
            Last 30 days
          </p>
          <p className="m-0 text-2xl font-semibold text-slate-900">
            {Number(stats.submittedLast30Days ?? 0)}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs text-slate-600">
          Lead Type
          <select
            value={hotLeadFilter}
            onChange={(event) => {
              setHotLeadFilter(event.target.value as HotLeadFilter);
              setPage(1);
            }}
            className="h-9 rounded border border-slate-300 bg-white px-2 text-sm"
            disabled={loading}
          >
            <option value="all">All leads</option>
            <option value="hot">Hot leads only</option>
            <option value="standard">Standard leads only</option>
          </select>
        </label>

        <label className="grid gap-1 text-xs text-slate-600">
          Status
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilter);
              setPage(1);
            }}
            className="h-9 rounded border border-slate-300 bg-white px-2 text-sm"
            disabled={loading}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="processed">Processed</option>
          </select>
        </label>

        <label className="grid gap-1 text-xs text-slate-600">
          Page Size
          <select
            value={String(pageSize)}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            className="h-9 rounded border border-slate-300 bg-white px-2 text-sm"
            disabled={loading}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      {errorMessage && (
        <div className="mb-3 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      {manageMessage && (
        <div className="mb-3 rounded-md border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
          {manageMessage}
        </div>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading leads...</p>}

      {!loading && items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No leads found for the selected filter.
        </p>
      )}

      {!loading && items.length > 0 && (
        <div className="overflow-auto rounded-lg border">
          <table className="min-w-[980px] w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Submitted
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Lead
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Contact
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Estate ID
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Lot
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Floor Plan
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Status
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Hot
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const enquiry = row.enquiry;
                const isSelected = String(row.id) === selectedLeadId;
                return (
                  <tr key={row.id}>
                    <td className="p-3 border-b border-slate-100 text-sm">
                      <span title={formatDateTimeForTooltip(enquiry?.createdAt)}>
                        {formatDateForCell(enquiry?.createdAt)}
                      </span>
                    </td>
                    <td className="p-3 border-b border-slate-100 text-sm">
                      {toDisplayName(enquiry)}
                    </td>
                    <td className="p-3 border-b border-slate-100 text-sm">
                      {toContact(enquiry)}
                    </td>
                    <td className="p-3 border-b border-slate-100 text-sm">
                      {toEstateId(enquiry)}
                    </td>
                    <td className="p-3 border-b border-slate-100 text-sm">
                      {toLotSummary(enquiry)}
                    </td>
                    <td className="p-3 border-b border-slate-100 text-sm">
                      {toFloorPlanSummary(enquiry)}
                    </td>
                    <td className="p-3 border-b border-slate-100 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${toStatusBadgeClass(
                          enquiry?.status ?? "PENDING"
                        )}`}
                      >
                        {toStatusLabel(enquiry?.status)}
                      </span>
                    </td>
                    <td className="p-3 border-b border-slate-100 text-sm">
                      {enquiry?.hotLead ? "Yes" : "No"}
                    </td>
                    <td className="p-3 border-b border-slate-100 text-sm">
                      <Button
                        onClick={() => handleManageLead(row)}
                        label={isSelected ? "Managing" : "Manage"}
                        variant="outline"
                        className="h-8 px-2 text-xs"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedEnquiry && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="m-0 text-base font-semibold">Lead Details</h3>
              <p className="m-0 text-xs text-slate-600">
                View enquiry comments and update status.
              </p>
            </div>
            <Button
              onClick={() => {
                setSelectedLeadId(null);
                setManageMessage(null);
              }}
              label="Close"
              variant="outline"
              className="h-8 px-2 text-xs"
            />
          </div>

          <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2 xl:grid-cols-4">
            <p className="m-0">
              <strong>Submitted:</strong>{" "}
              <span title={formatDateTimeForTooltip(selectedEnquiry.createdAt)}>
                {formatDateForCell(selectedEnquiry.createdAt)}
              </span>
            </p>
            <p className="m-0">
              <strong>Lead:</strong> {toDisplayName(selectedEnquiry)}
            </p>
            <p className="m-0">
              <strong>Contact:</strong> {toContact(selectedEnquiry)}
            </p>
            <p className="m-0">
              <strong>Estate ID:</strong> {toEstateId(selectedEnquiry)}
            </p>
            <p className="m-0">
              <strong>Lot:</strong> {toLotSummary(selectedEnquiry)}
            </p>
            <p className="m-0">
              <strong>Floor Plan:</strong> {toFloorPlanSummary(selectedEnquiry)}
            </p>
            <p className="m-0">
              <strong>Hot Lead:</strong> {selectedEnquiry.hotLead ? "Yes" : "No"}
            </p>
          </div>

          <div className="mt-3 grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Comments
            </span>
            <div className="min-h-16 rounded border border-slate-200 bg-white p-3 text-sm text-slate-700">
              {String(selectedEnquiry.comments || "").trim() || "--"}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-xs text-slate-600">
              Status
              <select
                value={selectedStatus}
                onChange={(event) =>
                  setSelectedStatus(event.target.value as BuilderLeadStatus)
                }
                className="h-9 rounded border border-slate-300 bg-white px-2 text-sm"
                disabled={statusSaving}
              >
                <option value="PENDING">Pending</option>
                <option value="PROCESSED">Processed</option>
              </select>
            </label>
            <Button
              onClick={handleSaveStatus}
              label={statusSaving ? "Saving..." : "Save status"}
              loading={statusSaving}
              disabled={statusSaving}
              className="h-9"
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-xs text-slate-600">{rangeLabel}</p>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            label="Previous"
            variant="outline"
            className="h-8 text-xs"
            disabled={loading || !canGoBack}
          />
          <span className="text-xs text-slate-600">
            Page {page}
            {totalPages > 0 ? ` of ${totalPages}` : ""}
          </span>
          <Button
            onClick={() => setPage((current) => current + 1)}
            label="Next"
            variant="outline"
            className="h-8 text-xs"
            disabled={loading || !canGoNext}
          />
        </div>
      </div>
    </section>
  );
};

export default BuilderLeadsPanel;
