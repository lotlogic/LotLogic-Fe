import mixpanel from 'mixpanel-browser';

// Initialize Mixpanel
export const initializeMixpanel = () => {
  const mixpanelToken = import.meta.env.VITE_MIXPANEL_TOKEN;
    
  if (!mixpanelToken) {
    console.warn('Please add VITE_MIXPANEL_TOKEN to your .env file');
    return false;
  }

  try {
    mixpanel.init(mixpanelToken, {
      debug: import.meta.env.DEV, // Enable debug in development
      track_pageview: false, // We'll handle page views manually
      persistence: 'localStorage',
      api_host: 'https://api.mixpanel.com', // Standard Mixpanel ingestion endpoint
      loaded: () => {
        // console.log('Mixpanel loaded successfully');
      }
    });

    // Generate and set a distinct ID
    const distinctId = generateDistinctId();
    mixpanel.identify(distinctId);
    
    // console.log('Mixpanel initialized successfully');
    
    // Send a test event to verify integration
    setTimeout(() => {
      trackEvent('App Initialized', {
        timestamp: new Date().toISOString(),
        distinctId: distinctId,
        environment: import.meta.env.DEV ? 'development' : 'production'
      });
    }, 1000);
    
    return true;
  } catch (error) {
    console.error('Failed to initialize Mixpanel:', error);
    return false;
  }
};

// Generate a unique distinct ID
export const generateDistinctId = (): string => {
  // Check if we already have an ID in localStorage
  const existingId = localStorage.getItem('mixpanel_distinct_id');
  if (existingId) {
    return existingId;
  }

  // Generate a new ID (24-character hex string, similar to your current approach)
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Store it for future use
  localStorage.setItem('mixpanel_distinct_id', result);
  return result;
};

// Check if Mixpanel is available
const isMixpanelAvailable = (): boolean => {
  return typeof mixpanel !== 'undefined' && typeof mixpanel.get_distinct_id === 'function';
};

// User identification and traits
export const identifyUser = (userId: string, traits: Record<string, unknown>) => {
  if (!isMixpanelAvailable()) return;
  
  try {
    mixpanel.identify(userId);
    mixpanel.people.set(traits);
  } catch (error) {
    // console.error('Failed to identify user:', error);
  }
};

// Track user events
export const trackEvent = (event: string, properties?: Record<string, unknown>) => {
  if (!isMixpanelAvailable()) {
    // console.warn('Mixpanel not available for event:', event);
    return;
  }
  
  try {
    const eventProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
      platform: 'web',
      app_version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    };
    
    mixpanel.track(event, eventProperties);
  } catch (error) {
    console.error('Failed to track event:', error);
  }
};

// Track page views
export const trackPage = (page: string, properties?: Record<string, unknown>) => {
  trackEvent('Page Viewed', {
    page,
    ...properties,
  });
};

// Track user segmentation
export const trackUserSegment = (segment: string, preferences: Record<string, unknown>) => {
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
    console.error('Failed to set user segment:', error);
  }
};

// Track lot interactions
export const trackLotView = (lotId: string, lotData: Record<string, unknown>) => {
  trackEvent('Lot Viewed', {
    lotId,
    lotArea: lotData.areaSqm,
    lotZoning: lotData.zoning,
    lotAddress: lotData.address,
    lotDistrict: lotData.district,
    lotSuburb: lotData.suburb,
    lotSize: lotData.size,
    lotType: lotData.type,
  });
};

// Track house design interactions
export const trackHouseDesignView = (designId: string, designData: Record<string, unknown>) => {
  trackEvent('House Design Viewed', {
    designId,
    designName: designData.name,
    bedrooms: designData.bedrooms,
    bathrooms: designData.bathrooms,
    area: designData.areaSqm,
  });
};

// Track lot selection
export const trackLotSelected = (lotId: string, lotData: Record<string, unknown>) => {
  trackEvent('Lot Selected', {
    lotId,
    lotArea: lotData.areaSqm,
    lotZoning: lotData.zoning,
    lotAddress: lotData.address,
  });
};

// Track enquiry submission
export const trackEnquirySubmitted = (enquiryData: Record<string, unknown>) => {
  trackEvent('Enquiry Submitted', {
    lotId: enquiryData.lotId,
    houseDesignId: enquiryData.houseDesignId,
    facadeId: enquiryData.facadeId,
    builderCount: (enquiryData.builder as unknown[])?.length || 0,
  });
};

// Track search events
export const trackSearch = (searchTerm: string, filters: Record<string, unknown>) => {
  trackEvent('Search Performed', {
    searchTerm,
    filters,
  });
};

// Track saved properties
export const trackPropertySaved = (lotId: string, action: 'saved' | 'removed') => {
  trackEvent(`Property ${action === 'saved' ? 'Saved' : 'Removed'}`, {
    lotId,
    action,
  });
};

// Track filter interactions
export const trackFilterApplied = (filterType: string, filterValue: unknown) => {
  trackEvent('Filter Applied', {
    filterType,
    filterValue,
  });
};

// Track house design interactions
export const trackHouseDesignInteraction = (action: string, designData: Record<string, unknown>) => {
  trackEvent(`House Design ${action}`, {
    designId: designData.id,
    designName: designData.title,
    bedrooms: designData.bedrooms,
    bathrooms: designData.bathrooms,
    area: designData.area,
    lotId: designData.lotId,
  });
};

// Track quote form interactions
export const trackQuoteFormInteraction = (action: string, formData: Record<string, unknown>) => {
  trackEvent(`Quote Form ${action}`, {
    lotId: formData.lotId,
    houseDesignId: formData.houseDesignId,
    builderCount: (formData.builders as unknown[])?.length || 0,
    hasComments: !!(formData.comments as string)?.trim(),
  });
};

// Track sidebar interactions
export const trackSidebarInteraction = (sidebarType: string, action: string) => {
  trackEvent('Sidebar Interaction', {
    sidebarType,
    action,
  });
};

// Track modal interactions
export const trackModalInteraction = (modalType: string, action: string) => {
  trackEvent('Modal Interaction', {
    modalType,
    action,
  });
};

// Track user journey milestones
export const trackUserJourneyMilestone = (milestone: string, data: Record<string, unknown>) => {
  trackEvent('User Journey Milestone', {
    milestone,
    ...data,
  });
};

// Track error events
export const trackError = (errorType: string, errorMessage: string, context: Record<string, unknown>) => {
  trackEvent('Error Occurred', {
    errorType,
    errorMessage,
    ...context,
  });
};

// Track performance metrics
export const trackPerformance = (metric: string, value: number, context: Record<string, unknown>) => {
  trackEvent('Performance Metric', {
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
    console.error('Failed to set user properties:', error);
  }
};

// Increment user properties (useful for counters)
export const incrementUserProperty = (property: string, value: number = 1) => {
  if (!isMixpanelAvailable()) return;
  
  try {
    mixpanel.people.increment(property, value);
  } catch (error) {
    console.error('Failed to increment user property:', error);
  }
};

// Track revenue (for conversion tracking)
export const trackRevenue = (amount: number, properties?: Record<string, unknown>) => {
  if (!isMixpanelAvailable()) return;
  
  try {
    mixpanel.people.track_charge(amount, properties);
    trackEvent('Revenue', {
      amount,
      ...properties,
    });
  } catch (error) {
    console.error('Failed to track revenue:', error);
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
    console.error('Failed to reset user:', error);
  }
};
