import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminSession } from "@/lib/admin/adminSession";

export const RequireAdminRole = ({
  children,
  fallback = "/dashboard",
}: {
  children: ReactNode;
  fallback?: string;
}) => {
  const location = useLocation();
  const { role, loading, errorMessage } = useAdminSession();

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">
        Checking permissions...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-destructive">
        Permission check failed: {errorMessage}
      </div>
    );
  }

  const isAdmin = role?.toUpperCase() === "ADMIN";
  if (!isAdmin) {
    return <Navigate to={fallback} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default RequireAdminRole;
