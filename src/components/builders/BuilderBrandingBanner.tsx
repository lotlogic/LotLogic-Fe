import { getImageUrl } from "@/lib/api/lotApi";

type BuilderBrandingBannerProps = {
  name: string;
  logoUrl: string;
  backgroundColor: string;
  textColor: string;
  className?: string;
};

const normalizeText = (value: unknown): string => String(value ?? "").trim();

export const hasBuilderBranding = (values: {
  name?: string | null;
  logoUrl?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
}) =>
  Boolean(
    (normalizeText(values.logoUrl) || normalizeText(values.name)) &&
      normalizeText(values.backgroundColor) &&
      normalizeText(values.textColor),
  );

export const BuilderBrandingBanner = ({
  name,
  logoUrl,
  backgroundColor,
  textColor,
  className,
}: BuilderBrandingBannerProps) => {
  const normalizedName = normalizeText(name);
  const normalizedLogoUrl = normalizeText(logoUrl);
  const normalizedBackgroundColor = normalizeText(backgroundColor);
  const normalizedTextColor = normalizeText(textColor);
  const hasLogo = Boolean(normalizedLogoUrl);

  if (
    !hasBuilderBranding({
      name: normalizedName,
      logoUrl: normalizedLogoUrl,
      backgroundColor: normalizedBackgroundColor,
      textColor: normalizedTextColor,
    })
  ) {
    return null;
  }

  return (
    <div
      className={`rounded-xl px-4 py-3 shadow-sm ${className ?? ""}`}
      style={{
        backgroundColor: normalizedBackgroundColor,
        color: normalizedTextColor,
      }}
    >
      <div className="flex min-w-0 items-center">
        {hasLogo ? (
          <img
            src={getImageUrl(normalizedLogoUrl)}
            alt={normalizedName ? `${normalizedName} logo` : "Builder logo"}
            className="max-h-10 max-w-[140px] object-contain"
          />
        ) : (
          <div className="min-w-0 text-sm font-semibold leading-tight">
            {normalizedName}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuilderBrandingBanner;
