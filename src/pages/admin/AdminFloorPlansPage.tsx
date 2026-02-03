import { useCallback } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import {
  FloorPlanCrud,
  type FloorPlanPayload,
  type FloorPlanRecord,
} from "@/components/admin/floorplans/FloorPlanCrud";
import { adminApi } from "@/lib/api/adminApi";
import { adminAuth } from "@/lib/auth/adminAuth";
import { Button } from "@/components/ui/Button";

const AdminFloorPlansPage = () => {
  const loadFloorPlans = useCallback(
    async () => adminApi.getFloorPlans<FloorPlanRecord>(),
    []
  );

  const createFloorPlan = useCallback(
    async (payload: FloorPlanPayload) => adminApi.createFloorPlan(payload),
    []
  );

  const updateFloorPlan = useCallback(
    async (id: string, payload: FloorPlanPayload) =>
      adminApi.updateFloorPlan(id, payload),
    []
  );

  const deleteFloorPlan = useCallback(
    async (id: string) => adminApi.deleteFloorPlan(id),
    []
  );

  const handleLogout = async () => {
    await adminAuth.logout();
  };

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Floor Plans</h1>
      <AdminNav />
      <div className="flex flex-wrap gap-2 mb-6 mt-4">
        <Button onClick={handleLogout} variant="outline" label="Sign out" />
      </div>
      <FloorPlanCrud
        loadFloorPlans={loadFloorPlans}
        createFloorPlan={createFloorPlan}
        updateFloorPlan={updateFloorPlan}
        deleteFloorPlan={deleteFloorPlan}
      />
    </div>
  );
};

export default AdminFloorPlansPage;
