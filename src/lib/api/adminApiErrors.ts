type ApiErrorLike = {
  message?: string;
  response?: {
    status?: number;
    data?: unknown;
  };
};

const extractStatus = (error: unknown): number | null => {
  if (!error || typeof error !== "object") {
    return null;
  }
  const { response } = error as ApiErrorLike;
  if (response && typeof response.status === "number") {
    return response.status;
  }
  return null;
};

const extractServerMessage = (error: unknown): string | null => {
  if (!error || typeof error !== "object") {
    return null;
  }
  const { response } = error as ApiErrorLike;
  if (!response) {
    return null;
  }
  const data = response.data;
  if (typeof data === "string" && data.trim()) {
    return data;
  }
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const message =
      (typeof record.message === "string" && record.message.trim()) ||
      (typeof record.error === "string" && record.error.trim()) ||
      null;
    return message;
  }
  return null;
};

export const getAdminApiErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  const status = extractStatus(error);
  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }
  if (status === 403) {
    return "You do not have access to this resource.";
  }
  const serverMessage = extractServerMessage(error);
  if (serverMessage) {
    return serverMessage;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

export const isAdminApiAccessError = (error: unknown): boolean => {
  const status = extractStatus(error);
  return status === 401 || status === 403;
};
