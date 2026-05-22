import { zoningColorMap } from "../../constants/zoningTag";
export function getZoningColor(zoning: string | undefined): string {
  if (!zoning) return "#F3F4F6";
  const normalizedZoning = zoning.toLowerCase();
  if (zoningColorMap[normalizedZoning]) {
    return zoningColorMap[normalizedZoning];
  }
  const code = normalizedZoning.match(/rz[1-5]/)?.[0];
  return code ? zoningColorMap[code] || "#F3F4F6" : "#F3F4F6";
}

export function hexToRgba(hex: string, alpha: number) {
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((x) => x + x)
      .join("");
  }
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
