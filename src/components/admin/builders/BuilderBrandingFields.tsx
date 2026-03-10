import { useMemo } from "react";
import { AdminUploadField } from "@/components/admin/AdminUploadField";
import {
  BuilderBrandingBanner,
  hasBuilderBranding,
} from "@/components/builders/BuilderBrandingBanner";
import { Input } from "@/components/ui/Input";

type ColorFieldProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  disabled?: boolean;
};

type BuilderBrandingFieldsProps = {
  builderName: string;
  logoUrl: string;
  brandingBgColor: string;
  brandingTextColor: string;
  onLogoUrlChange: (value: string) => void;
  onBrandingBgColorChange: (value: string) => void;
  onBrandingTextColorChange: (value: string) => void;
  disabled?: boolean;
};

const ColorField = ({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
}: ColorFieldProps) => {
  const previewValue = useMemo(() => {
    const trimmed = value.trim();
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
      return trimmed;
    }
    return "#111827";
  }, [value]);

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={previewValue}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-12 rounded-md border border-slate-200 bg-white p-1 shadow-sm"
          aria-label={`${label} color picker`}
          disabled={disabled}
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full font-mono"
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export const BuilderBrandingFields = ({
  builderName,
  logoUrl,
  brandingBgColor,
  brandingTextColor,
  onLogoUrlChange,
  onBrandingBgColorChange,
  onBrandingTextColorChange,
  disabled = false,
}: BuilderBrandingFieldsProps) => {
  const hasPreview = hasBuilderBranding({
    logoUrl,
    backgroundColor: brandingBgColor,
    textColor: brandingTextColor,
  });
  const previewName = builderName.trim() || "Builder name";

  return (
    <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div>
        <h3 className="m-0 text-sm font-semibold uppercase tracking-wide text-slate-700">
          Branding
        </h3>
        <p className="m-0 mt-1 text-sm text-muted-foreground">
          This banner is shown on public house design cards when logo, background
          colour, and text colour are all set.
        </p>
      </div>

      <AdminUploadField
        label="Builder Logo URL"
        value={logoUrl}
        onChange={onLogoUrlChange}
        folder="builders"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        disabled={disabled}
        helperText="Accepted formats: PNG, SVG, JPG, or WEBP. Transparent logos work best."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <ColorField
          label="Background Colour"
          value={brandingBgColor}
          onChange={onBrandingBgColorChange}
          placeholder="#111827"
          disabled={disabled}
        />
        <ColorField
          label="Text Colour"
          value={brandingTextColor}
          onChange={onBrandingTextColorChange}
          placeholder="#FFFFFF"
          disabled={disabled}
        />
      </div>

      <div className="grid gap-2">
        <span className="text-sm font-medium">Preview</span>
        {hasPreview ? (
          <BuilderBrandingBanner
            name={previewName}
            logoUrl={logoUrl}
            backgroundColor={brandingBgColor}
            textColor={brandingTextColor}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-muted-foreground">
            Add a logo, background colour, and text colour to preview the card
            banner.
          </div>
        )}
      </div>
    </div>
  );
};

export default BuilderBrandingFields;
