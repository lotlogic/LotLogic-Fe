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
  schemaSummary?: string;
  schemaOptions?: string[];
  schemaExample?: string;
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
    helpText:
      "When true, matching outcomes are routed to MANUAL_REVIEW for assessor sign-off.",
  },
  {
    key: "architecturalNotes",
    label: "Architectural Notes",
    type: "string-array",
    placeholder: "One note per line",
  },
];

const RULE_PAYLOAD_OPTION_LINES: string[] = [
  "Rule payload location: use `rules`.",
  "Allowed rule keys: `minFrontSetbackM`, `minRearSetbackM`, `minSideSetbackM`, `maxSiteCoverageRatio`, `minGfaM2`, `maxGfaM2`, `maxStoreys`, `maxBuildingHeightM`, `requiresArchitecturalReview`, `architecturalNotes`.",
  "All numeric values must be JSON numbers (not quoted strings).",
  "`requiresArchitecturalReview` must be a JSON boolean.",
  "`architecturalNotes` must be an array of strings.",
];

export const CONDITIONAL_RULE_SECTION_CONFIG: ConditionalSectionConfig[] = [
  {
    key: "lotAreaBands",
    label: "Lot Area Bands",
    helpText:
      "Array of area band objects. Backend merges overlaps and applies most restrictive result.",
    placeholder:
      '[{"label":"700-900sqm","minAreaSqm":700,"maxAreaSqm":900,"rules":{"maxGfaM2":380}}]',
    schemaSummary:
      "Accepted keys for this section.",
    schemaOptions: [
      "Label key: `label`.",
      "Lower bound key: `minAreaSqm`.",
      "Upper bound key: `maxAreaSqm`.",
      "At least one bound must be provided (`min*` or `max*`) or the band is ignored.",
      ...RULE_PAYLOAD_OPTION_LINES,
    ],
    schemaExample: `[
  {
    "label": "700-900sqm",
    "minAreaSqm": 700,
    "maxAreaSqm": 900,
    "rules": {
      "minFrontSetbackM": 6,
      "minRearSetbackM": 3,
      "minSideSetbackM": 0.9,
      "maxSiteCoverageRatio": 0.5,
      "minGfaM2": 170,
      "maxGfaM2": 380,
      "maxStoreys": 2,
      "maxBuildingHeightM": 10.5,
      "requiresArchitecturalReview": false,
      "architecturalNotes": ["Roof pitch minimum 22.5 degrees"]
    }
  }
]`,
  },
  {
    key: "lotWidthBands",
    label: "Lot Width Bands",
    helpText: "Array of width band objects.",
    placeholder:
      '[{"label":"<=12.5m","maxLotWidthM":12.5,"rules":{"minSideSetbackM":0.9}}]',
    schemaSummary:
      "Accepted keys for this section.",
    schemaOptions: [
      "Label key: `label`.",
      "Lower bound key: `minLotWidthM`.",
      "Upper bound key: `maxLotWidthM`.",
      "At least one bound must be provided (`min*` or `max*`) or the band is ignored.",
      ...RULE_PAYLOAD_OPTION_LINES,
    ],
    schemaExample: `[
  {
    "label": "<=12.5m",
    "maxLotWidthM": 12.5,
    "rules": {
      "minFrontSetbackM": 6,
      "minRearSetbackM": 3,
      "minSideSetbackM": 0.9
    }
  },
  {
    "label": "15m+ width",
    "minLotWidthM": 15,
    "rules": {
      "maxSiteCoverageRatio": 0.45,
      "maxGfaM2": 430,
      "maxStoreys": 2,
      "maxBuildingHeightM": 10.5,
      "requiresArchitecturalReview": true,
      "architecturalNotes": ["Review roof articulation on wide lots"]
    }
  }
]`,
  },
  {
    key: "frontageBands",
    label: "Frontage Bands",
    helpText: "Array of frontage band objects.",
    placeholder:
      '[{"label":"Narrow frontage","maxFrontageM":12.5,"rules":{"requiresArchitecturalReview":true}}]',
    schemaSummary:
      "Accepted keys for this section.",
    schemaOptions: [
      "Label key: `label`.",
      "Lower bound key: `minFrontageM`.",
      "Upper bound key: `maxFrontageM`.",
      "At least one bound must be provided (`min*` or `max*`) or the band is ignored.",
      ...RULE_PAYLOAD_OPTION_LINES,
    ],
    schemaExample: `[
  {
    "label": "Narrow frontage",
    "maxFrontageM": 12.5,
    "rules": {
      "requiresArchitecturalReview": true,
      "architecturalNotes": ["Narrow frontage facade review required"],
      "minFrontSetbackM": 6
    }
  },
  {
    "label": "Wide frontage",
    "minFrontageM": 16,
    "maxFrontageM": 22,
    "rules": {
      "maxSiteCoverageRatio": 0.5,
      "maxGfaM2": 430,
      "maxStoreys": 2
    }
  }
]`,
  },
  {
    key: "lotTypeRules",
    label: "Lot Type Rules",
    helpText: "Array of lot type rule objects keyed by lotTypeIn.",
    schemaSummary:
      "Accepted keys for this section.",
    schemaOptions: [
      "Label key: `label`.",
      "Matcher key: `lotTypeIn`.",
      "Matcher value must be an array of strings.",
      "At least one lot-type matcher value must be provided or the rule is ignored.",
      ...RULE_PAYLOAD_OPTION_LINES,
    ],
    schemaExample: `[
  {
    "label": "Corner lots",
    "lotTypeIn": ["corner", "battle-axe"],
    "rules": {
      "requiresArchitecturalReview": true,
      "minFrontSetbackM": 6
    }
  },
  {
    "label": "Parallel road lots",
    "lotTypeIn": ["parallel road"],
    "rules": {
      "maxSiteCoverageRatio": 0.45,
      "architecturalNotes": ["Parallel road facade review"]
    }
  },
  {
    "label": "Standard lots",
    "lotTypeIn": ["standard"],
    "rules": {
      "maxGfaM2": 380
    }
  }
]`,
    placeholder:
      '[{"label":"Corner lots","lotTypeIn":["corner"],"rules":{"requiresArchitecturalReview":true}}]',
  },
  {
    key: "roadFacingRules",
    label: "Road Facing Rules",
    helpText:
      "Array of road-facing rule objects keyed by roadFacingIn (case-insensitive contains matching in backend).",
    schemaSummary:
      "Accepted keys for this section.",
    schemaOptions: [
      "Label key: `label`.",
      "Matcher key: `roadFacingIn`.",
      "Matcher value must be an array of strings.",
      "Matching is case-insensitive contains matching in backend (either side can contain the other).",
      "At least one road-facing matcher value must be provided or the rule is ignored.",
      ...RULE_PAYLOAD_OPTION_LINES,
    ],
    schemaExample: `[
  {
    "label": "Yass Valley Way",
    "roadFacingIn": ["Yass Valley Way"],
    "rules": {
      "requiresArchitecturalReview": true
    }
  },
  {
    "label": "Main avenue",
    "roadFacingIn": ["Main Avenue"],
    "rules": {
      "minFrontSetbackM": 6,
      "architecturalNotes": ["Street-facing articulation required"]
    }
  },
  {
    "label": "Secondary road",
    "roadFacingIn": ["Collector Road"],
    "rules": {
      "maxSiteCoverageRatio": 0.5
    }
  }
]`,
    placeholder:
      '[{"label":"Yass Valley Way","roadFacingIn":["Yass Valley Way"],"rules":{"requiresArchitecturalReview":true}}]',
  },
  {
    key: "stageRules",
    label: "Stage Rules",
    helpText: "Array of stage rule objects keyed by lifecycleStageIn.",
    schemaSummary:
      "Accepted keys for this section.",
    schemaOptions: [
      "Label key: `label`.",
      "Matcher key: `lifecycleStageIn`.",
      "Matcher value must be an array of strings.",
      "At least one lifecycle-stage matcher value must be provided or the rule is ignored.",
      ...RULE_PAYLOAD_OPTION_LINES,
    ],
    schemaExample: `[
  {
    "label": "Stage 1",
    "lifecycleStageIn": ["Stage 1"],
    "rules": {
      "maxSiteCoverageRatio": 0.4
    }
  },
  {
    "label": "Stage 2",
    "lifecycleStageIn": ["Stage 2", "Stage 2A"],
    "rules": {
      "maxGfaM2": 430,
      "maxStoreys": 2
    }
  },
  {
    "label": "Stage 3",
    "lifecycleStageIn": ["Stage 3"],
    "rules": {
      "requiresArchitecturalReview": true
    }
  }
]`,
    placeholder:
      '[{"label":"Stage 1","lifecycleStageIn":["Stage 1"],"rules":{"maxSiteCoverageRatio":0.4}}]',
  },
  {
    key: "precinctRules",
    label: "Precinct Rules",
    helpText: "Array of precinct rule objects keyed by precinctIn.",
    schemaSummary:
      "Accepted keys for this section.",
    schemaOptions: [
      "Label key: `label`.",
      "Matcher key: `precinctIn`.",
      "Matcher value must be an array of strings.",
      "At least one precinct matcher value must be provided or the rule is ignored.",
      ...RULE_PAYLOAD_OPTION_LINES,
    ],
    schemaExample: `[
  {
    "label": "Precinct A",
    "precinctIn": ["Precinct A"],
    "rules": {
      "maxGfaM2": 430
    }
  },
  {
    "label": "Precinct B",
    "precinctIn": ["Precinct B"],
    "rules": {
      "minSideSetbackM": 1.2,
      "requiresArchitecturalReview": true
    }
  },
  {
    "label": "Precinct C",
    "precinctIn": ["Precinct C"],
    "rules": {
      "maxSiteCoverageRatio": 0.42
    }
  }
]`,
    placeholder:
      '[{"label":"Precinct A","precinctIn":["Precinct A"],"rules":{"maxGfaM2":430}}]',
  },
  {
    key: "conditionalRules",
    label: "Advanced Conditional Rules",
    helpText: "Array of full conditional rule objects with when + rules.",
    schemaSummary:
      "Accepted keys for this section.",
    schemaOptions: [
      "Label key: `label`.",
      "Condition container key: `when`.",
      "Range conditions must use `lotAreaSqm`, `lotWidthM`, and `frontageM` objects with `min` and/or `max`.",
      "Categorical matchers must use `lotTypeIn`, `roadFacingIn`, `lifecycleStageIn`, and `precinctIn` arrays.",
      "At least one supported condition must be present or the conditional rule is ignored.",
      ...RULE_PAYLOAD_OPTION_LINES,
    ],
    schemaExample: `[
  {
    "label": "Narrow width + stage 1",
    "when": {
      "lotWidthM": { "max": 12.5 },
      "lifecycleStageIn": ["Stage 1"]
    },
    "rules": {
      "minSideSetbackM": 0.9,
      "requiresArchitecturalReview": true
    }
  },
  {
    "label": "Large frontage in precinct A",
    "when": {
      "frontageM": { "min": 16, "max": 22 },
      "precinctIn": ["Precinct A"]
    },
    "rules": {
      "maxGfaM2": 430,
      "maxSiteCoverageRatio": 0.5
    }
  },
  {
    "label": "Large corner lots",
    "when": {
      "lotAreaSqm": { "min": 900, "max": 1500 },
      "lotTypeIn": ["corner"]
    },
    "rules": {
      "maxStoreys": 2,
      "maxBuildingHeightM": 10.5
    }
  }
]`,
    placeholder:
      '[{"label":"Narrow width","when":{"lotWidthM":{"max":12.5}},"rules":{"minSideSetbackM":0.9}}]',
  },
];
