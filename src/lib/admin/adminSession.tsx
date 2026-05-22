import { createContext, useContext } from "react";

export type AdminWhoAmI = Record<string, unknown>;

export type AdminSessionValue = {
  whoAmI: AdminWhoAmI | null;
  role: string | null;
  loading: boolean;
  errorMessage: string | null;
  reloadWhoAmI: () => Promise<AdminWhoAmI | null>;
};

export const AdminSessionContext = createContext<AdminSessionValue | null>(
  null
);

export const useAdminSession = (): AdminSessionValue => {
  const value = useContext(AdminSessionContext);
  if (!value) {
    throw new Error("useAdminSession must be used within RequireAdminAuth.");
  }
  return value;
};

