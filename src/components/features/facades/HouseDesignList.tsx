import Button from "@/components/ui/Button";
import {
  BuilderBrandingBanner,
  hasBuilderBranding,
} from "@/components/builders/BuilderBrandingBanner";
import showToast from "@/components/ui/Toast";
import {
  colors,
  filter as filterContent,
  houseDesign,
  lotSidebar,
} from "@/constants/content";
import { useHouseDesigns } from "@/hooks/useHouseDesigns";
import {
  trackHouseDesignView,
  trackHouseDesignInteraction,
  trackPropertySaved,
} from "@/lib/analytics/mixpanel";
import type { HouseDesignFilterRequest } from "@/lib/api/lotApi";
import { getImageUrl } from "@/lib/api/lotApi";
import { useSavedPropertiesStore } from "@/stores/savedPropertiesStore";
import type {
  HouseDesignItem,
  HouseDesignListProps,
} from "@/types/houseDesign";
import {
  Bath,
  BedDouble,
  Bookmark,
  Car,
  ChevronLeft,
  ChevronRight,
  Funnel,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { normalizeLotSalesMode } from "@/constants/lotSalesMode";
import { getDesignCardPriceLines } from "@/lib/utils/lotPricing";
import { normalizeFloorPlanTitle } from "@/utils/text";

type DesignMediaItem = {
  kind: "floorplan" | "facade";
  src: string;
  alt: string;
  label: string;
  facadeIndex?: number;
};

const SWIPE_THRESHOLD_PX = 36;
const SWIPE_MAX_VERTICAL_PX = 28;

const buildDesignMedia = (house: HouseDesignItem): DesignMediaItem[] => {
  const items: DesignMediaItem[] = [];

  house.images.forEach((image, index) => {
    items.push({
      kind: "facade",
      src: getImageUrl(image.src),
      alt: `${house.title} ${image.faced || `Facade ${index + 1}`}`,
      label: image.faced || `Facade ${index + 1}`,
      facadeIndex: index,
    });
  });

  if (house.floorPlanImage) {
    items.push({
      kind: "floorplan",
      src: getImageUrl(house.floorPlanImage),
      alt: `${house.title} floor plan`,
      label: "Floor plan",
    });
  }

  if (items.length === 0 && house.image) {
    items.push({
      kind: "facade",
      src: getImageUrl(house.image),
      alt: `${house.title} facade`,
      label: "Facade",
      facadeIndex: 0,
    });
  }

  return items;
};

const stopInteractionPropagation = (event: React.SyntheticEvent) => {
  event.stopPropagation();
};

const normalizeText = (value: unknown): string => String(value ?? "").trim();

const getBuilderCardBranding = (house: HouseDesignItem) => {
  const builderRecord =
    house.builder && typeof house.builder === "object" ? house.builder : null;
  const name =
    normalizeText(house.builderName) || normalizeText(builderRecord?.name);
  const logoUrl = normalizeText(builderRecord?.logoUrl);
  const backgroundColor = normalizeText(builderRecord?.brandingBgColor);
  const textColor = normalizeText(builderRecord?.brandingTextColor);

  if (
    !name ||
    !hasBuilderBranding({
      name,
      logoUrl,
      backgroundColor,
      textColor,
    })
  ) {
    return null;
  }

  return {
    name,
    logoUrl,
    backgroundColor,
    textColor,
  };
};

export const HouseDesignList = ({
  filter,
  lot,
  onShowFilter,
  onShowAllDesigns,
  onDesignClick,
  onEnquireNow,
  onViewDocuments,
  onViewFacades,
  selectedDesignId: controlledSelectedDesignId,
  onSelectedDesignIdChange,
  lockedDesignId,
  hideFilterControl = false,
  hasActiveFilters = false,
  showingAllDesigns = false,
}: HouseDesignListProps) => {
  const [internalSelectedDesignId, setInternalSelectedDesignId] = useState<
    string | null
  >(null);
  const selectedDesignId =
    controlledSelectedDesignId === undefined
      ? internalSelectedDesignId
      : controlledSelectedDesignId;
  const [mediaIndexByDesignId, setMediaIndexByDesignId] = useState<
    Record<string, number>
  >({});
  const touchStartByDesignIdRef = useRef<
    Record<string, { x: number; y: number } | undefined>
  >({});
  const suppressNextMediaClickRef = useRef<Record<string, boolean>>({});
  const [showToastMessage, setShowToastMessage] = useState<{
    message: string;
    type: "success" | "error" | "warning";
  } | null>(null);

  // Use Zustand store for saved properties
  const { isDesignSaved, toggleSaved } = useSavedPropertiesStore();

  const updateSelectedDesignId = (designId: string | null) => {
    setInternalSelectedDesignId(designId);
    onSelectedDesignIdChange?.(designId);
  };

  // Handle toast display with useEffect
  useEffect(() => {
    if (showToastMessage) {
      showToast(showToastMessage);
      setShowToastMessage(null);
    }
  }, [showToastMessage]);

  const apiFilters: HouseDesignFilterRequest = {
    bedroom: filter.bedroom,
    bathroom: filter.bathroom,
    car: filter.car,
    min_size:
      filter.min_size && !isNaN(filter.min_size) ? filter.min_size : undefined,
    max_size:
      filter.max_size && !isNaN(filter.max_size) ? filter.max_size : undefined,
    rumpus: filter.rumpus ? true : undefined,
    alfresco: filter.alfresco ? true : undefined,
    pergola: filter.pergola ? true : undefined,
  };

  // Fetch house designs from API
  const {
    data: apiResponse,
    isLoading,
    error,
  } = useHouseDesigns(
    lot.lotDbId?.toString() || lot.lotId?.toString() || null,
    lockedDesignId || showingAllDesigns ? null : apiFilters,
    true
  );

  // Safely extract house designs with fallback
  const houseDesigns = (apiResponse?.houseDesigns as HouseDesignItem[]) || [];

  const filteredHouses = lockedDesignId
    ? houseDesigns.filter((house) => house.id === lockedDesignId)
    : houseDesigns;

  useEffect(() => {
    if (!selectedDesignId || isLoading) {
      return;
    }
    const selectedStillExists = filteredHouses.some(
      (house) => house.id === selectedDesignId
    );
    if (!selectedStillExists) {
      updateSelectedDesignId(null);
      onDesignClick(null);
    }
  }, [filteredHouses, isLoading, onDesignClick, selectedDesignId]);

  const handleStarClick = (event: React.MouseEvent, clickedHouseId: string) => {
    event.stopPropagation();

    const clickedHouse = (houseDesigns as HouseDesignItem[]).find(
      (house) => house.id === clickedHouseId
    );
    if (!clickedHouse) return;

    const isCurrentlySaved = isDesignSaved(
      lot.lotId,
      clickedHouseId,
      lot.estateId
    );

    // Track property save/remove
    trackPropertySaved(
      lot.lotId?.toString() || "",
      !isCurrentlySaved ? "saved" : "removed",
      {
        estateId: lot.estateId,
        lotDbId: lot.lotDbId,
        builderId: clickedHouse.builderId,
        builder: clickedHouse.builder,
      }
    );

    // Toggle saved state using Zustand store
    toggleSaved({
      id: lot.lotId?.toString() || "",
      estateId: lot.estateId,
      ...lot,
      houseDesign: { ...clickedHouse, isFavorite: !isCurrentlySaved },
    });

    // Show toast message when adding
    if (!isCurrentlySaved) {
      setShowToastMessage({
        message: "Design saved to your Shortlist",
        type: "success",
      });
    }
  };

  const setMediaIndex = (
    designId: string,
    nextIndex: number,
    mediaLength: number
  ) => {
    if (mediaLength === 0) {
      return;
    }
    const normalized = ((nextIndex % mediaLength) + mediaLength) % mediaLength;
    setMediaIndexByDesignId((prev) => ({
      ...prev,
      [designId]: normalized,
    }));
  };

  const handleSelectDesign = (house: HouseDesignItem) => {
    if (selectedDesignId === house.id) {
      if (lockedDesignId === house.id) {
        return;
      }
      updateSelectedDesignId(null);
      onDesignClick(null);
      return;
    }

    updateSelectedDesignId(house.id);
    const houseWithOverlayOnly = { ...house, overlayOnly: true };
    onDesignClick(houseWithOverlayOnly);

    trackHouseDesignView(house.id, {
      id: house.id,
      name: house.title,
      title: house.title,
      estateId: lot.estateId,
      bedrooms: house.bedrooms,
      bathrooms: house.bathrooms,
      area: house.area,
      lotId: lot.lotId,
      lotDbId: lot.lotDbId,
      builderId: house.builderId,
      builderName: house.builderName,
      builder: house.builder,
    });
  };

  const handleMediaOpen = (
    event: React.MouseEvent,
    house: HouseDesignItem,
    media: DesignMediaItem
  ) => {
    event.stopPropagation();
    if (suppressNextMediaClickRef.current[house.id]) {
      suppressNextMediaClickRef.current[house.id] = false;
      return;
    }

    if (media.kind === "floorplan") {
      if (onViewDocuments) {
        onViewDocuments(house);
      }

      trackHouseDesignInteraction("Documents Viewed", {
        id: house.id,
        title: house.title,
        estateId: lot.estateId,
        bedrooms: house.bedrooms,
        bathrooms: house.bathrooms,
        area: house.area,
        lotId: lot.lotId,
        lotDbId: lot.lotDbId,
        builderId: house.builderId,
        builderName: house.builderName,
        builder: house.builder,
      });
      return;
    }

    if (onViewFacades) {
      onViewFacades(house, media.facadeIndex ?? 0);
    }

    trackHouseDesignInteraction("Facades Viewed", {
      id: house.id,
      title: house.title,
      estateId: lot.estateId,
      bedrooms: house.bedrooms,
      bathrooms: house.bathrooms,
      area: house.area,
      lotId: lot.lotId,
      lotDbId: lot.lotDbId,
      builderId: house.builderId,
      builderName: house.builderName,
      builder: house.builder,
    });
  };

  const handleMediaTouchStart = (
    designId: string,
    event: React.TouchEvent
  ) => {
    if (event.touches.length !== 1) {
      touchStartByDesignIdRef.current[designId] = undefined;
      return;
    }
    const touch = event.touches[0];
    touchStartByDesignIdRef.current[designId] = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const handleMediaTouchEnd = (
    designId: string,
    activeMediaIndex: number,
    mediaCount: number,
    event: React.TouchEvent
  ) => {
    const start = touchStartByDesignIdRef.current[designId];
    touchStartByDesignIdRef.current[designId] = undefined;

    if (!start || event.changedTouches.length !== 1 || mediaCount <= 1) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const horizontalDistance = Math.abs(deltaX);
    const verticalDistance = Math.abs(deltaY);

    if (
      horizontalDistance < SWIPE_THRESHOLD_PX ||
      verticalDistance > SWIPE_MAX_VERTICAL_PX ||
      verticalDistance > horizontalDistance
    ) {
      return;
    }

    event.stopPropagation();
    suppressNextMediaClickRef.current[designId] = true;

    if (deltaX < 0) {
      setMediaIndex(designId, activeMediaIndex + 1, mediaCount);
      return;
    }

    setMediaIndex(designId, activeMediaIndex - 1, mediaCount);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="p-6 overflow-y-auto h-full">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6 overflow-y-auto h-full">
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-brand mb-2">
                Unable to load house designs
              </h3>
              <p className="text-brand-muted mb-4">
                We encountered an issue while loading the house designs for this
                lot.
              </p>
            </div>
            <div className="space-y-3">
              <Button
                label="Try again"
                onClick={() => window.location.reload()}
                className="w-full bg-brand-primary text-white py-2 px-4 rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
              />
              <Button
                label="Adjust filters"
                variant="outline"
                onClick={onShowFilter}
                className="w-full border border-brand text-brand py-2 px-4 rounded-lg font-medium hover:bg-brand-muted transition-colors"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show no results state - simplified condition
  if (!isLoading && filteredHouses.length === 0) {
    const canShowAllDesigns =
      hasActiveFilters && !showingAllDesigns && !!onShowAllDesigns;

    return (
      <div className="p-6 overflow-y-auto h-full">
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-brand mb-2">
                {canShowAllDesigns
                  ? "No exact design matches"
                  : "No house designs found"}
              </h3>
              <p className="text-brand-muted mb-4">
                {lockedDesignId
                  ? "The configured house design is not available for this block yet."
                  : canShowAllDesigns
                  ? "Nothing matched the preferences you selected for this block. You can adjust them or view all compatible designs instead."
                  : "We couldn't find any house designs matching your current criteria. Try adjusting your filters to see more options."}
              </p>
            </div>
            {!lockedDesignId && (
              <div className="space-y-3">
                {canShowAllDesigns && (
                  <Button
                    label="Show all designs"
                    onClick={onShowAllDesigns}
                    className="w-full bg-brand-primary text-white py-2 px-4 rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
                  />
                )}
                <Button
                  label={
                    canShowAllDesigns ? "Adjust preferences" : "Adjust filters"
                  }
                  onClick={onShowFilter}
                  variant={canShowAllDesigns ? "outline" : undefined}
                  className={
                    canShowAllDesigns
                      ? "w-full border border-brand text-brand py-2 px-4 rounded-lg font-medium hover:bg-brand-muted transition-colors"
                      : "w-full bg-brand-primary text-white py-2 px-4 rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
                  }
                />
                <div className="text-sm text-brand-muted">
                  <p className="mb-2">Try these suggestions:</p>
                  <ul className="text-left space-y-1">
                    <li>• Increase the number of bedrooms or bathrooms</li>
                    <li>• Adjust the size range</li>
                    <li>• Change the number of car spaces</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      {!hideFilterControl && (
        <div className="mb-4 flex justify-end">
          <Button
            label={filterContent.title}
            leftIcon={<Funnel className="h-4 w-4" />}
            variant="outline"
            className="border border-brand rounded-lg px-3 py-1 flex items-center gap-2 text-brand bg-brand"
            onClick={onShowFilter}
          />
        </div>
      )}
      {showingAllDesigns && hasActiveFilters && (
        <div className="mb-4 rounded-xl border border-brand bg-brand-accent px-4 py-3 text-sm text-brand">
          Your selected preferences returned no exact matches, so you&apos;re
          viewing every compatible design for this block.
        </div>
      )}
      <div className="space-y-6">
        {filteredHouses.map((house) => {
          const normalizedTitle = normalizeFloorPlanTitle(house.title);
          const isSelected = selectedDesignId === house.id;
          const mediaItems = buildDesignMedia(house);
          const mediaCount = mediaItems.length;
          const builderCardBranding = getBuilderCardBranding(house);
          const rawMediaIndex = mediaIndexByDesignId[house.id] ?? 0;
          const activeMediaIndex =
            mediaCount === 0
              ? 0
              : rawMediaIndex >= 0 && rawMediaIndex < mediaCount
              ? rawMediaIndex
              : 0;
          const activeMedia = mediaItems[activeMediaIndex];

          const homeSizeLabel =
            typeof house.homeSize === "string" ? house.homeSize.trim() : "";
          const areaLabel =
            homeSizeLabel ||
            `${lotSidebar.singleStorey} ${houseDesign.area}: ${house.area} ${houseDesign.m2}`;
          const pricingLines = getDesignCardPriceLines({
            lotSalesMode: normalizeLotSalesMode(lot.salesMode),
            lotPrice: lot.price,
            buildPrice: lot.houseAndLandBuildPrice,
            designArea: house.area,
          });

          return (
            <div
              key={house.id}
              className={`rounded-2xl border border-brand p-4 transition-all duration-300 ${
                isSelected ? "bg-brand-accent" : "bg-brand hover:shadow-md"
              }`}
              onClick={() => handleSelectDesign(house)}
            >
              <div className="relative overflow-hidden rounded-xl border border-brand bg-brand-muted">
                {activeMedia ? (
                  <button
                    type="button"
                    className="block h-full w-full cursor-zoom-in"
                    onClick={(event) => handleMediaOpen(event, house, activeMedia)}
                    onTouchStart={(event) => handleMediaTouchStart(house.id, event)}
                    onTouchEnd={(event) =>
                      handleMediaTouchEnd(
                        house.id,
                        activeMediaIndex,
                        mediaCount,
                        event
                      )
                    }
                    style={{ touchAction: "pan-y" }}
                  >
                    <img
                      src={activeMedia.src}
                      alt={activeMedia.alt}
                      className="h-56 w-full object-cover sm:h-64"
                    />
                  </button>
                ) : (
                  <div className="flex h-56 w-full items-center justify-center text-sm text-brand-muted sm:h-64">
                    No media available
                  </div>
                )}

                {mediaCount > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Previous media"
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white transition hover:bg-black/60"
                      onClick={(event) => {
                        event.stopPropagation();
                        setMediaIndex(house.id, activeMediaIndex - 1, mediaCount);
                      }}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next media"
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white transition hover:bg-black/60"
                      onClick={(event) => {
                        event.stopPropagation();
                        setMediaIndex(house.id, activeMediaIndex + 1, mediaCount);
                      }}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}

                {activeMedia && (
                  <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white">
                    {activeMedia.label}
                  </div>
                )}

                {mediaCount > 1 && (
                  <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">
                    {activeMediaIndex + 1}/{mediaCount}
                  </div>
                )}
              </div>

              {mediaItems.length > 1 && (
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {mediaItems.map((media, mediaIndex) => (
                    <button
                      key={`${house.id}-${media.kind}-${mediaIndex}`}
                      type="button"
                      className={`h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition ${
                        mediaIndex === activeMediaIndex
                          ? "border-brand-primary"
                          : "border-transparent opacity-80 hover:opacity-100"
                      }`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setMediaIndex(house.id, mediaIndex, mediaItems.length);
                      }}
                    >
                      <img
                        src={media.src}
                        alt={media.alt}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {builderCardBranding && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <BuilderBrandingBanner
                      name={builderCardBranding.name}
                      logoUrl={builderCardBranding.logoUrl}
                      backgroundColor={builderCardBranding.backgroundColor}
                      textColor={builderCardBranding.textColor}
                    />
                  </div>
                  <div
                    className={`cursor-pointer rounded-full border border-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isSelected
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-white text-brand hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
                    }`}
                  >
                    {isSelected
                      ? "Selected for lot preview"
                      : "Click to preview on your block"}
                  </div>
                </div>
              )}
              {!builderCardBranding && (
                <div
                  className={`mt-4 inline-flex cursor-pointer rounded-full border border-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isSelected
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-white text-brand hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
                  }`}
                >
                  {isSelected
                    ? "Selected for lot preview"
                    : "Click to preview on your block"}
                </div>
              )}

              <div className="mt-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-lg font-bold text-brand">
                    {normalizedTitle}
                  </div>
                  <div className="mt-1 text-sm text-brand-muted">{areaLabel}</div>
                  <div className="mt-2 space-y-0.5 text-sm font-semibold text-brand">
                    {pricingLines.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-full p-2 -m-2 touch-manipulation"
                  aria-label={
                    isDesignSaved(lot.lotId, house.id, lot.estateId)
                      ? "Remove from shortlist"
                      : "Save to shortlist"
                  }
                  onPointerDown={stopInteractionPropagation}
                  onTouchStart={stopInteractionPropagation}
                  onMouseDown={stopInteractionPropagation}
                  onClick={(event) => handleStarClick(event, house.id)}
                  data-star-icon
                >
                  <Bookmark
                    className={`h-6 w-6 transition-colors duration-200 ${
                      isDesignSaved(lot.lotId, house.id, lot.estateId)
                        ? "fill-current"
                        : "text-brand-muted"
                    }`}
                    style={{
                      color: isDesignSaved(lot.lotId, house.id, lot.estateId)
                        ? colors.primary
                        : undefined,
                    }}
                  />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-sm font-medium text-brand">
                <span className="flex items-center gap-1">
                  <BedDouble className="h-5 w-5 text-brand" />
                  {house.bedrooms}
                </span>
                <span className="flex items-center gap-1">
                  <Bath className="h-5 w-5 text-brand" />
                  {house.bathrooms}
                </span>
                <span className="flex items-center gap-1">
                  <Car className="h-5 w-5 text-brand" />
                  {house.cars}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Button
                  label="View documents"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (onViewDocuments) {
                      onViewDocuments(house);
                    }

                    trackHouseDesignInteraction("Documents Viewed", {
                      id: house.id,
                      title: house.title,
                      estateId: lot.estateId,
                      bedrooms: house.bedrooms,
                      bathrooms: house.bathrooms,
                      area: house.area,
                      lotId: lot.lotId,
                      lotDbId: lot.lotDbId,
                      builderId: house.builderId,
                      builderName: house.builderName,
                      builder: house.builder,
                    });
                  }}
                  variant="ghost"
                  className="cursor-pointer rounded-lg border-[var(--color-primary)] bg-white py-2 px-4 font-medium text-brand transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
                />
                <Button
                  label="View facades"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (onViewFacades) {
                      onViewFacades(house, 0);
                    }

                    trackHouseDesignInteraction("Facades Viewed", {
                      id: house.id,
                      title: house.title,
                      estateId: lot.estateId,
                      bedrooms: house.bedrooms,
                      bathrooms: house.bathrooms,
                      area: house.area,
                      lotId: lot.lotId,
                      lotDbId: lot.lotDbId,
                      builderId: house.builderId,
                      builderName: house.builderName,
                      builder: house.builder,
                    });
                  }}
                  variant="ghost"
                  className="cursor-pointer rounded-lg border-[var(--color-primary)] bg-white py-2 px-4 font-medium text-brand transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
                />
              </div>

              {onEnquireNow && (
                <div className="mt-3">
                  <Button
                    label="Get a detailed quote"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEnquireNow(house);

                      trackHouseDesignInteraction("Enquiry Initiated", {
                        id: house.id,
                        title: house.title,
                        estateId: lot.estateId,
                        bedrooms: house.bedrooms,
                        bathrooms: house.bathrooms,
                        area: house.area,
                        lotId: lot.lotId,
                        lotDbId: lot.lotDbId,
                        builderId: house.builderId,
                        builderName: house.builderName,
                        builder: house.builder,
                      });
                    }}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-primary py-3 px-4 font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HouseDesignList;
