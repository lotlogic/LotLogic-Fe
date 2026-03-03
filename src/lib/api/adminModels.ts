export const JURISDICTIONS = ["NSW", "ACT"] as const;
export type Jurisdiction = (typeof JURISDICTIONS)[number];

export const RULE_SET_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type RuleSetStatus = (typeof RULE_SET_STATUSES)[number];

export const BUILDER_ESTATE_APPROVAL_STATUSES = [
  "APPROVED",
  "REVOKED",
] as const;
export type BuilderEstateApprovalStatus =
  (typeof BUILDER_ESTATE_APPROVAL_STATUSES)[number];

export const DESIGN_ON_LOT_STATUSES = [
  "PASS",
  "FAIL",
  "MANUAL_REVIEW",
] as const;
export type DesignOnLotStatus = (typeof DESIGN_ON_LOT_STATUSES)[number];

export type RuleLayer = {
  minFrontSetbackM?: number | null;
  minRearSetbackM?: number | null;
  minSideSetbackM?: number | null;
  maxSiteCoverageRatio?: number | null;
  minGfaM2?: number | null;
  maxGfaM2?: number | null;
  maxStoreys?: number | null;
  maxBuildingHeightM?: number | null;
  requiresArchitecturalReview?: boolean | null;
  architecturalNotes?: string[] | null;
  [key: string]: unknown;
};

export type RecomputeEstateSummary = {
  estateId: string;
  lotsProcessed: number;
  combinationsProcessed: number;
  pass: number;
  fail: number;
  manualReview: number;
  [key: string]: unknown;
};

export type RecomputeLotSummary = {
  lotId: string;
  processed: number;
  pass: number;
  fail: number;
  manualReview: number;
  [key: string]: unknown;
};

export type RecomputeJurisdictionSummary = {
  jurisdiction: Jurisdiction;
  estatesProcessed: number;
  summaries: RecomputeEstateSummary[];
  [key: string]: unknown;
};

export type RuleSetRecordBase = {
  id: string;
  name?: string | null;
  version?: number | null;
  status?: RuleSetStatus | null;
  rules?: RuleLayer | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
};

export type StateRuleSetRecord = RuleSetRecordBase & {
  jurisdiction?: Jurisdiction | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  sourceUrl?: string | null;
};

export type EstateRuleSetRecord = RuleSetRecordBase & {
  estateId?: string | null;
};

export type LotConstraintRecord = {
  id: string;
  estateId?: string | null;
  lotId?: string | null;
  name?: string | null;
  isActive?: boolean | null;
  rules?: RuleLayer | null;
  notes?: string | null;
  estateRuleSetId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
};

export type BuilderEstateApprovalRecord = {
  id: string;
  estateId?: string | null;
  builderId?: string | null;
  status?: BuilderEstateApprovalStatus | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  builder?: {
    id?: string;
    name?: string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type BuilderLeadLotSummary = {
  id?: string;
  estateId?: string | null;
  blockKey?: string | null;
  blockNumber?: number | null;
  address?: string | null;
  lifecycleStage?: string | null;
  [key: string]: unknown;
};

export type BuilderLeadFloorPlanSummary = {
  id?: string;
  name?: string | null;
  builderId?: string | null;
  [key: string]: unknown;
};

export type BuilderLeadStatus = "PENDING" | "PROCESSED";

export type BuilderPerformanceSummary = {
  builderId: string;
  range?: {
    from?: string;
    to?: string;
    [key: string]: unknown;
  } | null;
  source?: {
    provider?: string;
    configured?: boolean;
    available?: boolean;
    message?: string | null;
    [key: string]: unknown;
  } | null;
  stats?: {
    viewsTotal?: number;
    viewsLast7Days?: number;
    viewsLast30Days?: number;
    uniqueLotsViewed?: number;
    uniqueDesignsViewed?: number;
    [key: string]: unknown;
  } | null;
  viewsByLot?: Array<{
    lotId?: string;
    lotLabel?: string | null;
    lotDbId?: string | null;
    blockKey?: string | null;
    lotKey?: string | null;
    lotDisplayId?: string | null;
    displayLotId?: string | null;
    views?: number;
    [key: string]: unknown;
  }>;
  viewsByDesign?: Array<{
    designId?: string;
    designName?: string | null;
    designLabel?: string | null;
    houseDesignLabel?: string | null;
    builderId?: string | null;
    builderName?: string | null;
    views?: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

export type EstatePerformanceSummary = {
  estateId: string;
  range?: {
    from?: string;
    to?: string;
    [key: string]: unknown;
  } | null;
  source?: {
    provider?: string;
    configured?: boolean;
    available?: boolean;
    message?: string | null;
    [key: string]: unknown;
  } | null;
  stats?: {
    viewsTotal?: number;
    viewsLast7Days?: number;
    viewsLast30Days?: number;
    uniqueLotsViewed?: number;
    uniqueDesignsViewed?: number;
    uniqueBuildersViewed?: number;
    enquiriesTotal?: number;
    enquiriesHot?: number;
    enquiriesLast7Days?: number;
    enquiriesLast30Days?: number;
    enquiriesPending?: number;
    enquiriesProcessed?: number;
    totalMatchedPlans?: number;
    [key: string]: unknown;
  } | null;
  viewsByLot?: Array<{
    lotId?: string;
    lotLabel?: string | null;
    views?: number;
    [key: string]: unknown;
  }>;
  viewsByDesign?: Array<{
    designId?: string;
    designName?: string | null;
    builderId?: string | null;
    builderName?: string | null;
    views?: number;
    [key: string]: unknown;
  }>;
  viewsByBuilder?: Array<{
    builderId?: string;
    builderName?: string | null;
    views?: number;
    [key: string]: unknown;
  }>;
  matchesByDesign?: Array<{
    designId?: string;
    designName?: string | null;
    builderId?: string | null;
    builderName?: string | null;
    matches?: number;
    [key: string]: unknown;
  }>;
  enquiriesByLot?: Array<{
    lotId?: string;
    lotLabel?: string | null;
    enquiries?: number;
    [key: string]: unknown;
  }>;
  enquiriesByBuilder?: Array<{
    builderId?: string;
    builderName?: string | null;
    enquiries?: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

export type BuilderLeadEnquiry = {
  id?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  comments?: string | null;
  hotLead?: boolean | null;
  status?: BuilderLeadStatus | null;
  estateId?: string | null;
  lotId?: string | null;
  floorPlanId?: string | null;
  facadeId?: string | null;
  createdAt?: string | null;
  lot?: BuilderLeadLotSummary | null;
  floorPlan?: BuilderLeadFloorPlanSummary | null;
  [key: string]: unknown;
};

export type BuilderLeadRecord = {
  id: string;
  builderId?: string | null;
  createdAt?: string | null;
  enquiry?: BuilderLeadEnquiry | null;
  [key: string]: unknown;
};

export type BuilderLeadsResponse = {
  builder?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    [key: string]: unknown;
  } | null;
  filters?: {
    hotLead?: boolean | null;
    status?: BuilderLeadStatus | null;
    [key: string]: unknown;
  } | null;
  pagination?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
    [key: string]: unknown;
  } | null;
  stats?: {
    totalSubmitted?: number;
    hotLeadSubmitted?: number;
    submittedLast7Days?: number;
    submittedLast30Days?: number;
    pendingSubmitted?: number;
    processedSubmitted?: number;
    [key: string]: unknown;
  } | null;
  items?: BuilderLeadRecord[];
  [key: string]: unknown;
};

export type DesignOnLotRecord = {
  id: string;
  lotId?: string | null;
  floorPlanId?: string | null;
  status?: DesignOnLotStatus | null;
  reasons?: string[] | null;
  failReasons?: string[] | null;
  manualReviewReasons?: string[] | null;
  matchedFilters?: Record<string, unknown> | null;
  assessedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  lot?: {
    id?: string;
    blockKey?: string | null;
    blockNumber?: number | null;
    address?: string | null;
    areaSqm?: number | null;
    zoning?: string | null;
    lifecycleStage?: string | null;
    frontageM?: number | null;
    lotType?: string | null;
    roadFacing?: string | null;
    precinct?: string | null;
    estate?: {
      id?: string;
      name?: string | null;
      jurisdiction?: string | null;
      [key: string]: unknown;
    } | null;
    [key: string]: unknown;
  } | null;
  floorPlan?: {
    id?: string;
    name?: string | null;
    floorplanUrl?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    garages?: number | null;
    areaSqm?: number | null;
    width?: number | null;
    depth?: number | null;
    storeys?: number | null;
    buildingHeight_m?: number | null;
    builder?: {
      id?: string;
      name?: string | null;
      [key: string]: unknown;
    } | null;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
};

export type CreateStateRuleSetPayload = {
  jurisdiction: Jurisdiction;
  name: string;
  version: number;
  status: RuleSetStatus;
  effectiveFrom: string;
  effectiveTo?: string | null;
  rules: RuleLayer;
  sourceUrl?: string | null;
  notes?: string | null;
};

export type CreateEstateRuleSetPayload = {
  name: string;
  version: number;
  status: RuleSetStatus;
  rules: RuleLayer;
  notes?: string | null;
};

export type UpdateStateRuleSetPayload = Partial<CreateStateRuleSetPayload>;

export type UpdateEstateRuleSetPayload = Partial<CreateEstateRuleSetPayload>;

export type CreateLotConstraintPayload = {
  lotId: string;
  name: string;
  isActive: boolean;
  rules: RuleLayer;
  notes?: string | null;
  estateRuleSetId?: string | null;
};

export type UpdateLotConstraintPayload = Partial<CreateLotConstraintPayload>;

export type CreateBuilderEstateApprovalPayload = {
  builderId: string;
  status: BuilderEstateApprovalStatus;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  notes?: string | null;
};

export type UpdateBuilderEstateApprovalPayload =
  Partial<CreateBuilderEstateApprovalPayload>;

export type CreateStateRuleSetResponse = {
  ruleSet: StateRuleSetRecord;
  recompute?: RecomputeJurisdictionSummary;
  [key: string]: unknown;
};

export type CreateEstateRuleSetResponse = {
  ruleSet: EstateRuleSetRecord;
  recompute?: RecomputeEstateSummary;
  [key: string]: unknown;
};

export type CreateLotConstraintResponse = {
  constraint: LotConstraintRecord;
  recompute?: RecomputeLotSummary;
  [key: string]: unknown;
};

export type CreateBuilderEstateApprovalResponse = {
  approval: BuilderEstateApprovalRecord;
  recompute?: RecomputeEstateSummary;
  [key: string]: unknown;
};
