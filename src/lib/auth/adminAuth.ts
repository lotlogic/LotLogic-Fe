import {
  InteractionRequiredAuthError,
  PublicClientApplication,
} from "@azure/msal-browser";
import type {
  AccountInfo,
  AuthenticationResult,
} from "@azure/msal-browser";

export class AdminAuthRequiredError extends Error {
  constructor(message = "Admin authentication required.") {
    super(message);
    this.name = "AdminAuthRequiredError";
  }
}

const ACCESS_TOKEN_EXPIRY_SKEW_MS = 60_000;

const parseScopes = (value?: string): string[] => {
  if (!value) {
    return [];
  }
  return value
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
};

const getRequiredEnv = (key: string): string => {
  const env = import.meta.env as Record<string, string | undefined>;
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

const assertTenantSpecificAuthority = (authority: string): string => {
  const lowered = authority.toLowerCase();
  if (lowered.includes("/common") || lowered.includes("/consumers")) {
    throw new Error(
      "VITE_AAD_AUTHORITY must be tenant-specific (no /common or /consumers)."
    );
  }
  return authority;
};

const getAuthority = (): string => {
  const authority = import.meta.env.VITE_AAD_AUTHORITY;
  if (authority) {
    return assertTenantSpecificAuthority(authority);
  }
  const tenantId = import.meta.env.VITE_AAD_TENANT_ID;
  if (!tenantId) {
    throw new Error(
      "Missing VITE_AAD_AUTHORITY or VITE_AAD_TENANT_ID for tenant-specific auth."
    );
  }
  return assertTenantSpecificAuthority(
    `https://login.microsoftonline.com/${tenantId}`
  );
};

const getLocationOrigin = (): string =>
  typeof window !== "undefined" ? window.location.origin : "";

const getDefaultRedirectUri = (): string => {
  const origin = getLocationOrigin();
  if (!origin) {
    return origin;
  }
  return `${origin}/admin/login`;
};

const getRedirectUri = (): string =>
  import.meta.env.VITE_AAD_REDIRECT_URI || getDefaultRedirectUri();

const getPostLogoutRedirectUri = (): string =>
  import.meta.env.VITE_AAD_POST_LOGOUT_REDIRECT_URI || getLocationOrigin();

const getCacheLocation = (): "localStorage" | "sessionStorage" => {
  const cacheLocation = import.meta.env.VITE_AAD_CACHE_LOCATION;
  return cacheLocation === "sessionStorage" ? "sessionStorage" : "localStorage";
};

const getApiScope = (): string => {
  const apiAppClientId = import.meta.env.VITE_API_APP_CLIENT_ID;
  if (!apiAppClientId) {
    throw new Error(
      "Missing VITE_API_APP_CLIENT_ID. It is required to request the API scope."
    );
  }
  return `api://${apiAppClientId}/user_impersonation`;
};

const buildScopes = (): string[] => {
  const scopes = new Set<string>(["openid", "profile", "email"]);
  for (const scope of parseScopes(import.meta.env.VITE_AAD_SCOPES)) {
    scopes.add(scope);
  }
  scopes.add(getApiScope());
  return Array.from(scopes);
};

const getMsalConfig = () => ({
  auth: {
    clientId: getRequiredEnv("VITE_AAD_CLIENT_ID"),
    authority: getAuthority(),
    redirectUri: getRedirectUri(),
    postLogoutRedirectUri: getPostLogoutRedirectUri(),
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: getCacheLocation(),
    storeAuthStateInCookie: false,
  },
});

let msalInstance: PublicClientApplication | null = null;
let msalInitPromise: Promise<PublicClientApplication> | null = null;
let redirectPromise: Promise<AuthenticationResult | null> | null = null;

let cachedAccessToken: string | null = null;
let cachedAccessTokenExpiresAt: number | null = null;

const hasValidCachedAccessToken = (): boolean => {
  if (!cachedAccessToken || !cachedAccessTokenExpiresAt) {
    return false;
  }
  return Date.now() < cachedAccessTokenExpiresAt - ACCESS_TOKEN_EXPIRY_SKEW_MS;
};

const storeAccessToken = (result: AuthenticationResult | null) => {
  if (!result) {
    return;
  }
  if (result.account) {
    const instance = msalInstance;
    if (instance) {
      instance.setActiveAccount(result.account);
    }
  }
  if (result.accessToken) {
    cachedAccessToken = result.accessToken;
    cachedAccessTokenExpiresAt = result.expiresOn?.getTime() ?? null;
  }
};

const clearAccessTokenCache = () => {
  cachedAccessToken = null;
  cachedAccessTokenExpiresAt = null;
};

const getMsalInstance = async (): Promise<PublicClientApplication> => {
  if (!msalInitPromise) {
    msalInstance = new PublicClientApplication(getMsalConfig());
    msalInitPromise = msalInstance.initialize().then(() => msalInstance!);
  }
  return msalInitPromise;
};

const selectAccount = (
  instance: PublicClientApplication,
  account?: AccountInfo | null
): AccountInfo | null => {
  if (account) {
    instance.setActiveAccount(account);
    return account;
  }
  const active = instance.getActiveAccount();
  if (active) {
    return active;
  }
  const accounts = instance.getAllAccounts();
  if (accounts.length > 0) {
    instance.setActiveAccount(accounts[0]);
    return accounts[0];
  }
  return null;
};

const handleRedirect = async (): Promise<AuthenticationResult | null> => {
  const instance = await getMsalInstance();
  if (!redirectPromise) {
    redirectPromise = instance.handleRedirectPromise();
  }
  const result = await redirectPromise;
  selectAccount(instance, result?.account);
  storeAccessToken(result);
  return result;
};

const acquireAccessTokenSilent = async (): Promise<AuthenticationResult> => {
  const instance = await getMsalInstance();
  const account = selectAccount(instance, null);
  if (!account) {
    throw new AdminAuthRequiredError();
  }
  const result = await instance.acquireTokenSilent({
    account,
    scopes: buildScopes(),
  });
  storeAccessToken(result);
  return result;
};

const acquireAccessTokenInteractive = async (
  interactionMode: "redirect" | "popup"
): Promise<AuthenticationResult | null> => {
  const instance = await getMsalInstance();
  const request = {
    scopes: buildScopes(),
    prompt: "select_account",
  };
  if (interactionMode === "popup") {
    const result = await instance.loginPopup(request);
    storeAccessToken(result);
    return result;
  }
  await instance.loginRedirect(request);
  return null;
};

const ensureAccessToken = async (): Promise<string> => {
  if (hasValidCachedAccessToken() && cachedAccessToken) {
    return cachedAccessToken;
  }
  const redirectResult = await handleRedirect();
  if (hasValidCachedAccessToken() && cachedAccessToken) {
    return cachedAccessToken;
  }
  try {
    const silentResult = redirectResult?.accessToken
      ? redirectResult
      : await acquireAccessTokenSilent();
    if (!silentResult.accessToken) {
      throw new Error("MSAL did not return an access token.");
    }
    return silentResult.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      clearAccessTokenCache();
      throw new AdminAuthRequiredError();
    }
    if (error instanceof AdminAuthRequiredError) {
      clearAccessTokenCache();
      throw error;
    }
    throw error;
  }
};

const getActiveAccount = async (): Promise<AccountInfo | null> => {
  const instance = await getMsalInstance();
  return selectAccount(instance, null);
};

export const adminAuth = {
  async initialize(): Promise<AccountInfo | null> {
    await handleRedirect();
    return getActiveAccount();
  },

  getActiveAccount,

  ensureAccessToken,

  async login(
    interactionMode: "redirect" | "popup" = "redirect"
  ): Promise<string | null> {
    const result = await acquireAccessTokenInteractive(interactionMode);
    return result?.accessToken ?? null;
  },

  async logout() {
    clearAccessTokenCache();
    const instance = await getMsalInstance();
    const account = selectAccount(instance, null);
    if (account) {
      await instance.logoutRedirect({ account });
    } else {
      await instance.logoutRedirect();
    }
  },

  clearAccessTokenCache,
};
