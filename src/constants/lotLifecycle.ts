export const LOT_LIFECYCLE_VALUES = [
  "available",
  "reserved",
  "sold",
] as const;

export type LotLifecycleValue = (typeof LOT_LIFECYCLE_VALUES)[number];

const LEGACY_LIFECYCLE_ALIASES: Record<string, LotLifecycleValue> = {
  unavailable: "reserved",
};

const LOT_LIFECYCLE_LABELS: Record<LotLifecycleValue, string> = {
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
};

export const LOT_LIFECYCLE_OPTIONS: ReadonlyArray<{
  value: LotLifecycleValue;
  label: string;
}> = [
  {
    value: "available",
    label: "Available - visible to buyers, eligible for plan matching",
  },
  {
    value: "reserved",
    label: "Reserved",
  },
  {
    value: "sold",
    label: "Sold",
  },
];

export const normalizeLotLifecycle = (
  value: unknown
): LotLifecycleValue | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized in LEGACY_LIFECYCLE_ALIASES) {
    return LEGACY_LIFECYCLE_ALIASES[normalized];
  }

  return LOT_LIFECYCLE_VALUES.includes(normalized as LotLifecycleValue)
    ? (normalized as LotLifecycleValue)
    : null;
};

export const getLotLifecycleLabel = (
  value: LotLifecycleValue | null | undefined
) => {
  if (!value) {
    return "--";
  }
  return LOT_LIFECYCLE_LABELS[value] ?? value;
};
