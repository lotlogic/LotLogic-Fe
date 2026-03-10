import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BuilderTable } from "@/components/admin/builders/BuilderTable";
import type { BuilderRecord } from "@/components/admin/builders/types";
import { EstateCreateForm } from "@/components/admin/estates/EstateCreateForm";
import { EstateTable } from "@/components/admin/estates/EstateTable";
import type {
  EstateCreatePayload,
  EstateRecord,
} from "@/components/admin/estates/types";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/api/adminApi";
import { useAdminSession } from "@/lib/admin/adminSession";
import { getAdminApiErrorMessage } from "@/lib/api/adminApiErrors";
import {
  resolveDashboardAccess,
  type DashboardAccess,
  type DashboardAccessResolution,
} from "@/lib/dashboard/dashboardAccess";

const DashboardPage = () => {
  const navigate = useNavigate();
  const {
    whoAmI,
    loading: sessionLoading,
    errorMessage: sessionErrorMessage,
    reloadWhoAmI,
  } = useAdminSession();

  const [access, setAccess] = useState<DashboardAccess>({
    builderIds: [],
    estateIds: [],
  });
  const [hasAssignments, setHasAssignments] = useState(false);

  const [builders, setBuilders] = useState<BuilderRecord[]>([]);
  const [buildersLoading, setBuildersLoading] = useState(false);
  const [buildersErrorMessage, setBuildersErrorMessage] = useState<
    string | null
  >(null);

  const [estates, setEstates] = useState<EstateRecord[]>([]);
  const [estatesLoading, setEstatesLoading] = useState(false);
  const [estatesErrorMessage, setEstatesErrorMessage] = useState<string | null>(
    null
  );
  const [showEstateForm, setShowEstateForm] = useState(false);

  useEffect(() => {
    const resolved: DashboardAccessResolution = resolveDashboardAccess(whoAmI);
    setAccess(resolved.access);
    setHasAssignments(resolved.hasAssignments);
  }, [whoAmI]);

  const loadBuilders = useCallback(
    async (ids?: string[]) => {
      const targetIds = ids ?? access.builderIds;
      if (!hasAssignments || targetIds.length === 0) {
        setBuilders([]);
        setBuildersLoading(false);
        setBuildersErrorMessage(null);
        return;
      }
      setBuildersLoading(true);
      setBuildersErrorMessage(null);
      try {
        const data = await adminApi.getBuilders<BuilderRecord>();
        const scoped = data.filter((builder) => targetIds.includes(builder.id));
        setBuilders(scoped);
      } catch (error) {
        setBuildersErrorMessage(
          getAdminApiErrorMessage(error, "Failed to load builders.")
        );
      } finally {
        setBuildersLoading(false);
      }
    },
    [access.builderIds, hasAssignments]
  );

  const loadEstates = useCallback(
    async (ids?: string[]) => {
      const targetIds = ids ?? access.estateIds;
      if (!hasAssignments || targetIds.length === 0) {
        setEstates([]);
        setEstatesLoading(false);
        setEstatesErrorMessage(null);
        return;
      }
      setEstatesLoading(true);
      setEstatesErrorMessage(null);
      try {
        const data = await adminApi.getEstates<EstateRecord>();
        const scoped = data.filter((estate) => targetIds.includes(estate.id));
        setEstates(scoped);
      } catch (error) {
        setEstatesErrorMessage(
          getAdminApiErrorMessage(error, "Failed to load estates.")
        );
      } finally {
        setEstatesLoading(false);
      }
    },
    [access.estateIds, hasAssignments]
  );

  useEffect(() => {
    loadBuilders();
  }, [loadBuilders]);

  useEffect(() => {
    loadEstates();
  }, [loadEstates]);

  const accessHint = useMemo(() => {
    if (!hasAssignments) {
      return "Assignments are not yet available in whoami. Ask an admin to check your access.";
    }
    if (access.builderIds.length === 0 && access.estateIds.length === 0) {
      return "No assignments were detected for your account.";
    }
    return null;
  }, [access.builderIds.length, access.estateIds.length, hasAssignments]);

  const hasBuilderAssignments = hasAssignments && access.builderIds.length > 0;
  const hasEstateAssignments = hasAssignments && access.estateIds.length > 0;
  const canCreateEstate = hasEstateAssignments;

  const handleCreateEstate = useCallback(
    async (payload: EstateCreatePayload) => {
      if (!canCreateEstate) {
        throw new Error(
          "You need at least one assigned estate before creating another."
        );
      }
      try {
        const created = await adminApi.createEstate<EstateRecord>(payload);
        await reloadWhoAmI();
        return created;
      } catch (error) {
        throw new Error(
          getAdminApiErrorMessage(error, "Failed to create estate.")
        );
      }
    },
    [canCreateEstate, reloadWhoAmI]
  );

  useEffect(() => {
    if (!canCreateEstate && showEstateForm) {
      setShowEstateForm(false);
    }
  }, [canCreateEstate, showEstateForm]);

  if (sessionLoading) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Loading your access...">
        <p className="text-muted-foreground">Checking access...</p>
      </DashboardLayout>
    );
  }

  if (sessionErrorMessage) {
    return (
      <DashboardLayout title="Dashboard" subtitle="We couldn't load your session.">
        <p className="text-destructive">{sessionErrorMessage}</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Manage the builders and estates assigned to you."
    >
      {accessHint && (
        <div className="mb-6 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          {accessHint}
        </div>
      )}
      {!hasAssignments && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Need access? Contact your administrator to assign builders or estates
          to your account.
        </div>
      )}

      {hasBuilderAssignments && (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-semibold">Builders</h2>
              <p className="text-sm text-muted-foreground">
                Manage the builders you are assigned to.
              </p>
            </div>
          </div>

          <BuilderTable
            builders={builders}
            loading={buildersLoading}
            errorMessage={buildersErrorMessage}
            onOpenBuilder={(builderId) =>
              navigate(`/dashboard/builders/${builderId}`)
            }
            actionLabel="Manage"
          />
        </section>
      )}

      {hasEstateAssignments && (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-semibold">Estates</h2>
              <p className="text-sm text-muted-foreground">
                Manage the estates you are assigned to.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canCreateEstate && (
                <Button
                  onClick={() => setShowEstateForm((prev) => !prev)}
                  label={showEstateForm ? "Hide form" : "Add estate"}
                />
              )}
            </div>
          </div>

          {showEstateForm && canCreateEstate && (
            <EstateCreateForm
              onCreate={handleCreateEstate}
              onOpenCreated={(estateId) =>
                navigate(`/dashboard/estates/${estateId}`)
              }
              openLabel="Open in dashboard"
            />
          )}

          <EstateTable
            estates={estates}
            loading={estatesLoading}
            errorMessage={estatesErrorMessage}
            onOpenEstate={(estateId) =>
              navigate(`/dashboard/estates/${estateId}`)
            }
            actionLabel="Manage"
          />
        </section>
      )}
    </DashboardLayout>
  );
};

export default DashboardPage;
