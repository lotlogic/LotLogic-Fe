import { APP_CONTENT } from "@/constants/content";

const GENERIC_FONTS = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "cursive",
  "fantasy",
  "emoji",
  "math",
  "fangsong",
]);

const NON_GOOGLE_FONTS = new Set([
  "calibri",
  "arial",
  "arial black",
  "times new roman",
]);

const extractPrimaryFont = (value: string): string => {
  const first = value
    .split(",")[0]
    .replace(/["']/g, "")
    .trim();
  return first;
};

const isLoadableFont = (value: string): boolean => {
  if (!value) {
    return false;
  }
  const normalized = value.toLowerCase().trim();
  return (
    normalized.length > 0 &&
    !GENERIC_FONTS.has(normalized) &&
    !NON_GOOGLE_FONTS.has(normalized)
  );
};

const encodeGoogleFont = (value: string): string =>
  encodeURIComponent(value).replace(/%20/g, "+");

export const loadBrandFonts = () => {
  if (typeof document === "undefined") {
    return;
  }

  const { typography } = APP_CONTENT;
  const families = [
    typography.fontFamily.primary,
    typography.fontFamily.secondary,
  ]
    .map(extractPrimaryFont)
    .filter(isLoadableFont);

  if (families.length === 0) {
    return;
  }

  const uniqueFamilies = Array.from(new Set(families));
  const familyParams = uniqueFamilies
    .map(
      (family) =>
        `family=${encodeGoogleFont(family)}:wght@300;400;500;600;700;800`
    )
    .join("&");
  const href = `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;

  const existing =
    document.querySelector<HTMLLinkElement>("link[data-brand-fonts]");
  if (existing) {
    if (existing.href === href) {
      return;
    }
    existing.href = href;
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.setAttribute("data-brand-fonts", "true");
  document.head.appendChild(link);
};

const BRAND_THEME_VARS = [
  "--font-body",
  "--font-display",
  "--font-sans",
  "--color-primary",
  "--color-primary-hover",
  "--color-secondary",
  "--color-success",
  "--color-warning",
  "--color-error",
  "--color-bg-primary",
  "--color-bg-secondary",
  "--color-bg-accent",
  "--color-text-primary",
  "--color-text-secondary",
  "--color-border",
  "--color-muted",
  "--color-muted-foreground",
  "--color-ink",
  "--color-ink-soft",
  "--color-coral",
  "--color-lot-green",
  "--background",
  "--foreground",
];

export const clearBrandThemeOverrides = () => {
  if (typeof document === "undefined") {
    return;
  }
  const style = document.documentElement.style;
  BRAND_THEME_VARS.forEach((name) => {
    style.removeProperty(name);
  });
};

const setCssVar = (name: string, value?: string | null) => {
  if (!value) {
    return;
  }
  document.documentElement.style.setProperty(name, value);
};

export const applyBrandTheme = () => {
  if (typeof document === "undefined") {
    return;
  }

  const { colors, typography } = APP_CONTENT;

  setCssVar("--font-body", typography.fontFamily.primary);
  setCssVar("--font-display", typography.fontFamily.secondary);
  setCssVar("--font-sans", typography.fontFamily.primary);

  setCssVar("--color-primary", colors.primary);
  setCssVar("--color-primary-hover", colors.accent || colors.primary);
  setCssVar("--color-secondary", colors.secondary);
  setCssVar("--color-success", colors.success);
  setCssVar("--color-warning", colors.warning);
  setCssVar("--color-error", colors.error);

  setCssVar("--color-bg-primary", colors.background.primary);
  setCssVar("--color-bg-secondary", colors.background.secondary);
  setCssVar("--color-bg-accent", colors.background.accent);
  setCssVar("--color-text-primary", colors.text.primary);
  setCssVar("--color-text-secondary", colors.text.secondary);

  setCssVar("--color-border", colors.gray?.[300] ?? colors.secondary);
  setCssVar("--color-muted", colors.gray?.[100] ?? colors.background.secondary);
  setCssVar("--color-muted-foreground", colors.text.secondary);

  // Keep existing utility vars in sync with brand colors.
  setCssVar("--color-ink", colors.text.primary);
  setCssVar("--color-ink-soft", colors.text.secondary);
  setCssVar("--color-coral", colors.primary);
  setCssVar("--color-lot-green", colors.primary);

  // Legacy vars referenced in core.scss.
  setCssVar("--background", colors.background.primary);
  setCssVar("--foreground", colors.text.primary);
};

export default applyBrandTheme;
