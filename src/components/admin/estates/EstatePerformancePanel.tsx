import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/api/adminApi";
import type { EstatePerformanceSummary } from "@/lib/api/adminModels";

type EstatePerformancePanelProps = {
  estateId?: string;
  enabled?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
};

type EstateLotLookupRecord = {
  id?: string | number;
  blockKey?: string | null;
  blockNumber?: number | null;
  lotNumber?: number | null;
};

const toDateInputValue = (value: Date): string => value.toISOString().slice(0, 10);

const getDefaultFromDate = () => {
  const now = new Date();
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return toDateInputValue(from);
};

const getDefaultToDate = () => toDateInputValue(new Date());

const normalizeText = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized || null;
};

const isNumericId = (value: string): boolean => /^\d+$/.test(value);

const getLotLabelFromLookup = (
  lotId: string | null,
  lookup: Map<string, string>
): string | null => {
  if (!lotId) {
    return null;
  }
  return lookup.get(lotId) ?? null;
};

const defaultSummary: EstatePerformanceSummary = {
  estateId: "",
  source: {
    provider: "mixpanel",
    configured: false,
    available: false,
  },
  stats: {
    viewsTotal: 0,
    viewsLast7Days: 0,
    viewsLast30Days: 0,
    uniqueLotsViewed: 0,
    uniqueDesignsViewed: 0,
    uniqueBuildersViewed: 0,
    enquiriesTotal: 0,
    enquiriesHot: 0,
    enquiriesLast7Days: 0,
    enquiriesLast30Days: 0,
    enquiriesPending: 0,
    enquiriesProcessed: 0,
    totalMatchedPlans: 0,
  },
  viewsByLot: [],
  viewsByDesign: [],
  viewsByBuilder: [],
  matchesByDesign: [],
  enquiriesByLot: [],
  enquiriesByBuilder: [],
};

export const EstatePerformancePanel = ({
  estateId,
  enabled = true,
  title = "Estate Performance",
  subtitle = "Track lot interest, plan-match trends, and enquiry volume for this estate.",
  className,
}: EstatePerformancePanelProps) => {
  const [fromDate, setFromDate] = useState(getDefaultFromDate);
  const [toDate, setToDate] = useState(getDefaultToDate);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<EstatePerformanceSummary>(defaultSummary);
  const [lotLabelLookup, setLotLabelLookup] = useState<Map<string, string>>(
    new Map()
  );

  const resolveLotLabel = useCallback(
    (row: Record<string, unknown>) => {
      const explicitLabel =
        normalizeText(row.lotLabel) ??
        normalizeText(row.blockKey) ??
        normalizeText(row.lotKey) ??
        normalizeText(row.lotDisplayId) ??
        normalizeText(row.displayLotId);
      if (explicitLabel) {
        return explicitLabel;
      }

      const lotId = normalizeText(row.lotId);
      const fromLookup = getLotLabelFromLookup(lotId, lotLabelLookup);
      if (fromLookup) {
        return fromLookup;
      }

      if (lotId && !isNumericId(lotId)) {
        return lotId;
      }

      if (lotId) {
        return `Lot ${lotId}`;
      }

      return "--";
    },
    [lotLabelLookup]
  );

  const loadPerformance = useCallback(async (forceRefresh: boolean = false) => {
    if (!enabled || !estateId) {
      setSummary(defaultSummary);
      setLotLabelLookup(new Map());
      setErrorMessage(null);
      setLoading(false);
      return;
    }

    if (!fromDate || !toDate) {
      setErrorMessage("Both from and to dates are required.");
      return;
    }
    if (fromDate > toDate) {
      setErrorMessage('"From" date must be before or equal to "To" date.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const [data, estateLots] = await Promise.all([
        adminApi.getEstatePerformance(estateId, {
          from: fromDate,
          to: toDate,
          forceRefresh: forceRefresh ? "true" : undefined,
        }),
        adminApi.getLots<EstateLotLookupRecord>({ estateId }),
      ]);

      const lotLookup = new Map<string, string>();
      estateLots.forEach((lot) => {
        const id = normalizeText(lot.id);
        if (!id) {
          return;
        }
        const label =
          normalizeText(lot.blockKey) ??
          (lot.blockNumber !== null && lot.blockNumber !== undefined
            ? `Lot ${lot.blockNumber}`
            : null) ??
          (lot.lotNumber !== null && lot.lotNumber !== undefined
            ? `Lot ${lot.lotNumber}`
            : null);
        if (label) {
          lotLookup.set(id, label);
        }
      });

      setLotLabelLookup(lotLookup);
      setSummary(data);
    } catch (error) {
      setSummary(defaultSummary);
      setLotLabelLookup(new Map());
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load estate performance data."
      );
    } finally {
      setLoading(false);
    }
  }, [enabled, estateId, fromDate, toDate]);

  useEffect(() => {
    void loadPerformance();
  }, [loadPerformance]);

  const handleRefresh = useCallback(() => {
    void loadPerformance(true);
  }, [loadPerformance]);

  const stats = summary.stats ?? {};
  const source = summary.source;
  const sourceUnavailable =
    source && source.available === false && (source.message || !source.configured);

  const viewsByLot = useMemo(() => summary.viewsByLot ?? [], [summary.viewsByLot]);
  const matchesByDesign = useMemo(
    () => summary.matchesByDesign ?? [],
    [summary.matchesByDesign]
  );
  const enquiriesByBuilder = useMemo(
    () => summary.enquiriesByBuilder ?? [],
    [summary.enquiriesByBuilder]
  );

  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white p-6 shadow-sm ${className ?? ""}`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-xl font-semibold">{title}</h2>
          <p className="m-0 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button
          onClick={handleRefresh}
          label={loading ? "Refreshing..." : "Refresh"}
          variant="outline"
          className="h-8 text-xs"
          loading={loading}
          disabled={loading || !enabled || !estateId}
        />
      </div>

      <div className="mb-2 flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs text-slate-600">
          From
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="h-9 rounded border border-slate-300 bg-white px-2 text-sm"
            disabled={loading}
          />
        </label>
        <label className="grid gap-1 text-xs text-slate-600">
          To
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="h-9 rounded border border-slate-300 bg-white px-2 text-sm"
            disabled={loading}
          />
        </label>
        <Button
          onClick={handleRefresh}
          label="Apply range"
          className="h-9"
          disabled={loading || !enabled || !estateId}
        />
      </div>

      <p className="mb-4 text-xs text-slate-500">
        View-interest metrics. Enquiry and plan-match totals are
        sourced from your application database.
      </p>

      {errorMessage && (
        <div className="mb-3 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      {sourceUnavailable && (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {source?.message || "View data is currently unavailable."}
        </div>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="m-0 text-xs uppercase tracking-wide text-slate-500">
            Enquiries total
          </p>
          <p className="m-0 text-2xl font-semibold text-slate-900">
            {Number(stats.enquiriesTotal ?? 0)}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="m-0 text-xs uppercase tracking-wide text-slate-500">
            Enquiries last 30d
          </p>
          <p className="m-0 text-2xl font-semibold text-slate-900">
            {Number(stats.enquiriesLast30Days ?? 0)}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="m-0 text-xs uppercase tracking-wide text-slate-500">
            Design views (range)
          </p>
          <p className="m-0 text-2xl font-semibold text-slate-900">
            {Number(stats.viewsTotal ?? 0)}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="m-0 text-xs uppercase tracking-wide text-slate-500">
            Matched plans
          </p>
          <p className="m-0 text-2xl font-semibold text-slate-900">
            {Number(stats.totalMatchedPlans ?? 0)}
          </p>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="m-0 text-xs uppercase tracking-wide text-slate-500">
            Hot enquiries
          </p>
          <p className="m-0 text-2xl font-semibold text-slate-900">
            {Number(stats.enquiriesHot ?? 0)}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="m-0 text-xs uppercase tracking-wide text-slate-500">
            Pending enquiries
          </p>
          <p className="m-0 text-2xl font-semibold text-slate-900">
            {Number(stats.enquiriesPending ?? 0)}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="m-0 text-xs uppercase tracking-wide text-slate-500">
            Lots with views
          </p>
          <p className="m-0 text-2xl font-semibold text-slate-900">
            {Number(stats.uniqueLotsViewed ?? 0)}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="m-0 text-xs uppercase tracking-wide text-slate-500">
            Builders viewed
          </p>
          <p className="m-0 text-2xl font-semibold text-slate-900">
            {Number(stats.uniqueBuildersViewed ?? 0)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-lg border overflow-hidden">
          <div className="border-b bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            Lots Generating Interest
          </div>
          {viewsByLot.length === 0 ? (
            <p className="m-0 p-3 text-sm text-muted-foreground">
              No lot view data in this range.
            </p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="px-3 py-2 border-b">Lot</th>
                  <th className="px-3 py-2 border-b text-right">Views</th>
                </tr>
              </thead>
              <tbody>
                {viewsByLot.slice(0, 10).map((row) => (
                  <tr key={String(row.lotId ?? row.lotLabel ?? "")}>
                    <td className="px-3 py-2 border-b border-slate-100">
                      {resolveLotLabel(row as Record<string, unknown>)}
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100 text-right">
                      {Number(row.views ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-lg border overflow-hidden">
          <div className="border-b bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            Builder Plans Matching Most
          </div>
          {matchesByDesign.length === 0 ? (
            <p className="m-0 p-3 text-sm text-muted-foreground">
              No match data yet for this estate.
            </p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="px-3 py-2 border-b">Plan</th>
                  <th className="px-3 py-2 border-b">Builder</th>
                  <th className="px-3 py-2 border-b text-right">Matches</th>
                </tr>
              </thead>
              <tbody>
                {matchesByDesign.slice(0, 10).map((row) => (
                  <tr key={`${String(row.designId ?? "")}-match`}>
                    <td className="px-3 py-2 border-b border-slate-100">
                      {row.designName || row.designId || "--"}
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100">
                      {row.builderName || row.builderId || "--"}
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100 text-right">
                      {Number(row.matches ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-lg border overflow-hidden">
          <div className="border-b bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            Enquiry Volume By Builder
          </div>
          {enquiriesByBuilder.length === 0 ? (
            <p className="m-0 p-3 text-sm text-muted-foreground">
              No enquiry records yet for this estate.
            </p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="px-3 py-2 border-b">Builder</th>
                  <th className="px-3 py-2 border-b text-right">Enquiries</th>
                </tr>
              </thead>
              <tbody>
                {enquiriesByBuilder.slice(0, 10).map((row) => (
                  <tr key={String(row.builderId ?? "")}>
                    <td className="px-3 py-2 border-b border-slate-100">
                      {row.builderName || row.builderId || "--"}
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100 text-right">
                      {Number(row.enquiries ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
};

export default EstatePerformancePanel;
