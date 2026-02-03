import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminNav } from "@/components/admin/AdminNav";
import { BuilderCreateForm } from "@/components/admin/builders/BuilderCreateForm";
import { BuilderTable } from "@/components/admin/builders/BuilderTable";
import type {
  BuilderCreatePayload,
  BuilderRecord,
} from "@/components/admin/builders/types";
import { adminApi } from "@/lib/api/adminApi";
import { adminAuth } from "@/lib/auth/adminAuth";
import { Button } from "@/components/ui/Button";

const AdminBuildersPage = () => {
  const navigate = useNavigate();
  const [builders, setBuilders] = useState<BuilderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const loadBuilders = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminApi.getBuilders<BuilderRecord>();
      setBuilders(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load builders."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBuilders();
  }, [loadBuilders]);

  const handleCreateBuilder = useCallback(
    async (payload: BuilderCreatePayload) => {
      const created = await adminApi.createBuilder<BuilderRecord>(payload);
      await loadBuilders();
      return created;
    },
    [loadBuilders]
  );

  const handleLogout = async () => {
    await adminAuth.logout();
  };

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Builders</h1>
      <AdminNav />
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <Button
          onClick={loadBuilders}
          disabled={loading}
          label="Refresh builders"
          loading={loading}
        />
        <Button onClick={handleLogout} variant="outline" label="Sign out" />
        <Button
          onClick={() => setShowAddForm((prev) => !prev)}
          label={showAddForm ? "Cancel" : "Add builder"}
          variant={showAddForm ? "outline" : "primary"}
          className="ml-auto"
        />
      </div>

      {showAddForm && (
        <BuilderCreateForm
          onCreate={handleCreateBuilder}
          onOpenCreated={(builderId) => navigate(`/admin/builders/${builderId}`)}
        />
      )}

      <BuilderTable
        builders={builders}
        loading={loading}
        errorMessage={errorMessage}
        onOpenBuilder={(builderId) => navigate(`/admin/builders/${builderId}`)}
      />
    </div>
  );
};

export default AdminBuildersPage;
