export type RuleFieldType = "number" | "boolean" | "string-array";

export type RuleFieldConfig = {
  key: string;
  label: string;
  type: RuleFieldType;
  step?: string;
  min?: string;
  placeholder?: string;
  helpText?: string;
};

export type ConditionalSectionConfig = {
  key:
    | "lotAreaBands"
    | "lotWidthBands"
    | "frontageBands"
    | "lotTypeRules"
    | "roadFacingRules"
    | "stageRules"
    | "precinctRules"
    | "conditionalRules";
  label: string;
  helpText: string;
  placeholder: string;
};

export const RULE_LAYER_FIELD_CONFIG: RuleFieldConfig[] = [
  {
    key: "minFrontSetbackM",
    label: "Min Front Setback (m)",
    type: "number",
    step: "0.1",
  },
  {
    key: "minRearSetbackM",
    label: "Min Rear Setback (m)",
    type: "number",
    step: "0.1",
  },
  {
    key: "minSideSetbackM",
    label: "Min Side Setback (m)",
    type: "number",
    step: "0.1",
  },
  {
    key: "maxSiteCoverageRatio",
    label: "Max Site Coverage Ratio",
    type: "number",
    step: "0.01",
    helpText: "Accepts ratio form (0.4) or percent style (40).",
  },
  {
    key: "minGfaM2",
    label: "Min GFA (m2)",
    type: "number",
    step: "1",
  },
  {
    key: "maxGfaM2",
    label: "Max GFA (m2)",
    type: "number",
    step: "1",
  },
  {
    key: "maxStoreys",
    label: "Max Storeys",
    type: "number",
    step: "1",
    min: "1",
  },
  {
    key: "maxBuildingHeightM",
    label: "Max Building Height (m)",
    type: "number",
    step: "0.1",
  },
  {
    key: "requiresArchitecturalReview",
    label: "Requires Architectural Review",
    type: "boolean",
  },
  {
    key: "architecturalNotes",
    label: "Architectural Notes",
    type: "string-array",
    placeholder: "One note per line",
  },
];

export const CONDITIONAL_RULE_SECTION_CONFIG: ConditionalSectionConfig[] = [
  {
    key: "lotAreaBands",
    label: "Lot Area Bands",
    helpText:
      "Array of area band objects. Backend merges overlaps and applies most restrictive result.",
    placeholder:
      '[{"label":"700-900sqm","minAreaSqm":700,"maxAreaSqm":900,"maxGfaM2":380}]',
  },
  {
    key: "lotWidthBands",
    label: "Lot Width Bands",
    helpText: "Array of width band objects.",
    placeholder:
      '[{"label":"<=12.5m","maxLotWidthM":12.5,"minSideSetbackM":0.9}]',
  },
  {
    key: "frontageBands",
    label: "Frontage Bands",
    helpText: "Array of frontage band objects.",
    placeholder:
      '[{"label":"Narrow frontage","maxFrontageM":12.5,"requiresArchitecturalReview":true}]',
  },
  {
    key: "lotTypeRules",
    label: "Lot Type Rules",
    helpText: "Array of lot type rule objects keyed by lotTypeIn.",
    placeholder:
      '[{"label":"Corner lots","lotTypeIn":["corner"],"rules":{"requiresArchitecturalReview":true}}]',
  },
  {
    key: "roadFacingRules",
    label: "Road Facing Rules",
    helpText:
      "Array of road-facing rule objects keyed by roadFacingIn (case-insensitive contains matching in backend).",
    placeholder:
      '[{"label":"Yass Valley Way","roadFacingIn":["Yass Valley Way"],"rules":{"requiresArchitecturalReview":true}}]',
  },
  {
    key: "stageRules",
    label: "Stage Rules",
    helpText: "Array of stage rule objects keyed by lifecycleStageIn.",
    placeholder:
      '[{"label":"Stage 1","lifecycleStageIn":["Stage 1"],"rules":{"maxSiteCoverageRatio":0.4}}]',
  },
  {
    key: "precinctRules",
    label: "Precinct Rules",
    helpText: "Array of precinct rule objects keyed by precinctIn.",
    placeholder:
      '[{"label":"Precinct A","precinctIn":["Precinct A"],"rules":{"maxGfaM2":430}}]',
  },
  {
    key: "conditionalRules",
    label: "Advanced Conditional Rules",
    helpText: "Array of full conditional rule objects with when + rules.",
    placeholder:
      '[{"label":"Narrow width","when":{"lotWidthM":{"max":12.5}},"rules":{"minSideSetbackM":0.9}}]',
  },
];
