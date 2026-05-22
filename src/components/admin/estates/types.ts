import type { Jurisdiction } from "@/lib/api/adminModels";

export const ESTATE_ACCESS_STATUSES = ["LIVE", "GATED"] as const;

export type EstateAccessStatus = (typeof ESTATE_ACCESS_STATUSES)[number];

export type EstateRecord = {
  id: string;
  name?: string | null;
  jurisdiction?: Jurisdiction | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  backgroundImageUrl?: string | null;
  backgroundImageNorth?: number | null;
  backgroundImageSouth?: number | null;
  backgroundImageEast?: number | null;
  backgroundImageWest?: number | null;
  isPrototype?: boolean | null;
  status?: EstateAccessStatus | null;
  hasAccessPassword?: boolean | null;
  brandSetting?:
    | {
        guid?: string | null;
        name?: string | null;
        title?: string | null;
      }
    | null;
  [key: string]: unknown;
};

export type EstateCreatePayload = {
  name: string;
  jurisdiction: Jurisdiction;
  address?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  status?: EstateAccessStatus;
  accessPassword?: string;
};
