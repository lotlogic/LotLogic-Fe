import axios from "axios";
import type {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { getAdminApiBaseUrl } from "@/lib/api/adminApiBase";
import { adminAuth } from "@/lib/auth/adminAuth";

export type AdminId = string;

export type AdminQuery = Record<string, string | number | boolean | undefined>;

export type LotZoningRuleKey = {
  lotId: string;
  zoningRuleId: string;
};

export type CreateLotInput = Record<string, unknown> & { estateId: string };

const adminApiClient = axios.create({
  baseURL: getAdminApiBaseUrl(),
});

const adminDebugEnabled = (() => {
  const flag = import.meta.env.VITE_ADMIN_API_DEBUG;
  if (flag) {
    return flag === "true";
  }
  return import.meta.env.DEV;
})();

const getHeaderValue = (
  headers: AxiosRequestConfig["headers"],
  key: string
): string | undefined => {
  if (!headers) {
    return undefined;
  }
  if (typeof (headers as { get?: (name: string) => string | null }).get === "function") {
    const value = (headers as { get: (name: string) => string | null }).get(
      key
    );
    return value ?? undefined;
  }
  const record = headers as Record<string, unknown>;
  const value = record[key] ?? record[key.toLowerCase()];
  return typeof value === "string" ? value : undefined;
};

const maskToken = (value: string) =>
  value.length <= 12 ? value : `${value.slice(0, 6)}...${value.slice(-4)}`;

const resolveRequestUrl = (config: AxiosRequestConfig): string => {
  const url = config.url ?? "";
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  let baseUrl = config.baseURL ?? "";
  if (typeof window === "undefined") {
    return `${baseUrl}${url}`;
  }
  const origin = window.location.origin;
  if (!baseUrl) {
    baseUrl = origin;
  } else if (baseUrl.startsWith("/")) {
    baseUrl = `${origin}${baseUrl}`;
  }
  const base = baseUrl.replace(/\/+$/, "");
  if (!url) {
    return base;
  }
  const path = url.replace(/^\/+/, "");
  return `${base}/${path}`;
};

adminApiClient.interceptors.request.use(async (config) => {
  const token = await adminAuth.ensureAccessToken();
  const headers = config.headers ?? {};
  headers.Authorization = `Bearer ${token}`;
  if (adminDebugEnabled) {
    const method = (config.method ?? "get").toUpperCase();
    const requestUrl = resolveRequestUrl({ ...config, headers });
    const authHeader = getHeaderValue(headers, "Authorization");
    const rawToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;
    const authPreview = rawToken ? maskToken(rawToken) : "missing";
    console.debug(`[adminApi] -> ${method} ${requestUrl} auth=${authPreview}`);
  }
  return {
    ...config,
    headers,
  };
});

adminApiClient.interceptors.response.use(
  (response) => {
    if (adminDebugEnabled) {
      const method = (response.config.method ?? "get").toUpperCase();
      const requestUrl = resolveRequestUrl(response.config);
      console.debug(`[adminApi] <- ${response.status} ${method} ${requestUrl}`);
    }
    return response;
  },
  (error: AxiosError) => {
    if (adminDebugEnabled) {
      const method = (error.config?.method ?? "get").toUpperCase();
      const requestUrl = error.config
        ? resolveRequestUrl(error.config)
        : "unknown";
      const status = error.response?.status ?? "no-status";
      const payload = error.response?.data;
      console.error(
        `[adminApi] !! ${status} ${method} ${requestUrl}`,
        payload ?? error.message
      );
    }
    return Promise.reject(error);
  }
);

const data = async <T>(promise: Promise<AxiosResponse<T>>): Promise<T> => {
  const response = await promise;
  return response.data;
};

const encodeId = (value: string) => encodeURIComponent(value);

const basePath = (resource: string) => `/admin/${resource}`;
const idPath = (resource: string, id: string) =>
  `${basePath(resource)}/${encodeId(id)}`;

const lotZoningRulePath = (key: LotZoningRuleKey) =>
  `${basePath("lot-zoning-rules")}/${encodeId(
    key.lotId
  )}/${encodeId(key.zoningRuleId)}`;

const builderUsersPath = (builderId: AdminId) =>
  `${idPath("builders", builderId)}/users`;

const builderUserPath = (builderId: AdminId, userId: AdminId) =>
  `${builderUsersPath(builderId)}/${encodeId(userId)}`;

export const adminApi = {
  async getEstates<T = unknown>(params?: AdminQuery): Promise<T[]> {
    return data(adminApiClient.get<T[]>(basePath("estates"), { params }));
  },
  async getEstateById<T = unknown>(id: AdminId): Promise<T> {
    return data(adminApiClient.get<T>(idPath("estates", id)));
  },
  async createEstate<T = unknown, B extends Record<string, unknown> = Record<string, unknown>>(
    payload: B
  ): Promise<T> {
    return data(adminApiClient.post<T>(basePath("estates"), payload));
  },
  async updateEstate<T = unknown, B extends Record<string, unknown> = Record<string, unknown>>(
    id: AdminId,
    payload: B
  ): Promise<T> {
    return data(adminApiClient.patch<T>(idPath("estates", id), payload));
  },
  async deleteEstate<T = unknown>(id: AdminId): Promise<T> {
    return data(adminApiClient.delete<T>(idPath("estates", id)));
  },

  async getLots<T = unknown>(params?: AdminQuery): Promise<T[]> {
    return data(adminApiClient.get<T[]>(basePath("lots"), { params }));
  },
  async createLot<T = unknown>(payload: CreateLotInput): Promise<T> {
    return data(adminApiClient.post<T>(basePath("lots"), payload));
  },
  async updateLot<T = unknown, B extends Record<string, unknown> = Record<string, unknown>>(
    id: AdminId,
    payload: B
  ): Promise<T> {
    return data(adminApiClient.patch<T>(idPath("lots", id), payload));
  },
  async deleteLot<T = unknown>(id: AdminId): Promise<T> {
    return data(adminApiClient.delete<T>(idPath("lots", id)));
  },
  async importEstateLotsDxf<T = unknown>(
    estateId: AdminId,
    payload: FormData
  ): Promise<T> {
    return data(
      adminApiClient.post<T>(
        `${idPath("estates", estateId)}/lots/import-dxf`,
        payload
      )
    );
  },

  async getZoningRules<T = unknown>(params?: AdminQuery): Promise<T[]> {
    return data(adminApiClient.get<T[]>(basePath("zoning-rules"), { params }));
  },
  async createZoningRule<T = unknown, B extends Record<string, unknown> = Record<string, unknown>>(
    payload: B
  ): Promise<T> {
    return data(adminApiClient.post<T>(basePath("zoning-rules"), payload));
  },
  async updateZoningRule<T = unknown, B extends Record<string, unknown> = Record<string, unknown>>(
    id: AdminId,
    payload: B
  ): Promise<T> {
    return data(adminApiClient.patch<T>(idPath("zoning-rules", id), payload));
  },
  async deleteZoningRule<T = unknown>(id: AdminId): Promise<T> {
    return data(adminApiClient.delete<T>(idPath("zoning-rules", id)));
  },

  async getLotZoningRules<T = unknown>(params?: AdminQuery): Promise<T[]> {
    return data(
      adminApiClient.get<T[]>(basePath("lot-zoning-rules"), { params })
    );
  },
  async createLotZoningRule<T = unknown, B extends Record<string, unknown> = Record<string, unknown>>(
    payload: B
  ): Promise<T> {
    return data(adminApiClient.post<T>(basePath("lot-zoning-rules"), payload));
  },
  async updateLotZoningRule<T = unknown, B extends Record<string, unknown> = Record<string, unknown>>(
    key: LotZoningRuleKey,
    payload: B
  ): Promise<T> {
    return data(adminApiClient.patch<T>(lotZoningRulePath(key), payload));
  },
  async deleteLotZoningRule<T = unknown>(key: LotZoningRuleKey): Promise<T> {
    return data(adminApiClient.delete<T>(lotZoningRulePath(key)));
  },

  async createUpload<T = unknown, B extends Record<string, unknown> = Record<string, unknown>>(
    payload: B
  ): Promise<T> {
    return data(adminApiClient.post<T>(basePath("uploads"), payload));
  },

  async getFloorPlans<T = unknown>(params?: AdminQuery): Promise<T[]> {
    return data(adminApiClient.get<T[]>(basePath("floor-plans"), { params }));
  },
  async createFloorPlan<T = unknown, B extends Record<string, unknown> = Record<string, unknown>>(
    payload: B
  ): Promise<T> {
    return data(adminApiClient.post<T>(basePath("floor-plans"), payload));
  },
  async updateFloorPlan<T = unknown, B extends Record<string, unknown> = Record<string, unknown>>(
    id: AdminId,
    payload: B
  ): Promise<T> {
    return data(adminApiClient.patch<T>(idPath("floor-plans", id), payload));
  },
  async deleteFloorPlan<T = unknown>(id: AdminId): Promise<T> {
    return data(adminApiClient.delete<T>(idPath("floor-plans", id)));
  },

  async getFacades<T = unknown>(params?: AdminQuery): Promise<T[]> {
    return data(adminApiClient.get<T[]>(basePath("facades"), { params }));
  },
  async createFacade<T = unknown, B extends Record<string, unknown> = Record<string, unknown>>(
    payload: B
  ): Promise<T> {
    return data(adminApiClient.post<T>(basePath("facades"), payload));
  },
  async updateFacade<T = unknown, B extends Record<string, unknown> = Record<string, unknown>>(
    id: AdminId,
    payload: B
  ): Promise<T> {
    return data(adminApiClient.patch<T>(idPath("facades", id), payload));
  },
  async deleteFacade<T = unknown>(id: AdminId): Promise<T> {
    return data(adminApiClient.delete<T>(idPath("facades", id)));
  },

  async getDesignsOnLots<T = unknown>(params?: AdminQuery): Promise<T[]> {
    return data(
      adminApiClient.get<T[]>(basePath("design-on-lots"), { params })
    );
  },
  async createDesignOnLot<T = unknown, B extends Record<string, unknown> = Record<string, unknown>>(
    payload: B
  ): Promise<T> {
    return data(adminApiClient.post<T>(basePath("design-on-lots"), payload));
  },
  async updateDesignOnLot<T = unknown, B extends Record<string, unknown> = Record<string, unknown>>(
    id: AdminId,
    payload: B
  ): Promise<T> {
    return data(adminApiClient.patch<T>(idPath("design-on-lots", id), payload));
  },
  async deleteDesignOnLot<T = unknown>(id: AdminId): Promise<T> {
    return data(adminApiClient.delete<T>(idPath("design-on-lots", id)));
  },

  async getBuilders<T = unknown>(params?: AdminQuery): Promise<T[]> {
    return data(adminApiClient.get<T[]>(basePath("builders"), { params }));
  },
  async getBuilderById<T = unknown>(id: AdminId): Promise<T> {
    return data(adminApiClient.get<T>(idPath("builders", id)));
  },
  async createBuilder<T = unknown, B extends Record<string, unknown> = Record<string, unknown>>(
    payload: B
  ): Promise<T> {
    return data(adminApiClient.post<T>(basePath("builders"), payload));
  },
  async updateBuilder<T = unknown, B extends Record<string, unknown> = Record<string, unknown>>(
    id: AdminId,
    payload: B
  ): Promise<T> {
    return data(adminApiClient.patch<T>(idPath("builders", id), payload));
  },
  async deleteBuilder<T = unknown>(id: AdminId): Promise<T> {
    return data(adminApiClient.delete<T>(idPath("builders", id)));
  },
  async getBuilderUsers<T = unknown>(id: AdminId): Promise<T[]> {
    return data(adminApiClient.get<T[]>(builderUsersPath(id)));
  },
  async replaceBuilderUsers<T = unknown>(
    id: AdminId,
    userIds: string[]
  ): Promise<T> {
    return data(adminApiClient.put<T>(builderUsersPath(id), { userIds }));
  },
  async addBuilderUsers<T = unknown>(id: AdminId, userIds: string[]): Promise<T> {
    return data(adminApiClient.post<T>(builderUsersPath(id), { userIds }));
  },
  async removeBuilderUser<T = unknown>(
    id: AdminId,
    userId: AdminId
  ): Promise<T> {
    return data(adminApiClient.delete<T>(builderUserPath(id, userId)));
  },

  async getBrandSettings<T = unknown>(params?: AdminQuery): Promise<T[]> {
    return data(adminApiClient.get<T[]>(basePath("brand-settings"), { params }));
  },
  async getBrandSettingByGuid<T = unknown>(guid: AdminId): Promise<T> {
    return data(adminApiClient.get<T>(idPath("brand-settings", guid)));
  },
  async createBrandSetting<
    T = unknown,
    B extends Record<string, unknown> = Record<string, unknown>
  >(payload: B): Promise<T> {
    return data(adminApiClient.post<T>(basePath("brand-settings"), payload));
  },
  async updateBrandSetting<
    T = unknown,
    B extends Record<string, unknown> = Record<string, unknown>
  >(guid: AdminId, payload: B): Promise<T> {
    return data(adminApiClient.patch<T>(idPath("brand-settings", guid), payload));
  },
  async deleteBrandSetting<T = unknown>(guid: AdminId): Promise<T> {
    return data(adminApiClient.delete<T>(idPath("brand-settings", guid)));
  },

  async getUsers<T = unknown>(params?: AdminQuery): Promise<T[]> {
    return data(adminApiClient.get<T[]>(basePath("users"), { params }));
  },
  async getWhoAmI<T = unknown>(): Promise<T> {
    return data(adminApiClient.get<T>(basePath("whoami")));
  },
  async getUserById<T = unknown>(id: AdminId): Promise<T> {
    return data(adminApiClient.get<T>(idPath("users", id)));
  },
  async inviteUser<
    T = unknown,
    B extends Record<string, unknown> = Record<string, unknown>
  >(payload: B): Promise<T> {
    return data(adminApiClient.post<T>(basePath("invitations"), payload));
  },
  async createUser<T = unknown, B extends Record<string, unknown> = Record<string, unknown>>(
    payload: B
  ): Promise<T> {
    return data(adminApiClient.post<T>(basePath("users"), payload));
  },
  async updateUser<T = unknown, B extends Record<string, unknown> = Record<string, unknown>>(
    id: AdminId,
    payload: B
  ): Promise<T> {
    return data(adminApiClient.patch<T>(idPath("users", id), payload));
  },
  async deleteUser<T = unknown>(id: AdminId): Promise<T> {
    return data(adminApiClient.delete<T>(idPath("users", id)));
  },
  async disableUser<T = unknown>(id: AdminId): Promise<T> {
    return data(adminApiClient.post<T>(`${idPath("users", id)}/disable`));
  },
  async enableUser<T = unknown>(id: AdminId): Promise<T> {
    return data(adminApiClient.post<T>(`${idPath("users", id)}/enable`));
  },
  async updateUserEstates<T = unknown>(
    id: AdminId,
    estateIds: string[]
  ): Promise<T> {
    return data(
      adminApiClient.put<T>(`${idPath("users", id)}/estates`, { estateIds })
    );
  },
};

export { adminApiClient };
