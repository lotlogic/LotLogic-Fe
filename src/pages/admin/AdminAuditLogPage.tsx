import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { adminApi } from "@/lib/api/adminApi";
import type {
  AuditLogActionType,
  AuditLogItem,
  AuditLogResponse,
} from "@/lib/api/adminModels";
import { adminAuth } from "@/lib/auth/adminAuth";
import {
  formatDateForCell,
  formatDateTimeForTooltip,
} from "@/lib/utils/dateTime";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const ACTION_OPTIONS: Array<{
  value: "all" | AuditLogActionType;
  label: string;
}> = [
  { value: "all", label: "All actions" },
  { value: "login", label: "Login" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "approve", label: "Approve" },
  { value: "recompute", label: "Recompute" },
  { value: "invite", label: "Invite" },
  { value: "enable", label: "Enable" },
  { value: "disable", label: "Disable" },
  { value: "upload", label: "Upload" },
  { value: "other", label: "Other" },
];

type ActionFilter = "all" | AuditLogActionType;

type AppliedFilters = {
  fromDate: string;
  toDate: string;
  actionType: ActionFilter;
  resourceType: string;
  search: string;
};

const toDateInputValue = (value: Date): string => value.toISOString().slice(0, 10);

const getDefaultFromDate = () => {
  const now = new Date();
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return toDateInputValue(from);
};

const getDefaultToDate = () => toDateInputValue(new Date());

const createDefaultFilters = (): AppliedFilters => ({
  fromDate: getDefaultFromDate(),
  toDate: getDefaultToDate(),
  actionType: "all",
  resourceType: "",
  search: "",
});

const emptyResponse: AuditLogResponse = {
  source: {
    provider: "mixpanel",
    configured: false,
    available: false,
  },
  pagination: {
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0,
  },
  items: [],
};

const normalizeText = (value: unknown): string => String(value ?? "").trim();

const toActorSummary = (item: AuditLogItem): string => {
  const displayName = normalizeText(item.actor?.displayName);
  if (displayName) {
    return displayName;
  }
  const email = normalizeText(item.actor?.email);
  if (email) {
    return email;
  }
  const id = normalizeText(item.actor?.id);
  return id || "--";
};

const toActorMeta = (item: AuditLogItem): string => {
  const email = normalizeText(item.actor?.email);
  const role = normalizeText(item.actor?.role);
  if (email && role) {
    return `${email} • ${role}`;
  }
  return email || role || "--";
};

const toEntitySummary = (item: AuditLogItem): string => {
  const label = normalizeText(item.entityLabel);
  if (label) {
    return label;
  }
  const id = normalizeText(item.entityId);
  return id || "--";
};

const toEntityMeta = (item: AuditLogItem): string => {
  const label = normalizeText(item.entityLabel);
  const id = normalizeText(item.entityId);
  if (label && id) {
    return id;
  }
  return "--";
};

const toActionBadgeClass = (value?: AuditLogActionType | null): string => {
  switch (value) {
    case "login":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "create":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "update":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "delete":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "approve":
      return "bg-teal-50 text-teal-700 border-teal-200";
    case "recompute":
      return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200";
    case "invite":
      return "bg-violet-50 text-violet-700 border-violet-200";
    case "enable":
      return "bg-lime-50 text-lime-700 border-lime-200";
    case "disable":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "upload":
      return "bg-cyan-50 text-cyan-700 border-cyan-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const toActionLabel = (value?: string | null): string => {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) {
    return "Other";
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const toJsonText = (value: unknown): string => {
  if (!value || typeof value !== "object") {
    return "--";
  }
  return JSON.stringify(value, null, 2);
};

const AdminAuditLogPage = () => {
  const [draftFromDate, setDraftFromDate] = useState(getDefaultFromDate);
  const [draftToDate, setDraftToDate] = useState(getDefaultToDate);
  const [draftActionType, setDraftActionType] = useState<ActionFilter>("all");
  const [draftResourceType, setDraftResourceType] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(
    createDefaultFilters,
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [response, setResponse] = useState<AuditLogResponse>(emptyResponse);
  const [selectedInsertId, setSelectedInsertId] = useState<string | null>(null);

  const loadAuditLog = useCallback(async () => {
    if (!appliedFilters.fromDate || !appliedFilters.toDate) {
      setErrorMessage("Both from and to dates are required.");
      return;
    }
    if (appliedFilters.fromDate > appliedFilters.toDate) {
      setErrorMessage('"From" date must be before or equal to "To" date.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminApi.getAuditLog({
        from: appliedFilters.fromDate,
        to: appliedFilters.toDate,
        page,
        pageSize,
        actionType:
          appliedFilters.actionType === "all"
            ? undefined
            : appliedFilters.actionType,
        resourceType: appliedFilters.resourceType || undefined,
        search: appliedFilters.search || undefined,
      });
      setResponse(data);
    } catch (error) {
      setResponse(emptyResponse);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load audit log.",
      );
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, pageSize]);

  useEffect(() => {
    void loadAuditLog();
  }, [loadAuditLog]);

  const items = response.items ?? [];
  const pagination = response.pagination ?? {};
  const total = Number(pagination.total ?? 0);
  const totalPages = Number(pagination.totalPages ?? 0);
  const rangeLabel = useMemo(() => {
    if (total <= 0) {
      return "No events";
    }
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `${start}-${end} of ${total}`;
  }, [page, pageSize, total]);

  const selectedItem = useMemo(
    () => items.find((item) => item.insertId === selectedInsertId) ?? null,
    [items, selectedInsertId],
  );

  useEffect(() => {
    if (!selectedInsertId) {
      return;
    }
    if (!items.some((item) => item.insertId === selectedInsertId)) {
      setSelectedInsertId(null);
    }
  }, [items, selectedInsertId]);

  const handleApplyFilters = () => {
    if (!draftFromDate || !draftToDate) {
      setErrorMessage("Both from and to dates are required.");
      return;
    }
    if (draftFromDate > draftToDate) {
      setErrorMessage('"From" date must be before or equal to "To" date.');
      return;
    }
    setPage(1);
    setAppliedFilters({
      fromDate: draftFromDate,
      toDate: draftToDate,
      actionType: draftActionType,
      resourceType: draftResourceType.trim(),
      search: draftSearch.trim(),
    });
  };

  const handleResetFilters = () => {
    const defaults = createDefaultFilters();
    setDraftFromDate(defaults.fromDate);
    setDraftToDate(defaults.toDate);
    setDraftActionType(defaults.actionType);
    setDraftResourceType(defaults.resourceType);
    setDraftSearch(defaults.search);
    setAppliedFilters(defaults);
    setPage(1);
  };

  const handleLogout = async () => {
    await adminAuth.logout();
  };

  const source = response.source;
  const sourceUnavailable =
    source && source.available === false && (source.message || !source.configured);
  const canGoBack = page > 1;
  const canGoNext = totalPages > 0 && page < totalPages;

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Audit Log</h1>
      <AdminNav />

      <div className="mb-6 mt-4 flex flex-wrap items-center gap-3">
        <Button
          onClick={() => void loadAuditLog()}
          label={loading ? "Refreshing..." : "Refresh"}
          loading={loading}
        />
        <Button onClick={handleLogout} variant="outline" label="Sign out" />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-xl font-semibold">Admin Actions</h2>
            <p className="m-0 text-sm text-muted-foreground">
              Backend-recorded admin mutations and login events stored in Mixpanel.
            </p>
          </div>
          <div className="grid gap-1 text-right text-xs text-slate-500">
            <span>Source: {normalizeText(source?.provider) || "mixpanel"}</span>
            <span>
              Range: {appliedFilters.fromDate} to {appliedFilters.toDate}
            </span>
          </div>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="m-0 text-xs uppercase tracking-wide text-slate-500">
              Matching events
            </p>
            <p className="m-0 text-2xl font-semibold text-slate-900">{total}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="m-0 text-xs uppercase tracking-wide text-slate-500">
              Action filter
            </p>
            <p className="m-0 text-lg font-semibold text-slate-900">
              {ACTION_OPTIONS.find((option) => option.value === appliedFilters.actionType)
                ?.label ?? "All actions"}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="m-0 text-xs uppercase tracking-wide text-slate-500">
              Resource filter
            </p>
            <p className="m-0 text-lg font-semibold text-slate-900">
              {appliedFilters.resourceType || "All resources"}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="m-0 text-xs uppercase tracking-wide text-slate-500">
              Search
            </p>
            <p className="m-0 text-lg font-semibold text-slate-900">
              {appliedFilters.search || "None"}
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs text-slate-600">
            From
            <input
              type="date"
              value={draftFromDate}
              onChange={(event) => setDraftFromDate(event.target.value)}
              className="h-9 rounded border border-slate-300 bg-white px-2 text-sm"
              disabled={loading}
            />
          </label>
          <label className="grid gap-1 text-xs text-slate-600">
            To
            <input
              type="date"
              value={draftToDate}
              onChange={(event) => setDraftToDate(event.target.value)}
              className="h-9 rounded border border-slate-300 bg-white px-2 text-sm"
              disabled={loading}
            />
          </label>
          <label className="grid gap-1 text-xs text-slate-600">
            Action
            <select
              value={draftActionType}
              onChange={(event) =>
                setDraftActionType(event.target.value as ActionFilter)
              }
              className="h-9 rounded border border-slate-300 bg-white px-2 text-sm"
              disabled={loading}
            >
              {ACTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-slate-600">
            Resource
            <Input
              value={draftResourceType}
              onChange={(event) => setDraftResourceType(event.target.value)}
              placeholder="estates, builders, users"
              className="w-[220px]"
              disabled={loading}
            />
          </label>
          <label className="grid gap-1 text-xs text-slate-600 min-w-[220px] flex-1">
            Search
            <Input
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder="email, path, entity"
              className="w-full"
              disabled={loading}
            />
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
          <Button
            onClick={handleApplyFilters}
            label="Apply filters"
            className="h-9"
            disabled={loading}
          />
          <Button
            onClick={handleResetFilters}
            label="Reset"
            variant="outline"
            className="h-9"
            disabled={loading}
          />
        </div>

        {errorMessage && (
          <div className="mb-3 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-600">
            {errorMessage}
          </div>
        )}

        {sourceUnavailable && (
          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {source?.message || "Audit log data is currently unavailable."}
          </div>
        )}

        {loading && (
          <p className="text-sm text-muted-foreground">Loading audit events...</p>
        )}

        {!loading && items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No audit events found for the current filter.
          </p>
        )}

        {!loading && items.length > 0 && (
          <div className="overflow-auto rounded-lg border">
            <table className="min-w-[1120px] w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 text-left">
                  <th className="p-3 border-b font-medium text-sm text-slate-700">
                    Timestamp
                  </th>
                  <th className="p-3 border-b font-medium text-sm text-slate-700">
                    Action
                  </th>
                  <th className="p-3 border-b font-medium text-sm text-slate-700">
                    Actor
                  </th>
                  <th className="p-3 border-b font-medium text-sm text-slate-700">
                    Resource
                  </th>
                  <th className="p-3 border-b font-medium text-sm text-slate-700">
                    Entity
                  </th>
                  <th className="p-3 border-b font-medium text-sm text-slate-700">
                    Path
                  </th>
                  <th className="p-3 border-b font-medium text-sm text-slate-700">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isSelected = item.insertId === selectedInsertId;
                  return (
                    <tr
                      key={item.insertId}
                      className={isSelected ? "bg-slate-50" : undefined}
                    >
                      <td className="p-3 border-b border-slate-100 text-sm">
                        <span title={formatDateTimeForTooltip(item.createdAt)}>
                          {formatDateForCell(item.createdAt)}
                        </span>
                      </td>
                      <td className="p-3 border-b border-slate-100 text-sm">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${toActionBadgeClass(
                            item.actionType,
                          )}`}
                        >
                          {toActionLabel(item.actionType)}
                        </span>
                      </td>
                      <td className="p-3 border-b border-slate-100 text-sm">
                        <div>{toActorSummary(item)}</div>
                        <div className="text-xs text-slate-500">
                          {toActorMeta(item)}
                        </div>
                      </td>
                      <td className="p-3 border-b border-slate-100 text-sm">
                        <div>{normalizeText(item.resourceType) || "--"}</div>
                        <div className="text-xs text-slate-500">
                          {normalizeText(item.method) || "--"}
                        </div>
                      </td>
                      <td className="p-3 border-b border-slate-100 text-sm">
                        <div>{toEntitySummary(item)}</div>
                        <div className="text-xs text-slate-500">
                          {toEntityMeta(item)}
                        </div>
                      </td>
                      <td className="p-3 border-b border-slate-100 text-xs font-mono text-slate-600">
                        {normalizeText(item.path) || "--"}
                      </td>
                      <td className="p-3 border-b border-slate-100 text-sm">
                        <Button
                          onClick={() =>
                            setSelectedInsertId(isSelected ? null : item.insertId)
                          }
                          label={isSelected ? "Hide" : "View"}
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

        {selectedItem && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="m-0 text-base font-semibold">Event Details</h3>
                <p className="m-0 text-xs text-slate-600">
                  Sanitized request and response data captured by the backend.
                </p>
              </div>
              <Button
                onClick={() => setSelectedInsertId(null)}
                label="Close"
                variant="outline"
                className="h-8 px-2 text-xs"
              />
            </div>

            <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2 xl:grid-cols-4">
              <p className="m-0">
                <strong>Timestamp:</strong>{" "}
                <span title={formatDateTimeForTooltip(selectedItem.createdAt)}>
                  {formatDateForCell(selectedItem.createdAt)}
                </span>
              </p>
              <p className="m-0">
                <strong>Action:</strong> {toActionLabel(selectedItem.actionType)}
              </p>
              <p className="m-0">
                <strong>Actor:</strong> {toActorSummary(selectedItem)}
              </p>
              <p className="m-0">
                <strong>Role:</strong> {normalizeText(selectedItem.actor?.role) || "--"}
              </p>
              <p className="m-0">
                <strong>Resource:</strong>{" "}
                {normalizeText(selectedItem.resourceType) || "--"}
              </p>
              <p className="m-0">
                <strong>Entity:</strong> {toEntitySummary(selectedItem)}
              </p>
              <p className="m-0">
                <strong>IP:</strong> {normalizeText(selectedItem.ip) || "--"}
              </p>
              <p className="m-0">
                <strong>User Agent:</strong>{" "}
                {normalizeText(selectedItem.userAgent) || "--"}
              </p>
            </div>

            <div className="mt-3 grid gap-3 xl:grid-cols-2">
              <div className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Request
                </span>
                <pre className="min-h-40 overflow-auto rounded border border-slate-200 bg-white p-3 text-xs text-slate-700">
                  {toJsonText(selectedItem.request)}
                </pre>
              </div>
              <div className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Response
                </span>
                <pre className="min-h-40 overflow-auto rounded border border-slate-200 bg-white p-3 text-xs text-slate-700">
                  {toJsonText(selectedItem.response)}
                </pre>
              </div>
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
    </div>
  );
};

export default AdminAuditLogPage;
