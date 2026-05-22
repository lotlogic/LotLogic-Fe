import { overlaysColorMap } from "../../constants/overlaysTag";

export function getOverlaysColor(overlay: string | undefined): string {
  if (!overlay) return "#F3F4F6";
  if (overlaysColorMap[overlay]) return overlaysColorMap[overlay];
  return "#F3F4F6";
}
