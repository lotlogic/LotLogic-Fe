import type {
  RecomputeEstateSummary,
  RecomputeJurisdictionSummary,
  RecomputeLotSummary,
} from "@/lib/api/adminModels";

type RecomputeSummaryCardProps = {
  summary: unknown;
  title?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const asNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const asString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : null;

const formatMetricValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") {
    return "--";
  }
  if (typeof value === "number" || typeof value === "string") {
    return String(value);
  }
  return JSON.stringify(value);
};

const hasJurisdictionShape = (
  value: Record<string, unknown>
): value is RecomputeJurisdictionSummary =>
  typeof value.jurisdiction === "string" && Array.isArray(value.summaries);

const hasEstateShape = (
  value: Record<string, unknown>
): value is RecomputeEstateSummary =>
  typeof value.estateId === "string" && typeof value.lotsProcessed === "number";

const hasLotShape = (value: Record<string, unknown>): value is RecomputeLotSummary =>
  typeof value.lotId === "string" && typeof value.processed === "number";

const SummaryMetric = ({ label, value }: { label: string; value: unknown }) => (
  <div className="rounded border border-emerald-100 bg-white p-2">
    <p className="text-xs uppercase tracking-wide text-emerald-700 m-0">{label}</p>
    <p className="text-base font-semibold text-emerald-900 m-0">
      {formatMetricValue(value)}
    </p>
  </div>
);

export const RecomputeSummaryCard = ({
  summary,
  title = "Recompute summary",
}: RecomputeSummaryCardProps) => {
  if (!summary || !isRecord(summary)) {
    return null;
  }

  if (hasJurisdictionShape(summary)) {
    const jurisdiction = asString(summary.jurisdiction) ?? "--";
    const estatesProcessed = asNumber(summary.estatesProcessed);
    const summaries = Array.isArray(summary.summaries)
      ? (summary.summaries.filter(isRecord) as RecomputeEstateSummary[])
      : [];
    return (
      <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3">
        <p className="text-sm font-medium text-emerald-700 mb-2">{title}</p>
        <div className="grid gap-2 md:grid-cols-2 mb-3">
          <SummaryMetric label="Jurisdiction" value={jurisdiction} />
          <SummaryMetric label="Estates Processed" value={estatesProcessed ?? "--"} />
        </div>
        {summaries.length > 0 ? (
          <div className="overflow-auto border rounded-md bg-white">
            <table className="w-full border-collapse min-w-[620px]">
              <thead>
                <tr className="bg-emerald-100 text-left">
                  <th className="p-2 border-b text-xs font-medium text-emerald-800">
                    Estate ID
                  </th>
                  <th className="p-2 border-b text-xs font-medium text-emerald-800">
                    Lots
                  </th>
                  <th className="p-2 border-b text-xs font-medium text-emerald-800">
                    Combinations
                  </th>
                  <th className="p-2 border-b text-xs font-medium text-emerald-800">
                    Pass
                  </th>
                  <th className="p-2 border-b text-xs font-medium text-emerald-800">
                    Fail
                  </th>
                  <th className="p-2 border-b text-xs font-medium text-emerald-800">
                    Manual Review
                  </th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((item, index) => (
                  <tr key={`${item.estateId ?? "estate"}-${index}`}>
                    <td className="p-2 border-b border-slate-100 text-xs font-mono">
                      {item.estateId ?? "--"}
                    </td>
                    <td className="p-2 border-b border-slate-100 text-xs">
                      {item.lotsProcessed ?? "--"}
                    </td>
                    <td className="p-2 border-b border-slate-100 text-xs">
                      {item.combinationsProcessed ?? "--"}
                    </td>
                    <td className="p-2 border-b border-slate-100 text-xs">
                      {item.pass ?? "--"}
                    </td>
                    <td className="p-2 border-b border-slate-100 text-xs">
                      {item.fail ?? "--"}
                    </td>
                    <td className="p-2 border-b border-slate-100 text-xs">
                      {item.manualReview ?? "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <pre className="text-xs text-emerald-800 whitespace-pre-wrap">
            {JSON.stringify(summary, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  if (hasEstateShape(summary) || hasLotShape(summary)) {
    const idLabel = hasEstateShape(summary) ? "Estate ID" : "Lot ID";
    const idValue = hasEstateShape(summary) ? summary.estateId : summary.lotId;
    const lotsProcessed = hasEstateShape(summary)
      ? summary.lotsProcessed
      : summary.processed;
    const combinationsProcessed = hasEstateShape(summary)
      ? summary.combinationsProcessed
      : null;
    return (
      <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3">
        <p className="text-sm font-medium text-emerald-700 mb-2">{title}</p>
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <SummaryMetric label={idLabel} value={idValue ?? "--"} />
          <SummaryMetric label="Lots Processed" value={lotsProcessed ?? "--"} />
          {combinationsProcessed !== null && (
            <SummaryMetric
              label="Combinations"
              value={combinationsProcessed ?? "--"}
            />
          )}
          <SummaryMetric label="Pass" value={summary.pass ?? "--"} />
          <SummaryMetric label="Fail" value={summary.fail ?? "--"} />
          <SummaryMetric
            label="Manual Review"
            value={summary.manualReview ?? "--"}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3">
      <p className="text-sm font-medium text-emerald-700 mb-2">{title}</p>
      <pre className="text-xs text-emerald-800 whitespace-pre-wrap">
        {JSON.stringify(summary, null, 2)}
      </pre>
    </div>
  );
};

export default RecomputeSummaryCard;
