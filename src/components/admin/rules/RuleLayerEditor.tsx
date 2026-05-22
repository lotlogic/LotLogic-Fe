import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { RuleLayer } from "@/lib/api/adminModels";
import {
  CONDITIONAL_RULE_SECTION_CONFIG,
  RULE_LAYER_FIELD_CONFIG,
} from "@/components/admin/rules/ruleSetFormConfig";

type RuleLayerEditorProps = {
  value: string;
  onChange: (value: string) => void;
  idPrefix?: string;
};

type EditorMode = "structured" | "json";
type FormatFeedback =
  | { tone: "success" | "error"; message: string }
  | null;

const parseRuleLayer = (value: string): {
  rules: RuleLayer | null;
  error: string | null;
} => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { rules: {}, error: null };
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        rules: null,
        error: "Rules must be a JSON object.",
      };
    }
    return { rules: parsed as RuleLayer, error: null };
  } catch (error) {
    return {
      rules: null,
      error: error instanceof Error ? error.message : "Invalid rules JSON.",
    };
  }
};

const buildSectionDrafts = (rules: RuleLayer | null) =>
  Object.fromEntries(
    CONDITIONAL_RULE_SECTION_CONFIG.map((section) => {
      const sectionValue = rules?.[section.key];
      const normalized = Array.isArray(sectionValue) ? sectionValue : [];
      return [section.key, JSON.stringify(normalized, null, 2)];
    })
  ) as Record<string, string>;

const safeStringify = (value: RuleLayer) => JSON.stringify(value, null, 2);

const getNumericValue = (rules: RuleLayer | null, key: string) => {
  if (!rules) {
    return "";
  }
  const value = rules[key];
  return typeof value === "number" ? String(value) : "";
};

const getBooleanValue = (rules: RuleLayer | null, key: string) => {
  if (!rules) {
    return "";
  }
  const value = rules[key];
  return typeof value === "boolean" ? String(value) : "";
};

const getStringArrayValue = (rules: RuleLayer | null, key: string) => {
  if (!rules) {
    return "";
  }
  const value = rules[key];
  if (!Array.isArray(value)) {
    return "";
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .join("\n");
};

export const RuleLayerEditor = ({
  value,
  onChange,
  idPrefix = "rule-layer",
}: RuleLayerEditorProps) => {
  const [mode, setMode] = useState<EditorMode>("structured");
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, string>>({});
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({});
  const [formatFeedback, setFormatFeedback] = useState<FormatFeedback>(null);

  const parsed = useMemo(() => parseRuleLayer(value), [value]);
  const canEditStructured = Boolean(parsed.rules) && !parsed.error;

  useEffect(() => {
    setSectionDrafts(buildSectionDrafts(parsed.rules));
    setSectionErrors({});
  }, [parsed.rules]);

  const updateRules = (updater: (next: RuleLayer) => void) => {
    if (!parsed.rules) {
      return;
    }
    const nextRules: RuleLayer = { ...parsed.rules };
    updater(nextRules);
    onChange(safeStringify(nextRules));
  };

  const handleNumberChange = (key: string, rawValue: string) => {
    if (!canEditStructured) {
      return;
    }
    const trimmed = rawValue.trim();
    updateRules((next) => {
      if (!trimmed) {
        delete next[key];
        return;
      }
      const parsedNumber = Number(trimmed);
      if (!Number.isFinite(parsedNumber)) {
        return;
      }
      next[key] = parsedNumber;
    });
  };

  const handleBooleanChange = (key: string, rawValue: string) => {
    if (!canEditStructured) {
      return;
    }
    updateRules((next) => {
      if (!rawValue) {
        delete next[key];
        return;
      }
      next[key] = rawValue === "true";
    });
  };

  const handleStringArrayChange = (key: string, rawValue: string) => {
    if (!canEditStructured) {
      return;
    }
    updateRules((next) => {
      const values = rawValue
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (values.length === 0) {
        delete next[key];
        return;
      }
      next[key] = values;
    });
  };

  const handleApplySection = (key: string) => {
    if (!canEditStructured) {
      return;
    }
    const draft = (sectionDrafts[key] ?? "").trim();
    if (!draft) {
      updateRules((next) => {
        delete next[key];
      });
      setSectionErrors((prev) => ({ ...prev, [key]: "" }));
      return;
    }
    try {
      const parsedValue = JSON.parse(draft) as unknown;
      if (!Array.isArray(parsedValue)) {
        setSectionErrors((prev) => ({
          ...prev,
          [key]: "This section must be a JSON array.",
        }));
        return;
      }
      updateRules((next) => {
        next[key] = parsedValue;
      });
      setSectionErrors((prev) => ({ ...prev, [key]: "" }));
    } catch (error) {
      setSectionErrors((prev) => ({
        ...prev,
        [key]:
          error instanceof Error
            ? `Invalid JSON: ${error.message}`
            : "Invalid JSON.",
      }));
    }
  };

  const handleFormatJson = () => {
    const nextParsed = parseRuleLayer(value);
    if (!nextParsed.rules || nextParsed.error) {
      setFormatFeedback({
        tone: "error",
        message: nextParsed.error ?? "Rules JSON is invalid.",
      });
      return;
    }
    onChange(safeStringify(nextParsed.rules));
    setFormatFeedback({
      tone: "success",
      message: "JSON formatted.",
    });
  };

  return (
    <div className="grid gap-4">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        State rules provide the baseline. Estate and lot rules overlay that
        baseline, with stricter outcomes taking precedence. Setting
        <code className="mx-1 rounded bg-slate-100 px-1 py-0.5">
          requiresArchitecturalReview
        </code>
        routes matches to <strong>MANUAL_REVIEW</strong>.
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={mode === "structured" ? "primary" : "outline"}
          className="h-8 px-2 text-xs"
          label="Structured editor"
          onClick={() => setMode("structured")}
        />
        <Button
          type="button"
          variant={mode === "json" ? "primary" : "outline"}
          className="h-8 px-2 text-xs"
          label="Raw JSON"
          onClick={() => setMode("json")}
        />
        {mode === "json" && (
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-2 text-xs"
            label="Format JSON"
            onClick={handleFormatJson}
          />
        )}
      </div>
      {formatFeedback && (
        <p
          className={`m-0 text-xs ${
            formatFeedback.tone === "error"
              ? "text-destructive"
              : "text-emerald-600"
          }`}
        >
          {formatFeedback.message}
        </p>
      )}

      {mode === "structured" && (
        <div className="grid gap-4 rounded-md border border-slate-100 bg-slate-50 p-4">
          {!canEditStructured && (
            <div className="rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-600">
              Fix raw JSON to continue using structured editing.
              {parsed.error ? ` ${parsed.error}` : ""}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {RULE_LAYER_FIELD_CONFIG.filter((field) => field.type !== "string-array").map(
              (field) => (
                <div key={field.key} className="grid gap-2">
                  <label
                    htmlFor={`${idPrefix}-${field.key}`}
                    className="text-sm font-medium"
                  >
                    {field.label}
                  </label>
                  {field.type === "number" ? (
                    <Input
                      id={`${idPrefix}-${field.key}`}
                      value={getNumericValue(parsed.rules, field.key)}
                      onChange={(event) =>
                        handleNumberChange(field.key, event.target.value)
                      }
                      type="number"
                      step={field.step ?? "any"}
                      min={field.min}
                      className="w-full"
                      placeholder={field.placeholder}
                      disabled={!canEditStructured}
                    />
                  ) : (
                    <select
                      id={`${idPrefix}-${field.key}`}
                      value={getBooleanValue(parsed.rules, field.key)}
                      onChange={(event) =>
                        handleBooleanChange(field.key, event.target.value)
                      }
                      className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
                      disabled={!canEditStructured}
                    >
                      <option value="">(not set)</option>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  )}
                  {field.helpText && (
                    <p className="text-xs text-slate-500 m-0">{field.helpText}</p>
                  )}
                </div>
              )
            )}
          </div>

          {RULE_LAYER_FIELD_CONFIG.filter((field) => field.type === "string-array").map(
            (field) => (
              <div key={field.key} className="grid gap-2">
                <label
                  htmlFor={`${idPrefix}-${field.key}`}
                  className="text-sm font-medium"
                >
                  {field.label}
                </label>
                <textarea
                  id={`${idPrefix}-${field.key}`}
                  value={getStringArrayValue(parsed.rules, field.key)}
                  onChange={(event) =>
                    handleStringArrayChange(field.key, event.target.value)
                  }
                  rows={4}
                  spellCheck={false}
                  placeholder={field.placeholder}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
                  disabled={!canEditStructured}
                />
                <p className="text-xs text-slate-500 m-0">
                  One note per line.
                </p>
              </div>
            )
          )}

          <div className="grid gap-3">
            {CONDITIONAL_RULE_SECTION_CONFIG.map((section) => (
              <div
                key={section.key}
                className="rounded-md border border-slate-200 bg-white p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h4 className="text-sm font-semibold m-0">{section.label}</h4>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 px-2 text-xs"
                    label="Apply section"
                    onClick={() => handleApplySection(section.key)}
                    disabled={!canEditStructured}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-0 mb-2">{section.helpText}</p>
                {(section.schemaSummary ||
                  section.schemaExample ||
                  section.schemaOptions?.length) && (
                  <details className="mb-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                    <summary className="cursor-pointer text-xs font-medium text-slate-700">
                      Schema reference
                    </summary>
                    {section.schemaSummary && (
                      <p className="m-0 mt-2 text-xs text-slate-600">
                        {section.schemaSummary}
                      </p>
                    )}
                    {section.schemaOptions && section.schemaOptions.length > 0 && (
                      <ul className="m-0 mt-2 list-disc pl-5 text-xs text-slate-600">
                        {section.schemaOptions.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    )}
                    {section.schemaExample && (
                      <pre className="mt-2 mb-0 overflow-auto rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-700">
{section.schemaExample}
                      </pre>
                    )}
                  </details>
                )}
                <textarea
                  value={sectionDrafts[section.key] ?? "[]"}
                  onChange={(event) =>
                    setSectionDrafts((prev) => ({
                      ...prev,
                      [section.key]: event.target.value,
                    }))
                  }
                  rows={6}
                  spellCheck={false}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
                  placeholder={section.placeholder}
                  disabled={!canEditStructured}
                />
                {sectionErrors[section.key] && (
                  <p className="text-xs text-red-600 mt-2 mb-0">
                    {sectionErrors[section.key]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === "json" && (
        <div className="grid gap-2">
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={10}
            spellCheck={false}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {parsed.error && (
            <p className="text-xs text-red-600 m-0">JSON error: {parsed.error}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default RuleLayerEditor;
