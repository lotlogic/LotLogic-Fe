import PrototypePage from "@/pages/PrototypePage";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { lotApi, type EstateAccessState } from "@/lib/api/lotApi";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useSearchParams } from "react-router-dom";

const parseEstateId = (
  estateIdFromPath: string | undefined,
  estateIdFromQuery: string | null
) => {
  const value = (estateIdFromPath ?? estateIdFromQuery ?? "").trim();
  return value.length > 0 ? value : null;
};

const getEstateAccessSessionKey = (estateId: string) =>
  `lotlogic-estate-access:${estateId}`;

const hasEstateAccessInSession = (estateId: string) => {
  if (typeof window === "undefined") {
    return false;
  }
  return window.sessionStorage.getItem(getEstateAccessSessionKey(estateId)) === "1";
};

const setEstateAccessInSession = (estateId: string) => {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(getEstateAccessSessionKey(estateId), "1");
};

const EmbedPage = () => {
  const { estateId: estateIdFromPath } = useParams<{ estateId: string }>();
  const [searchParams] = useSearchParams();
  const [accessState, setAccessState] = useState<EstateAccessState | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessErrorMessage, setAccessErrorMessage] = useState<string | null>(
    null
  );
  const [password, setPassword] = useState("");
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<string | null>(
    null
  );
  const [validatingPassword, setValidatingPassword] = useState(false);
  const [isSessionValidated, setIsSessionValidated] = useState(false);

  const estateId = useMemo(
    () => parseEstateId(estateIdFromPath, searchParams.get("estateId")),
    [estateIdFromPath, searchParams]
  );

  useEffect(() => {
    if (!estateId) {
      setAccessLoading(false);
      setAccessState(null);
      setAccessErrorMessage(null);
      setIsSessionValidated(false);
      return;
    }

    let isActive = true;
    const loadAccess = async () => {
      setAccessLoading(true);
      setAccessErrorMessage(null);
      try {
        const nextAccessState = await lotApi.getEstateAccess(estateId);
        if (!isActive) {
          return;
        }
        setAccessState(nextAccessState);
        setIsSessionValidated(
          nextAccessState.status !== "GATED" || hasEstateAccessInSession(estateId)
        );
      } catch (error) {
        if (!isActive) {
          return;
        }
        setAccessState(null);
        setAccessErrorMessage(
          error instanceof Error ? error.message : "Failed to load estate."
        );
        setIsSessionValidated(false);
      } finally {
        if (isActive) {
          setAccessLoading(false);
        }
      }
    };

    void loadAccess();

    return () => {
      isActive = false;
    };
  }, [estateId]);

  const handleValidatePassword = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!estateId) {
      return;
    }

    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      setPasswordErrorMessage("Password is required.");
      return;
    }

    setValidatingPassword(true);
    setPasswordErrorMessage(null);
    try {
      await lotApi.validateEstateAccess(estateId, trimmedPassword);
      setEstateAccessInSession(estateId);
      setIsSessionValidated(true);
      setPassword("");
    } catch (error) {
      setPasswordErrorMessage("Incorrect password.");
    } finally {
      setValidatingPassword(false);
    }
  };

  if (!estateId) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white px-6">
        <div className="max-w-lg text-center text-brand">
          <h1 className="text-2xl font-semibold">Missing estate id</h1>
          <p className="mt-2 text-brand-muted">
            Add an estate id to the URL, for example{" "}
            <span className="font-mono">/embed/my-estate-id</span>.
          </p>
        </div>
      </div>
    );
  }

  if (accessLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white px-6">
        <div className="max-w-lg text-center text-brand">
          <h1 className="text-2xl font-semibold">Loading estate</h1>
          <p className="mt-2 text-brand-muted">
            Checking estate access settings.
          </p>
        </div>
      </div>
    );
  }

  if (accessErrorMessage) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white px-6">
        <div className="max-w-lg text-center text-brand">
          <h1 className="text-2xl font-semibold">Unable to load estate</h1>
          <p className="mt-2 text-brand-muted">{accessErrorMessage}</p>
        </div>
      </div>
    );
  }

  if (accessState?.status === "GATED" && !isSessionValidated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 px-6">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">
            {accessState.name?.trim() || "Estate"} is gated
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter the estate password to continue. You will only need to do this
            once per browser session.
          </p>
          <form onSubmit={handleValidatePassword} className="mt-5 grid gap-4">
            <div className="grid gap-2">
              <span className="text-sm font-medium text-slate-900">
                Password
              </span>
              <Input
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (passwordErrorMessage) {
                    setPasswordErrorMessage(null);
                  }
                }}
                type="password"
                placeholder="Enter password"
                className="w-full"
                autoFocus
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                disabled={validatingPassword}
                loading={validatingPassword}
                label="View Estate"
              />
              {passwordErrorMessage && (
                <span className="text-sm text-destructive">
                  {passwordErrorMessage}
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  return <PrototypePage estateId={estateId} />;
};

export default EmbedPage;
