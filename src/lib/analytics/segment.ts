// Get the global analytics object from the snippet
declare global {
  interface Window {
    analytics: {
      identify: (userId: string, traits?: Record<string, unknown>) => void;
      track: (event: string, properties?: Record<string, unknown>) => void;
      page: (page: string, properties?: Record<string, unknown>) => void;
    };
  }
}

// Wait for analytics to be available
const getAnalytics = () => {
  return window.analytics;
};

// User identification and traits
export const identifyUser = (userId: string, traits: Record<string, unknown>) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.identify(userId, traits);
  }
};

// Track user events
export const trackEvent = (event: string, properties?: Record<string, unknown>) => {
  const analytics = getAnalytics();
  if (analytics) {

    analytics.track(event, properties);
  } else {
    console.error('Analytics not available for event:', event);
  }
};

// Track page views
export const trackPage = (page: string, properties?: Record<string, unknown>) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.page(page, properties);
  }
};

// Track user segmentation
export const trackUserSegment = (segment: string, preferences: Record<string, unknown>) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.identify('anonymous', {
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
export const trackLotView = (lotId: string, lotData: Record<string, unknown>) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.track('Lot Viewed', {
      lotId,
      lotArea: lotData.areaSqm,
      lotZoning: lotData.zoning,
      lotAddress: lotData.address,
      lotDistrict: lotData.district,
    });
  }
};

// Track house design interactions
export const trackHouseDesignView = (designId: string, designData: Record<string, unknown>) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.track('House Design Viewed', {
      designId,
      designName: designData.name,
      bedrooms: designData.bedrooms,
      bathrooms: designData.bathrooms,
      area: designData.areaSqm,
    });
  }
};

// Track lot selection
export const trackLotSelected = (lotId: string, lotData: Record<string, unknown>) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.track('Lot Selected', {
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
    analytics.track('Enquiry Submitted', {
      lotId: enquiryData.lotId,
      houseDesignId: enquiryData.houseDesignId,
      facadeId: enquiryData.facadeId,
      builderCount: (enquiryData.builder as unknown[])?.length || 0,
    });
  }
};

// Track search events
export const trackSearch = (searchTerm: string, filters: Record<string, unknown>) => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.track('Search Performed', {
      searchTerm,
      filters,
    });
  }
};

// Track saved properties
export const trackPropertySaved = (lotId: string, action: 'saved' | 'removed') => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.track(`Property ${action === 'saved' ? 'Saved' : 'Removed'}`, {
      lotId,
      action,
    });
  }
};
