import { useCallback, useEffect, useMemo, useState } from "react";
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

const AdminDesignsOnLotsPage = () => {
  const [records, setRecords] = useState<DesignOnLotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    "MANUAL_REVIEW"
  );
  const [lotIdFilter, setLotIdFilter] = useState("");

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
                Reasons
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={5}
                  className="p-4 text-center text-sm text-muted-foreground"
                >
                  Loading plan-lot matches...
                </td>
              </tr>
            )}
            {!loading &&
              filteredRecords.map((record) => (
                <tr key={record.id}>
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
                    {Array.isArray(record.reasons) && record.reasons.length > 0
                      ? record.reasons.join(", ")
                      : "--"}
                  </td>
                </tr>
              ))}
            {!loading && filteredRecords.length === 0 && (
              <tr>
                <td
                  colSpan={5}
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
