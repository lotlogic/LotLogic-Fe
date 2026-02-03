import { useCallback } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import {
  FacadeCrud,
  type FacadePayload,
  type FacadeRecord,
} from "@/components/admin/facades/FacadeCrud";
import { adminApi } from "@/lib/api/adminApi";
import { adminAuth } from "@/lib/auth/adminAuth";
import { Button } from "@/components/ui/Button";

const AdminFacadesPage = () => {
  const loadFacades = useCallback(
    async (floorPlanId?: string | null) =>
      adminApi.getFacades<FacadeRecord>(
        floorPlanId ? { floorPlanId } : undefined
      ),
    []
  );

  const createFacade = useCallback(
    async (payload: FacadePayload) => adminApi.createFacade(payload),
    []
  );

  const updateFacade = useCallback(
    async (id: string, payload: FacadePayload) =>
      adminApi.updateFacade(id, payload),
    []
  );

  const deleteFacade = useCallback(
    async (id: string) => adminApi.deleteFacade(id),
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
      <FacadeCrud
        loadFacades={loadFacades}
        createFacade={createFacade}
        updateFacade={updateFacade}
        deleteFacade={deleteFacade}
      />
    </div>
  );
};

export default AdminFacadesPage;
