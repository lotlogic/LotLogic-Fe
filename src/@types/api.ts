export type GeoApi = {
  formattedAddress: string;
  location: {
    lat: number;
    lng: number;
  };
  source: string;
  block: Block;
  zone: Zone;
  lotCheckRules: {
    zoneCode: string;
    blockAreaSqm: number;
    matches: LotRule[];
  };
};

export type Block = {
  objectId: number | null;
  blockKey: string | null;
  blockNumber: number | null;
  sectionNumber: number | null;
  derivedAreaSqm: string | null;
  properties: Property | null;
};

export type Property = {
  ID: number | null;
  OBJECTID: number | null;
  DISTRICT_CODE: number | null;
  DISTRICT_NAME: string | null;
  DIVISION_CODE: number | null;
  DIVISION_NAME: string | null;
  DISTRICT_SHORT: string | null;
  DIVISION_SHORT: string | null;
  CURRENT_LIFECYCLE_STAGE: string | null;
  TYPE?: string | null;
  GlobalID?: string | null;
  ADDRESSES?: string | null;
  AP_NUMBER?: string | null;
  BLOCK_KEY?: number | null;
  WATER_FLAG?: string | null;
  LAST_UPDATE?: string | null;
  BLOCK_NUMBER?: number | null;
  GROUND_LEVEL?: string | null;
  PLAN_NUMBERS?: string | null;
  VOLUME_FOLIO?: string | null;
  BLOCK_SECTION?: string | null;
  BLOCK_TYPE_ID?: string | null;
  SECTION_NUMBER?: number | null;
  SENSITIVE_FLAG?: string | null;
  TRANSITION_FLAG?: string | null;
  STRATUM_DATUM_ID?: string | null;
  BLOCK_LEASED_AREA?: string | null;
  DEPOSITED_PLAN_NO?: string | null;
  BLOCK_DERIVED_AREA?: string | null;
  NEW_TERRITORY_PLAN?: string | null;
  STRATUM_LOWEST_LEVEL?: string | null;
  LAND_USE_POLICY_ZONES?: string | null;
  STRATUM_HIGHEST_LEVEL?: string | null;
  OVERLAY_PROVISION_ZONES?: string | null;
  DESCRIPTION?: string | null;
  GAZETTAL_DATE?: string | null;
  VARIATION_YEAR?: string | null;
  GAZETTAL_NUMBER?: string | null;
  DEGAZETTAL_NUMBER?: string | null;
  LAND_USE_POLICY_DESC?: string | null;
  LAND_USE_ZONE_CODE_ID?: string | null;
};

export type Zone = {
  objectId: number | null;
  zoneCode: string | null;
  properties: Property | null;
};

export type LotRule = {
  zone: string | null;
  pathway: string | null;
  parameter: string | null;
  units: string | null;
  confidence: string | null;
  sourceCitation: string | null;
  notes: string | null;
  explanation: string | null;
  explanationResolved: string | null;
  current: {
    kind: string | null;
    raw: string | null;
    operator: string | null;
    value: number | boolean;
  };
  draft: {
    kind: string | null;
    raw: string | null;
  };
  evaluation: {
    currentMeetsRule: boolean | null;
    draftMeetsRule: boolean | null;
  };
};
