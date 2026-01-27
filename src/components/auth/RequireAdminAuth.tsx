import { useCallback, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AdminAuthRequiredError, adminAuth } from "@/lib/auth/adminAuth";
import { adminApi } from "@/lib/api/adminApi";
import { AdminSessionContext } from "@/lib/admin/adminSession";
import type { AdminWhoAmI } from "@/lib/admin/adminSession";

type AuthStatus = "loading" | "authorized" | "unauthorized" | "error";

const extractRole = (value: AdminWhoAmI | null): string | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const role = (value as { role?: unknown }).role;
  return typeof role === "string" ? role : null;
};

export const RequireAdminAuth = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const location = useLocation();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [whoAmI, setWhoAmI] = useState<AdminWhoAmI | null>(null);
  const [whoAmILoading, setWhoAmILoading] = useState(true);
  const [whoAmIErrorMessage, setWhoAmIErrorMessage] = useState<string | null>(
    null
  );

  const reloadWhoAmI = useCallback(async (): Promise<AdminWhoAmI | null> => {
    setWhoAmILoading(true);
    setWhoAmIErrorMessage(null);
    try {
      const data = await adminApi.getWhoAmI<AdminWhoAmI>();
      setWhoAmI(data);
      return data;
    } catch (error) {
      setWhoAmIErrorMessage(
        error instanceof Error ? error.message : "Failed to load whoami."
      );
      return null;
    } finally {
      setWhoAmILoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    const run = async () => {
      try {
        await adminAuth.initialize();
        await adminAuth.ensureAccessToken();
        await reloadWhoAmI();
        if (!isActive) {
          return;
        }
        setStatus("authorized");
      } catch (error) {
        if (!isActive) {
          return;
        }
        if (error instanceof AdminAuthRequiredError) {
          setStatus("unauthorized");
          return;
        }
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    };
    run();
    return () => {
      isActive = false;
    };
  }, [reloadWhoAmI]);

  if (status === "loading") {
    return <div>Checking admin access...</div>;
  }

  if (status === "unauthorized") {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (status === "error") {
    return <div>Admin auth failed: {errorMessage ?? "Unknown error"}</div>;
  }

  const sessionValue = {
    whoAmI,
    role: extractRole(whoAmI),
    loading: whoAmILoading,
    errorMessage: whoAmIErrorMessage,
    reloadWhoAmI,
  };

  return (
    <AdminSessionContext.Provider value={sessionValue}>
      {children}
    </AdminSessionContext.Provider>
  );
};
