import { hexToRgba } from "@/lib/utils/zoning";
import type { LotData } from "@/types/lot";
import { Diamond } from "lucide-react";

interface SummaryViewProps {
  lot: LotData;
  zoningColor: string;
  zoningText: string;
  onShowDetailedRules?: () => void;
}

export const SummaryView = ({
  lot,
  zoningColor,
  zoningText,
}: SummaryViewProps) => {
  return (
    <>
      <div className="mx-4 sm:mx-6 my-3 sm:my-4">
        <span
          className="inline-block w-full text-center font-body font-medium text-xs sm:text-sm leading-[1.36] text-brand rounded-full py-2 px-4"
          style={{ backgroundColor: hexToRgba(zoningColor, 0.3) }}
        >
          {`Zoning: ${zoningText}`}
        </span>
      </div>

      <div className="bg-white rounded-xl shadow border border-brand p-4 sm:p-6 mx-4 sm:mx-6 mb-4 flex flex-col sm:flex-row items-start sm:items-center font-body gap-4 sm:gap-0">
        <div className="flex flex-col items-start w-full sm:w-auto">
          <div className="flex items-center mb-1 sm:mb-2">
            <Diamond className="h-5 w-5 text-brand-muted mr-2" />
            <span className="font-medium text-xs sm:text-sm text-brand-muted">
              Block Size
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-brand leading-none">
            {lot.size ? `${lot.size}m²` : "--"}
          </div>
        </div>
        <div className="hidden sm:block h-20 w-px bg-brand-muted mx-6" />
        <div className="flex flex-col justify-center flex-grow w-full sm:w-auto">
          <div className="flex items-baseline mb-1 justify-between sm:justify-start">
            <span className="text-brand-muted text-xs sm:text-sm font-normal sm:min-w-[85px]">
              Width:
            </span>
            <span className="ml-1 text-brand-muted text-xs sm:text-sm font-normal">
              {typeof lot.apiDimensions?.width === "number"
                ? `${lot.apiDimensions.width.toFixed(2)}m`
                : lot.width
                ? `${lot.width} m`
                : "--"}
            </span>
          </div>
          <div className="flex items-baseline mb-1 justify-between sm:justify-start">
            <span className="text-brand-muted text-xs sm:text-sm font-normal sm:min-w-[85px]">
              Depth:
            </span>
            <span className="ml-1 text-brand-muted text-xs sm:text-sm font-normal">
              {typeof lot.apiDimensions?.depth === "number"
                ? `${lot.apiDimensions.depth.toFixed(2)}m`
                : lot.depth
                ? `${lot.depth} m`
                : "--"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
export default SummaryView;
