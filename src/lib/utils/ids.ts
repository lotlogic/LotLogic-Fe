export const normalizeId = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const direct = normalizeId(record.id);
    if (direct) {
      return direct;
    }
    const estateId = normalizeId(record.estateId);
    if (estateId) {
      return estateId;
    }
    const builderId = normalizeId(record.builderId);
    if (builderId) {
      return builderId;
    }
    return null;
  }
  return null;
};

export const normalizeIdList = (values: unknown[]): string[] => {
  const ids = values
    .map((value) => normalizeId(value))
    .filter((value): value is string => Boolean(value));
  return Array.from(new Set(ids));
};
