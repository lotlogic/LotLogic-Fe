import type { Jurisdiction } from "@/lib/api/adminModels";

export type EstateRecord = {
  id: string;
  name?: string | null;
  jurisdiction?: Jurisdiction | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  isPrototype?: boolean | null;
  status?: string | null;
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
};
