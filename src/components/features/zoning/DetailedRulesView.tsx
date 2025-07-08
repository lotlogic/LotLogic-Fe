import { Home } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CollapsibleSection } from "@/components/ui/zoningColorMap";
import { LotData } from "@/types/lot";

interface DetailedRulesViewProps {
  lot: LotData;
}

export function DetailedRulesView({ lot }: DetailedRulesViewProps) {
  return (
    <>
      {/* Site Planning Rules Section */}
      <CollapsibleSection title="Site Planning Rules" initialOpen={true}>
        <p>The following rules apply regardless of building type.</p>
      </CollapsibleSection>

      {/* Property Type Section */}
      <CollapsibleSection title="Property Type">
        <Button
          leftIcon={<Home className="h-4 w-4" />}
          className="px-4 py-2 rounded-lg text-sm text-gray-700 border-gray-200 hover:bg-gray-100"
        >
          House
        </Button>
      </CollapsibleSection>

      {/* Max Building Height Section */}
      <CollapsibleSection title="Max Building Height">
          <p>Maximum Height: {lot.maxHeight || '--'} meters</p>
          <p>Stories: {lot.maxStories || '--'} stories</p>
      </CollapsibleSection>

      {/* Minimum Lot Size Section */}
      <CollapsibleSection title="Minimum Lot Size">
          <p>Minimum Area: {lot.minArea || '--'} m2</p>
          <p>Width: Large (18-22m), Medium (14-18m), Compact (10-14m)</p>
          <p>Depth: {lot.minDepth || '--'} meters</p>
      </CollapsibleSection>

      {/* Minimum Street Frontage Section */}
      <CollapsibleSection title="Minimum Street Frontage">
          <p>Standard Lots: 12-14 meters</p>
          <p>Corner Lots: 15-20 meters</p>
      </CollapsibleSection>

      {/* Floor Space Ratio (FSR) Section  */}
      <CollapsibleSection title="Floor Space Ratio (FSR)">
          <div className="bg-[#F7F7F8] p-4 rounded-lg"> 
              <div className="flex justify-between items-start gap-4">
                  <div className="flex-shrink-0">
                      <p className="text-xl font-bold text-gray-900 leading-tight">
                          {lot.maxFSR || '0.5:1'} – {lot.maxFSRUpper || '0.65:1'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                          Depending on frontage & building type
                      </p>
                  </div>
                  <div className="flex-grow text-right text-gray-700">
                      <p className="font-semibold">Example Calculation</p>
                      <p className="text-xs mt-1">
                          {lot.exampleArea || '279m²'} floor area on {lot.exampleLotSize || '465m²'} lot
                      </p>
                      <p className="text-xs">
                          FSR = Total Floor Area ÷ Lot Area
                      </p>
                  </div>
              </div>
          </div>
      </CollapsibleSection>

      {/* Required Setbacks Section */}
      <CollapsibleSection title="Required Setbacks">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                  <span className="font-semibold text-gray-800 block">Front Yard:</span>
                  <span className="text-gray-700">{lot.frontYardSetback || '4-6 meters'}</span>
              </div>
              <div>
                  <span className="font-semibold text-gray-800 block">Side Yard (min):</span>
                  <span className="text-gray-700">{lot.sideYardMinSetback || '3 meters'}</span>
              </div>
              <div>
                  <span className="font-semibold text-gray-800 block">Rear Yard (min):</span>
                  <span className="text-gray-700">{lot.rearYardMinSetback || '6 meters'}</span>
              </div>
          </div>
      </CollapsibleSection>
    </>
  );
}