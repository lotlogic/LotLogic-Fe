import Button from "@/components/ui/Button";
import { ImageCarouselModal, TextModal } from "@/components/ui/DynamicModal";
import { FilterSectionWithSingleLineSliders } from "@/components/ui/HouseDesignFilter";
import Sidebar from "@/components/ui/Sidebar";
import { useHouseDesigns } from "@/hooks/useHouseDesigns";
import { setAnalyticsContext } from "@/lib/analytics/mixpanel";
import { getImageUrl } from "@/lib/api/lotApi";
import {
  getHouseAndLandPriceBreakdown,
  getLotPriceText,
} from "@/lib/utils/lotPricing";
import { normalizeLotSalesMode } from "@/constants/lotSalesMode";
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

const buildDesignGalleryImages = (design: HouseDesignItem | null) => {
  if (!design) {
    return [];
  }

  const images = design.images.map((image, index) => ({
    src: getImageUrl(image.src),
    alt: `${design.title} ${image.faced || `Facade ${index + 1}`}`,
    label: image.faced || `Facade ${index + 1}`,
  }));

  if (images.length === 0 && design.image) {
    images.push({
      src: getImageUrl(design.image),
      alt: `${design.title} facade`,
      label: "Facade",
    });
  }

  if (design.floorPlanImage) {
    images.push({
      src: getImageUrl(design.floorPlanImage),
      alt: `${design.title} floor plan`,
      label: "Floor plan",
    });
  }

  return images;
};

const formatDocumentSize = (bytes: number | null | undefined) => {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) {
    return "";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const digits = value >= 10 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
};

const getDocumentLabel = (
  document: NonNullable<HouseDesignItem["documents"]>[number]
) => {
  const documentName = String(document.documentName ?? "").trim();
  if (documentName) {
    return documentName;
  }
  return String(document.fileName ?? "").trim() || "Document";
};

const getDesignBuilderName = (design: HouseDesignItem | null | undefined) => {
  const builderRecord =
    design?.builder && typeof design.builder === "object"
      ? design.builder
      : null;
  const builderName =
    String(design?.builderName ?? "").trim() ||
    String(builderRecord?.name ?? "").trim() ||
    (typeof design?.builder === "string" ? design.builder.trim() : "");

  return builderName || "the builder";
};

export const LotSidebar = ({
  open,
  onClose,
  lot,
  geometry,
  onSelectFloorPlan,
  onFocusLot,
  onZoningDataUpdate,
}: LotSidebarProps) => {
  const { setManualRotation } = useRotationStore();
  const {
    showFloorPlanModal,
    showFacadeModal,
    setShowFloorPlanModal,
    setShowFacadeModal,
  } = useModalStore();

  const [showFilter, setShowFilter] = React.useState(false);
  const [showHouseDesigns, setShowHouseDesigns] = React.useState(false);
  const [showAllDesigns, setShowAllDesigns] = React.useState(false);
  const [selectedHouseDesignForModals, setSelectedHouseDesignForModals] =
    React.useState<HouseDesignItem | null>(null);
  const [selectedHouseDesignId, setSelectedHouseDesignId] = React.useState<
    string | null
  >(null);
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
  const [initialQuoteJourneyType, setInitialQuoteJourneyType] = React.useState<
    "secure_block" | null
  >(null);
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
  const packageFloorPlanId =
    lot.houseAndLandFloorPlanId !== undefined &&
    lot.houseAndLandFloorPlanId !== null
      ? String(lot.houseAndLandFloorPlanId).trim()
      : "";
  const isConfiguredHouseAndLandPackage =
    normalizeLotSalesMode(lot.salesMode) === "house_and_land" &&
    packageFloorPlanId.length > 0;
  const activeHouseDesignFilters = isConfiguredHouseAndLandPackage
    ? null
    : showAllDesigns
    ? null
    : filtersToPass;

  const { data: houseDesignsData } = useHouseDesigns(
    lotId,
    activeHouseDesignFilters,
    showHouseDesigns || isConfiguredHouseAndLandPackage
  );
  const packageHouseDesign = React.useMemo(
    () =>
      isConfiguredHouseAndLandPackage
        ? houseDesignsData?.houseDesigns?.find(
            (designItem) => designItem.id === packageFloorPlanId
          ) ?? null
        : null,
    [
      houseDesignsData?.houseDesigns,
      isConfiguredHouseAndLandPackage,
      packageFloorPlanId,
    ]
  );

  const selectDesignForLotPreview = React.useCallback(
    (selectedDesign: HouseDesignItem | null) => {
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
    },
    [geometry, lot.size, onSelectFloorPlan, setManualRotation]
  );

  useEffect(() => {
    setShowFilter(false);
    setShowHouseDesigns(false);
    setShowAllDesigns(false);
    setSelectedHouseDesignForModals(null);
    setSelectedHouseDesignId(null);
    setSelectedFacadeByDesignId({});
    setQuoteDesign(null);
    setQuoteSelectedFacade(null);
    setInitialQuoteJourneyType(null);
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

  useEffect(() => {
    if (!open || !isConfiguredHouseAndLandPackage || !packageHouseDesign) {
      return;
    }

    setSelectedHouseDesignForModals(packageHouseDesign);
    setSelectedHouseDesignId(packageHouseDesign.id);
    selectDesignForLotPreview(packageHouseDesign);
  }, [
    isConfiguredHouseAndLandPackage,
    open,
    packageHouseDesign,
    selectDesignForLotPreview,
  ]);

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
  const houseAndLandPriceBreakdown = getHouseAndLandPriceBreakdown({
    lifecycleStage: lot.lifecycleStage,
    salesMode: lot.salesMode,
    floorPlanId: lot.houseAndLandFloorPlanId,
    blockPrice: lot.price,
    buildPrice: lot.houseAndLandBuildPrice,
  });
  const isSold = lot.lifecycleStage === "sold";
  const packageDesignTitle =
    packageHouseDesign?.title || lot.houseAndLandFloorPlanName || "";
  const packageBuilderName = getDesignBuilderName(packageHouseDesign);

  const openSummaryView = () => {
    setShowFilter(false);
    setShowHouseDesigns(false);
    setShowAllDesigns(false);
    setSelectedHouseDesignForModals(null);
    setSelectedHouseDesignId(null);
  };

  const openPreferencesView = () => {
    setShowFilter(true);
    setShowHouseDesigns(false);
    setSelectedHouseDesignForModals(null);
    setSelectedHouseDesignId(null);
  };

  const handleShowHouseDesign = () => {
    setShowAllDesigns(false);
    setShowHouseDesigns(true);
    setShowFilter(false);
    setSelectedHouseDesignForModals(null);
    setSelectedHouseDesignId(null);
    onFocusLot?.();
  };

  const handleShowAllDesigns = () => {
    setShowAllDesigns(true);
    setShowHouseDesigns(true);
    setShowFilter(false);
    setSelectedHouseDesignForModals(null);
    setSelectedHouseDesignId(null);
  };

  const handleBackClick = () => {
    if (showQuoteSidebar) {
      setShowQuoteSidebar(false);
      setQuoteDesign(null);
      setQuoteSelectedFacade(null);
      setShowHouseDesigns(true);
    } else if (showHouseDesigns) {
      if (isConfiguredHouseAndLandPackage) {
        setShowHouseDesigns(false);
        setShowFilter(false);
        setShowAllDesigns(false);
      } else {
        openPreferencesView();
      }
    } else if (showFilter) {
      openSummaryView();
    }
    setShowFloorPlanModal(false);
    setShowFacadeModal(false);
    setSelectedHouseDesignForModals(null);
    setSelectedHouseDesignId(null);
  };

  const handleShowPackageDesign = () => {
    setShowAllDesigns(false);
    setShowHouseDesigns(true);
    setShowFilter(false);
    if (packageHouseDesign) {
      setSelectedHouseDesignForModals(packageHouseDesign);
      setSelectedHouseDesignId(packageHouseDesign.id);
      selectDesignForLotPreview(packageHouseDesign);
    }
    onFocusLot?.();
  };

  const handleDesignSelectedInList = (selectedDesign: HouseDesignItem | null) => {
    setSelectedHouseDesignForModals(selectedDesign);
    selectDesignForLotPreview(selectedDesign);
  };

  const handleViewDocumentsClick = (selectedDesign: HouseDesignItem) => {
    setSelectedHouseDesignForModals(selectedDesign);
    setShowFacadeModal(false);
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
    setShowFloorPlanModal(false);
    setShowFacadeModal(true);
  };

  const handleEnquireNow = (selectedDesign: HouseDesignItem) => {
    setSelectedHouseDesignId(selectedDesign.id);
    setSelectedHouseDesignForModals(selectedDesign);
    selectDesignForLotPreview(selectedDesign);
    setQuoteDesign(selectedDesign);
    setInitialQuoteJourneyType(null);
    setQuoteSelectedFacade(
      selectedFacadeByDesignId[selectedDesign.id] ??
        getInitialFacadeSelection(selectedDesign)
    );
    setShowQuoteSidebar(true);
  };

  const handleSecureLot = () => {
    const packageDesign = isConfiguredHouseAndLandPackage
      ? packageHouseDesign
      : null;
    if (packageDesign) {
      setSelectedHouseDesignId(packageDesign.id);
      setSelectedHouseDesignForModals(packageDesign);
      selectDesignForLotPreview(packageDesign);
    }
    setQuoteDesign(packageDesign);
    setQuoteSelectedFacade(
      packageDesign ? getInitialFacadeSelection(packageDesign) : null
    );
    setInitialQuoteJourneyType("secure_block");
    setShowQuoteSidebar(true);
  };

  const handleExploreAvailableBlocks = () => {
    setShowQuoteSidebar(false);
    setQuoteDesign(null);
    setQuoteSelectedFacade(null);
    setInitialQuoteJourneyType(null);
    setShowFloorPlanModal(false);
    setShowFacadeModal(false);
    setSelectedHouseDesignForModals(null);
    setSelectedHouseDesignId(null);
    onSelectFloorPlan?.(null);
    onClose();
  };

  const showBackArrow = showFilter || showHouseDesigns || showQuoteSidebar;
  const designMatchCount = houseDesignsData?.houseDesigns?.length ?? 0;
  const minimizedLabel = showFilter
    ? "Set preferences"
    : showHouseDesigns
    ? showAllDesigns
      ? "All designs"
      : "Design matches"
    : `Lot ${displayLotId}`;

  const headerContent = (
    <>
      {showFilter ? (
        <>
          <h2 className="text-2xl font-medium text-brand">
            What&apos;s your dream home?
          </h2>
          <div className="text-brand-muted mt-1 text-base font-normal">
            We&apos;ll find the designs that fit Lot {displayLotId}.
          </div>
        </>
      ) : showHouseDesigns ? (
        <>
          <h2 className="text-2xl font-medium text-brand">
            {isConfiguredHouseAndLandPackage
              ? "House & land package"
              : showAllDesigns
              ? "All compatible designs"
              : "Design matches"}
          </h2>
          <div className="text-brand-muted mt-1 text-base font-normal">
            {isConfiguredHouseAndLandPackage
              ? packageDesignTitle || "Configured house design for this block"
              : showAllDesigns
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
          {houseAndLandPriceBreakdown ? (
            <div className="mt-2 grid gap-0.5 text-sm">
              {houseAndLandPriceBreakdown.map((line) => (
                <div
                  key={line.label}
                  className="flex items-baseline justify-between gap-3 text-brand"
                >
                  <span className="text-brand-muted">{line.label}</span>
                  <span
                    className={
                      line.label === "House & Land total"
                        ? "font-semibold text-brand-primary"
                        : "font-medium text-brand"
                    }
                  >
                    {line.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-brand-primary mt-1 text-base font-semibold">
              {priceText}
            </div>
          )}
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
                houseAndLandBuildPrice: lot.houseAndLandBuildPrice,
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
              onViewDocuments={handleViewDocumentsClick}
              onViewFacades={handleViewFacadesClick}
              selectedDesignId={selectedHouseDesignId}
              onSelectedDesignIdChange={setSelectedHouseDesignId}
              lockedDesignId={
                isConfiguredHouseAndLandPackage ? packageFloorPlanId : null
              }
              hideFilterControl={isConfiguredHouseAndLandPackage}
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
                    {isConfiguredHouseAndLandPackage
                      ? `This is a House and land package from ${packageBuilderName}.`
                      : "Find floor plans that fit this lot, or secure it now if you're ready."}
                  </p>
                  {isConfiguredHouseAndLandPackage && packageDesignTitle && (
                    <p className="mt-2 text-sm text-brand-muted">
                      {packageDesignTitle} is included with this package.
                    </p>
                  )}
                </div>

                {isConfiguredHouseAndLandPackage ? (
                  <Button
                    label="Show me the house design"
                    rightIcon={<ArrowRight className="h-6 w-8" />}
                    className="w-full text-base py-4 rounded-xl font-semibold animated-gradient-button transition-all duration-300 shadow-md cursor-pointer"
                    onClick={handleShowPackageDesign}
                    disabled={isSold || !packageHouseDesign}
                  />
                ) : (
                  <Button
                    label="Show me matching floor plans"
                    rightIcon={<ArrowRight className="h-6 w-8" />}
                    className="w-full text-base py-4 rounded-xl font-semibold animated-gradient-button transition-all duration-300 shadow-md cursor-pointer"
                    onClick={openPreferencesView}
                    disabled={isSold}
                  />
                )}
                <Button
                  label="Secure this lot"
                  variant="ghost"
                  className="mt-3 w-full rounded-xl border-brand-primary bg-white py-4 text-base font-semibold text-brand hover:bg-brand-accent hover:text-brand"
                  onClick={handleSecureLot}
                  disabled={
                    isSold ||
                    (isConfiguredHouseAndLandPackage && !packageHouseDesign)
                  }
                />
              </div>
            </div>
          )}
        </Sidebar>
      )}

      {showQuoteSidebar && (
        <React.Suspense fallback={<div>Loading...</div>}>
          <GetYourQuoteSidebar
            open={showQuoteSidebar}
            onClose={() => {
              setShowQuoteSidebar(false);
              setQuoteDesign(null);
              setQuoteSelectedFacade(null);
              setInitialQuoteJourneyType(null);
            }}
            onBack={() => {
              setShowQuoteSidebar(false);
              const hadQuoteDesign = !!quoteDesign;
              setQuoteDesign(null);
              setQuoteSelectedFacade(null);
              setInitialQuoteJourneyType(null);
              if (hadQuoteDesign) {
                setShowHouseDesigns(true);
                setShowFilter(false);
              } else {
                openSummaryView();
              }
            }}
            selectedHouseDesign={quoteDesign}
            selectedFacade={quoteSelectedFacade}
            initialJourneyType={initialQuoteJourneyType}
            onExploreAvailableBlocks={handleExploreAvailableBlocks}
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

      <TextModal
        open={showFloorPlanModal && !!selectedHouseDesignForModals}
        onClose={() => {
          setShowFloorPlanModal(false);
        }}
        title={`${selectedHouseDesignForModals?.title || ""} documents`}
        content={
          <div className="grid gap-3">
            {selectedHouseDesignForModals?.documents?.length ? (
              selectedHouseDesignForModals.documents.map((document) => {
                const size = formatDocumentSize(document.fileSizeBytes);
                return (
                  <a
                    key={document.id}
                    href={document.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-brand bg-white px-4 py-3 text-sm font-medium text-brand transition hover:border-brand-primary hover:bg-brand-accent"
                  >
                    {getDocumentLabel(document)}
                    {size ? (
                      <span className="font-normal text-brand-muted">
                        {" "}
                        ({size})
                      </span>
                    ) : null}
                  </a>
                );
              })
            ) : (
              <p className="m-0 text-sm text-brand-muted">
                No documents are available for this floor plan yet.
              </p>
            )}
          </div>
        }
      />

      <ImageCarouselModal
        key={`gallery-${lot.id}-${selectedHouseDesignForModals?.id ?? "none"}`}
        open={showFacadeModal && !!selectedHouseDesignForModals}
        onClose={() => {
          setShowFacadeModal(false);
          setCurrentModalFacadeIdx(0);
        }}
        title={`${selectedHouseDesignForModals?.title || ""} gallery`}
        images={buildDesignGalleryImages(selectedHouseDesignForModals)}
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
