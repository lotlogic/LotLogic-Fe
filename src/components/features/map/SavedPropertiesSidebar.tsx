import Button from "@/components/ui/Button";
import { GetYourQuoteSidebar } from "@/components/features/quote/QuoteSideBar";
import { useMobile } from "@/hooks/useMobile";
import { getImageUrl } from "@/lib/api/lotApi";
import { getOverlaysColor } from "@/lib/utils/overlays";
import { getZoningColor } from "@/lib/utils/zoning";
import { useSavedPropertiesStore } from "@/stores/savedPropertiesStore";
import type { HouseDesignItem } from "@/types/houseDesign";
import type { SavedPropertiesSidebarProps, SavedProperty } from "@/types/ui";
import {
  Bath,
  BedDouble,
  Bookmark,
  Car,
  ChevronLeft,
  ChevronRight,
  MailQuestionMark,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type DesignMediaItem = {
  kind: "floorplan" | "facade";
  src: string;
  alt: string;
  label: string;
};

const REMOVE_SHORTLIST_MESSAGE =
  "This will remove this from your shortlist. Are you sure you want to do that?";

const buildSavedDesignMedia = (property: SavedProperty): DesignMediaItem[] => {
  const mediaItems: DesignMediaItem[] = [];
  const floorPlanSrc = getImageUrl(property.houseDesign.floorPlanImage);

  if (floorPlanSrc) {
    mediaItems.push({
      kind: "floorplan",
      src: floorPlanSrc,
      alt: `${property.houseDesign.title} floor plan`,
      label: "Floor plan",
    });
  }

  (property.houseDesign.images || []).forEach((image, index) => {
    const facadeSrc = getImageUrl(image.src);
    if (!facadeSrc) {
      return;
    }

    mediaItems.push({
      kind: "facade",
      src: facadeSrc,
      alt: `${property.houseDesign.title} ${image.faced || `Facade ${index + 1}`}`,
      label: image.faced || `Facade ${index + 1}`,
    });
  });

  if (mediaItems.length === 0) {
    const fallbackSrc = getImageUrl(property.houseDesign.image);
    if (fallbackSrc) {
      mediaItems.push({
        kind: "facade",
        src: fallbackSrc,
        alt: `${property.houseDesign.title} facade`,
        label: "Facade",
      });
    }
  }

  return mediaItems;
};

const getSavedPropertyKey = (property: SavedProperty) =>
  `${property.estateId || "default"}-${property.lotId}-${property.houseDesign.id}`;

const normalizeMediaIndex = (index: number, mediaLength: number) => {
  if (mediaLength <= 0) {
    return 0;
  }
  return ((index % mediaLength) + mediaLength) % mediaLength;
};

const toHouseDesignItem = (
  houseDesign: SavedProperty["houseDesign"]
): HouseDesignItem => ({
  id: houseDesign.id,
  title: houseDesign.title,
  area: houseDesign.area || "",
  builderId: houseDesign.builderId,
  builderName: houseDesign.builderName,
  width: houseDesign.width,
  depth: houseDesign.depth,
  image: houseDesign.image || "",
  images: houseDesign.images || [],
  bedrooms: houseDesign.bedrooms,
  bathrooms: houseDesign.bathrooms,
  cars: houseDesign.cars,
  storeys: houseDesign.storeys,
  isFavorite: true,
  floorPlanImage: houseDesign.floorPlanImage,
});

const toLotSizeNumber = (size?: string | number) => {
  if (typeof size === "number") {
    return size;
  }

  if (typeof size === "string") {
    const parsed = parseFloat(size);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

type SavedPropertyCardProps = {
  property: SavedProperty;
  mediaIndex: number;
  onMediaIndexChange: (nextIndex: number, mediaLength: number) => void;
  onRemove: (property: SavedProperty) => void;
  onGetCostEstimate: (property: SavedProperty) => void;
};

const SavedPropertyCard = ({
  property,
  mediaIndex,
  onMediaIndexChange,
  onRemove,
  onGetCostEstimate,
}: SavedPropertyCardProps) => {
  const mediaItems = buildSavedDesignMedia(property);
  const mediaCount = mediaItems.length;
  const activeMediaIndex = normalizeMediaIndex(mediaIndex, mediaCount);
  const activeMedia = mediaItems[activeMediaIndex];

  return (
    <div className="rounded-2xl border border-brand bg-brand p-4 shadow-sm">
      <div className="relative overflow-hidden rounded-xl border border-brand bg-brand-muted">
        {activeMedia ? (
          <img
            src={activeMedia.src}
            alt={activeMedia.alt}
            className="h-52 w-full object-cover sm:h-56"
          />
        ) : (
          <div className="flex h-52 w-full items-center justify-center text-sm text-brand-muted sm:h-56">
            No media available
          </div>
        )}

        {mediaCount > 1 && (
          <>
            <button
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white transition hover:bg-black/60"
              aria-label="Previous media"
              onClick={(event) => {
                event.stopPropagation();
                onMediaIndexChange(activeMediaIndex - 1, mediaCount);
              }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white transition hover:bg-black/60"
              aria-label="Next media"
              onClick={(event) => {
                event.stopPropagation();
                onMediaIndexChange(activeMediaIndex + 1, mediaCount);
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

      {mediaCount > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {mediaItems.map((media, index) => (
            <button
              key={`${property.houseDesign.id}-${media.kind}-${index}`}
              type="button"
              className={`h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition ${
                index === activeMediaIndex
                  ? "border-brand-primary"
                  : "border-transparent opacity-80 hover:opacity-100"
              }`}
              onClick={(event) => {
                event.stopPropagation();
                onMediaIndexChange(index, mediaCount);
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

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-lg font-bold text-brand">
            {property.houseDesign.title}
          </div>
          <div className="mt-1 text-sm text-brand-muted">
            Lot ID: {property.lotDisplayId ?? property.lotId}, {property.suburb},{" "}
            {property.address}
          </div>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full p-2 -m-2 touch-manipulation"
          aria-label="Remove from shortlist"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(property);
          }}
        >
          <Bookmark
            className="h-6 w-6 fill-current"
            style={{ color: "var(--color-primary)" }}
          />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {property.size && (
          <span className="rounded-full bg-brand-muted px-3 py-1 text-xs text-brand">
            {property.size}m²
          </span>
        )}
        {property.zoning && (
          <span
            className="rounded-full px-3 py-1 text-xs text-brand"
            style={{ backgroundColor: getZoningColor(property.zoning) }}
          >
            {property.zoning}
          </span>
        )}
        {property.overlays && (
          <span
            className="rounded-full px-3 py-1 text-xs text-brand"
            style={{ backgroundColor: getOverlaysColor(property.overlays) }}
          >
            {property.overlays}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-sm font-medium text-brand">
        <span className="flex items-center gap-1">
          <BedDouble className="h-5 w-5 text-brand" />
          {property.houseDesign.bedrooms}
        </span>
        <span className="flex items-center gap-1">
          <Bath className="h-5 w-5 text-brand" />
          {property.houseDesign.bathrooms}
        </span>
        <span className="flex items-center gap-1">
          <Car className="h-5 w-5 text-brand" />
          {property.houseDesign.cars}
        </span>
      </div>

      <Button
        label="Get a detailed quote"
        leftIcon={<MailQuestionMark className="h-4 w-4" />}
        variant="outline"
        onClick={(event) => {
          event.stopPropagation();
          onGetCostEstimate(property);
        }}
        className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-brand bg-brand py-3 px-4 font-medium text-brand transition-colors hover:border-primary hover:bg-primary hover:text-white"
      />
    </div>
  );
};

export const SavedPropertiesSidebar = ({
  open,
  onClose,
  onViewDetails: _onViewDetails,
}: Omit<SavedPropertiesSidebarProps, "savedProperties">) => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const isMobile = useMobile();
  const [drawerHeight, setDrawerHeight] = useState<"50vh" | "100vh">("50vh");
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState<"50vh" | "100vh">("50vh");
  const [mediaIndexByPropertyKey, setMediaIndexByPropertyKey] = useState<
    Record<string, number>
  >({});
  const [isQuoteSidebarOpen, setIsQuoteSidebarOpen] = useState(false);
  const [quoteProperty, setQuoteProperty] = useState<SavedProperty | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const {
    savedProperties: storeSavedProperties,
    removeFromSaved,
    hydrateFromCookie,
  } = useSavedPropertiesStore();

  const savedProperties = storeSavedProperties as SavedProperty[];

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (open) {
      hydrateFromCookie();
    }
  }, [open, hydrateFromCookie]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [open, onClose]);

  const handleTouchStart = (event: React.TouchEvent) => {
    if (!isMobile) return;
    setIsDragging(true);
    setStartY(event.touches[0].clientY);
    setStartHeight(drawerHeight);
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!isMobile || !isDragging) return;
    event.preventDefault();

    const currentY = event.touches[0].clientY;
    const deltaY = startY - currentY;
    const threshold = 80;

    if (deltaY > threshold && startHeight === "50vh") {
      setDrawerHeight("100vh");
    } else if (deltaY < -threshold && startHeight === "100vh") {
      setDrawerHeight("50vh");
    } else if (deltaY < -threshold && startHeight === "50vh") {
      onClose();
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;
    setIsDragging(false);
  };

  useEffect(() => {
    if (open && isMobile) {
      setDrawerHeight("50vh");
    }
  }, [open, isMobile]);

  const setMediaIndex = (
    propertyKey: string,
    nextIndex: number,
    mediaLength: number
  ) => {
    setMediaIndexByPropertyKey((prev) => ({
      ...prev,
      [propertyKey]: normalizeMediaIndex(nextIndex, mediaLength),
    }));
  };

  const handleRemove = (property: SavedProperty) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(REMOVE_SHORTLIST_MESSAGE)
    ) {
      return;
    }

    removeFromSaved(property.lotId, property.houseDesign.id, property.estateId);
  };

  const handleGetCostEstimate = (property: SavedProperty) => {
    setQuoteProperty(property);
    setIsQuoteSidebarOpen(true);
  };

  const renderSavedList = () => (
    <div className="space-y-4">
      {savedProperties.map((property) => {
        const propertyKey = getSavedPropertyKey(property);
        return (
          <SavedPropertyCard
            key={propertyKey}
            property={property}
            mediaIndex={mediaIndexByPropertyKey[propertyKey] ?? 0}
            onMediaIndexChange={(nextIndex, mediaLength) =>
              setMediaIndex(propertyKey, nextIndex, mediaLength)
            }
            onRemove={handleRemove}
            onGetCostEstimate={handleGetCostEstimate}
          />
        );
      })}
    </div>
  );

  if (!open) return null;

  if (isMobile) {
    return (
      <>
        {!isQuoteSidebarOpen && (
          <div
            ref={drawerRef}
            className="fixed bottom-16 left-0 right-0 bg-brand shadow-2xl z-50 transition-all duration-300 ease-in-out"
            style={{
              height: drawerHeight === "100vh" ? "calc(100vh - 4rem)" : "70vh",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="flex justify-center pt-2 pb-1 cursor-pointer"
              onClick={() =>
                setDrawerHeight(drawerHeight === "50vh" ? "100vh" : "50vh")
              }
            >
              <div className="h-1 w-12 rounded-full bg-brand-muted" />
            </div>

            <div className="flex items-start rounded-t-2xl border-b border-brand bg-brand p-4 pb-3">
              <div className="flex-grow">
                <h2 className="text-xl font-bold text-brand">Your Shortlist</h2>
                <p className="mt-1 text-sm text-brand-muted">
                  List of properties that you&apos;ve shortlisted.
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-brand-muted hover:bg-brand-muted hover:text-brand"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="min-h-0 flex-grow overflow-y-auto p-4">
              {!isClient ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-brand-primary"></div>
                </div>
              ) : savedProperties.length === 0 ? (
                <div className="py-8 text-center">
                  <Bookmark className="mx-auto mb-4 h-12 w-12 text-brand-muted" />
                  <h3 className="mb-2 text-lg font-medium text-brand">
                    No saved properties yet
                  </h3>
                  <p className="text-brand-muted">
                    Start exploring lots and save your favorite house designs!
                  </p>
                </div>
              ) : (
                renderSavedList()
              )}
            </div>
          </div>
        )}

        {quoteProperty && (
          <GetYourQuoteSidebar
            open={isQuoteSidebarOpen}
            onClose={() => {
              setIsQuoteSidebarOpen(false);
              setQuoteProperty(null);
            }}
            onBack={() => {
              setIsQuoteSidebarOpen(false);
            }}
            selectedHouseDesign={toHouseDesignItem(quoteProperty.houseDesign)}
            selectedFacade={
              quoteProperty.houseDesign.images?.[0]
                ? {
                    facadeId: quoteProperty.houseDesign.images[0].facadeId,
                    label:
                      quoteProperty.houseDesign.images[0].faced || "Facade 1",
                  }
                : null
            }
            lotDetails={{
              id: quoteProperty.lotId,
              estateId: quoteProperty.estateId,
              displayId: quoteProperty.lotDisplayId ?? quoteProperty.lotId,
              suburb: quoteProperty.suburb || "",
              address: quoteProperty.address || "",
              size: toLotSizeNumber(quoteProperty.size),
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      {!isQuoteSidebarOpen && (
        <div
          ref={sidebarRef}
          className={`absolute bg-brand shadow-lg z-30 transition-transform duration-300 ease-in-out
                bottom-0 left-0 right-0 h-[70vh] w-full
                        md:bottom-auto md:left-auto md:top-0 md:right-0 md:h-full md:w-[350px]`}
        >
          <div className="flex justify-center pb-2 pt-3 md:hidden">
            <div className="h-1 w-12 rounded-full bg-brand-muted"></div>
          </div>

          <div className="border-b border-brand p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-brand">Your Shortlist</h2>
                <p className="mt-1 text-sm text-brand-muted">
                  List of properties that you&apos;ve shortlisted.
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded pb-6 text-brand transition-colors hover:bg-brand-muted hover:text-brand"
              >
                <X className="h-8 w-7" />
              </button>
            </div>
          </div>

          <div className="h-[calc(100%-80px)] overflow-y-auto p-4">
            {!isClient ? (
              <div className="py-8 text-center">
                <div className="animate-pulse">
                  <Bookmark className="mx-auto mb-4 h-12 w-12 text-brand-muted" />
                  <h3 className="mb-2 text-lg font-medium text-brand">
                    Loading...
                  </h3>
                </div>
              </div>
            ) : savedProperties.length === 0 ? (
              <div className="py-8 text-center">
                <Bookmark className="mx-auto mb-4 h-12 w-12 text-brand-muted" />
                <h3 className="mb-2 text-lg font-medium text-brand">
                  No saved properties
                </h3>
                <p className="text-brand-muted">
                  Start exploring properties and save them to your shortlist.
                </p>
              </div>
            ) : (
              renderSavedList()
            )}
          </div>
        </div>
      )}

      {quoteProperty && (
        <GetYourQuoteSidebar
          open={isQuoteSidebarOpen}
          onClose={() => {
            setIsQuoteSidebarOpen(false);
            setQuoteProperty(null);
          }}
          onBack={() => {
            setIsQuoteSidebarOpen(false);
          }}
          selectedHouseDesign={toHouseDesignItem(quoteProperty.houseDesign)}
          selectedFacade={
            quoteProperty.houseDesign.images?.[0]
              ? {
                  facadeId: quoteProperty.houseDesign.images[0].facadeId,
                  label:
                    quoteProperty.houseDesign.images[0].faced || "Facade 1",
                }
              : null
          }
          lotDetails={{
            id: quoteProperty.lotId,
            estateId: quoteProperty.estateId,
            displayId: quoteProperty.lotDisplayId ?? quoteProperty.lotId,
            suburb: quoteProperty.suburb || "",
            address: quoteProperty.address || "",
            size: toLotSizeNumber(quoteProperty.size),
          }}
        />
      )}
    </>
  );
};

export default SavedPropertiesSidebar;
