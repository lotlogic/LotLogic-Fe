import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/api/adminApi";
import type { BuilderPerformanceSummary } from "@/lib/api/adminModels";

type BuilderPerformancePanelProps = {
  builderId?: string;
  enabled?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
};

const normalizeText = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized || null;
};

const isNumericId = (value: string): boolean => /^\d+$/.test(value);

const resolveLotLabel = (row: Record<string, unknown>): string => {
  const label =
    normalizeText(row.lotLabel) ??
    normalizeText(row.blockKey) ??
    normalizeText(row.lotKey) ??
    normalizeText(row.lotDisplayId) ??
    normalizeText(row.displayLotId);

  if (label) {
    return label;
  }

  const lotId = normalizeText(row.lotId);
  if (!lotId) {
    return "--";
  }

  if (!isNumericId(lotId)) {
    return lotId;
  }

  return `Lot ${lotId}`;
};

const resolveDesignLabel = (row: Record<string, unknown>): string => {
  const explicit =
    normalizeText(row.houseDesignLabel) ??
    normalizeText(row.designLabel) ??
    normalizeText(row.designName);
  if (explicit) {
    return explicit;
  }
  return normalizeText(row.designId) ?? "--";
};

const toDateInputValue = (value: Date): string => value.toISOString().slice(0, 10);

const getDefaultFromDate = () => {
  const now = new Date();
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return toDateInputValue(from);
};

const getDefaultToDate = () => toDateInputValue(new Date());

const defaultSummary: BuilderPerformanceSummary = {
  builderId: "",
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
  },
  viewsByLot: [],
  viewsByDesign: [],
};

export const BuilderPerformancePanel = ({
  builderId,
  enabled = true,
  title = "Design View Performance",
  subtitle = "House design views filtered by this builder.",
  className,
}: BuilderPerformancePanelProps) => {
  const [fromDate, setFromDate] = useState(getDefaultFromDate);
  const [toDate, setToDate] = useState(getDefaultToDate);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<BuilderPerformanceSummary>(defaultSummary);

  const loadPerformance = useCallback(async (forceRefresh: boolean = false) => {
    if (!enabled || !builderId) {
      setSummary(defaultSummary);
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
      const data = await adminApi.getBuilderPerformance(builderId, {
        from: fromDate,
        to: toDate,
        forceRefresh: forceRefresh ? "true" : undefined,
      });
      setSummary(data);
    } catch (error) {
      setSummary(defaultSummary);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load performance data."
      );
    } finally {
      setLoading(false);
    }
  }, [builderId, enabled, fromDate, toDate]);

  useEffect(() => {
    void loadPerformance();
  }, [loadPerformance]);

  const handleRefresh = useCallback(() => {
    void loadPerformance(true);
  }, [loadPerformance]);

  const stats = summary.stats ?? {};
  const viewsByLot = useMemo(() => summary.viewsByLot ?? [], [summary.viewsByLot]);
  const viewsByDesign = useMemo(
    () => summary.viewsByDesign ?? [],
    [summary.viewsByDesign]
  );
  const source = summary.source;
  const sourceUnavailable =
    source && source.available === false && (source.message || !source.configured);

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
            onClick={handleRefresh}
            label={loading ? "Refreshing..." : "Refresh"}
            variant="outline"
            className="h-8 text-xs"
            loading={loading}
            disabled={loading || !enabled || !builderId}
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
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
          disabled={loading || !enabled || !builderId}
        />
      </div>

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

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="m-0 text-xs uppercase tracking-wide text-slate-500">
            Total views
          </p>
          <p className="m-0 text-2xl font-semibold text-slate-900">
            {Number(stats.viewsTotal ?? 0)}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="m-0 text-xs uppercase tracking-wide text-slate-500">
            Last 7 days
          </p>
          <p className="m-0 text-2xl font-semibold text-slate-900">
            {Number(stats.viewsLast7Days ?? 0)}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="m-0 text-xs uppercase tracking-wide text-slate-500">
            Last 30 days
          </p>
          <p className="m-0 text-2xl font-semibold text-slate-900">
            {Number(stats.viewsLast30Days ?? 0)}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="m-0 text-xs uppercase tracking-wide text-slate-500">
            Unique lots
          </p>
          <p className="m-0 text-2xl font-semibold text-slate-900">
            {Number(stats.uniqueLotsViewed ?? 0)}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="m-0 text-xs uppercase tracking-wide text-slate-500">
            Unique designs
          </p>
          <p className="m-0 text-2xl font-semibold text-slate-900">
            {Number(stats.uniqueDesignsViewed ?? 0)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border overflow-hidden">
          <div className="border-b bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            Top Lots
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
            Top House Designs
          </div>
          {viewsByDesign.length === 0 ? (
            <p className="m-0 p-3 text-sm text-muted-foreground">
              No design view data in this range.
            </p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="px-3 py-2 border-b">Design</th>
                  <th className="px-3 py-2 border-b text-right">Views</th>
                </tr>
              </thead>
              <tbody>
                {viewsByDesign.slice(0, 10).map((row) => (
                  <tr key={`${String(row.designId ?? "")}-${String(row.designName ?? "")}`}>
                    <td className="px-3 py-2 border-b border-slate-100">
                      {resolveDesignLabel(row as Record<string, unknown>)}
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
      </div>
    </section>
  );
};

export default BuilderPerformancePanel;
