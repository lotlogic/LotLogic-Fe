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

export type DesignOnLotRecord = {
  id: string;
  lotId?: string | null;
  floorPlanId?: string | null;
  status?: DesignOnLotStatus | null;
  reasons?: string[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
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
