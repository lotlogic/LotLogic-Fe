import mixpanel from "mixpanel-browser";

// Initialize Mixpanel
export const initializeMixpanel = () => {
  const mixpanelToken = import.meta.env.VITE_MIXPANEL_TOKEN;

  if (!mixpanelToken) {
    console.warn("Please add VITE_MIXPANEL_TOKEN to your .env file");
    return false;
  }

  try {
    mixpanel.init(mixpanelToken, {
      debug: import.meta.env.DEV, // Enable debug in development
      track_pageview: false, // We'll handle page views manually
      persistence: "localStorage",
      api_host: "https://api.mixpanel.com", // Standard Mixpanel ingestion endpoint
      loaded: () => {
        // console.log('Mixpanel loaded successfully');
      },
    });

    // Generate and set a distinct ID
    const distinctId = generateDistinctId();
    mixpanel.identify(distinctId);

    // console.log('Mixpanel initialized successfully');

    // Send a test event to verify integration
    setTimeout(() => {
      trackEvent("App Initialized", {
        timestamp: new Date().toISOString(),
        distinctId: distinctId,
        environment: import.meta.env.DEV ? "development" : "production",
      });
    }, 1000);

    return true;
  } catch (error) {
    console.error("Failed to initialize Mixpanel:", error);
    return false;
  }
};

// Generate a unique distinct ID
export const generateDistinctId = (): string => {
  // Check if we already have an ID in localStorage
  const existingId = localStorage.getItem("mixpanel_distinct_id");
  if (existingId) {
    return existingId;
  }

  // Generate a new ID (24-character hex string, similar to your current approach)
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Store it for future use
  localStorage.setItem("mixpanel_distinct_id", result);
  return result;
};

// Check if Mixpanel is available
const isMixpanelAvailable = (): boolean => {
  return (
    typeof mixpanel !== "undefined" &&
    typeof mixpanel.get_distinct_id === "function"
  );
};

const normalizeEntityId = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized || undefined;
};

const asRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  return value as Record<string, unknown>;
};

const normalizeBuilderId = (value: unknown): string | undefined => {
  if (value && typeof value === "object") {
    const builderRecord = value as Record<string, unknown>;
    return normalizeEntityId(builderRecord.builderId ?? builderRecord.id);
  }
  return normalizeEntityId(value);
};

const normalizeBuilderIdList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeBuilderId(item))
      .filter((item): item is string => Boolean(item));
  }
  const single = normalizeBuilderId(value);
  return single ? [single] : [];
};

const resolveBuilderIds = (data?: Record<string, unknown>): string[] => {
  if (!data) {
    return [];
  }

  const ids = new Set<string>();
  const push = (value: unknown) => {
    normalizeBuilderIdList(value).forEach((id) => ids.add(id));
  };

  push(data.builderId);
  push(data.builderIds);
  push(data.builders);
  push(data.builder);

  const houseDesign = data.houseDesign;
  if (houseDesign && typeof houseDesign === "object") {
    const designRecord = houseDesign as Record<string, unknown>;
    push(designRecord.builderId);
    push(designRecord.builderIds);
    push(designRecord.builder);
  }

  return Array.from(ids);
};

const resolveLotId = (data?: Record<string, unknown>): string | undefined => {
  if (!data) {
    return undefined;
  }

  const lotRecord = asRecord(data.lot) ?? asRecord(data.lotDetails);
  const lotIdCandidates: unknown[] = [
    data.lotKey,
    data.blockKey,
    data.BLOCK_KEY,
    data.lotDisplayId,
    data.displayLotId,
    data.displayId,
    data.blockNumber,
    data.BLOCK_NUMBER,
    data.LOT_NUMBER,
    data.lotId,
    data.lot_id,
    data.lotID,
    data.ID,
    lotRecord?.lotId,
    lotRecord?.lot_id,
    lotRecord?.lotKey,
    lotRecord?.blockKey,
    lotRecord?.BLOCK_KEY,
    lotRecord?.lotDisplayId,
    lotRecord?.displayLotId,
    lotRecord?.displayId,
    lotRecord?.blockNumber,
    lotRecord?.BLOCK_NUMBER,
    lotRecord?.LOT_NUMBER,
    lotRecord?.id,
    lotRecord?.ID,
  ];

  for (const candidate of lotIdCandidates) {
    const normalized = normalizeEntityId(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
};

const resolveLotDbId = (data?: Record<string, unknown>): string | undefined => {
  if (!data) {
    return undefined;
  }

  const lotRecord = asRecord(data.lot) ?? asRecord(data.lotDetails);
  const lotDbIdCandidates: unknown[] = [
    data.lotDbId,
    data.lotDatabaseId,
    data.databaseId,
    data.dbLotId,
    data.lot_id,
    lotRecord?.lotDbId,
    lotRecord?.lotDatabaseId,
    lotRecord?.databaseId,
    lotRecord?.dbLotId,
    lotRecord?.id,
    lotRecord?.ID,
  ];

  for (const candidate of lotDbIdCandidates) {
    const normalized = normalizeEntityId(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
};

const resolveEstateIdFromData = (
  data?: Record<string, unknown>
): string | undefined => {
  if (!data) {
    return undefined;
  }

  const lotRecord = asRecord(data.lot) ?? asRecord(data.lotDetails);
  const houseDesignRecord = asRecord(data.houseDesign);
  const estateIdCandidates: unknown[] = [
    data.estateId,
    data.estate_id,
    data.estateID,
    lotRecord?.estateId,
    lotRecord?.estate_id,
    houseDesignRecord?.estateId,
  ];

  for (const candidate of estateIdCandidates) {
    const normalized = normalizeEntityId(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
};

const decodePathSegment = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const resolveEstateIdFromLocation = (): string | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const fromQuery =
    normalizeEntityId(searchParams.get("estateId")) ??
    normalizeEntityId(searchParams.get("estate")) ??
    normalizeEntityId(searchParams.get("estate_id"));
  if (fromQuery) {
    return fromQuery;
  }

  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length >= 2 && parts[0] === "embed") {
    return normalizeEntityId(decodePathSegment(parts[1]));
  }
  if (parts.length >= 3 && parts[0] === "dashboard" && parts[1] === "estates") {
    return normalizeEntityId(decodePathSegment(parts[2]));
  }
  if (parts.length >= 3 && parts[0] === "admin" && parts[1] === "estates") {
    return normalizeEntityId(decodePathSegment(parts[2]));
  }

  return undefined;
};

const resolveBuilderName = (data?: Record<string, unknown>): string | undefined => {
  if (!data) {
    return undefined;
  }

  const builderRecord = asRecord(data.builder);
  const houseDesignRecord = asRecord(data.houseDesign);
  const houseDesignBuilderRecord = asRecord(houseDesignRecord?.builder);
  const candidates: unknown[] = [
    data.builderName,
    data.builderLabel,
    builderRecord?.name,
    typeof data.builder === "string" ? data.builder : undefined,
    houseDesignRecord?.builderName,
    houseDesignBuilderRecord?.name,
    typeof houseDesignRecord?.builder === "string"
      ? houseDesignRecord.builder
      : undefined,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeEntityId(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
};

const resolveDesignName = (data?: Record<string, unknown>): string | undefined => {
  if (!data) {
    return undefined;
  }

  const houseDesignRecord = asRecord(data.houseDesign);
  const candidates: unknown[] = [
    data.designName,
    data.houseDesignName,
    data.houseDesignTitle,
    data.name,
    data.title,
    houseDesignRecord?.name,
    houseDesignRecord?.title,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeEntityId(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
};

const buildHouseDesignLabel = (
  designName?: string,
  builderName?: string
): string | undefined => {
  if (designName && builderName) {
    return `${designName} - ${builderName}`;
  }

  return designName;
};

const buildBuilderEventProperties = (
  data?: Record<string, unknown>
): Record<string, unknown> => {
  const builderIds = resolveBuilderIds(data);
  if (builderIds.length === 0) {
    return {};
  }

  return {
    builderId: builderIds[0],
    builderIds,
  };
};

const compactProperties = (
  input?: Record<string, unknown>
): Record<string, unknown> => {
  if (!input) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  );
};

type EntityContext = {
  estateId?: string;
  lotId?: string;
  lotDbId?: string;
};

let currentEntityContext: EntityContext = {};

const buildEntityEventProperties = (
  data?: Record<string, unknown>
): Record<string, unknown> => {
  const estateId =
    resolveEstateIdFromData(data) ??
    currentEntityContext.estateId ??
    resolveEstateIdFromLocation();
  const lotId = resolveLotId(data) ?? currentEntityContext.lotId;
  const lotDbId = resolveLotDbId(data) ?? currentEntityContext.lotDbId;

  return compactProperties({
    estateId,
    lotId,
    lotDbId,
    ...buildBuilderEventProperties(data),
  });
};

const updateEntityContext = (data?: Record<string, unknown>) => {
  const lotId = resolveLotId(data);
  if (lotId) {
    currentEntityContext = {
      ...currentEntityContext,
      lotId,
    };
  }

  const lotDbId = resolveLotDbId(data);
  if (lotDbId) {
    currentEntityContext = {
      ...currentEntityContext,
      lotDbId,
    };
  }

  const estateId =
    resolveEstateIdFromData(data) ??
    currentEntityContext.estateId ??
    resolveEstateIdFromLocation();
  if (estateId) {
    currentEntityContext = {
      ...currentEntityContext,
      estateId,
    };
  }
};

export const setAnalyticsContext = (context: Record<string, unknown>) => {
  updateEntityContext(context);
};

// User identification and traits
export const identifyUser = (
  userId: string,
  traits: Record<string, unknown>
) => {
  if (!isMixpanelAvailable()) return;

  try {
    mixpanel.identify(userId);
    mixpanel.people.set(traits);
  } catch (error) {
    // console.error('Failed to identify user:', error);
  }
};

// Track user events
export const trackEvent = (
  event: string,
  properties?: Record<string, unknown>
) => {
  if (!isMixpanelAvailable()) {
    // console.warn('Mixpanel not available for event:', event);
    return;
  }

  try {
    const normalizedProperties = compactProperties(properties);
    const entityProperties = buildEntityEventProperties(normalizedProperties);
    const eventProperties = {
      ...entityProperties,
      ...normalizedProperties,
      timestamp: new Date().toISOString(),
      platform: "web",
      app_version: import.meta.env.VITE_APP_VERSION || "1.0.0",
    };

    mixpanel.track(event, eventProperties);
    updateEntityContext(eventProperties);
  } catch (error) {
    console.error("Failed to track event:", error);
  }
};

// Track page views
export const trackPage = (
  page: string,
  properties?: Record<string, unknown>
) => {
  trackEvent("Page Viewed", {
    page,
    ...properties,
  });
};

// Track user segmentation
export const trackUserSegment = (
  segment: string,
  preferences: Record<string, unknown>
) => {
  if (!isMixpanelAvailable()) return;

  try {
    mixpanel.people.set({
      segment,
      preferences,
      userType: segment,
      budget: preferences.budget,
      propertyType: preferences.propertyType,
      bedrooms: preferences.bedrooms,
      bathrooms: preferences.bathrooms,
      timeline: preferences.timeline,
    });
  } catch (error) {
    console.error("Failed to set user segment:", error);
  }
};

// Track lot interactions
export const trackLotView = (
  lotId: string,
  lotData: Record<string, unknown>
) => {
  trackEvent("Lot Viewed", {
    lotId,
    lotDbId: lotData.lotDbId ?? lotData.databaseId ?? lotData.id,
    estateId: lotData.estateId,
    lotArea: lotData.areaSqm,
    lotZoning: lotData.zoning,
    lotAddress: lotData.address,
    lotDistrict: lotData.district,
    lotSuburb: lotData.suburb,
    lotSize: lotData.size,
    lotType: lotData.type,
    ...buildBuilderEventProperties(lotData),
  });
};

// Track house design interactions
export const trackHouseDesignView = (
  designId: string,
  designData: Record<string, unknown>
) => {
  const designName = resolveDesignName(designData);
  const builderName = resolveBuilderName(designData);

  trackEvent("House Design Viewed", {
    designId,
    estateId: designData.estateId,
    designName,
    houseDesignLabel: buildHouseDesignLabel(designName, builderName),
    bedrooms: designData.bedrooms,
    bathrooms: designData.bathrooms,
    area: designData.areaSqm ?? designData.area,
    lotId: designData.lotId,
    lotDbId: designData.lotDbId,
    builderName,
    ...buildBuilderEventProperties(designData),
  });
};

// Track lot selection
export const trackLotSelected = (
  lotId: string,
  lotData: Record<string, unknown>
) => {
  trackEvent("Lot Selected", {
    lotId,
    lotDbId: lotData.lotDbId ?? lotData.databaseId ?? lotData.id,
    estateId: lotData.estateId,
    lotArea: lotData.areaSqm,
    lotZoning: lotData.zoning,
    lotAddress: lotData.address,
    ...buildBuilderEventProperties(lotData),
  });
};

// Track enquiry submission
export const trackEnquirySubmitted = (enquiryData: Record<string, unknown>) => {
  const builderProps = buildBuilderEventProperties(enquiryData);
  const builderName = resolveBuilderName(enquiryData);
  const designName = resolveDesignName(enquiryData);
  const builderCountFromIds = Array.isArray(builderProps.builderIds)
    ? builderProps.builderIds.length
    : 0;
  trackEvent("Enquiry Submitted", {
    estateId: enquiryData.estateId,
    lotId: enquiryData.lotId,
    lotDbId: enquiryData.lotDbId,
    houseDesignId: enquiryData.houseDesignId,
    houseDesignName: designName,
    houseDesignLabel: buildHouseDesignLabel(designName, builderName),
    builderName,
    facadeId: enquiryData.facadeId,
    builderCount:
      builderCountFromIds || (enquiryData.builder as unknown[])?.length || 0,
    ...builderProps,
  });
};

// Track search events
export const trackSearch = (
  searchTerm: string,
  filters: Record<string, unknown>
) => {
  trackEvent("Search Performed", {
    searchTerm,
    filters,
  });
};

// Track saved properties
export const trackPropertySaved = (
  lotId: string,
  action: "saved" | "removed",
  context?: Record<string, unknown>
) => {
  trackEvent(`Property ${action === "saved" ? "Saved" : "Removed"}`, {
    estateId: context?.estateId,
    lotDbId: context?.lotDbId,
    ...buildBuilderEventProperties(context),
    lotId,
    action,
  });
};

// Track filter interactions
export const trackFilterApplied = (
  filterType: string,
  filterValue: unknown,
  context?: Record<string, unknown>
) => {
  trackEvent("Filter Applied", {
    ...context,
    filterType,
    filterValue,
  });
};

// Track house design interactions
export const trackHouseDesignInteraction = (
  action: string,
  designData: Record<string, unknown>
) => {
  const designName = resolveDesignName(designData);
  const builderName = resolveBuilderName(designData);

  trackEvent(`House Design ${action}`, {
    designId: designData.id,
    estateId: designData.estateId,
    designName,
    houseDesignLabel: buildHouseDesignLabel(designName, builderName),
    bedrooms: designData.bedrooms,
    bathrooms: designData.bathrooms,
    area: designData.area,
    lotId: designData.lotId,
    lotDbId: designData.lotDbId,
    builderName,
    ...buildBuilderEventProperties(designData),
  });
};

// Track quote form interactions
export const trackQuoteFormInteraction = (
  action: string,
  formData: Record<string, unknown>
) => {
  const builderProps = buildBuilderEventProperties(formData);
  const builderName = resolveBuilderName(formData);
  const designName = resolveDesignName(formData);
  const builderCountFromIds = Array.isArray(builderProps.builderIds)
    ? builderProps.builderIds.length
    : 0;
  trackEvent(`Quote Form ${action}`, {
    estateId: formData.estateId,
    lotId: formData.lotId,
    lotDbId: formData.lotDbId,
    houseDesignId: formData.houseDesignId,
    houseDesignName: designName,
    houseDesignLabel: buildHouseDesignLabel(designName, builderName),
    builderName,
    builderCount:
      builderCountFromIds || (formData.builders as unknown[])?.length || 0,
    hasComments: !!(formData.comments as string)?.trim(),
    ...builderProps,
  });
};

// Track sidebar interactions
export const trackSidebarInteraction = (
  sidebarType: string,
  action: string
) => {
  trackEvent("Sidebar Interaction", {
    sidebarType,
    action,
  });
};

// Track modal interactions
export const trackModalInteraction = (modalType: string, action: string) => {
  trackEvent("Modal Interaction", {
    modalType,
    action,
  });
};

// Track user journey milestones
export const trackUserJourneyMilestone = (
  milestone: string,
  data: Record<string, unknown>
) => {
  trackEvent("User Journey Milestone", {
    milestone,
    ...data,
  });
};

// Track error events
export const trackError = (
  errorType: string,
  errorMessage: string,
  context: Record<string, unknown>
) => {
  trackEvent("Error Occurred", {
    errorType,
    errorMessage,
    ...context,
  });
};

// Track performance metrics
export const trackPerformance = (
  metric: string,
  value: number,
  context: Record<string, unknown>
) => {
  trackEvent("Performance Metric", {
    metric,
    value,
    ...context,
  });
};

// Set user properties (for user profiles)
export const setUserProperties = (properties: Record<string, unknown>) => {
  if (!isMixpanelAvailable()) return;

  try {
    mixpanel.people.set(properties);
  } catch (error) {
    console.error("Failed to set user properties:", error);
  }
};

// Increment user properties (useful for counters)
export const incrementUserProperty = (property: string, value: number = 1) => {
  if (!isMixpanelAvailable()) return;

  try {
    mixpanel.people.increment(property, value);
  } catch (error) {
    console.error("Failed to increment user property:", error);
  }
};

// Track revenue (for conversion tracking)
export const trackRevenue = (
  amount: number,
  properties?: Record<string, unknown>
) => {
  if (!isMixpanelAvailable()) return;

  try {
    mixpanel.people.track_charge(amount, properties);
    trackEvent("Revenue", {
      amount,
      ...properties,
    });
  } catch (error) {
    console.error("Failed to track revenue:", error);
  }
};

// Reset user (for logout)
export const resetUser = () => {
  if (!isMixpanelAvailable()) return;

  try {
    mixpanel.reset();
    // Generate new distinct ID
    const newId = generateDistinctId();
    mixpanel.identify(newId);
  } catch (error) {
    console.error("Failed to reset user:", error);
  }
};
