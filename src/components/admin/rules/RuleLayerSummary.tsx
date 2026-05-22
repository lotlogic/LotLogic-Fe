import {
  CONDITIONAL_RULE_SECTION_CONFIG,
  RULE_LAYER_FIELD_CONFIG,
  type ConditionalSectionConfig,
} from "@/components/admin/rules/ruleSetFormConfig";

type RuleLayerSummaryProps = {
  rules?: Record<string, unknown> | null;
  emptyMessage?: string;
};

type RuleDisplayEntry = {
  key: string;
  label: string;
  value: string | string[];
};

const FIELD_CONFIG_BY_KEY = new Map(
  RULE_LAYER_FIELD_CONFIG.map((field) => [field.key, field]),
);

const CONDITIONAL_SECTION_KEYS: Set<string> = new Set(
  CONDITIONAL_RULE_SECTION_CONFIG.map((section) => section.key),
);

const NUMBER_FORMATTER = new Intl.NumberFormat("en-AU", {
  maximumFractionDigits: 2,
});

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
};

const humanizeKey = (key: string): string =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bGfa\b/g, "GFA")
    .replace(/\bM2\b/g, "m2");

const formatNumber = (value: number): string => NUMBER_FORMATTER.format(value);

const formatRuleValue = (
  key: string,
  value: unknown,
): string | string[] | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (key === "requiresArchitecturalReview" && typeof value === "boolean") {
    return value ? "Required" : "Not required";
  }

  const stringArray = asStringArray(value);
  if (stringArray.length > 0) {
    return stringArray;
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  const numericValue = toFiniteNumber(value);
  if (numericValue !== null) {
    if (key === "maxSiteCoverageRatio") {
      if (numericValue <= 1) {
        return `${formatNumber(numericValue * 100)}% (${formatNumber(numericValue)} ratio)`;
      }
      return `${formatNumber(numericValue)}%`;
    }
    if (
      key === "minFrontSetbackM" ||
      key === "minRearSetbackM" ||
      key === "minSideSetbackM" ||
      key === "maxBuildingHeightM"
    ) {
      return `${formatNumber(numericValue)} m`;
    }
    if (key === "minGfaM2" || key === "maxGfaM2") {
      return `${formatNumber(numericValue)} m2`;
    }
    if (key === "maxStoreys") {
      return `${formatNumber(numericValue)} storeys`;
    }
    return formatNumber(numericValue);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  return null;
};

const getCoreRuleEntries = (rules: Record<string, unknown>): RuleDisplayEntry[] => {
  const entries: RuleDisplayEntry[] = [];
  const usedKeys = new Set<string>();

  RULE_LAYER_FIELD_CONFIG.forEach((field) => {
    const formatted = formatRuleValue(field.key, rules[field.key]);
    if (!formatted) {
      return;
    }
    usedKeys.add(field.key);
    entries.push({
      key: field.key,
      label: field.label,
      value: formatted,
    });
  });

  const additionalEntries: RuleDisplayEntry[] = [];
  Object.entries(rules).forEach(([key, rawValue]) => {
    if (usedKeys.has(key) || CONDITIONAL_SECTION_KEYS.has(key)) {
      return;
    }
    if (asRecord(rawValue)) {
      return;
    }
    const formatted = formatRuleValue(key, rawValue);
    if (!formatted) {
      return;
    }
    additionalEntries.push({
      key,
      label: humanizeKey(key),
      value: formatted,
    });
  });

  additionalEntries.sort((left, right) => left.label.localeCompare(right.label));
  return [...entries, ...additionalEntries];
};

const formatRangeCondition = (
  label: string,
  min: number | null,
  max: number | null,
  unit?: string,
): string | null => {
  if (min === null && max === null) {
    return null;
  }
  const withUnit = (value: number) =>
    unit ? `${formatNumber(value)} ${unit}` : formatNumber(value);
  if (min !== null && max !== null) {
    return `${label}: ${withUnit(min)} to ${withUnit(max)}`;
  }
  if (min !== null) {
    return `${label}: at least ${withUnit(min)}`;
  }
  return `${label}: up to ${withUnit(max as number)}`;
};

const formatArrayCondition = (label: string, values: string[]): string | null => {
  if (values.length === 0) {
    return null;
  }
  return `${label}: ${values.join(", ")}`;
};

const rangeFromRule = (
  value: unknown,
): { min: number | null; max: number | null } => {
  const record = asRecord(value);
  if (!record) {
    return { min: null, max: null };
  }
  return {
    min: toFiniteNumber(record.min),
    max: toFiniteNumber(record.max),
  };
};

const getSectionConditions = (
  sectionKey: ConditionalSectionConfig["key"],
  entry: Record<string, unknown>,
): string[] => {
  const lines: Array<string | null> = [];

  switch (sectionKey) {
    case "lotAreaBands":
      lines.push(
        formatRangeCondition(
          "Lot area",
          toFiniteNumber(entry.minAreaSqm),
          toFiniteNumber(entry.maxAreaSqm),
          "m2",
        ),
      );
      break;
    case "lotWidthBands":
      lines.push(
        formatRangeCondition(
          "Lot width",
          toFiniteNumber(entry.minLotWidthM),
          toFiniteNumber(entry.maxLotWidthM),
          "m",
        ),
      );
      break;
    case "frontageBands":
      lines.push(
        formatRangeCondition(
          "Frontage",
          toFiniteNumber(entry.minFrontageM),
          toFiniteNumber(entry.maxFrontageM),
          "m",
        ),
      );
      break;
    case "lotTypeRules":
      lines.push(formatArrayCondition("Lot type", asStringArray(entry.lotTypeIn)));
      break;
    case "roadFacingRules":
      lines.push(
        formatArrayCondition("Road facing", asStringArray(entry.roadFacingIn)),
      );
      break;
    case "stageRules":
      lines.push(
        formatArrayCondition(
          "Lifecycle stage",
          asStringArray(entry.lifecycleStageIn),
        ),
      );
      break;
    case "precinctRules":
      lines.push(formatArrayCondition("Precinct", asStringArray(entry.precinctIn)));
      break;
    case "conditionalRules": {
      const when = asRecord(entry.when) ?? entry;
      const areaRange = rangeFromRule(when.lotAreaSqm);
      const widthRange = rangeFromRule(when.lotWidthM);
      const frontageRange = rangeFromRule(when.frontageM);

      lines.push(
        formatRangeCondition("Lot area", areaRange.min, areaRange.max, "m2"),
      );
      lines.push(
        formatRangeCondition("Lot width", widthRange.min, widthRange.max, "m"),
      );
      lines.push(
        formatRangeCondition(
          "Frontage",
          frontageRange.min,
          frontageRange.max,
          "m",
        ),
      );
      lines.push(formatArrayCondition("Lot type", asStringArray(when.lotTypeIn)));
      lines.push(
        formatArrayCondition("Road facing", asStringArray(when.roadFacingIn)),
      );
      lines.push(
        formatArrayCondition(
          "Lifecycle stage",
          asStringArray(when.lifecycleStageIn),
        ),
      );
      lines.push(formatArrayCondition("Precinct", asStringArray(when.precinctIn)));
      break;
    }
    default:
      break;
  }

  return lines.filter((line): line is string => Boolean(line));
};

const renderEntryValue = (value: string | string[]) => {
  if (Array.isArray(value)) {
    return (
      <ul className="m-0 list-disc space-y-0.5 pl-4 text-sm text-slate-900">
        {value.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    );
  }
  return <span className="text-sm text-slate-900">{value}</span>;
};

export const RuleLayerSummary = ({
  rules,
  emptyMessage = "No rules defined.",
}: RuleLayerSummaryProps) => {
  const parsedRules = asRecord(rules);

  if (!parsedRules || Object.keys(parsedRules).length === 0) {
    return <p className="m-0 text-xs text-muted-foreground">{emptyMessage}</p>;
  }

  const coreEntries = getCoreRuleEntries(parsedRules);
  const sectionSummaries = CONDITIONAL_RULE_SECTION_CONFIG.map((section) => {
    const rawValue = parsedRules[section.key];
    if (!Array.isArray(rawValue) || rawValue.length === 0) {
      return null;
    }

    const rows = rawValue
      .map((entry, index) => {
        const record = asRecord(entry);
        if (!record) {
          return null;
        }
        const title =
          typeof record.label === "string" && record.label.trim()
            ? record.label.trim()
            : `${section.label} ${index + 1}`;
        const conditions = getSectionConditions(section.key, record);
        const overridesRecord = asRecord(record.rules);
        const overrides = overridesRecord ? getCoreRuleEntries(overridesRecord) : [];
        return {
          title,
          conditions,
          overrides,
        };
      })
      .filter(Boolean) as Array<{
      title: string;
      conditions: string[];
      overrides: RuleDisplayEntry[];
    }>;

    if (rows.length === 0) {
      return null;
    }

    return {
      key: section.key,
      label: section.label,
      rows,
    };
  }).filter(Boolean) as Array<{
    key: string;
    label: string;
    rows: Array<{
      title: string;
      conditions: string[];
      overrides: RuleDisplayEntry[];
    }>;
  }>;

  const additionalPayload = Object.fromEntries(
    Object.entries(parsedRules).filter(([key, value]) => {
      if (FIELD_CONFIG_BY_KEY.has(key) || CONDITIONAL_SECTION_KEYS.has(key)) {
        return false;
      }
      return asRecord(value) !== null || (Array.isArray(value) && asStringArray(value).length === 0);
    }),
  );

  const hasContent = coreEntries.length > 0 || sectionSummaries.length > 0;

  if (!hasContent) {
    return (
      <pre className="m-0 overflow-auto rounded-md border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-800">
        {JSON.stringify(parsedRules, null, 2)}
      </pre>
    );
  }

  return (
    <div className="grid gap-3">
      {coreEntries.length > 0 && (
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <p className="m-0 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
            Core Constraints
          </p>
          <dl className="mt-2 grid gap-2 md:grid-cols-2">
            {coreEntries.map((entry) => (
              <div
                key={entry.key}
                className="rounded-md border border-slate-100 bg-slate-50 p-2"
              >
                <dt className="text-xs font-medium text-slate-600">{entry.label}</dt>
                <dd className="m-0 mt-1">{renderEntryValue(entry.value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {sectionSummaries.map((section) => (
        <div
          key={section.key}
          className="rounded-md border border-slate-200 bg-white p-3"
        >
          <p className="m-0 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
            {section.label}
          </p>
          <div className="mt-2 grid gap-2">
            {section.rows.map((row, index) => (
              <div
                key={`${section.key}-${row.title}-${index}`}
                className="rounded-md border border-slate-100 bg-slate-50 p-2"
              >
                <p className="m-0 text-sm font-semibold text-slate-900">
                  {row.title}
                </p>
                {row.conditions.length > 0 ? (
                  <ul className="m-0 mt-1 list-disc space-y-0.5 pl-4 text-xs text-slate-600">
                    {row.conditions.map((condition, conditionIndex) => (
                      <li key={`${condition}-${conditionIndex}`}>{condition}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 mt-1 text-xs text-slate-500">
                    Applies when this condition is matched.
                  </p>
                )}

                {row.overrides.length > 0 ? (
                  <dl className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {row.overrides.map((override) => (
                      <div key={override.key}>
                        <dt className="text-[11px] font-medium text-slate-600">
                          {override.label}
                        </dt>
                        <dd className="m-0 text-xs text-slate-900">
                          {Array.isArray(override.value)
                            ? override.value.join("; ")
                            : override.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="m-0 mt-2 text-xs text-slate-500">
                    No rule overrides in this condition.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {Object.keys(additionalPayload).length > 0 && (
        <details className="rounded-md border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer text-xs font-medium text-slate-600">
            Additional payload
          </summary>
          <pre className="m-0 mt-2 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2 text-xs leading-relaxed text-slate-800">
            {JSON.stringify(additionalPayload, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default RuleLayerSummary;
