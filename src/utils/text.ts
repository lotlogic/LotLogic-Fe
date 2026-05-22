/******************************************************

	Utilities - Text

******************************************************/
export const toSentenceCase = (str?: string | null) => {
  if (!str) return "";
  const lowercased = str.toLowerCase();
  return lowercased.charAt(0).toUpperCase() + lowercased.slice(1);
};

export const toTitleCase = (str?: string | null) => {
  if (!str) return "";
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export const normalizeFloorPlanTitle = (str?: string | null) => {
  if (!str) return "";

  return str.replace(
    /\b(floor plan)(\s+\1)+\b/gi,
    (_, term: string) => term
  );
};
