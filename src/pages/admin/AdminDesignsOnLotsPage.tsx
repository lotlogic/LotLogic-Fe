import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { adminApi } from "@/lib/api/adminApi";
import {
  DESIGN_ON_LOT_STATUSES,
  type DesignOnLotRecord,
  type DesignOnLotStatus,
} from "@/lib/api/adminModels";
import { adminAuth } from "@/lib/auth/adminAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type StatusFilter = DesignOnLotStatus | "ALL";

const formatNumber = (value: unknown): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

const getPrimaryReasons = (record: DesignOnLotRecord): string[] => {
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

const AdminDesignsOnLotsPage = () => {
  const [records, setRecords] = useState<DesignOnLotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    "MANUAL_REVIEW"
  );
  const [lotIdFilter, setLotIdFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminApi.getDesignsOnLots<DesignOnLotRecord>();
      setRecords(data);
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
    loadRecords();
  }, [loadRecords]);

  const filteredRecords = useMemo(() => {
    const lotNeedle = lotIdFilter.trim().toLowerCase();
    return records.filter((record) => {
      const statusMatches =
        statusFilter === "ALL" ? true : record.status === statusFilter;
      if (!statusMatches) {
        return false;
      }
      if (!lotNeedle) {
        return true;
      }
      const lotId = String(record.lotId ?? "").toLowerCase();
      const id = String(record.id ?? "").toLowerCase();
      return lotId.includes(lotNeedle) || id.includes(lotNeedle);
    });
  }, [lotIdFilter, records, statusFilter]);

  const handleLogout = async () => {
    await adminAuth.logout();
  };

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Plan-Lot Matches</h1>
      <AdminNav />
      <div className="flex flex-wrap gap-2 mb-6 mt-4">
        <Button
          onClick={loadRecords}
          disabled={loading}
          loading={loading}
          label="Refresh"
        />
        <Button onClick={handleLogout} variant="outline" label="Sign out" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm mb-4 grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <span className="text-sm font-medium">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
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
          <span className="text-sm font-medium">Lot or match ID</span>
          <Input
            value={lotIdFilter}
            onChange={(event) => setLotIdFilter(event.target.value)}
            placeholder="Filter by lot id or design-on-lot id"
            className="w-full"
          />
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      <div className="overflow-auto border rounded-lg">
        <table className="w-full border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="p-3 border-b font-medium text-sm text-slate-700">
                ID
              </th>
              <th className="p-3 border-b font-medium text-sm text-slate-700">
                Lot ID
              </th>
                  <th className="p-3 border-b font-medium text-sm text-slate-700">
                    Floor Plan ID
                  </th>
                  <th className="p-3 border-b font-medium text-sm text-slate-700">
                    Status
                  </th>
                  <th className="p-3 border-b font-medium text-sm text-slate-700">
                    Review reasons
                  </th>
                  <th className="p-3 border-b font-medium text-sm text-slate-700 text-right">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
              <tr>
                <td
                  colSpan={6}
                  className="p-4 text-center text-sm text-muted-foreground"
                >
                  Loading plan-lot matches...
                </td>
              </tr>
            )}
            {!loading &&
              filteredRecords.map((record) => {
                const reasons = getPrimaryReasons(record);
                const showDetails = expandedId === record.id;

                return (
                  <Fragment key={record.id}>
                    <tr>
                      <td className="p-3 border-b border-slate-100 text-xs font-mono text-slate-500">
                        {record.id}
                      </td>
                      <td className="p-3 border-b border-slate-100 text-sm font-mono">
                        {record.lotId ?? "--"}
                      </td>
                      <td className="p-3 border-b border-slate-100 text-sm font-mono">
                        {record.floorPlanId ?? "--"}
                      </td>
                      <td className="p-3 border-b border-slate-100 text-sm">
                        {record.status ?? "--"}
                      </td>
                      <td className="p-3 border-b border-slate-100 text-sm">
                        {reasons.length > 0 ? (
                          <div className="grid gap-1">
                            <span>{reasons[0]}</span>
                            {reasons.length > 1 ? (
                              <span className="text-xs text-slate-500">
                                +{reasons.length - 1} more
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td className="p-3 border-b border-slate-100 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          label={showDetails ? "Hide" : "View"}
                          onClick={() =>
                            setExpandedId((previous) =>
                              previous === record.id ? null : record.id
                            )
                          }
                        />
                      </td>
                    </tr>
                    {showDetails && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-3 border-b border-slate-100 bg-slate-50"
                        >
                          <div className="grid gap-3 lg:grid-cols-3">
                            <div className="rounded-md border border-slate-200 bg-white p-3">
                              <p className="m-0 text-xs uppercase tracking-[0.08em] text-slate-500">
                                Review Context
                              </p>
                              <p className="m-0 mt-1 text-xs text-slate-700">
                                Assessed: {record.assessedAt ?? "--"}
                              </p>
                              <div className="mt-2">
                                <p className="m-0 text-xs font-medium text-slate-700">
                                  Manual review reasons
                                </p>
                                {Array.isArray(record.manualReviewReasons) &&
                                record.manualReviewReasons.length > 0 ? (
                                  <ul className="m-0 mt-1 list-disc pl-4 text-xs text-slate-700">
                                    {record.manualReviewReasons.map((reason) => (
                                      <li key={reason}>{reason}</li>
                                    ))}
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
                                {Array.isArray(record.failReasons) &&
                                record.failReasons.length > 0 ? (
                                  <ul className="m-0 mt-1 list-disc pl-4 text-xs text-slate-700">
                                    {record.failReasons.map((reason) => (
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
                                Lot Details
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
                                  <dt className="text-slate-500">Zoning</dt>
                                  <dd className="m-0 text-slate-800">
                                    {record.lot?.zoning ?? "--"}
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
                                <div className="flex justify-between gap-2">
                                  <dt className="text-slate-500">Type</dt>
                                  <dd className="m-0 text-slate-800">
                                    {record.lot?.lotType ?? "--"}
                                  </dd>
                                </div>
                              </dl>
                            </div>

                            <div className="rounded-md border border-slate-200 bg-white p-3">
                              <p className="m-0 text-xs uppercase tracking-[0.08em] text-slate-500">
                                Floor Plan Details
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
                                  <dt className="text-slate-500">Floorplan file</dt>
                                  <dd className="m-0 text-slate-800">
                                    {record.floorPlan?.floorplanUrl ? (
                                      <a
                                        href={record.floorPlan.floorplanUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-brand-primary underline"
                                      >
                                        View file
                                      </a>
                                    ) : (
                                      "--"
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
                                  <dt className="text-slate-500">Beds/Baths/Garages</dt>
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
                                <div className="flex justify-between gap-2">
                                  <dt className="text-slate-500">
                                    Storeys / Height
                                  </dt>
                                  <dd className="m-0 text-slate-800">
                                    {record.floorPlan?.storeys ?? "--"} /{" "}
                                    {formatNumber(
                                      record.floorPlan?.buildingHeight_m
                                    )}{" "}
                                    m
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
            {!loading && filteredRecords.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="p-4 text-center text-sm text-muted-foreground"
                >
                  No plan-lot matches match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDesignsOnLotsPage;
