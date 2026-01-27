import { useCallback, useEffect, useState } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { adminAuth } from "@/lib/auth/adminAuth";
import { Button } from "@/components/ui/Button";

type AdminResourcePageProps = {
  title: string;
  loader: () => Promise<unknown>;
};

const AdminResourcePage = ({ title, loader }: AdminResourcePageProps) => {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await loader();
      setData(response);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : `Failed to load ${title}.`
      );
    } finally {
      setLoading(false);
    }
  }, [loader, title]);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogout = async () => {
    await adminAuth.logout();
  };

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">{title}</h1>
      <AdminNav />
      <div className="flex gap-2 mb-6 mt-4">
        <Button onClick={load} disabled={loading} label="Refresh" loading={loading} />
        <Button onClick={handleLogout} variant="outline" label="Sign out" />
      </div>
      
      {stateView(loading, errorMessage, title, data)}
    </div>
  );
};

const stateView = (
  loading: boolean, 
  errorMessage: string | null, 
  title: string, 
  data: unknown
) => {
  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground bg-slate-50 rounded-lg border border-slate-100">
        Loading {title.toLowerCase()}...
      </div>
    );
  }

  if (errorMessage) {
     return (
        <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-100">
          {errorMessage}
        </div>
     );
  }

  return (
    <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 overflow-auto">
      <pre className="text-sm font-mono whitespace-pre-wrap text-slate-800">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default AdminResourcePage;

