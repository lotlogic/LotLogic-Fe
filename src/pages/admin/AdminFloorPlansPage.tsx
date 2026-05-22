import { useCallback } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import {
  FloorPlanCrud,
  type FloorPlanPayload,
  type FloorPlanRecord,
} from "@/components/admin/floorplans/FloorPlanCrud";
import {
  FloorPlanDocumentCrud,
  type FloorPlanDocumentPayload,
  type FloorPlanDocumentRecord,
} from "@/components/admin/floorplans/FloorPlanDocumentCrud";
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

  const loadDocuments = useCallback(async (floorPlanId: string) => {
    return adminApi.getFloorPlanDocuments<FloorPlanDocumentRecord>(floorPlanId);
  }, []);

  const createDocument = useCallback(
    async (floorPlanId: string, payload: FloorPlanDocumentPayload) =>
      adminApi.createFloorPlanDocument(floorPlanId, payload),
    []
  );

  const updateDocument = useCallback(
    async (
      floorPlanId: string,
      id: string,
      payload: FloorPlanDocumentPayload
    ) => adminApi.updateFloorPlanDocument(floorPlanId, id, payload),
    []
  );

  const deleteDocument = useCallback(
    async (floorPlanId: string, id: string) =>
      adminApi.deleteFloorPlanDocument(floorPlanId, id),
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
        renderEditPanel={(floorPlanId) => (
          <div className="grid gap-3">
            <div>
              <h3 className="text-lg font-semibold m-0">Documents</h3>
              <p className="text-sm text-muted-foreground m-0">
                Manage PDFs and other sales documents for this floor plan.
              </p>
            </div>
            <FloorPlanDocumentCrud
              loadDocuments={loadDocuments}
              createDocument={createDocument}
              updateDocument={updateDocument}
              deleteDocument={deleteDocument}
              floorPlanOptions={[{ id: floorPlanId, label: floorPlanId }]}
              initialFloorPlanId={floorPlanId}
              filterPlaceholder="Filter by name, file, or id"
            />
          </div>
        )}
      />
    </div>
  );
};

export default AdminFloorPlansPage;
