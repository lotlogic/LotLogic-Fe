const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const ensureApiSuffix = (value: string) => {
  const trimmed = trimTrailingSlash(value);
  return trimmed.toLowerCase().endsWith("/api") ? trimmed : `${trimmed}/api`;
};

const getRequiredApiUrl = (): string => {
  const envUrl =
    import.meta.env.VITE_ADMIN_API_URL || import.meta.env.VITE_API_URL;
  if (!envUrl) {
    throw new Error(
      "Missing VITE_API_URL (or VITE_ADMIN_API_URL) for admin API calls."
    );
  }
  return envUrl;
};

export const getAdminApiBaseUrl = (): string => {
  const envUrl = getRequiredApiUrl();
  return ensureApiSuffix(envUrl);
};

export const getEasyAuthBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_EASY_AUTH_BASE_URL;
  if (envUrl) {
    return trimTrailingSlash(envUrl);
  }

  const envAdminUrl = getRequiredApiUrl();
  const apiBase = trimTrailingSlash(ensureApiSuffix(envAdminUrl));
  return apiBase.toLowerCase().endsWith("/api")
    ? apiBase.slice(0, -4)
    : apiBase;
};
