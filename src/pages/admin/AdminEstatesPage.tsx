import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminNav } from "@/components/admin/AdminNav";
import { EstateCreateForm } from "@/components/admin/estates/EstateCreateForm";
import { EstateTable } from "@/components/admin/estates/EstateTable";
import type {
  EstateCreatePayload,
  EstateRecord,
} from "@/components/admin/estates/types";
import { adminApi } from "@/lib/api/adminApi";
import { adminAuth } from "@/lib/auth/adminAuth";
import { Button } from "@/components/ui/Button";

const AdminEstatesPage = () => {
  const navigate = useNavigate();
  const [estates, setEstates] = useState<EstateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const loadEstates = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminApi.getEstates<EstateRecord>();
      setEstates(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load estates."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEstates();
  }, [loadEstates]);

  const handleCreateEstate = useCallback(
    async (payload: EstateCreatePayload) => {
      const created = await adminApi.createEstate<EstateRecord>(payload);
      await loadEstates();
      return created;
    },
    [loadEstates]
  );

  const handleLogout = async () => {
    await adminAuth.logout();
  };

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Estates</h1>
      <AdminNav />
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <Button
          onClick={loadEstates}
          disabled={loading}
          label="Refresh estates"
          loading={loading}
        />
        <Button onClick={handleLogout} variant="outline" label="Sign out" />
        <Button
          onClick={() => setShowAddForm((prev) => !prev)}
          label={showAddForm ? "Cancel" : "Add estate"}
          variant={showAddForm ? "outline" : "primary"}
          className="ml-auto"
        />
      </div>

      {showAddForm && (
        <EstateCreateForm
          onCreate={handleCreateEstate}
          onOpenCreated={(estateId) => navigate(`/admin/estates/${estateId}`)}
        />
      )}

      <EstateTable
        estates={estates}
        loading={loading}
        errorMessage={errorMessage}
        onOpenEstate={(estateId) => navigate(`/admin/estates/${estateId}`)}
      />
    </div>
  );
};

export default AdminEstatesPage;
