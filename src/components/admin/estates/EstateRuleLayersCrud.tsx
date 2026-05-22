import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { RecomputeSummaryCard } from "@/components/admin/rules/RecomputeSummaryCard";
import { RuleLayerEditor } from "@/components/admin/rules/RuleLayerEditor";
import { adminApi } from "@/lib/api/adminApi";
import { getAdminApiErrorMessage } from "@/lib/api/adminApiErrors";
import {
  BUILDER_ESTATE_APPROVAL_STATUSES,
  RULE_SET_STATUSES,
  type BuilderEstateApprovalRecord,
  type BuilderEstateApprovalStatus,
  type CreateBuilderEstateApprovalResponse,
  type CreateEstateRuleSetResponse,
  type EstateRuleSetRecord,
  type RecomputeEstateSummary,
  type RuleLayer,
  type RuleSetStatus,
} from "@/lib/api/adminModels";
import {
} from "@/lib/utils/dateTime";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export type EstateRuleLayersCrudMode = "ruleSet" | "builderApprovals";

type EstateRuleLayersCrudProps = {
  estateId: string;
  mode?: EstateRuleLayersCrudMode;
  estateName?: string;
};

type BuilderOption = {
  id: string;
  name?: string | null;
  email?: string | null;
  [key: string]: unknown;
};

type AdminInvitationResponse = {
  invitation?: {
    invitedUserId?: string;
    inviteRedeemUrl?: string;
    [key: string]: unknown;
  };
  user?: {
    id?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

const inviteRedirectUrl =
  typeof window !== "undefined"
    ? `${window.location.origin}/dashboard`
    : "/dashboard";

const toDateTimeLocalValue = (date: Date) => {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const toDateTimeLocalFromIso = (value?: string | null) => {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return toDateTimeLocalValue(parsed);
};

const parseRulesJson = (value: string): RuleLayer => {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Rules must be a JSON object.");
  }
  return parsed as RuleLayer;
};

const defaultRulesJson = `{
  "maxSiteCoverageRatio": 0.5,
  "maxStoreys": 2,
  "maxBuildingHeightM": 10.5
}`;

export const EstateRuleLayersCrud = ({
  estateId,
  mode = "ruleSet",
  estateName,
}: EstateRuleLayersCrudProps) => {
  const isRuleSetMode = mode === "ruleSet";

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastRecompute, setLastRecompute] =
    useState<RecomputeEstateSummary | null>(null);
  const [recomputeLoading, setRecomputeLoading] = useState(false);

  const [estateRuleSets, setEstateRuleSets] = useState<EstateRuleSetRecord[]>([]);
  const [showRuleSetManager, setShowRuleSetManager] = useState(false);
  const [ruleSetName, setRuleSetName] = useState("");
  const [ruleSetVersion, setRuleSetVersion] = useState("1");
  const [ruleSetStatus, setRuleSetStatus] = useState<RuleSetStatus>("DRAFT");
  const [ruleSetRulesJson, setRuleSetRulesJson] = useState(defaultRulesJson);
  const [ruleSetNotes, setRuleSetNotes] = useState("");
  const [ruleSetSaving, setRuleSetSaving] = useState(false);
  const [ruleSetErrorMessage, setRuleSetErrorMessage] = useState<string | null>(null);
  const [ruleSetSuccessMessage, setRuleSetSuccessMessage] = useState<string | null>(null);

  const [builderApprovals, setBuilderApprovals] = useState<BuilderEstateApprovalRecord[]>([]);
  const [builders, setBuilders] = useState<BuilderOption[]>([]);
  const [approvalFormMode, setApprovalFormMode] = useState<"add" | "manage" | null>(null);
  const [approvalBuilderId, setApprovalBuilderId] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<BuilderEstateApprovalStatus>("APPROVED");
  const [approvalEffectiveFrom, setApprovalEffectiveFrom] = useState(toDateTimeLocalValue(new Date()));
  const [approvalNotes, setApprovalNotes] = useState("");
  const [approvalSaving, setApprovalSaving] = useState(false);
  const [approvalAction, setApprovalAction] = useState<{
    builderId: string;
    type: "toggle" | "delete";
  } | null>(null);
  const [approvalErrorMessage, setApprovalErrorMessage] = useState<string | null>(null);
  const [approvalSuccessMessage, setApprovalSuccessMessage] = useState<string | null>(null);

  const isAddingBuilderApproval = approvalFormMode === "add";
  const isManagingBuilderApproval = approvalFormMode === "manage";

  const resetBuilderApprovalForm = useCallback(() => {
    setApprovalBuilderId("");
    setApprovalStatus("APPROVED");
    setApprovalEffectiveFrom(toDateTimeLocalValue(new Date()));
    setApprovalNotes("");
  }, []);

  const setBuilderApprovalFormFromRecord = useCallback(
    (approval: BuilderEstateApprovalRecord) => {
      setApprovalBuilderId(String(approval.builderId ?? ""));
      setApprovalStatus(approval.status ?? "APPROVED");
      setApprovalEffectiveFrom(toDateTimeLocalFromIso(approval.effectiveFrom));
      setApprovalNotes(approval.notes ?? "");
    },
    []
  );

  const openAddBuilderApproval = useCallback(() => {
    setApprovalFormMode((previous) => {
      if (previous === "add") {
        return null;
      }
      return "add";
    });
    setApprovalErrorMessage(null);
    setApprovalSuccessMessage(null);
    resetBuilderApprovalForm();
  }, [resetBuilderApprovalForm]);

  const openManageBuilderApproval = useCallback(
    (builderId?: string | null) => {
      if (builderApprovals.length === 0) {
        return;
      }
      const trimmedRequestedBuilderId = String(builderId ?? "").trim();
      const trimmedCurrentBuilderId = approvalBuilderId.trim();
      if (
        approvalFormMode === "manage" &&
        trimmedRequestedBuilderId &&
        trimmedRequestedBuilderId === trimmedCurrentBuilderId
      ) {
        setApprovalFormMode(null);
        return;
      }
      const targetBuilderId = String(
        trimmedRequestedBuilderId || approvalBuilderId || ""
      ).trim();
      const targetApproval =
        builderApprovals.find(
          (item) => String(item.builderId ?? "").trim() === targetBuilderId
        ) ?? builderApprovals[0];
      if (!targetApproval) {
        return;
      }
      setApprovalFormMode("manage");
      setApprovalErrorMessage(null);
      setApprovalSuccessMessage(null);
      setBuilderApprovalFormFromRecord(targetApproval);
    },
    [
      approvalBuilderId,
      approvalFormMode,
      builderApprovals,
      setBuilderApprovalFormFromRecord,
    ]
  );

  const primaryRuleSet = estateRuleSets[0] ?? null;
  const builderOptionsForAdd = builders
    .map((builder) => ({
      id: String(builder.id ?? "").trim(),
      name: String(builder.name ?? "").trim(),
    }))
    .filter((builder) => builder.id.length > 0);
  const builderOptionsForManage = builderApprovals
    .map((approval) => ({
      id: String(approval.builderId ?? "").trim(),
      name: String(approval.builder?.name ?? "").trim(),
    }))
    .filter((builder) => builder.id.length > 0);
  const selectedManagedBuilder =
    builderOptionsForManage.find(
      (builder) => builder.id === approvalBuilderId.trim()
    ) ?? null;

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (isRuleSetMode) {
        const ruleSets = await adminApi.getEstateRuleSets<EstateRuleSetRecord>(estateId);
        setEstateRuleSets(ruleSets);
      } else {
        const [approvals, builderRecords] = await Promise.all([
          adminApi.getEstateBuilderApprovals<BuilderEstateApprovalRecord>(estateId),
          adminApi.getBuilders<BuilderOption>(),
        ]);
        setBuilderApprovals(approvals);
        setBuilders(builderRecords);
      }
    } catch (error) {
      setErrorMessage(getAdminApiErrorMessage(error, "Failed to load data."));
    } finally {
      setLoading(false);
    }
  }, [estateId, isRuleSetMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!isRuleSetMode || showRuleSetManager) {
      return;
    }
    if (primaryRuleSet) {
      setRuleSetName(primaryRuleSet.name ?? "");
      setRuleSetVersion(primaryRuleSet.version != null ? String(primaryRuleSet.version) : "1");
      setRuleSetStatus(primaryRuleSet.status ?? "DRAFT");
      setRuleSetRulesJson(JSON.stringify(primaryRuleSet.rules ?? {}, null, 2));
      setRuleSetNotes(primaryRuleSet.notes ?? "");
    } else {
      setRuleSetName("");
      setRuleSetVersion("1");
      setRuleSetStatus("DRAFT");
      setRuleSetRulesJson(defaultRulesJson);
      setRuleSetNotes("");
    }
  }, [isRuleSetMode, primaryRuleSet, showRuleSetManager]);

  useEffect(() => {
    if (isRuleSetMode || approvalFormMode !== "manage") {
      return;
    }
    if (builderApprovals.length === 0) {
      setApprovalFormMode(null);
      resetBuilderApprovalForm();
      return;
    }
    const selectedBuilderApproval = builderApprovals.find(
      (item) => String(item.builderId ?? "").trim() === approvalBuilderId.trim()
    );
    if (!selectedBuilderApproval) {
      setBuilderApprovalFormFromRecord(builderApprovals[0]);
    }
  }, [
    approvalBuilderId,
    approvalFormMode,
    builderApprovals,
    isRuleSetMode,
    resetBuilderApprovalForm,
    setBuilderApprovalFormFromRecord,
  ]);

  const handleRecompute = async () => {
    setRecomputeLoading(true);
    try {
      const result = await adminApi.recomputeEstateDesignOnLot(estateId);
      setLastRecompute(result);
      await loadData();
    } finally {
      setRecomputeLoading(false);
    }
  };

  const handleSaveRuleSet = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRuleSetErrorMessage(null);
    setRuleSetSuccessMessage(null);
    setRuleSetSaving(true);
    try {
      const rules = parseRulesJson(ruleSetRulesJson);
      const payload = {
        name: ruleSetName.trim(),
        version: Number(ruleSetVersion),
        status: ruleSetStatus,
        rules,
        notes: ruleSetNotes.trim() || null,
      };
      const response = primaryRuleSet
        ? await adminApi.updateEstateRuleSet<CreateEstateRuleSetResponse>(estateId, primaryRuleSet.id, payload)
        : await adminApi.createEstateRuleSet<CreateEstateRuleSetResponse>(estateId, payload);
      setRuleSetSuccessMessage(primaryRuleSet ? "Estate rule set updated." : "Estate rule set created.");
      setLastRecompute(response.recompute ?? null);
      setShowRuleSetManager(false);
      await loadData();
    } catch (error) {
      setRuleSetErrorMessage(getAdminApiErrorMessage(error, "Failed to save estate rule set."));
    } finally {
      setRuleSetSaving(false);
    }
  };

  const handleSaveBuilderApproval = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setApprovalErrorMessage(null);
    setApprovalSuccessMessage(null);
    const trimmedBuilderId = approvalBuilderId.trim();
    if (!trimmedBuilderId) {
      setApprovalErrorMessage("Builder is required.");
      return;
    }
    const effectiveFromIso = approvalEffectiveFrom
      ? new Date(approvalEffectiveFrom).toISOString()
      : null;
    const effectiveToIso =
      approvalStatus === "REVOKED" ? new Date().toISOString() : null;
    setApprovalSaving(true);
    try {
      const response = isManagingBuilderApproval
        ? await adminApi.updateEstateBuilderApproval<CreateBuilderEstateApprovalResponse>(
            estateId,
            trimmedBuilderId,
            {
              status: approvalStatus,
              effectiveFrom: effectiveFromIso,
              effectiveTo: effectiveToIso,
              notes: approvalNotes.trim() || null,
            }
          )
        : await adminApi.createEstateBuilderApproval<CreateBuilderEstateApprovalResponse>(
            estateId,
            {
              builderId: trimmedBuilderId,
              status: approvalStatus,
              effectiveFrom: effectiveFromIso,
              effectiveTo: effectiveToIso,
              notes: approvalNotes.trim() || null,
            }
          );
      if (!isManagingBuilderApproval && approvalStatus === "APPROVED") {
        const invitedBuilder = builders.find(
          (builder) => String(builder.id ?? "").trim() === trimmedBuilderId
        );
        const inviteEmail =
          typeof invitedBuilder?.email === "string"
            ? invitedBuilder.email.trim()
            : "";
        const inviteDisplayName =
          typeof invitedBuilder?.name === "string" && invitedBuilder.name.trim()
            ? invitedBuilder.name.trim()
            : inviteEmail;
        const inviteEstateName =
          typeof estateName === "string" && estateName.trim()
            ? estateName.trim()
            : "your estate";

        if (inviteEmail) {
          try {
            const inviteResult = await adminApi.inviteUser<AdminInvitationResponse>(
              {
                email: inviteEmail,
                displayName: inviteDisplayName || inviteEmail,
                role: "USER",
                status: "ACTIVE",
                estateIds: [],
                redirectUrl: inviteRedirectUrl,
                inviteContext: {
                  scenario: "builder-estate",
                  estateName: inviteEstateName,
                },
              }
            );
            const invitedUserId =
              inviteResult.user?.id ??
              inviteResult.invitation?.invitedUserId ??
              null;
            if (invitedUserId) {
              await adminApi.addBuilderUsers(trimmedBuilderId, [invitedUserId]);
            }
          } catch (inviteError) {
            setApprovalErrorMessage(
              getAdminApiErrorMessage(
                inviteError,
                "Builder approval was saved, but invitation email failed."
              )
            );
          }
        } else {
          setApprovalErrorMessage(
            "Builder approval was saved, but invitation email was skipped because the builder has no email address."
          );
        }
      }
      setApprovalSuccessMessage(
        isManagingBuilderApproval
          ? "Builder approval updated."
          : "Builder added to this estate."
      );
      setLastRecompute(response.recompute ?? null);
      if (!isManagingBuilderApproval) {
        resetBuilderApprovalForm();
      }
      await loadData();
    } catch (error) {
      setApprovalErrorMessage(
        getAdminApiErrorMessage(error, "Failed to save builder approval.")
      );
    } finally {
      setApprovalSaving(false);
    }
  };

  const handleToggleBuilderApproval = async (
    approval: BuilderEstateApprovalRecord
  ) => {
    const trimmedBuilderId = String(approval.builderId ?? "").trim();
    if (!trimmedBuilderId) {
      return;
    }
    const nextStatus: BuilderEstateApprovalStatus =
      approval.status === "REVOKED" ? "APPROVED" : "REVOKED";
    const confirmed = window.confirm(
      nextStatus === "REVOKED"
        ? "Revoke this builder's approval for the estate?"
        : "Mark this builder as approved for the estate?"
    );
    if (!confirmed) {
      return;
    }
    setApprovalErrorMessage(null);
    setApprovalSuccessMessage(null);
    setApprovalAction({ builderId: trimmedBuilderId, type: "toggle" });
    try {
      const payload: {
        status: BuilderEstateApprovalStatus;
        effectiveFrom?: string | null;
        effectiveTo?: string | null;
      } = {
        status: nextStatus,
      };
      if (nextStatus === "REVOKED") {
        payload.effectiveTo = new Date().toISOString();
      } else {
        payload.effectiveFrom = new Date().toISOString();
        payload.effectiveTo = null;
      }
      const response =
        await adminApi.updateEstateBuilderApproval<CreateBuilderEstateApprovalResponse>(
          estateId,
          trimmedBuilderId,
          payload
        );
      if (nextStatus === "APPROVED") {
        const inviteEmail =
          typeof approval.builder?.email === "string"
            ? approval.builder.email.trim()
            : "";
        const inviteDisplayName =
          typeof approval.builder?.name === "string" &&
          approval.builder.name.trim()
            ? approval.builder.name.trim()
            : inviteEmail;
        const inviteEstateName =
          typeof estateName === "string" && estateName.trim()
            ? estateName.trim()
            : "your estate";

        if (inviteEmail) {
          try {
            const inviteResult = await adminApi.inviteUser<AdminInvitationResponse>(
              {
                email: inviteEmail,
                displayName: inviteDisplayName || inviteEmail,
                role: "USER",
                status: "ACTIVE",
                estateIds: [],
                redirectUrl: inviteRedirectUrl,
                inviteContext: {
                  scenario: "builder-estate",
                  estateName: inviteEstateName,
                },
              }
            );
            const invitedUserId =
              inviteResult.user?.id ??
              inviteResult.invitation?.invitedUserId ??
              null;
            if (invitedUserId) {
              await adminApi.addBuilderUsers(trimmedBuilderId, [invitedUserId]);
            }
          } catch (inviteError) {
            setApprovalErrorMessage(
              getAdminApiErrorMessage(
                inviteError,
                "Builder was marked approved, but invitation email failed."
              )
            );
          }
        } else {
          setApprovalErrorMessage(
            "Builder was marked approved, but invitation email was skipped because the builder has no email address."
          );
        }
      }
      setApprovalSuccessMessage(
        nextStatus === "REVOKED"
          ? "Builder approval revoked."
          : "Builder approval marked as approved."
      );
      setLastRecompute(response.recompute ?? null);
      await loadData();
    } catch (error) {
      setApprovalErrorMessage(
        getAdminApiErrorMessage(error, "Failed to update builder approval.")
      );
    } finally {
      setApprovalAction(null);
    }
  };

  const handleDeleteBuilderApproval = async (builderId: string) => {
    const trimmedBuilderId = builderId.trim();
    if (!trimmedBuilderId) {
      return;
    }
    const confirmed = window.confirm(
      "Delete this builder approval from the estate?"
    );
    if (!confirmed) {
      return;
    }
    setApprovalErrorMessage(null);
    setApprovalSuccessMessage(null);
    setApprovalAction({ builderId: trimmedBuilderId, type: "delete" });
    try {
      const response = await adminApi.deleteEstateBuilderApproval<{
        recompute?: RecomputeEstateSummary | null;
      }>(estateId, trimmedBuilderId);
      setApprovalSuccessMessage("Builder approval deleted.");
      setLastRecompute(response?.recompute ?? null);
      await loadData();
    } catch (error) {
      setApprovalErrorMessage(
        getAdminApiErrorMessage(error, "Failed to delete builder approval.")
      );
    } finally {
      setApprovalAction(null);
    }
  };

  if (isRuleSetMode) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold m-0">Estate Rule Set</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Overlay rules for this estate. Stricter estate constraints
              override state baselines.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={loadData} disabled={loading} loading={loading} variant="outline" label="Refresh" />
            <Button
              onClick={() => setShowRuleSetManager((prev) => !prev)}
              variant="outline"
              label={showRuleSetManager ? "Close" : primaryRuleSet ? "Manage rule set" : "Create rule set"}
            />
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-600">{errorMessage}</div>
        )}

        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 mb-4">
          <p className="text-sm font-medium text-slate-700 m-0">
            Current: {primaryRuleSet ? `${primaryRuleSet.name ?? "Unnamed"} v${primaryRuleSet.version ?? "--"}` : "No estate rule set configured."}
          </p>
          {estateRuleSets.length > 1 && (
            <p className="text-xs text-amber-700 mt-2 mb-0">
              Multiple estate rule sets detected ({estateRuleSets.length}). This UI manages the first item only.
            </p>
          )}
        </div>

        {showRuleSetManager && (
          <form onSubmit={handleSaveRuleSet} className="grid gap-4 mb-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2 md:col-span-2">
                <span className="text-sm font-medium">Name *</span>
                <Input value={ruleSetName} onChange={(event) => setRuleSetName(event.target.value)} className="w-full" required />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Version *</span>
                <Input value={ruleSetVersion} onChange={(event) => setRuleSetVersion(event.target.value)} type="number" min="1" className="w-full" required />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <span className="text-sm font-medium">Status *</span>
                <select
                  value={ruleSetStatus}
                  onChange={(event) => setRuleSetStatus(event.target.value as RuleSetStatus)}
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {RULE_SET_STATUSES.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Notes</span>
                <Input value={ruleSetNotes} onChange={(event) => setRuleSetNotes(event.target.value)} className="w-full" />
              </div>
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Rules JSON *</span>
              <p className="m-0 text-xs text-slate-500">
                Use this layer for estate-specific overrides only. If
                <code className="mx-1 rounded bg-slate-100 px-1 py-0.5">
                  requiresArchitecturalReview
                </code>
                is true, matching results are marked as manual review.
              </p>
              <RuleLayerEditor value={ruleSetRulesJson} onChange={setRuleSetRulesJson} idPrefix="estate-rule-set-rules" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={ruleSetSaving} loading={ruleSetSaving} label={primaryRuleSet ? "Save rule set" : "Create rule set"} />
              {ruleSetErrorMessage && <span className="text-sm text-destructive">{ruleSetErrorMessage}</span>}
              {ruleSetSuccessMessage && <span className="text-sm text-emerald-600">{ruleSetSuccessMessage}</span>}
            </div>
          </form>
        )}

        <div className="border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold m-0">Rule Layers + Matching</h3>
            <Button onClick={handleRecompute} disabled={recomputeLoading} loading={recomputeLoading} label="Recompute designs" className="h-8 px-2 text-xs" />
          </div>
          {lastRecompute && <RecomputeSummaryCard summary={lastRecompute} title="Last recompute summary" />}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold m-0">Builder Approvals</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage approved builders for this estate and keep internal notes for
            estate staff.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={loadData}
            disabled={loading}
            loading={loading}
            variant="outline"
            label="Refresh"
          />
          <Button
            onClick={openAddBuilderApproval}
            variant={isAddingBuilderApproval ? "outline" : "primary"}
            label={isAddingBuilderApproval ? "Close add builder" : "Add builder"}
          />
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-600">{errorMessage}</div>
      )}

      {approvalFormMode && (
        <form onSubmit={handleSaveBuilderApproval} className="grid gap-4 mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div>
            <h3 className="text-base font-semibold m-0">
              {isManagingBuilderApproval ? "Manage builder approval" : "Add builder approval"}
            </h3>
            <p className="text-xs text-slate-600 mt-1 mb-0">
              Internal notes are estate-only and are never shown to builders.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="grid gap-2 xl:col-span-2">
              <span className="text-sm font-medium">
                {isManagingBuilderApproval ? "Builder" : "Builder *"}
              </span>
              {isManagingBuilderApproval ? (
                <>
                  <div className="h-10 rounded-md border border-input bg-white px-3 text-sm shadow-sm flex items-center">
                    {selectedManagedBuilder
                      ? selectedManagedBuilder.name
                        ? `${selectedManagedBuilder.name} (${selectedManagedBuilder.id})`
                        : selectedManagedBuilder.id
                      : approvalBuilderId || "--"}
                  </div>
                </>
              ) : (
                <select
                  value={approvalBuilderId}
                  onChange={(event) => setApprovalBuilderId(event.target.value)}
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  required
                >
                  <option value="">Select builder</option>
                  {builderOptionsForAdd.map((builderOption) => (
                    <option key={builderOption.id} value={builderOption.id}>
                      {builderOption.name
                        ? `${builderOption.name} (${builderOption.id})`
                        : builderOption.id}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Status *</span>
              <select
                value={approvalStatus}
                onChange={(event) =>
                  setApprovalStatus(
                    event.target.value as BuilderEstateApprovalStatus
                  )
                }
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {BUILDER_ESTATE_APPROVAL_STATUSES.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Effective From</span>
              <Input
                value={approvalEffectiveFrom}
                onChange={(event) => setApprovalEffectiveFrom(event.target.value)}
                type="datetime-local"
                className="w-full"
              />
            </div>
            <div className="grid gap-2 md:col-span-2 xl:col-span-4">
              <span className="text-sm font-medium">Internal Notes</span>
              <Input
                value={approvalNotes}
                onChange={(event) => setApprovalNotes(event.target.value)}
                className="w-full"
                placeholder="Notes about this builder relationship for estate team members."
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={approvalSaving}
              loading={approvalSaving}
              label={isManagingBuilderApproval ? "Save builder" : "Add builder"}
            />
            <Button
              type="button"
              variant="outline"
              label="Cancel"
              onClick={() => setApprovalFormMode(null)}
              disabled={approvalSaving}
            />
            {approvalErrorMessage && <span className="text-sm text-destructive">{approvalErrorMessage}</span>}
            {approvalSuccessMessage && <span className="text-sm text-emerald-600">{approvalSuccessMessage}</span>}
          </div>
        </form>
      )}

      {lastRecompute && <RecomputeSummaryCard summary={lastRecompute} title="Last recompute summary" />}

      <div className="overflow-auto border rounded-lg mt-4">
        <table className="w-full border-collapse min-w-[520px]">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="p-3 border-b font-medium text-sm text-slate-700">Builder</th>
              <th className="p-3 border-b font-medium text-sm text-slate-700">Status</th>
              <th className="p-3 border-b font-medium text-sm text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {builderApprovals.map((item) => (
              <tr key={item.id}>
                <td className="p-3 border-b border-slate-100 text-sm">{item.builder?.name ?? "--"}</td>
                <td className="p-3 border-b border-slate-100 text-sm">{item.status ?? "--"}</td>
                <td className="p-3 border-b border-slate-100 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      label={
                        isManagingBuilderApproval &&
                        approvalBuilderId.trim() ===
                          String(item.builderId ?? "").trim()
                          ? "Close"
                          : "Manage"
                      }
                      onClick={() =>
                        openManageBuilderApproval(String(item.builderId ?? ""))
                      }
                      disabled={
                        approvalSaving ||
                        (approvalAction?.type === "toggle" &&
                          approvalAction.builderId === String(item.builderId ?? "")) ||
                        (approvalAction?.type === "delete" &&
                          approvalAction.builderId === String(item.builderId ?? ""))
                      }
                    />
                    <Button
                      type="button"
                      variant={item.status === "REVOKED" ? "outline" : "ghost"}
                      className="h-7 px-2 text-xs"
                      label={item.status === "REVOKED" ? "Mark approved" : "Mark revoked"}
                      onClick={() => handleToggleBuilderApproval(item)}
                      disabled={
                        approvalSaving ||
                        (approvalAction?.type === "toggle" &&
                          approvalAction.builderId === String(item.builderId ?? "")) ||
                        (approvalAction?.type === "delete" &&
                          approvalAction.builderId === String(item.builderId ?? ""))
                      }
                      loading={
                        approvalAction?.type === "toggle" &&
                        approvalAction.builderId === String(item.builderId ?? "")
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-destructive hover:bg-red-50 hover:text-destructive"
                      label="Delete"
                      leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={() =>
                        handleDeleteBuilderApproval(String(item.builderId ?? ""))
                      }
                      disabled={
                        approvalSaving ||
                        (approvalAction?.type === "toggle" &&
                          approvalAction.builderId === String(item.builderId ?? "")) ||
                        (approvalAction?.type === "delete" &&
                          approvalAction.builderId === String(item.builderId ?? ""))
                      }
                      loading={
                        approvalAction?.type === "delete" &&
                        approvalAction.builderId === String(item.builderId ?? "")
                      }
                    />
                  </div>
                </td>
              </tr>
            ))}
            {builderApprovals.length === 0 && (
              <tr>
                <td colSpan={3} className="p-4 text-center text-sm text-muted-foreground">No approved builders yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default EstateRuleLayersCrud;
