import Button from "@/components/ui/Button";
import {
  ImageCarouselModal,
  SingleImageModal,
} from "@/components/ui/DynamicModal";
import { FilterSectionWithSingleLineSliders } from "@/components/ui/HouseDesignFilter";
import Sidebar from "@/components/ui/Sidebar";
import { useHouseDesigns } from "@/hooks/useHouseDesigns";
import { setAnalyticsContext } from "@/lib/analytics/mixpanel";
import { getImageUrl } from "@/lib/api/lotApi";
import { getLotPriceText } from "@/lib/utils/lotPricing";
import { getZoningColor, hexToRgba } from "@/lib/utils/zoning";
import { useModalStore } from "@/stores/modalStore";
import { useRotationStore } from "@/stores/rotationStore";
import type {
  DesignState,
  HouseDesignItem,
  SelectedFacadeOption,
} from "@/types/houseDesign";
import type { LotSidebarProps } from "@/types/lot";
import { ArrowRight, Diamond } from "lucide-react";
import React, { useEffect, useState } from "react";
import { HouseDesignList } from "../facades/HouseDesignList";
import { GetYourQuoteSidebar } from "../quote/QuoteSideBar";
import { SummaryView } from "./SummaryView";

const toTitleCase = (value: string | undefined) =>
  value
    ? value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
    : undefined;

const getInitialFacadeSelection = (
  design: HouseDesignItem | null | undefined
): SelectedFacadeOption | null => {
  const facade = design?.images?.[0];
  if (!facade) {
    return null;
  }

  return {
    facadeId: facade.facadeId,
    label: facade.faced || "Facade 1",
  };
};

export const LotSidebar = ({
  open,
  onClose,
  lot,
  geometry,
  onSelectFloorPlan,
  onZoningDataUpdate,
}: LotSidebarProps) => {
  const { setManualRotation } = useRotationStore();
  const {
    showFloorPlanModal,
    showFacadeModal,
    setShowFloorPlanModal,
    setShowFacadeModal,
  } = useModalStore();

  const [showFilter, setShowFilter] = React.useState(true);
  const [showHouseDesigns, setShowHouseDesigns] = React.useState(false);
  const [showAllDesigns, setShowAllDesigns] = React.useState(false);
  const [selectedHouseDesignForModals, setSelectedHouseDesignForModals] =
    React.useState<HouseDesignItem | null>(null);
  const [selectedFacadeByDesignId, setSelectedFacadeByDesignId] =
    React.useState<Record<string, SelectedFacadeOption>>({});

  const [bedroom, setBedroom] = React.useState<number[]>([]);
  const [bathroom, setBathroom] = React.useState<number[]>([]);
  const [car, setCar] = React.useState<number[]>([]);
  const [design, setDesign] = React.useState<DesignState>({
    rumpus: false,
    alfresco: false,
    pergola: false,
  });
  const [min_size, setMinSize] = React.useState<number>(Number.NaN);
  const [max_size, setMaxSize] = React.useState<number>(Number.NaN);

  const [showQuoteSidebar, setShowQuoteSidebar] = React.useState(false);
  const [quoteDesign, setQuoteDesign] = React.useState<HouseDesignItem | null>(
    null
  );
  const [quoteSelectedFacade, setQuoteSelectedFacade] =
    React.useState<SelectedFacadeOption | null>(null);
  const [currentModalFacadeIdx, setCurrentModalFacadeIdx] = useState(0);

  const lotId = lot.id?.toString() || null;
  const analyticsLotKey =
    lot.blockKey !== undefined && lot.blockKey !== null
      ? String(lot.blockKey)
      : lot.displayLotId !== undefined && lot.displayLotId !== null
      ? String(lot.displayLotId)
      : lot.id !== undefined && lot.id !== null
      ? String(lot.id)
      : "";

  const hasAnyFilters =
    bedroom.length > 0 ||
    bathroom.length > 0 ||
    car.length > 0 ||
    (!Number.isNaN(min_size) && min_size > 0) ||
    (!Number.isNaN(max_size) && max_size > 0) ||
    design.rumpus ||
    design.alfresco ||
    design.pergola;

  const filtersToPass = React.useMemo(() => {
    if (!hasAnyFilters) {
      return null;
    }

    return {
      bedroom: bedroom.length > 0 ? bedroom : [],
      bathroom: bathroom.length > 0 ? bathroom : [],
      car: car.length > 0 ? car : [],
      min_size: !Number.isNaN(min_size) && min_size > 0 ? min_size : undefined,
      max_size: !Number.isNaN(max_size) && max_size > 0 ? max_size : undefined,
      rumpus: design.rumpus ? true : undefined,
      alfresco: design.alfresco ? true : undefined,
      pergola: design.pergola ? true : undefined,
    };
  }, [
    bathroom,
    bedroom,
    car,
    design.alfresco,
    design.pergola,
    design.rumpus,
    hasAnyFilters,
    max_size,
    min_size,
  ]);
  const activeHouseDesignFilters = showAllDesigns ? null : filtersToPass;

  const { data: houseDesignsData } = useHouseDesigns(
    lotId,
    activeHouseDesignFilters,
    showHouseDesigns
  );

  useEffect(() => {
    setShowFilter(true);
    setShowHouseDesigns(false);
    setShowAllDesigns(false);
    setSelectedHouseDesignForModals(null);
    setSelectedFacadeByDesignId({});
    setQuoteDesign(null);
    setQuoteSelectedFacade(null);
    setBedroom([]);
    setBathroom([]);
    setCar([]);
    setDesign({
      rumpus: false,
      alfresco: false,
      pergola: false,
    });
    setMinSize(Number.NaN);
    setMaxSize(Number.NaN);
  }, [lot.id]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setAnalyticsContext({
      lotId: analyticsLotKey,
      lotDbId: lot.id,
      estateId: lot.estateId,
    });
  }, [analyticsLotKey, lot.estateId, lot.id, open]);

  useEffect(() => {
    if (houseDesignsData?.zoning && onZoningDataUpdate) {
      onZoningDataUpdate(houseDesignsData.zoning);
    }
  }, [houseDesignsData?.zoning, onZoningDataUpdate]);

  if (!open || !lot) return null;

  const zoningColor = getZoningColor(lot.zoning);
  const zoningText = lot.zoning || "--";
  const displayLotId =
    lot.displayLotId !== undefined && lot.displayLotId !== null
      ? String(lot.displayLotId)
      : lot.id !== undefined && lot.id !== null
      ? String(lot.id)
      : "--";
  const priceText = getLotPriceText({
    lifecycleStage: lot.lifecycleStage,
    salesMode: lot.salesMode,
    price: lot.price,
  });
  const isSold = lot.lifecycleStage === "sold";

  const openSummaryView = () => {
    setShowFilter(false);
    setShowHouseDesigns(false);
    setShowAllDesigns(false);
    setSelectedHouseDesignForModals(null);
  };

  const openPreferencesView = () => {
    setShowFilter(true);
    setShowHouseDesigns(false);
    setSelectedHouseDesignForModals(null);
  };

  const handleShowHouseDesign = () => {
    setShowAllDesigns(false);
    setShowHouseDesigns(true);
    setShowFilter(false);
    setSelectedHouseDesignForModals(null);
  };

  const handleShowAllDesigns = () => {
    setShowAllDesigns(true);
    setShowHouseDesigns(true);
    setShowFilter(false);
    setSelectedHouseDesignForModals(null);
  };

  const handleBackClick = () => {
    if (showQuoteSidebar) {
      setShowQuoteSidebar(false);
      setQuoteDesign(null);
      setQuoteSelectedFacade(null);
      setShowHouseDesigns(true);
    } else if (showHouseDesigns) {
      openPreferencesView();
    } else if (showFilter) {
      openSummaryView();
    }
    setShowFloorPlanModal(false);
    setShowFacadeModal(false);
    setSelectedHouseDesignForModals(null);
  };

  const handleDesignSelectedInList = (selectedDesign: HouseDesignItem | null) => {
    setSelectedHouseDesignForModals(selectedDesign);

    if (
      selectedDesign &&
      onSelectFloorPlan &&
      selectedDesign.floorPlanImage &&
      geometry &&
      geometry.type === "Polygon"
    ) {
      setManualRotation(0);
      const ring = geometry.coordinates[0];
      if (ring && ring.length >= 4) {
        const houseArea = selectedDesign.area
          ? Number.parseFloat(selectedDesign.area.toString())
          : 0;
        const lotArea = lot.size ? Number.parseFloat(lot.size.toString()) : 0;
        const scaleFactor =
          lotArea > 0 && houseArea > 0 ? Math.sqrt(houseArea / lotArea) : 1;
        const centerLng =
          ring.reduce((sum, coord) => sum + coord[0], 0) / ring.length;
        const centerLat =
          ring.reduce((sum, coord) => sum + coord[1], 0) / ring.length;

        const scaledCoordinates = ring.map((coord) => {
          const deltaLng = (coord[0] - centerLng) * scaleFactor;
          const deltaLat = (coord[1] - centerLat) * scaleFactor;
          return [centerLng + deltaLng, centerLat + deltaLat] as [
            number,
            number
          ];
        });

        onSelectFloorPlan({
          url: getImageUrl(selectedDesign.floorPlanImage),
          coordinates: [
            scaledCoordinates[0],
            scaledCoordinates[1],
            scaledCoordinates[2],
            scaledCoordinates[3],
          ] as [
            [number, number],
            [number, number],
            [number, number],
            [number, number]
          ],
          houseArea,
          houseWidth: selectedDesign.width,
          houseDepth: selectedDesign.depth,
        });
      }
    } else if (!selectedDesign && onSelectFloorPlan) {
      onSelectFloorPlan(null);
    }
  };

  const handleViewFloorPlanClick = (selectedDesign: HouseDesignItem) => {
    setSelectedHouseDesignForModals(selectedDesign);
    setShowFloorPlanModal(true);
  };

  const handleViewFacadesClick = (
    selectedDesign: HouseDesignItem,
    startIndex: number = 0
  ) => {
    setSelectedHouseDesignForModals(selectedDesign);
    setCurrentModalFacadeIdx(startIndex);
    const selectedFacade = selectedDesign.images[startIndex];
    if (selectedFacade) {
      setSelectedFacadeByDesignId((prev) => ({
        ...prev,
        [selectedDesign.id]: {
          facadeId: selectedFacade.facadeId,
          label: selectedFacade.faced || `Facade ${startIndex + 1}`,
        },
      }));
    }
    setShowFacadeModal(true);
  };

  const handleEnquireNow = (selectedDesign: HouseDesignItem) => {
    setQuoteDesign(selectedDesign);
    setQuoteSelectedFacade(
      selectedFacadeByDesignId[selectedDesign.id] ??
        getInitialFacadeSelection(selectedDesign)
    );
    setShowQuoteSidebar(true);
  };

  const showBackArrow = showFilter || showHouseDesigns || showQuoteSidebar;
  const designMatchCount = houseDesignsData?.houseDesigns?.length ?? 0;
  const minimizedLabel = showFilter
    ? "Set Preferences"
    : showHouseDesigns
    ? showAllDesigns
      ? "All Designs"
      : "Design Matches"
    : `Lot ${displayLotId}`;

  const headerContent = (
    <>
      {showFilter ? (
        <>
          <h2 className="text-2xl font-medium text-brand">
            Set your preferences
          </h2>
          <div className="text-brand-muted mt-1 text-base font-normal">
            Choose what matters for Lot {displayLotId}, then we&apos;ll show
            matching designs.
          </div>
        </>
      ) : showHouseDesigns ? (
        <>
          <h2 className="text-2xl font-medium text-brand">
            {showAllDesigns ? "All Compatible Designs" : "Design Matches"}
          </h2>
          <div className="text-brand-muted mt-1 text-base font-normal">
            {showAllDesigns
              ? `Showing ${designMatchCount} design${
                  designMatchCount === 1 ? "" : "s"
                } that work on this block`
              : `${designMatchCount} design${
                  designMatchCount === 1 ? "" : "s"
                } match your preferences`}
          </div>
          <div className="mt-3 flex flex-nowrap items-center gap-2 overflow-x-auto text-xs font-normal">
            {lot.size && (
              <span className="px-2 py-1 bg-brand-muted rounded-md flex items-center text-brand shrink-0">
                <Diamond className="h-3 w-3 mr-1" />
                {lot.size}m²
              </span>
            )}
            {lot.zoning && (
              <span
                className="px-2 py-1 rounded-full text-brand font-medium shrink-0"
                style={{ backgroundColor: hexToRgba(zoningColor, 0.3) }}
              >
                {`Zoning: ${zoningText}`}
              </span>
            )}
          </div>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-medium text-brand">{`Lot ${displayLotId}`}</h2>
          <div className="text-brand-primary mt-1 text-base font-semibold">
            {priceText}
          </div>
          <div className="text-brand-muted mt-1 text-base font-normal">
            {[
              toTitleCase(lot.suburb),
              toTitleCase(lot.address),
            ]
              .filter(Boolean)
              .join(" | ") || "--"}
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      {!showQuoteSidebar && (
        <Sidebar
          open={open}
          onClose={onClose}
          onBack={showBackArrow ? handleBackClick : undefined}
          showBackButton={showBackArrow}
          headerContent={headerContent}
          minimizable={true}
          minimizedLabel={minimizedLabel}
        >
          {showHouseDesigns ? (
            <HouseDesignList
              filter={{
                bedroom,
                bathroom,
                car,
                min_size,
                max_size,
                rumpus: design.rumpus ? true : undefined,
                alfresco: design.alfresco ? true : undefined,
                pergola: design.pergola ? true : undefined,
              }}
              lot={{
                estateId: lot.estateId ?? "",
                lotId: analyticsLotKey,
                lotDbId: lot.id ?? "",
                lotDisplayId: displayLotId,
                suburb: lot.suburb ?? "",
                address: lot.address ?? "",
                size: lot.size ?? "",
                zoning: lot.zoning ?? "",
                overlays: lot.overlays ?? "",
                lifecycleStage: lot.lifecycleStage,
                salesMode: lot.salesMode,
                price: lot.price,
              }}
              onShowFilter={() => {
                setShowAllDesigns(false);
                setShowHouseDesigns(false);
                setShowFilter(true);
              }}
              onShowAllDesigns={
                hasAnyFilters ? handleShowAllDesigns : undefined
              }
              onDesignClick={handleDesignSelectedInList}
              onEnquireNow={handleEnquireNow}
              onViewFloorPlan={handleViewFloorPlanClick}
              onViewFacades={handleViewFacadesClick}
              hasActiveFilters={hasAnyFilters}
              showingAllDesigns={showAllDesigns}
            />
          ) : showFilter ? (
            <FilterSectionWithSingleLineSliders
              bedroom={bedroom}
              setBedroom={setBedroom}
              bathroom={bathroom}
              setBathroom={setBathroom}
              car={car}
              setCar={setCar}
              design={design}
              setDesign={setDesign}
              min_size={min_size}
              setMinSize={setMinSize}
              max_size={max_size}
              setMaxSize={setMaxSize}
              onShowHouseDesign={handleShowHouseDesign}
            />
          ) : (
            <SummaryView
              lot={lot}
              zoningColor={zoningColor}
              zoningText={zoningText}
            />
          )}

          {!showFilter && !showHouseDesigns && (
            <div className="px-6 pt-0 pb-6 md:sticky md:bottom-0">
              <div className="bg-white rounded-xl shadow border border-brand p-6">
                <div className="text-left mb-4">
                  <p className="text-brand-muted text-base font-medium">
                    Choose your preferences before viewing matching designs
                  </p>
                </div>

                <Button
                  label="Set preferences"
                  rightIcon={<ArrowRight className="h-6 w-8" />}
                  className="w-full text-base py-4 rounded-xl font-semibold animated-gradient-button transition-all duration-300 shadow-md cursor-pointer"
                  onClick={openPreferencesView}
                  disabled={isSold}
                />
              </div>
            </div>
          )}
        </Sidebar>
      )}

      {showQuoteSidebar && quoteDesign && (
        <React.Suspense fallback={<div>Loading...</div>}>
          <GetYourQuoteSidebar
            open={showQuoteSidebar}
            onClose={() => {
              setShowQuoteSidebar(false);
              setQuoteDesign(null);
              setQuoteSelectedFacade(null);
            }}
            onBack={() => {
              setShowQuoteSidebar(false);
              setQuoteDesign(null);
              setQuoteSelectedFacade(null);
              setShowHouseDesigns(true);
            }}
            selectedHouseDesign={quoteDesign}
            selectedFacade={quoteSelectedFacade}
            lotDetails={{
              id: String(lot.id || ""),
              estateId: lot.estateId || "",
              blockKey: analyticsLotKey,
              displayId: displayLotId,
              suburb: lot.suburb || "",
              address: lot.address || "",
              size:
                typeof lot.size === "number"
                  ? lot.size
                  : lot.size
                  ? Number.parseFloat(String(lot.size))
                  : undefined,
              lifecycleStage: lot.lifecycleStage,
              salesMode: lot.salesMode,
              price: lot.price,
            }}
          />
        </React.Suspense>
      )}

      <SingleImageModal
        key={`floorplan-${lot.id}-${selectedHouseDesignForModals?.id ?? "none"}`}
        open={showFloorPlanModal && !!selectedHouseDesignForModals}
        onClose={() => setShowFloorPlanModal(false)}
        title={`Lot ${displayLotId}, ${selectedHouseDesignForModals?.title || ""}`}
        imageSrc={
          selectedHouseDesignForModals?.floorPlanImage
            ? getImageUrl(selectedHouseDesignForModals.floorPlanImage)
            : ""
        }
        imageAlt="Floor Plan"
      />

      <ImageCarouselModal
        key={`facades-${lot.id}-${selectedHouseDesignForModals?.id ?? "none"}`}
        open={showFacadeModal && !!selectedHouseDesignForModals}
        onClose={() => {
          setShowFacadeModal(false);
          setCurrentModalFacadeIdx(0);
        }}
        title={`${selectedHouseDesignForModals?.title || ""} - Facades`}
        images={(() => {
          const images = (selectedHouseDesignForModals?.images || []).map(
            (image, index) => ({
              src: getImageUrl(image.src),
              alt: `Facade ${index + 1}`,
              label: image.faced || `Facade ${index + 1}`,
            })
          );

          if (images.length === 0 && selectedHouseDesignForModals?.image) {
            return [
              {
                src: getImageUrl(selectedHouseDesignForModals.image),
                alt: "Facade 1",
                label: "Facade",
              },
            ];
          }

          return images;
        })()}
        currentIndex={currentModalFacadeIdx}
        onIndexChange={(nextIndex) => {
          setCurrentModalFacadeIdx(nextIndex);
          if (!selectedHouseDesignForModals) {
            return;
          }

          const selectedFacade = selectedHouseDesignForModals.images[nextIndex];
          if (!selectedFacade) {
            return;
          }

          setSelectedFacadeByDesignId((prev) => ({
            ...prev,
            [selectedHouseDesignForModals.id]: {
              facadeId: selectedFacade.facadeId,
              label: selectedFacade.faced || `Facade ${nextIndex + 1}`,
            },
          }));
        }}
        showThumbnails={true}
      />
    </>
  );
};

export default LotSidebar;
