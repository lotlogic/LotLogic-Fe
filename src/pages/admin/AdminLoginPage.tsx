import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AdminAuthRequiredError, adminAuth } from "@/lib/auth/adminAuth";
import { Button } from "@/components/ui/Button";

type LoginState = "loading" | "idle" | "error";

const DEFAULT_ADMIN_REDIRECT_PATH = "/dashboard";
const ADMIN_REDIRECT_STORAGE_KEY = "lotlogic.admin.redirectPath";

const normalizeRedirectPath = (path?: string | null): string | null => {
  if (!path || typeof path !== "string") {
    return null;
  }
  if (path.startsWith("/admin") || path.startsWith("/dashboard")) {
    return path;
  }
  return null;
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
  const redirectContext = useMemo(() => {
    const isDashboard = redirectPath.startsWith("/dashboard");
    if (isDashboard) {
      return {
        accessTitle: "Dashboard Access",
        intro:
          "This portal will take you to your dashboard workspace for assigned estates and builders.",
        bullets: [
          "Review and maintain records in your assigned scope.",
          "Invite or manage team members and permissions.",
          "Use the operational tools available to your role.",
        ],
        destination: "Dashboard",
      };
    }
    return {
      accessTitle: "Admin Access",
      intro:
        "This portal is where your team manages users, estates, builders, and platform settings for LotCheck and BlockPlanner.",
      bullets: [
        "Review and maintain estate and builder records.",
        "Invite or manage team members and permissions.",
        "Update brand and operational settings.",
      ],
      destination: "Admin",
    };
  }, [redirectPath]);
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
    <main className="min-h-screen bg-gradient-to-b from-stone-100 via-stone-50 to-white text-[var(--color-ink)]">
      <section className="mt-0">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-6 flex items-center gap-4">
                <img
                  src="/images/logos/logo.png"
                  alt="LotCheck"
                  className="h-10 w-auto rounded"
                />
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    LotCheck Portal
                  </p>
                  <h1 className="m-0 text-3xl font-bold">
                    {redirectContext.accessTitle}
                  </h1>
                </div>
              </div>
              <p className="mb-4 text-sm text-slate-600">
                {redirectContext.intro}
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
                {redirectContext.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-5 text-xs text-slate-500">
                After sign-in you will be redirected to{" "}
                {redirectContext.destination} at <code>{redirectPath}</code>.
              </p>
            </article>

            <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
              <h2 className="mb-2 mt-0 text-xl font-semibold">
                Continue to Sign-In
              </h2>
              <p className="mb-6 text-sm text-slate-600">
                Use your approved work account to continue. If you were invited,
                sign in with the same email address the invitation was sent to.
              </p>
              {state === "loading" && (
                <p className="text-muted-foreground mb-4">
                  Preparing secure sign-in...
                </p>
              )}
              {state === "error" && (
                <p className="text-destructive mb-4">{errorMessage}</p>
              )}
              <Button
                onClick={handleLogin}
                disabled={state === "loading"}
                label="Continue to secure sign-in"
              />
              <p className="mt-3 text-xs text-slate-500">
                Need access? Contact your LotCheck administrator.
              </p>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AdminLoginPage;
