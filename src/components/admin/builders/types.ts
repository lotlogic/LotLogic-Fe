export type AdminUser = {
  id: string;
  externalAuthId?: string | null;
  email?: string | null;
  displayName?: string | null;
  role?: string | null;
  status?: string | null;
  [key: string]: unknown;
};

export type BuilderUser = {
  userId: string;
  builderId?: string;
  user?: AdminUser;
  [key: string]: unknown;
};

export type BuilderRecord = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  builderUsers?: BuilderUser[];
  [key: string]: unknown;
};

export type BuilderCreatePayload = {
  name: string;
  email?: string;
  phone?: string;
};
