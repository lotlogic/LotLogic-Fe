import type { AdminWhoAmI } from "@/lib/admin/adminSession";
import { normalizeId } from "@/lib/utils/ids";

export type DashboardAccess = {
  builderIds: string[];
  estateIds: string[];
};

export type DashboardAccessResolution = {
  access: DashboardAccess;
  hasAssignments: boolean;
};

const parseIdList = (value: unknown): string[] => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    const ids = value
      .map((entry) => normalizeId(entry))
      .filter((entry): entry is string => Boolean(entry));
    return Array.from(new Set(ids));
  }
  if (typeof value === "string") {
    const parts = value
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    return Array.from(new Set(parts));
  }
  return [];
};

export const resolveDashboardAccess = (
  whoAmI: AdminWhoAmI | null
): DashboardAccessResolution => {
  if (!whoAmI || typeof whoAmI !== "object") {
    return { access: { builderIds: [], estateIds: [] }, hasAssignments: false };
  }
  const record = whoAmI as Record<string, unknown>;
  const hasAssignments =
    "builderIds" in record ||
    "builders" in record ||
    "assignedBuilderIds" in record ||
    "builderAssignments" in record ||
    "estateIds" in record ||
    "estates" in record ||
    "assignedEstateIds" in record ||
    "estateAssignments" in record;

  const builderIds = parseIdList(
    record.builderIds ??
      record.builders ??
      record.assignedBuilderIds ??
      record.builderAssignments
  );
  const estateIds = parseIdList(
    record.estateIds ??
      record.estates ??
      record.assignedEstateIds ??
      record.estateAssignments
  );

  return { access: { builderIds, estateIds }, hasAssignments };
};
