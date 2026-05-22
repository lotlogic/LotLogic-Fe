const normalizeOptional = (value?: string | null): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const getOrigin = (): string =>
  typeof window !== "undefined" ? window.location.origin : "";

type EstateEmbedOptions = {
  estateId: string;
  themeGuid?: string | null;
  absolute?: boolean;
};

export const buildEstateEmbedUrl = ({
  estateId,
  themeGuid,
  absolute = false,
}: EstateEmbedOptions): string => {
  const normalizedEstateId = normalizeOptional(estateId);
  if (!normalizedEstateId) {
    return "";
  }

  const normalizedThemeGuid = normalizeOptional(themeGuid);
  const relativePath = `/embed/${encodeURIComponent(normalizedEstateId)}`;
  const relativeUrl = normalizedThemeGuid
    ? `${relativePath}?brand=${encodeURIComponent(normalizedThemeGuid)}`
    : relativePath;

  if (!absolute) {
    return relativeUrl;
  }

  const origin = getOrigin();
  return origin ? `${origin}${relativeUrl}` : relativeUrl;
};

export const buildEstateEmbedScriptUrl = (absolute = false): string => {
  const relativeUrl = "/lotlogic-embed.js";
  const origin = getOrigin();
  return absolute && origin ? `${origin}${relativeUrl}` : relativeUrl;
};

export const buildEstateEmbedIframeCode = ({
  estateId,
  themeGuid,
}: EstateEmbedOptions): string =>
  [
    "<iframe",
    `  src="${buildEstateEmbedUrl({ estateId, themeGuid, absolute: true })}"`,
    '  width="100%"',
    '  height="760"',
    '  style="border:0;"',
    '  loading="lazy"',
    '  title="LotLogic estate embed"',
    "></iframe>",
  ].join("\n");

export const buildEstateEmbedScriptCode = ({
  estateId,
  themeGuid,
}: EstateEmbedOptions): string => {
  const normalizedThemeGuid = normalizeOptional(themeGuid);
  return [
    '<div id="lotlogic-root"></div>',
    "",
    "<script",
    `  src="${buildEstateEmbedScriptUrl(true)}"`,
    `  data-estate-id="${estateId}"`,
    ...(normalizedThemeGuid
      ? [`  data-brand="${normalizedThemeGuid}"`]
      : []),
    '  data-target="#lotlogic-root"',
    '  data-height="760"',
    "></script>",
  ].join("\n");
};
