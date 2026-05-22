import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import {
  FacadeCrud,
  type FacadePayload,
  type FacadeRecord,
} from "@/components/admin/facades/FacadeCrud";
import type { FloorPlanRecord } from "@/components/admin/floorplans/FloorPlanCrud";
import { adminApi } from "@/lib/api/adminApi";
import { adminAuth } from "@/lib/auth/adminAuth";
import { Button } from "@/components/ui/Button";

const AdminFacadesPage = () => {
  const [floorPlans, setFloorPlans] = useState<FloorPlanRecord[]>([]);
  const [floorPlansError, setFloorPlansError] = useState<string | null>(null);

  const loadFloorPlans = useCallback(async () => {
    setFloorPlansError(null);
    try {
      const data = await adminApi.getFloorPlans<FloorPlanRecord>();
      setFloorPlans(data);
    } catch (error) {
      setFloorPlansError(
        error instanceof Error ? error.message : "Failed to load floor plans."
      );
    }
  }, []);

  useEffect(() => {
    loadFloorPlans();
  }, [loadFloorPlans]);

  const floorPlanOptions = useMemo(
    () =>
      floorPlans.map((plan) => {
        const name =
          typeof plan.name === "string" && plan.name.trim()
            ? plan.name.trim()
            : "Untitled";
        return { id: plan.id, label: `${name} (${plan.id})` };
      }),
    [floorPlans]
  );

  const loadFacades = useCallback(
    async (floorPlanId: string) => adminApi.getFacades<FacadeRecord>(floorPlanId),
    []
  );

  const createFacade = useCallback(
    async (floorPlanId: string, payload: FacadePayload) =>
      adminApi.createFacade(floorPlanId, payload),
    []
  );

  const updateFacade = useCallback(
    async (floorPlanId: string, id: string, payload: FacadePayload) =>
      adminApi.updateFacade(floorPlanId, id, payload),
    []
  );

  const deleteFacade = useCallback(
    async (floorPlanId: string, id: string) =>
      adminApi.deleteFacade(floorPlanId, id),
    []
  );

  const handleLogout = async () => {
    await adminAuth.logout();
  };

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Facades</h1>
      <AdminNav />
      <div className="flex flex-wrap gap-2 mb-6 mt-4">
        <Button onClick={handleLogout} variant="outline" label="Sign out" />
      </div>
      {floorPlansError && (
        <div className="mb-4 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {floorPlansError}
        </div>
      )}
      <FacadeCrud
        loadFacades={loadFacades}
        createFacade={createFacade}
        updateFacade={updateFacade}
        deleteFacade={deleteFacade}
        floorPlanOptions={floorPlanOptions}
        initialFloorPlanId={floorPlanOptions[0]?.id ?? null}
      />
    </div>
  );
};

export default AdminFacadesPage;
