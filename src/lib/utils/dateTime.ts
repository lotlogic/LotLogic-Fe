const dateCellFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const toValidDate = (value?: string | null): Date | null => {
  if (!value || typeof value !== "string") {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

export const formatDateForCell = (value?: string | null): string => {
  const date = toValidDate(value);
  if (date) {
    return dateCellFormatter.format(date);
  }
  if (value && value.trim()) {
    return value;
  }
  return "--";
};

export const formatDateTimeForTooltip = (
  value?: string | null
): string | undefined => {
  const date = toValidDate(value);
  if (!date) {
    return undefined;
  }
  return dateTimeFormatter.format(date);
};
