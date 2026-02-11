import type { Jurisdiction } from "@/lib/api/adminModels";

export type EstateRecord = {
  id: string;
  name?: string | null;
  jurisdiction?: Jurisdiction | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  themeColor?: string | null;
  status?: string | null;
  [key: string]: unknown;
};

export type EstateCreatePayload = {
  name: string;
  jurisdiction: Jurisdiction;
  address?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  themeColor?: string;
};
