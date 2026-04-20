import axios from "axios";
import type {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { getAdminApiBaseUrl } from "@/lib/api/adminApiBase";
import type {
  BuilderPerformanceSummary,
  EstatePerformanceSummary,
  BuilderLeadsResponse,
  AuditLogResponse,
  CreateBuilderEstateApprovalPayload,
  CreateBuilderEstateApprovalResponse,
  ReviewDesignOnLotPayload,
  CreateEstateRuleSetPayload,
  CreateEstateRuleSetResponse,
  CreateLotConstraintPayload,
  CreateLotConstraintResponse,
  CreateStateRuleSetPayload,
  CreateStateRuleSetResponse,
  RecomputeEstateSummary,
  ReviewLotDesignOnLotsPayload,
  ReviewLotDesignOnLotsResponse,
  RuleSetRecordBase,
  StateRuleSetRecord,
  UpdateBuilderEstateApprovalPayload,
  UpdateEstateRuleSetPayload,
  UpdateLotConstraintPayload,
  UpdateStateRuleSetPayload,
} from "@/lib/api/adminModels";
import { adminAuth } from "@/lib/auth/adminAuth";

export type AdminId = string;

export type AdminQuery = Record<string, string | number | boolean | undefined>;

export type LotZoningRuleKey = {
  lotId: string;
  zoningRuleId: string;
};

export type CreateLotInput = Record<string, unknown> & { estateId: string };
export type ActLandUseZoneLookupResponse = {
  lotCheckRules?: {
    zoneCode?: string | null;
    [key: string]: unknown;
  } | null;
  zone?: {
    zoneCode?: string | null;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
};

export type DeleteEstateLotsResponse = {
  estateId: string;
  deleted: number;
};

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
const builderApprovedEstatesPath = (builderId: AdminId) =>
  `${idPath("builders", builderId)}/approved-estates`;
const builderLeadsPath = (builderId: AdminId) =>
  `${idPath("builders", builderId)}/leads`;
const builderEstateJoinRequestPath = (builderId: AdminId) =>
  `${idPath("builders", builderId)}/estate-join-request`;
const builderPerformancePath = (builderId: AdminId) =>
  `${idPath("builders", builderId)}/performance`;
const builderLeadsExportPath = (builderId: AdminId) =>
  `${builderLeadsPath(builderId)}/export`;
const builderLeadPath = (builderId: AdminId, leadId: AdminId) =>
  `${builderLeadsPath(builderId)}/${encodeId(leadId)}`;
const auditLogPath = () => `${basePath("audit-log")}`;

const builderUserPath = (builderId: AdminId, userId: AdminId) =>
  `${builderUsersPath(builderId)}/${encodeId(userId)}`;

const floorPlanFacadesPath = (floorPlanId: AdminId) =>
  `${idPath("floor-plans", floorPlanId)}/facades`;

const floorPlanFacadePath = (floorPlanId: AdminId, id: AdminId) =>
  `${floorPlanFacadesPath(floorPlanId)}/${encodeId(id)}`;

const stateRuleSetPath = (id: AdminId) =>
  `${basePath("state-rule-sets")}/${encodeId(id)}`;

const estateRuleSetsPath = (estateId: AdminId) =>
  `${idPath("estates", estateId)}/rule-sets`;
const estateRuleSetPath = (estateId: AdminId, id: AdminId) =>
  `${estateRuleSetsPath(estateId)}/${encodeId(id)}`;

const estateLotConstraintsPath = (estateId: AdminId) =>
  `${idPath("estates", estateId)}/lot-constraints`;
const estateLotConstraintPath = (estateId: AdminId, id: AdminId) =>
  `${estateLotConstraintsPath(estateId)}/${encodeId(id)}`;

const estateBuilderApprovalsPath = (estateId: AdminId) =>
  `${idPath("estates", estateId)}/builder-approvals`;
const estateBuilderApprovalPath = (estateId: AdminId, builderId: AdminId) =>
  `${estateBuilderApprovalsPath(estateId)}/${encodeId(builderId)}`;

const estateRecomputePath = (estateId: AdminId) =>
  `${idPath("estates", estateId)}/recompute-design-on-lot`;
const estatePerformancePath = (estateId: AdminId) =>
  `${idPath("estates", estateId)}/performance`;
const designOnLotReviewPath = (id: AdminId) =>
  `${idPath("design-on-lots", id)}/review`;
const designOnLotClearReviewPath = (id: AdminId) =>
  `${idPath("design-on-lots", id)}/clear-review`;
const lotDesignOnLotReviewPath = (lotId: AdminId) =>
  `${basePath("design-on-lots")}/lot/${encodeId(lotId)}/review`;

export const adminApi = {
  async getStateRuleSets<T = StateRuleSetRecord>(
    params?: AdminQuery
  ): Promise<T[]> {
    return data(adminApiClient.get<T[]>(basePath("state-rule-sets"), { params }));
  },
  async createStateRuleSet<
    T = CreateStateRuleSetResponse,
    B extends CreateStateRuleSetPayload = CreateStateRuleSetPayload
  >(payload: B): Promise<T> {
    return data(adminApiClient.post<T>(basePath("state-rule-sets"), payload));
  },
  async updateStateRuleSet<
    T = CreateStateRuleSetResponse,
    B extends UpdateStateRuleSetPayload = UpdateStateRuleSetPayload
  >(id: AdminId, payload: B): Promise<T> {
    return data(adminApiClient.patch<T>(stateRuleSetPath(id), payload));
  },
  async deleteStateRuleSet<T = unknown>(id: AdminId): Promise<T> {
    return data(adminApiClient.delete<T>(stateRuleSetPath(id)));
  },

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
  async getEstateRuleSets<T = RuleSetRecordBase>(
    estateId: AdminId,
    params?: AdminQuery
  ): Promise<T[]> {
    return data(adminApiClient.get<T[]>(estateRuleSetsPath(estateId), { params }));
  },
  async createEstateRuleSet<
    T = CreateEstateRuleSetResponse,
    B extends CreateEstateRuleSetPayload = CreateEstateRuleSetPayload
  >(estateId: AdminId, payload: B): Promise<T> {
    return data(adminApiClient.post<T>(estateRuleSetsPath(estateId), payload));
  },
  async updateEstateRuleSet<
    T = CreateEstateRuleSetResponse,
    B extends UpdateEstateRuleSetPayload = UpdateEstateRuleSetPayload
  >(estateId: AdminId, id: AdminId, payload: B): Promise<T> {
    return data(adminApiClient.patch<T>(estateRuleSetPath(estateId, id), payload));
  },
  async deleteEstateRuleSet<T = unknown>(
    estateId: AdminId,
    id: AdminId
  ): Promise<T> {
    return data(adminApiClient.delete<T>(estateRuleSetPath(estateId, id)));
  },
  async getEstateLotConstraints<T = unknown>(
    estateId: AdminId,
    params?: AdminQuery
  ): Promise<T[]> {
    return data(
      adminApiClient.get<T[]>(estateLotConstraintsPath(estateId), { params })
    );
  },
  async createEstateLotConstraint<
    T = CreateLotConstraintResponse,
    B extends CreateLotConstraintPayload = CreateLotConstraintPayload
  >(estateId: AdminId, payload: B): Promise<T> {
    return data(
      adminApiClient.post<T>(estateLotConstraintsPath(estateId), payload)
    );
  },
  async updateEstateLotConstraint<
    T = CreateLotConstraintResponse,
    B extends UpdateLotConstraintPayload = UpdateLotConstraintPayload
  >(estateId: AdminId, id: AdminId, payload: B): Promise<T> {
    return data(
      adminApiClient.patch<T>(estateLotConstraintPath(estateId, id), payload)
    );
  },
  async deleteEstateLotConstraint<T = unknown>(
    estateId: AdminId,
    id: AdminId
  ): Promise<T> {
    return data(adminApiClient.delete<T>(estateLotConstraintPath(estateId, id)));
  },
  async getEstateBuilderApprovals<T = unknown>(
    estateId: AdminId,
    params?: AdminQuery
  ): Promise<T[]> {
    return data(
      adminApiClient.get<T[]>(estateBuilderApprovalsPath(estateId), { params })
    );
  },
  async createEstateBuilderApproval<
    T = CreateBuilderEstateApprovalResponse,
    B extends CreateBuilderEstateApprovalPayload =
      CreateBuilderEstateApprovalPayload
  >(estateId: AdminId, payload: B): Promise<T> {
    return data(
      adminApiClient.post<T>(estateBuilderApprovalsPath(estateId), payload)
    );
  },
  async updateEstateBuilderApproval<
    T = CreateBuilderEstateApprovalResponse,
    B extends UpdateBuilderEstateApprovalPayload =
      UpdateBuilderEstateApprovalPayload
  >(estateId: AdminId, builderId: AdminId, payload: B): Promise<T> {
    return data(
      adminApiClient.patch<T>(
        estateBuilderApprovalPath(estateId, builderId),
        payload
      )
    );
  },
  async deleteEstateBuilderApproval<T = unknown>(
    estateId: AdminId,
    builderId: AdminId
  ): Promise<T> {
    return data(
      adminApiClient.delete<T>(estateBuilderApprovalPath(estateId, builderId))
    );
  },
  async recomputeEstateDesignOnLot<T = RecomputeEstateSummary>(
    estateId: AdminId
  ): Promise<T> {
    return data(adminApiClient.post<T>(estateRecomputePath(estateId)));
  },
  async getEstatePerformance<T = EstatePerformanceSummary>(
    estateId: AdminId,
    params?: AdminQuery
  ): Promise<T> {
    return data(adminApiClient.get<T>(estatePerformancePath(estateId), { params }));
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
  async deleteEstateLots<T = DeleteEstateLotsResponse>(
    estateId: AdminId
  ): Promise<T> {
    return data(adminApiClient.delete<T>(`${idPath("estates", estateId)}/lots`));
  },
  async lookupActLandUseZoneByAddress<T = ActLandUseZoneLookupResponse>(
    address: string
  ): Promise<T> {
    return data(
      adminApiClient.get<T>("/geo/act-zone", {
        params: { address },
      })
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

  async getFacades<T = unknown>(floorPlanId: AdminId): Promise<T[]> {
    return data(adminApiClient.get<T[]>(floorPlanFacadesPath(floorPlanId)));
  },
  async createFacade<
    T = unknown,
    B extends Record<string, unknown> = Record<string, unknown>
  >(
    floorPlanId: AdminId,
    payload: B
  ): Promise<T> {
    return data(adminApiClient.post<T>(floorPlanFacadesPath(floorPlanId), payload));
  },
  async updateFacade<
    T = unknown,
    B extends Record<string, unknown> = Record<string, unknown>
  >(
    floorPlanId: AdminId,
    id: AdminId,
    payload: B
  ): Promise<T> {
    return data(
      adminApiClient.patch<T>(floorPlanFacadePath(floorPlanId, id), payload)
    );
  },
  async deleteFacade<T = unknown>(floorPlanId: AdminId, id: AdminId): Promise<T> {
    return data(adminApiClient.delete<T>(floorPlanFacadePath(floorPlanId, id)));
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
  async reviewDesignOnLot<T = unknown, B extends ReviewDesignOnLotPayload = ReviewDesignOnLotPayload>(
    id: AdminId,
    payload: B
  ): Promise<T> {
    return data(adminApiClient.post<T>(designOnLotReviewPath(id), payload));
  },
  async clearDesignOnLotReview<T = unknown>(id: AdminId): Promise<T> {
    return data(adminApiClient.post<T>(designOnLotClearReviewPath(id)));
  },
  async reviewLotDesignOnLots<
    T = ReviewLotDesignOnLotsResponse,
    B extends ReviewLotDesignOnLotsPayload = ReviewLotDesignOnLotsPayload
  >(lotId: AdminId, payload: B): Promise<T> {
    return data(adminApiClient.post<T>(lotDesignOnLotReviewPath(lotId), payload));
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
  async submitBuilderEstateJoinRequest<
    T = { message: string },
    B extends Record<string, unknown> = Record<string, unknown>
  >(id: AdminId, payload: B): Promise<T> {
    return data(adminApiClient.post<T>(builderEstateJoinRequestPath(id), payload));
  },
  async getBuilderApprovedEstates<T = unknown>(id: AdminId): Promise<T[]> {
    return data(adminApiClient.get<T[]>(builderApprovedEstatesPath(id)));
  },
  async getEstateUsers<T = unknown>(id: AdminId): Promise<T[]> {
    return data(adminApiClient.get<T[]>(`${idPath("estates", id)}/users`));
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
  async getBuilderLeads<T = BuilderLeadsResponse>(
    id: AdminId,
    params?: AdminQuery
  ): Promise<T> {
    return data(adminApiClient.get<T>(builderLeadsPath(id), { params }));
  },
  async getBuilderPerformance<T = BuilderPerformanceSummary>(
    id: AdminId,
    params?: AdminQuery
  ): Promise<T> {
    return data(adminApiClient.get<T>(builderPerformancePath(id), { params }));
  },
  async updateBuilderLeadStatus<
    T = { leadId: string; enquiryId: string; status: string; updatedAt: string },
    B extends Record<string, unknown> = Record<string, unknown>
  >(id: AdminId, leadId: AdminId, payload: B): Promise<T> {
    return data(adminApiClient.patch<T>(builderLeadPath(id, leadId), payload));
  },
  async exportBuilderLeadsCsv(id: AdminId, params?: AdminQuery): Promise<Blob> {
    const response = await adminApiClient.get(builderLeadsExportPath(id), {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
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
  async getAuditLog<T = AuditLogResponse>(params?: AdminQuery): Promise<T> {
    return data(adminApiClient.get<T>(auditLogPath(), { params }));
  },
  async trackAuditLogin<T = { message: string }>(): Promise<T> {
    return data(adminApiClient.post<T>(`${auditLogPath()}/login`));
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
