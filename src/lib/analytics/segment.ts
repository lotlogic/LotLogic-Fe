// Get the global analytics object from the snippet
declare global {
  interface Window {
    analytics: {
      identify: (userId: string, traits?: Record<string, unknown>) => void;
      track: (event: string, properties?: Record<string, unknown>) => void;
      page: (page: string, properties?: Record<string, unknown>) => void;
      setAnonymousId: (anonymousId: string) => void;
    };
  }
}

// Generate a Mixpanel-compatible ID (24-character hex string)
export const generateMixpanelCompatibleId = (): string => {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Initialize analytics with proper ID
export const initializeAnalytics = () => {
  const analytics = getAnalytics();
  if (analytics) {
    const mixpanelCompatibleId = generateMixpanelCompatibleId();
    analytics.setAnonymousId(mixpanelCompatibleId);
    analytics.identify(mixpanelCompatibleId);
  }
};

// Wait for analytics to be available
const getAnalytics = () => {
  return window.analytics;
};

// User identification and traits
export const identifyUser = (
  userId: string,
  traits: Record<string, unknown>
) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.identify(userId, traits);
  }
};

// Track user events
export const trackEvent = (
  event: string,
  properties?: Record<string, unknown>
) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.track(event, properties);
  } else {
    console.error("Analytics not available for event:", event);
  }
};

// Track page views
export const trackPage = (
  page: string,
  properties?: Record<string, unknown>
) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.page(page, properties);
  }
};

// Track user segmentation
export const trackUserSegment = (
  segment: string,
  preferences: Record<string, unknown>
) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.identify("anonymous", {
      segment,
      preferences,
      userType: segment,
      budget: preferences.budget,
      propertyType: preferences.propertyType,
      bedrooms: preferences.bedrooms,
      bathrooms: preferences.bathrooms,
      timeline: preferences.timeline,
    });
  }
};

// Track lot interactions
export const trackLotView = (
  lotId: string,
  lotData: Record<string, unknown>
) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.track("Lot Viewed", {
      lotId,
      lotArea: lotData.areaSqm,
      lotZoning: lotData.zoning,
      lotAddress: lotData.address,
      lotDistrict: lotData.district,
      lotSuburb: lotData.suburb,
      lotSize: lotData.size,
      lotType: lotData.type,
      timestamp: new Date().toISOString(),
    });
  }
};

// Track house design interactions
export const trackHouseDesignView = (
  designId: string,
  designData: Record<string, unknown>
) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.track("House Design Viewed", {
      designId,
      designName: designData.name,
      bedrooms: designData.bedrooms,
      bathrooms: designData.bathrooms,
      area: designData.areaSqm,
    });
  }
};

// Track lot selection
export const trackLotSelected = (
  lotId: string,
  lotData: Record<string, unknown>
) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.track("Lot Selected", {
      lotId,
      lotArea: lotData.areaSqm,
      lotZoning: lotData.zoning,
      lotAddress: lotData.address,
    });
  }
};

// Track enquiry submission
export const trackEnquirySubmitted = (enquiryData: Record<string, unknown>) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.track("Enquiry Submitted", {
      lotId: enquiryData.lotId,
      houseDesignId: enquiryData.houseDesignId,
      facadeId: enquiryData.facadeId,
      builderCount: (enquiryData.builder as unknown[])?.length || 0,
    });
  }
};

// Track search events
export const trackSearch = (
  searchTerm: string,
  filters: Record<string, unknown>
) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.track("Search Performed", {
      searchTerm,
      filters,
    });
  }
};

// Track saved properties
export const trackPropertySaved = (
  lotId: string,
  action: "saved" | "removed"
) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.track(`Property ${action === "saved" ? "Saved" : "Removed"}`, {
      lotId,
      action,
    });
  }
};

// Track filter interactions
export const trackFilterApplied = (
  filterType: string,
  filterValue: unknown
) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.track("Filter Applied", {
      filterType,
      filterValue,
    });
  }
};

// Track house design interactions
export const trackHouseDesignInteraction = (
  action: string,
  designData: Record<string, unknown>
) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.track(`House Design ${action}`, {
      designId: designData.id,
      designName: designData.title,
      bedrooms: designData.bedrooms,
      bathrooms: designData.bathrooms,
      area: designData.area,
      lotId: designData.lotId,
    });
  }
};

// Track quote form interactions
export const trackQuoteFormInteraction = (
  action: string,
  formData: Record<string, unknown>
) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.track(`Quote Form ${action}`, {
      lotId: formData.lotId,
      houseDesignId: formData.houseDesignId,
      builderCount: (formData.builders as unknown[])?.length || 0,
      hasComments: !!(formData.comments as string)?.trim(),
    });
  }
};

// Track sidebar interactions
export const trackSidebarInteraction = (
  sidebarType: string,
  action: string
) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.track("Sidebar Interaction", {
      sidebarType,
      action,
    });
  }
};

// Track modal interactions
export const trackModalInteraction = (modalType: string, action: string) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.track("Modal Interaction", {
      modalType,
      action,
    });
  }
};

// Track user journey milestones
export const trackUserJourneyMilestone = (
  milestone: string,
  data: Record<string, unknown>
) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.track("User Journey Milestone", {
      milestone,
      ...data,
    });
  }
};

// Track error events
export const trackError = (
  errorType: string,
  errorMessage: string,
  context: Record<string, unknown>
) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.track("Error Occurred", {
      errorType,
      errorMessage,
      ...context,
    });
  }
};

// Track performance metrics
export const trackPerformance = (
  metric: string,
  value: number,
  context: Record<string, unknown>
) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.track("Performance Metric", {
      metric,
      value,
      ...context,
    });
  }
};
