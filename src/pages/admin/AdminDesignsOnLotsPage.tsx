import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { adminApi } from "@/lib/api/adminApi";
import {
  DESIGN_ON_LOT_REVIEW_DECISIONS,
  DESIGN_ON_LOT_STATUSES,
  type DesignOnLotRecord,
  type DesignOnLotReviewDecision,
  type DesignOnLotStatus,
  type ReviewLotDesignOnLotsPayload,
} from "@/lib/api/adminModels";
import { adminAuth } from "@/lib/auth/adminAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  formatDateForCell,
  formatDateTimeForTooltip,
} from "@/lib/utils/dateTime";

type StatusFilter = DesignOnLotStatus | "ALL";
type ReviewFilter = DesignOnLotReviewDecision | "ALL";
type LotGroup = {
  key: string;
  lotId: string;
  lotLabel: string;
  estateName: string;
  summaryLine: string;
  records: DesignOnLotRecord[];
};

const textareaClassName =
  "min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const formatNumber = (value: unknown): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

const getLotLabel = (record: DesignOnLotRecord): string => {
  const blockNumber = record.lot?.blockNumber;
  if (typeof blockNumber === "number" && Number.isFinite(blockNumber)) {
    return `Lot ${blockNumber}`;
  }
  const blockKey = String(record.lot?.blockKey ?? "").trim();
  if (blockKey) {
    return blockKey;
  }
  const lotId = String(record.lotId ?? "").trim();
  return lotId ? `Lot ${lotId}` : "Unknown lot";
};

const getEstateName = (record: DesignOnLotRecord): string =>
  String(record.lot?.estate?.name ?? "").trim() || "No estate";

const getSystemStatus = (record: DesignOnLotRecord): DesignOnLotStatus | "--" =>
  record.systemStatus ?? record.status ?? "--";

const getLiveStatus = (record: DesignOnLotRecord): DesignOnLotStatus | "--" =>
  record.effectiveStatus ?? record.status ?? "--";

const getEffectiveReasons = (record: DesignOnLotRecord): string[] => {
  const manual = Array.isArray(record.manualReviewReasons)
    ? record.manualReviewReasons.filter(Boolean)
    : [];
  if (manual.length > 0) {
    return manual;
  }
  const fail = Array.isArray(record.failReasons)
    ? record.failReasons.filter(Boolean)
    : [];
  if (fail.length > 0) {
    return fail;
  }
  return Array.isArray(record.reasons) ? record.reasons.filter(Boolean) : [];
};

const getSystemReasons = (record: DesignOnLotRecord): string[] => {
  const manual = Array.isArray(record.systemManualReviewReasons)
    ? record.systemManualReviewReasons.filter(Boolean)
    : [];
  if (manual.length > 0) {
    return manual;
  }
  const fail = Array.isArray(record.systemFailReasons)
    ? record.systemFailReasons.filter(Boolean)
    : [];
  if (fail.length > 0) {
    return fail;
  }
  return Array.isArray(record.systemReasons)
    ? record.systemReasons.filter(Boolean)
    : [];
};

const getStatusBadgeClass = (status: DesignOnLotStatus | "--"): string => {
  switch (status) {
    case "PASS":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "FAIL":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "MANUAL_REVIEW":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
};

const getReviewBadgeClass = (
  decision: DesignOnLotReviewDecision | "ALL" | null | undefined
): string => {
  switch (decision) {
    case "APPROVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "REJECTED":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "NONE":
      return "border-slate-200 bg-slate-100 text-slate-600";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
};

const formatReviewActor = (record: DesignOnLotRecord): string => {
  const displayName = String(record.reviewedBy?.displayName ?? "").trim();
  if (displayName) {
    return displayName;
  }
  const email = String(record.reviewedBy?.email ?? "").trim();
  if (email) {
    return email;
  }
  const reviewedByUserId = String(record.reviewedByUserId ?? "").trim();
  return reviewedByUserId || "--";
};

const buildSummaryLine = (record: DesignOnLotRecord): string => {
  const address = String(record.lot?.address ?? "").trim();
  if (address) {
    return address;
  }
  const frontage = formatNumber(record.lot?.frontageM);
  const area = formatNumber(record.lot?.areaSqm);
  const parts = [
    area !== "--" ? `${area} m2` : "",
    frontage !== "--" ? `${frontage} m frontage` : "",
    String(record.lot?.zoning ?? "").trim(),
  ].filter(Boolean);
  return parts.join(" • ") || "No lot summary available";
};

const AdminDesignsOnLotsPage = () => {
  const [records, setRecords] = useState<DesignOnLotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [systemStatusFilter, setSystemStatusFilter] =
    useState<StatusFilter>("MANUAL_REVIEW");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("ALL");
  const [lotIdFilter, setLotIdFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [lotNotes, setLotNotes] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminApi.getDesignsOnLots<DesignOnLotRecord>();
      setRecords(data);
      setSelectedIds({});
    } catch (error) {
      setRecords([]);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load plan-lot matches."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const filteredRecords = useMemo(() => {
    const needle = lotIdFilter.trim().toLowerCase();
    return records.filter((record) => {
      const systemStatusMatches =
        systemStatusFilter === "ALL"
          ? true
          : getSystemStatus(record) === systemStatusFilter;
      if (!systemStatusMatches) {
        return false;
      }

      const decision = record.reviewDecision ?? "NONE";
      const reviewMatches =
        reviewFilter === "ALL" ? true : decision === reviewFilter;
      if (!reviewMatches) {
        return false;
      }

      if (!needle) {
        return true;
      }

      const searchable = [
        record.id,
        record.lotId,
        record.floorPlanId,
        record.floorPlan?.name,
        record.floorPlan?.builder?.name,
        getLotLabel(record),
        getEstateName(record),
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ");

      return searchable.includes(needle);
    });
  }, [lotIdFilter, records, reviewFilter, systemStatusFilter]);

  const lotGroups = useMemo<LotGroup[]>(() => {
    const groups = new Map<string, LotGroup>();
    for (const record of filteredRecords) {
      const lotId = String(record.lotId ?? `unknown-${record.id}`);
      const existing = groups.get(lotId);
      if (existing) {
        existing.records.push(record);
        continue;
      }
      groups.set(lotId, {
        key: lotId,
        lotId,
        lotLabel: getLotLabel(record),
        estateName: getEstateName(record),
        summaryLine: buildSummaryLine(record),
        records: [record],
      });
    }
    return Array.from(groups.values());
  }, [filteredRecords]);

  const handleLogout = async () => {
    await adminAuth.logout();
  };

  const getLotNote = useCallback(
    (lotId: string): string | undefined => {
      const note = lotNotes[lotId]?.trim();
      return note ? note : undefined;
    },
    [lotNotes]
  );

  const resetMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleToggleRecordSelection = (recordId: string, checked: boolean) => {
    setSelectedIds((previous) => ({
      ...previous,
      [recordId]: checked,
    }));
  };

  const handleToggleLotSelection = (
    recordIds: string[],
    checked: boolean
  ) => {
    setSelectedIds((previous) => {
      const next = { ...previous };
      for (const recordId of recordIds) {
        next[recordId] = checked;
      }
      return next;
    });
  };

  const runSingleReview = useCallback(
    async (
      record: DesignOnLotRecord,
      decision: Exclude<DesignOnLotReviewDecision, "NONE">
    ) => {
      const lotId = String(record.lotId ?? "");
      setBusyKey(`record:${record.id}:${decision}`);
      resetMessages();
      try {
        await adminApi.reviewDesignOnLot(record.id, {
          decision,
          note: getLotNote(lotId) ?? null,
        });
        await loadRecords();
        setSuccessMessage(
          `${record.floorPlan?.name ?? `Design ${record.floorPlanId ?? record.id}`} marked ${decision.toLowerCase()}.`
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to update review."
        );
      } finally {
        setBusyKey(null);
      }
    },
    [getLotNote, loadRecords]
  );

  const runClearReview = useCallback(
    async (record: DesignOnLotRecord) => {
      setBusyKey(`record:${record.id}:clear`);
      resetMessages();
      try {
        await adminApi.clearDesignOnLotReview(record.id);
        await loadRecords();
        setSuccessMessage(
          `${record.floorPlan?.name ?? `Design ${record.floorPlanId ?? record.id}`} review cleared.`
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to clear review."
        );
      } finally {
        setBusyKey(null);
      }
    },
    [loadRecords]
  );

  const runLotReview = useCallback(
    async (
      lotId: string,
      payload: ReviewLotDesignOnLotsPayload,
      successLabel: string,
      confirmMessage?: string
    ) => {
      if (confirmMessage && !window.confirm(confirmMessage)) {
        return;
      }

      setBusyKey(`lot:${lotId}:${payload.decision}:${payload.scope ?? "manual_review"}`);
      resetMessages();
      try {
        const response = await adminApi.reviewLotDesignOnLots(lotId, {
          ...payload,
          note: getLotNote(lotId) ?? null,
        });
        await loadRecords();
        setSuccessMessage(`${successLabel} (${response.updated} updated).`);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to update lot review."
        );
      } finally {
        setBusyKey(null);
      }
    },
    [getLotNote, loadRecords]
  );

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Plan-Lot Matches</h1>
      <AdminNav />
      <div className="flex flex-wrap gap-2 mb-6 mt-4">
        <Button
          onClick={() => void loadRecords()}
          disabled={loading || busyKey !== null}
          loading={loading}
          label="Refresh"
        />
        <Button onClick={handleLogout} variant="outline" label="Sign out" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm mb-4 grid gap-4 lg:grid-cols-3">
        <div className="grid gap-2">
          <span className="text-sm font-medium">System status</span>
          <select
            value={systemStatusFilter}
            onChange={(event) =>
              setSystemStatusFilter(event.target.value as StatusFilter)
            }
            className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="ALL">ALL</option>
            {DESIGN_ON_LOT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <span className="text-sm font-medium">Review state</span>
          <select
            value={reviewFilter}
            onChange={(event) =>
              setReviewFilter(event.target.value as ReviewFilter)
            }
            className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="ALL">ALL</option>
            {DESIGN_ON_LOT_REVIEW_DECISIONS.map((decision) => (
              <option key={decision} value={decision}>
                {decision}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <span className="text-sm font-medium">Lot, match, or plan</span>
          <Input
            value={lotIdFilter}
            onChange={(event) => setLotIdFilter(event.target.value)}
            placeholder="Filter by lot id, match id, floor plan, builder, or estate"
            className="w-full"
          />
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 rounded-md border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading plan-lot matches...
        </div>
      ) : lotGroups.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          No plan-lot matches match the current filters.
        </div>
      ) : (
        <div className="grid gap-4">
          {lotGroups.map((group) => {
            const selectedRecordIds = group.records
              .filter((record) => selectedIds[record.id])
              .map((record) => record.id);
            const allSelected =
              group.records.length > 0 &&
              selectedRecordIds.length === group.records.length;
            const manualReviewCount = group.records.filter(
              (record) => getSystemStatus(record) === "MANUAL_REVIEW"
            ).length;
            const passCount = group.records.filter(
              (record) => getLiveStatus(record) === "PASS"
            ).length;
            const overrideCount = group.records.filter(
              (record) => (record.reviewDecision ?? "NONE") !== "NONE"
            ).length;
            const lotBusy =
              busyKey?.startsWith(`lot:${group.lotId}:`) ?? false;

            return (
              <section
                key={group.key}
                className="rounded-lg border border-slate-200 bg-white shadow-sm"
              >
                <div className="border-b border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="grid gap-2">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                          {group.lotLabel}
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">
                          {group.estateName}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {group.summaryLine}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
                          {manualReviewCount} manual review
                        </span>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
                          {passCount} live pass
                        </span>
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-sky-700">
                          {overrideCount} overrides
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 px-3 text-xs"
                        label="Approve manual review"
                        onClick={() =>
                          void runLotReview(
                            group.lotId,
                            {
                              decision: "APPROVED",
                              scope: "manual_review",
                            },
                            `${group.lotLabel} manual-review matches approved`,
                            `Approve all manual-review matches on ${group.lotLabel}?`
                          )
                        }
                        disabled={lotBusy || manualReviewCount === 0}
                        loading={busyKey === `lot:${group.lotId}:APPROVED:manual_review`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 px-3 text-xs"
                        label="Approve selected"
                        onClick={() =>
                          void runLotReview(
                            group.lotId,
                            {
                              decision: "APPROVED",
                              scope: "selected",
                              ids: selectedRecordIds,
                            },
                            `${group.lotLabel} selected matches approved`,
                            `Approve ${selectedRecordIds.length} selected matches on ${group.lotLabel}?`
                          )
                        }
                        disabled={lotBusy || selectedRecordIds.length === 0}
                        loading={busyKey === `lot:${group.lotId}:APPROVED:selected`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 px-3 text-xs"
                        label="Reject selected"
                        onClick={() =>
                          void runLotReview(
                            group.lotId,
                            {
                              decision: "REJECTED",
                              scope: "selected",
                              ids: selectedRecordIds,
                            },
                            `${group.lotLabel} selected matches rejected`,
                            `Reject ${selectedRecordIds.length} selected matches on ${group.lotLabel}?`
                          )
                        }
                        disabled={lotBusy || selectedRecordIds.length === 0}
                        loading={busyKey === `lot:${group.lotId}:REJECTED:selected`}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2">
                    <span className="text-sm font-medium">
                      Review note for lot actions
                    </span>
                    <textarea
                      value={lotNotes[group.lotId] ?? ""}
                      onChange={(event) =>
                        setLotNotes((previous) => ({
                          ...previous,
                          [group.lotId]: event.target.value,
                        }))
                      }
                      placeholder="Optional note applied to row and bulk actions for this lot."
                      className={textareaClassName}
                    />
                  </div>
                </div>

                <div className="overflow-auto">
                  <table className="w-full min-w-[1120px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-left">
                        <th className="w-12 p-3 border-b font-medium text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={(event) =>
                              handleToggleLotSelection(
                                group.records.map((record) => record.id),
                                event.target.checked
                              )
                            }
                          />
                        </th>
                        <th className="p-3 border-b font-medium text-sm text-slate-700">
                          Floor plan
                        </th>
                        <th className="p-3 border-b font-medium text-sm text-slate-700">
                          Builder
                        </th>
                        <th className="p-3 border-b font-medium text-sm text-slate-700">
                          System
                        </th>
                        <th className="p-3 border-b font-medium text-sm text-slate-700">
                          Live
                        </th>
                        <th className="p-3 border-b font-medium text-sm text-slate-700">
                          Review
                        </th>
                        <th className="p-3 border-b font-medium text-sm text-slate-700">
                          Reasons
                        </th>
                        <th className="p-3 border-b font-medium text-sm text-slate-700 text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.records.map((record) => {
                        const systemStatus = getSystemStatus(record);
                        const liveStatus = getLiveStatus(record);
                        const systemReasons = getSystemReasons(record);
                        const liveReasons = getEffectiveReasons(record);
                        const reviewDecision = record.reviewDecision ?? "NONE";
                        const isExpanded = expandedId === record.id;
                        const planLabel =
                          String(record.floorPlan?.name ?? "").trim() ||
                          `Design ${record.floorPlanId ?? record.id}`;

                        return (
                          <Fragment key={record.id}>
                            <tr>
                              <td className="p-3 border-b border-slate-100 align-top">
                                <input
                                  type="checkbox"
                                  checked={Boolean(selectedIds[record.id])}
                                  onChange={(event) =>
                                    handleToggleRecordSelection(
                                      record.id,
                                      event.target.checked
                                    )
                                  }
                                />
                              </td>
                              <td className="p-3 border-b border-slate-100 align-top">
                                <div className="grid gap-1">
                                  <span className="text-sm font-medium text-slate-900">
                                    {planLabel}
                                  </span>
                                  <span className="text-xs font-mono text-slate-500">
                                    Match {record.id} • Plan {record.floorPlanId ?? "--"}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 border-b border-slate-100 align-top text-sm text-slate-700">
                                {record.floorPlan?.builder?.name ?? "--"}
                              </td>
                              <td className="p-3 border-b border-slate-100 align-top">
                                <div className="grid gap-1">
                                  <span
                                    className={`inline-flex w-fit rounded-full border px-2 py-1 text-xs font-medium ${getStatusBadgeClass(
                                      systemStatus
                                    )}`}
                                  >
                                    {systemStatus}
                                  </span>
                                  <span
                                    className="text-xs text-slate-500"
                                    title={formatDateTimeForTooltip(
                                      record.systemAssessedAt
                                    )}
                                  >
                                    {formatDateForCell(record.systemAssessedAt)}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 border-b border-slate-100 align-top">
                                <div className="grid gap-1">
                                  <span
                                    className={`inline-flex w-fit rounded-full border px-2 py-1 text-xs font-medium ${getStatusBadgeClass(
                                      liveStatus
                                    )}`}
                                  >
                                    {liveStatus}
                                  </span>
                                  <span
                                    className="text-xs text-slate-500"
                                    title={formatDateTimeForTooltip(
                                      record.assessedAt
                                    )}
                                  >
                                    {formatDateForCell(record.assessedAt)}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 border-b border-slate-100 align-top">
                                <div className="grid gap-1">
                                  <span
                                    className={`inline-flex w-fit rounded-full border px-2 py-1 text-xs font-medium ${getReviewBadgeClass(
                                      reviewDecision
                                    )}`}
                                  >
                                    {reviewDecision}
                                  </span>
                                  {(record.reviewedAt || record.reviewedByUserId) && (
                                    <span
                                      className="text-xs text-slate-500"
                                      title={formatDateTimeForTooltip(
                                        record.reviewedAt
                                      )}
                                    >
                                      {formatReviewActor(record)}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 border-b border-slate-100 align-top text-sm">
                                <div className="grid gap-1">
                                  <span className="text-slate-800">
                                    {systemReasons[0] ??
                                      liveReasons[0] ??
                                      "--"}
                                  </span>
                                  {systemReasons.length > 1 && (
                                    <span className="text-xs text-slate-500">
                                      +{systemReasons.length - 1} more system reasons
                                    </span>
                                  )}
                                  {record.reviewNote && (
                                    <span className="text-xs text-slate-500">
                                      Review note: {record.reviewNote}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 border-b border-slate-100 align-top text-right">
                                <div className="flex flex-wrap justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-7 px-2 text-xs"
                                    label="Approve"
                                    onClick={() =>
                                      void runSingleReview(record, "APPROVED")
                                    }
                                    disabled={busyKey !== null}
                                    loading={
                                      busyKey === `record:${record.id}:APPROVED`
                                    }
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs"
                                    label="Reject"
                                    onClick={() =>
                                      void runSingleReview(record, "REJECTED")
                                    }
                                    disabled={busyKey !== null}
                                    loading={
                                      busyKey === `record:${record.id}:REJECTED`
                                    }
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-7 px-2 text-xs"
                                    label="Clear"
                                    onClick={() => void runClearReview(record)}
                                    disabled={
                                      busyKey !== null || reviewDecision === "NONE"
                                    }
                                    loading={
                                      busyKey === `record:${record.id}:clear`
                                    }
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-7 px-2 text-xs"
                                    label={isExpanded ? "Hide" : "View"}
                                    onClick={() =>
                                      setExpandedId((previous) =>
                                        previous === record.id ? null : record.id
                                      )
                                    }
                                    disabled={busyKey !== null}
                                  />
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td
                                  colSpan={8}
                                  className="bg-slate-50 p-4 border-b border-slate-100"
                                >
                                  <div className="grid gap-3 xl:grid-cols-4">
                                    <div className="rounded-md border border-slate-200 bg-white p-3">
                                      <p className="m-0 text-xs uppercase tracking-[0.08em] text-slate-500">
                                        Review
                                      </p>
                                      <dl className="m-0 mt-2 grid gap-1 text-xs">
                                        <div className="flex justify-between gap-2">
                                          <dt className="text-slate-500">Decision</dt>
                                          <dd className="m-0 text-slate-800">
                                            {reviewDecision}
                                          </dd>
                                        </div>
                                        <div className="flex justify-between gap-2">
                                          <dt className="text-slate-500">Reviewer</dt>
                                          <dd className="m-0 text-slate-800">
                                            {formatReviewActor(record)}
                                          </dd>
                                        </div>
                                        <div className="flex justify-between gap-2">
                                          <dt className="text-slate-500">Reviewed</dt>
                                          <dd className="m-0 text-slate-800">
                                            {formatDateForCell(record.reviewedAt)}
                                          </dd>
                                        </div>
                                      </dl>
                                      <div className="mt-3">
                                        <p className="m-0 text-xs font-medium text-slate-700">
                                          Review note
                                        </p>
                                        <p className="m-0 mt-1 text-xs text-slate-600">
                                          {record.reviewNote ?? "--"}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="rounded-md border border-slate-200 bg-white p-3">
                                      <p className="m-0 text-xs uppercase tracking-[0.08em] text-slate-500">
                                        System assessment
                                      </p>
                                      <p className="m-0 mt-1 text-xs text-slate-700">
                                        Assessed: {formatDateForCell(record.systemAssessedAt)}
                                      </p>
                                      <div className="mt-2">
                                        <p className="m-0 text-xs font-medium text-slate-700">
                                          Manual review reasons
                                        </p>
                                        {Array.isArray(record.systemManualReviewReasons) &&
                                        record.systemManualReviewReasons.length > 0 ? (
                                          <ul className="m-0 mt-1 list-disc pl-4 text-xs text-slate-700">
                                            {record.systemManualReviewReasons.map(
                                              (reason) => (
                                                <li key={reason}>{reason}</li>
                                              )
                                            )}
                                          </ul>
                                        ) : (
                                          <p className="m-0 mt-1 text-xs text-slate-500">
                                            --
                                          </p>
                                        )}
                                      </div>
                                      <div className="mt-2">
                                        <p className="m-0 text-xs font-medium text-slate-700">
                                          Fail reasons
                                        </p>
                                        {Array.isArray(record.systemFailReasons) &&
                                        record.systemFailReasons.length > 0 ? (
                                          <ul className="m-0 mt-1 list-disc pl-4 text-xs text-slate-700">
                                            {record.systemFailReasons.map((reason) => (
                                              <li key={reason}>{reason}</li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <p className="m-0 mt-1 text-xs text-slate-500">
                                            --
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="rounded-md border border-slate-200 bg-white p-3">
                                      <p className="m-0 text-xs uppercase tracking-[0.08em] text-slate-500">
                                        Lot details
                                      </p>
                                      <dl className="m-0 mt-2 grid gap-1 text-xs">
                                        <div className="flex justify-between gap-2">
                                          <dt className="text-slate-500">Estate</dt>
                                          <dd className="m-0 text-slate-800">
                                            {record.lot?.estate?.name ?? "--"}
                                          </dd>
                                        </div>
                                        <div className="flex justify-between gap-2">
                                          <dt className="text-slate-500">Block</dt>
                                          <dd className="m-0 text-slate-800">
                                            {record.lot?.blockNumber ??
                                              record.lot?.blockKey ??
                                              "--"}
                                          </dd>
                                        </div>
                                        <div className="flex justify-between gap-2">
                                          <dt className="text-slate-500">Address</dt>
                                          <dd className="m-0 text-slate-800">
                                            {record.lot?.address ?? "--"}
                                          </dd>
                                        </div>
                                        <div className="flex justify-between gap-2">
                                          <dt className="text-slate-500">Area</dt>
                                          <dd className="m-0 text-slate-800">
                                            {formatNumber(record.lot?.areaSqm)} m2
                                          </dd>
                                        </div>
                                        <div className="flex justify-between gap-2">
                                          <dt className="text-slate-500">Lifecycle</dt>
                                          <dd className="m-0 text-slate-800">
                                            {record.lot?.lifecycleStage ?? "--"}
                                          </dd>
                                        </div>
                                        <div className="flex justify-between gap-2">
                                          <dt className="text-slate-500">Frontage</dt>
                                          <dd className="m-0 text-slate-800">
                                            {formatNumber(record.lot?.frontageM)} m
                                          </dd>
                                        </div>
                                      </dl>
                                    </div>

                                    <div className="rounded-md border border-slate-200 bg-white p-3">
                                      <p className="m-0 text-xs uppercase tracking-[0.08em] text-slate-500">
                                        Floor plan details
                                      </p>
                                      <dl className="m-0 mt-2 grid gap-1 text-xs">
                                        <div className="flex justify-between gap-2">
                                          <dt className="text-slate-500">Plan</dt>
                                          <dd className="m-0 text-slate-800">
                                            {record.floorPlan?.floorplanUrl ? (
                                              <a
                                                href={record.floorPlan.floorplanUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-brand-primary underline"
                                              >
                                                {record.floorPlan?.name ?? "Open floorplan"}
                                              </a>
                                            ) : (
                                              record.floorPlan?.name ?? "--"
                                            )}
                                          </dd>
                                        </div>
                                        <div className="flex justify-between gap-2">
                                          <dt className="text-slate-500">Builder</dt>
                                          <dd className="m-0 text-slate-800">
                                            {record.floorPlan?.builder?.name ?? "--"}
                                          </dd>
                                        </div>
                                        <div className="flex justify-between gap-2">
                                          <dt className="text-slate-500">
                                            Beds/Baths/Garages
                                          </dt>
                                          <dd className="m-0 text-slate-800">
                                            {record.floorPlan?.bedrooms ?? "--"} /{" "}
                                            {record.floorPlan?.bathrooms ?? "--"} /{" "}
                                            {record.floorPlan?.garages ?? "--"}
                                          </dd>
                                        </div>
                                        <div className="flex justify-between gap-2">
                                          <dt className="text-slate-500">Area</dt>
                                          <dd className="m-0 text-slate-800">
                                            {formatNumber(record.floorPlan?.areaSqm)} m2
                                          </dd>
                                        </div>
                                        <div className="flex justify-between gap-2">
                                          <dt className="text-slate-500">Design (W x D)</dt>
                                          <dd className="m-0 text-slate-800">
                                            {formatNumber(record.floorPlan?.width)} x{" "}
                                            {formatNumber(record.floorPlan?.depth)} m
                                          </dd>
                                        </div>
                                      </dl>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminDesignsOnLotsPage;
