import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AdminAuthRequiredError, adminAuth } from "@/lib/auth/adminAuth";
import { Button } from "@/components/ui/Button";

type LoginState = "loading" | "idle" | "error";

const DEFAULT_ADMIN_REDIRECT_PATH = "/admin/users";
const ADMIN_REDIRECT_STORAGE_KEY = "lotlogic.admin.redirectPath";

const normalizeRedirectPath = (path?: string | null): string | null => {
  if (!path || typeof path !== "string") {
    return null;
  }
  return path.startsWith("/admin") ? path : null;
};

const readStoredRedirectPath = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return normalizeRedirectPath(
      window.sessionStorage.getItem(ADMIN_REDIRECT_STORAGE_KEY)
    );
  } catch {
    return null;
  }
};

const storeRedirectPath = (path: string) => {
  if (typeof window === "undefined") {
    return;
  }
  const normalized = normalizeRedirectPath(path);
  if (!normalized) {
    return;
  }
  try {
    window.sessionStorage.setItem(ADMIN_REDIRECT_STORAGE_KEY, normalized);
  } catch {
    // Ignore storage errors (privacy modes, etc).
  }
};

const clearStoredRedirectPath = () => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(ADMIN_REDIRECT_STORAGE_KEY);
  } catch {
    // Ignore storage errors (privacy modes, etc).
  }
};

const getRedirectPath = (state: unknown): string => {
  if (!state || typeof state !== "object") {
    return readStoredRedirectPath() ?? DEFAULT_ADMIN_REDIRECT_PATH;
  }
  const typedState = state as { from?: { pathname?: string } };
  return (
    normalizeRedirectPath(typedState.from?.pathname) ??
    readStoredRedirectPath() ??
    DEFAULT_ADMIN_REDIRECT_PATH
  );
};

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = useMemo(
    () => getRedirectPath(location.state),
    [location.state]
  );
  const [state, setState] = useState<LoginState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const run = async () => {
      try {
        await adminAuth.initialize();
        if (!isActive) {
          return;
        }
        try {
          await adminAuth.ensureAccessToken();
          clearStoredRedirectPath();
          navigate(redirectPath, { replace: true });
          return;
        } catch (error) {
          if (!(error instanceof AdminAuthRequiredError)) {
            throw error;
          }
        }
        setState("idle");
      } catch (error) {
        if (!isActive) {
          return;
        }
        setState("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    };
    run();
    return () => {
      isActive = false;
    };
  }, [navigate, redirectPath]);

  const handleLogin = async () => {
    setState("loading");
    setErrorMessage(null);
    try {
      storeRedirectPath(redirectPath);
      await adminAuth.login("redirect");
    } catch (error) {
      setState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  };

  return (
    <main className="bg-stone-50 text-[var(--color-ink)]">
      <section className="mt-0">
        <div className="mx-auto max-w-lg py-20 text-center">
          <h1 className="text-3xl font-bold mb-3">Admin Login</h1>
          <p className="text-sm text-stone-500 mb-8">
            Sign in with your Entra ID to manage LotCheck settings.
          </p>
          {state === "loading" && (
            <p className="text-muted-foreground mb-4">Preparing login...</p>
          )}
          {state === "error" && (
            <p className="text-destructive mb-4">{errorMessage}</p>
          )}
          <Button
            onClick={handleLogin}
            disabled={state === "loading"}
            label="Sign in with Entra ID"
          />
        </div>
      </section>
    </main>
  );
};

export default AdminLoginPage;
