import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "@/lib/api/adminApi";
import { getAdminApiErrorMessage } from "@/lib/api/adminApiErrors";
import { RecomputeSummaryCard } from "@/components/admin/rules/RecomputeSummaryCard";
import { RuleLayerEditor } from "@/components/admin/rules/RuleLayerEditor";
import {
  JURISDICTIONS,
  RULE_SET_STATUSES,
  type CreateStateRuleSetResponse,
  type Jurisdiction,
  type RecomputeJurisdictionSummary,
  type RuleSetStatus,
  type RuleLayer,
  type StateRuleSetRecord,
} from "@/lib/api/adminModels";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const toDateTimeLocalValue = (date: Date) => {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const parseRulesJson = (value: string): RuleLayer => {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Rules must be a JSON object.");
  }
  return parsed as RuleLayer;
};

type StatusFilter = RuleSetStatus | "ALL";

export const StateRuleSetsCrud = () => {
  const [jurisdictionFilter, setJurisdictionFilter] =
    useState<Jurisdiction>("NSW");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [records, setRecords] = useState<StateRuleSetRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [version, setVersion] = useState("1");
  const [status, setStatus] = useState<RuleSetStatus>("DRAFT");
  const [effectiveFrom, setEffectiveFrom] = useState(
    toDateTimeLocalValue(new Date())
  );
  const [rulesJson, setRulesJson] = useState(
    `{
  "minFrontSetbackM": 6,
  "minRearSetbackM": 3,
  "minSideSetbackM": 0.9,
  "maxSiteCoverageRatio": 0.5
}`
  );
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(
    null
  );
  const [editingRuleSetId, setEditingRuleSetId] = useState<string | null>(null);
  const [deletingRuleSetId, setDeletingRuleSetId] = useState<string | null>(
    null
  );
  const [lastRecompute, setLastRecompute] =
    useState<RecomputeJurisdictionSummary | null>(null);

  const resetForm = useCallback(() => {
    setEditingRuleSetId(null);
    setName("");
    setVersion("1");
    setStatus("DRAFT");
    setEffectiveFrom(toDateTimeLocalValue(new Date()));
    setRulesJson(
      `{
  "minFrontSetbackM": 6,
  "minRearSetbackM": 3,
  "minSideSetbackM": 0.9,
  "maxSiteCoverageRatio": 0.5
}`
    );
    setSourceUrl("");
    setNotes("");
    setSaveErrorMessage(null);
    setSaveSuccessMessage(null);
  }, []);

  const loadRuleSets = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const params: Record<string, string> = { jurisdiction: jurisdictionFilter };
      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }
      const data = await adminApi.getStateRuleSets<StateRuleSetRecord>(params);
      setRecords(data);
    } catch (error) {
      setRecords([]);
      setErrorMessage(
        getAdminApiErrorMessage(error, "Failed to load state rule sets.")
      );
    } finally {
      setLoading(false);
    }
  }, [jurisdictionFilter, statusFilter]);

  useEffect(() => {
    loadRuleSets();
  }, [loadRuleSets]);

  const sortedRecords = useMemo(
    () =>
      [...records].sort((a, b) => {
        const versionA = a.version ?? 0;
        const versionB = b.version ?? 0;
        if (versionA !== versionB) {
          return versionB - versionA;
        }
        const aTime = a.updatedAt ?? a.createdAt ?? "";
        const bTime = b.updatedAt ?? b.createdAt ?? "";
        return bTime.localeCompare(aTime);
      }),
    [records]
  );

  const handleEdit = (record: StateRuleSetRecord) => {
    setEditingRuleSetId(record.id);
    setJurisdictionFilter(record.jurisdiction ?? "NSW");
    setName(record.name ?? "");
    setVersion(record.version != null ? String(record.version) : "1");
    setStatus(record.status ?? "DRAFT");
    setEffectiveFrom(
      record.effectiveFrom
        ? toDateTimeLocalValue(new Date(record.effectiveFrom))
        : toDateTimeLocalValue(new Date())
    );
    setRulesJson(JSON.stringify(record.rules ?? {}, null, 2));
    setSourceUrl(record.sourceUrl ?? "");
    setNotes(record.notes ?? "");
    setSaveErrorMessage(null);
    setSaveSuccessMessage(null);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveErrorMessage(null);
    setSaveSuccessMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setSaveErrorMessage("Name is required.");
      return;
    }

    const parsedVersion = Number(version);
    if (!Number.isFinite(parsedVersion) || parsedVersion <= 0) {
      setSaveErrorMessage("Version must be a positive number.");
      return;
    }

    if (!effectiveFrom.trim()) {
      setSaveErrorMessage("Effective from date is required.");
      return;
    }

    const effectiveFromDate = new Date(effectiveFrom);
    if (Number.isNaN(effectiveFromDate.getTime())) {
      setSaveErrorMessage("Effective from date is invalid.");
      return;
    }
    const effectiveFromIso = effectiveFromDate.toISOString();

    let parsedRules: RuleLayer;
    try {
      parsedRules = parseRulesJson(rulesJson);
    } catch (error) {
      setSaveErrorMessage(
        error instanceof Error ? error.message : "Rules JSON is invalid."
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        jurisdiction: jurisdictionFilter,
        name: trimmedName,
        version: parsedVersion,
        status,
        effectiveFrom: effectiveFromIso,
        rules: parsedRules,
        sourceUrl: sourceUrl.trim() || null,
        notes: notes.trim() || null,
      };
      const response = editingRuleSetId
        ? await adminApi.updateStateRuleSet<CreateStateRuleSetResponse>(
            editingRuleSetId,
            payload
          )
        : await adminApi.createStateRuleSet<CreateStateRuleSetResponse>(payload);
      setSaveSuccessMessage(
        editingRuleSetId ? "State rule set updated." : "State rule set created."
      );
      setLastRecompute(response.recompute ?? null);
      if (editingRuleSetId) {
        setEditingRuleSetId(null);
      } else {
        setName("");
        setVersion(String(parsedVersion + 1));
        setStatus("DRAFT");
      }
      await loadRuleSets();
    } catch (error) {
      setSaveErrorMessage(
        getAdminApiErrorMessage(
          error,
          editingRuleSetId
            ? "Failed to update state rule set."
            : "Failed to create state rule set."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record: StateRuleSetRecord) => {
    const confirmed = window.confirm(
      `Delete state rule set "${record.name ?? record.id}"?`
    );
    if (!confirmed) {
      return;
    }
    setDeletingRuleSetId(record.id);
    setSaveErrorMessage(null);
    setSaveSuccessMessage(null);
    try {
      const response = await adminApi.deleteStateRuleSet<{
        recompute?: RecomputeJurisdictionSummary;
      }>(record.id);
      if (response?.recompute) {
        setLastRecompute(response.recompute);
      }
      if (editingRuleSetId === record.id) {
        resetForm();
      }
      setSaveSuccessMessage("State rule set deleted.");
      await loadRuleSets();
    } catch (error) {
      setSaveErrorMessage(
        getAdminApiErrorMessage(error, "Failed to delete state rule set.")
      );
    } finally {
      setDeletingRuleSetId(null);
    }
  };

  return (
    <section className="grid gap-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold m-0">State Rule Sets</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={loadRuleSets}
              disabled={loading}
              loading={loading}
              label="Refresh"
            />
            {editingRuleSetId && (
              <Button
                onClick={resetForm}
                variant="outline"
                label="Cancel edit"
              />
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-4">
          <div className="grid gap-2">
            <span className="text-sm font-medium">Jurisdiction</span>
            <select
              value={jurisdictionFilter}
              onChange={(event) =>
                setJurisdictionFilter(event.target.value as Jurisdiction)
              }
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {JURISDICTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Status filter</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">ALL</option>
              {RULE_SET_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
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
                  Name
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Version
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Status
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Effective From
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Source
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  ID
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-4 text-center text-sm text-muted-foreground"
                  >
                    Loading state rule sets...
                  </td>
                </tr>
              )}
              {!loading &&
                sortedRecords.map((item) => (
                  <tr key={item.id}>
                    <td className="p-3 border-b border-slate-100 text-sm">
                      {item.name ?? "--"}
                    </td>
                    <td className="p-3 border-b border-slate-100 text-sm">
                      {item.version ?? "--"}
                    </td>
                    <td className="p-3 border-b border-slate-100 text-sm">
                      {item.status ?? "--"}
                    </td>
                    <td className="p-3 border-b border-slate-100 text-sm">
                      {item.effectiveFrom ?? "--"}
                    </td>
                    <td className="p-3 border-b border-slate-100 text-sm">
                      {item.sourceUrl ? (
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-700 hover:underline"
                        >
                          Open source
                        </a>
                      ) : (
                        "--"
                      )}
                    </td>
                    <td className="p-3 border-b border-slate-100 text-xs font-mono text-slate-500">
                      {item.id}
                    </td>
                    <td className="p-3 border-b border-slate-100 text-sm">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          onClick={() => handleEdit(item)}
                          variant="ghost"
                          className="h-8 px-2 text-xs"
                          label="Edit"
                          disabled={deletingRuleSetId === item.id}
                        />
                        <Button
                          onClick={() => handleDelete(item)}
                          variant="ghost"
                          className="h-8 px-2 text-xs text-destructive hover:bg-red-50 hover:text-destructive"
                          label="Delete"
                          disabled={deletingRuleSetId === item.id}
                          loading={deletingRuleSetId === item.id}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              {!loading && sortedRecords.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-4 text-center text-sm text-muted-foreground"
                  >
                    No state rule sets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 m-0">
          {editingRuleSetId ? "Edit State Rule Set" : "Create State Rule Set"}
        </h3>
        <form onSubmit={handleSave} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="grid gap-2">
              <span className="text-sm font-medium">Jurisdiction</span>
              <select
                value={jurisdictionFilter}
                onChange={(event) =>
                  setJurisdictionFilter(event.target.value as Jurisdiction)
                }
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {JURISDICTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Name *</span>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="NSW baseline v2"
                className="w-full"
                required
              />
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Version *</span>
              <Input
                value={version}
                onChange={(event) => setVersion(event.target.value)}
                type="number"
                step="1"
                min="1"
                className="w-full"
                required
              />
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Status *</span>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as RuleSetStatus)
                }
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {RULE_SET_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Effective From *</span>
              <Input
                value={effectiveFrom}
                onChange={(event) => setEffectiveFrom(event.target.value)}
                type="datetime-local"
                className="w-full"
                required
              />
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Source URL</span>
              <Input
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="https://..."
                className="w-full"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Rules JSON *</span>
            <RuleLayerEditor
              value={rulesJson}
              onChange={setRulesJson}
              idPrefix="state-rule-set-rules"
            />
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={saving}
              loading={saving}
              label={
                editingRuleSetId
                  ? "Update state rule set"
                  : "Create state rule set"
              }
            />
            {saveErrorMessage && (
              <span className="text-sm text-destructive">{saveErrorMessage}</span>
            )}
            {saveSuccessMessage && (
              <span className="text-sm text-emerald-600">
                {saveSuccessMessage}
              </span>
            )}
          </div>
          <RecomputeSummaryCard summary={lastRecompute} />
        </form>
      </div>
    </section>
  );
};

export default StateRuleSetsCrud;
