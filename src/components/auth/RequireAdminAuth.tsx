import { useCallback, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AdminAuthRequiredError, adminAuth } from "@/lib/auth/adminAuth";
import { adminApi } from "@/lib/api/adminApi";
import { AdminSessionContext } from "@/lib/admin/adminSession";
import type { AdminWhoAmI } from "@/lib/admin/adminSession";

type AuthStatus = "loading" | "authorized" | "unauthorized" | "error";

const getAuditLoginKey = (userKey: string) => `lotlogic.admin.audit-login:${userKey}`;

const recordAuditLoginOnce = async (whoAmI: AdminWhoAmI | null) => {
  if (typeof window === "undefined" || !whoAmI || typeof whoAmI !== "object") {
    return;
  }
  const userKey =
    String((whoAmI as { id?: unknown }).id ?? "").trim() ||
    String((whoAmI as { externalAuthId?: unknown }).externalAuthId ?? "").trim();
  if (!userKey) {
    return;
  }
  const storageKey = getAuditLoginKey(userKey);
  if (window.sessionStorage.getItem(storageKey) === "1") {
    return;
  }
  try {
    await adminApi.trackAuditLogin();
    window.sessionStorage.setItem(storageKey, "1");
  } catch {
    // Ignore audit logging failures in auth flow.
  }
};

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
        const data = await reloadWhoAmI();
        void recordAuditLoginOnce(data);
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
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">
        Checking permissions...
      </div>
    );
  }

  if (status === "unauthorized") {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-destructive">
        Permission check failed: {errorMessage ?? "Unknown error"}
      </div>
    );
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
