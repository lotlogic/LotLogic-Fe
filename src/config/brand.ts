// Brand configuration for white-labeling
export const BRAND_CONFIG = {
  // Brand identity
  brand: {
    name: "LotLogic",
    tagline: "Build Your Dream Home",
    description: "Find your perfect lot and design your dream home",
    logo: "/images/logo.png",
    favicon: "/favicon.ico",
  },

  // Contact information
  contact: {
    email: "info@lotlogic.com",
    phone: "+1 (555) 123-4567",
    address: "123 Main Street, City, State 12345",
    website: "https://lotlogic.com",
  },

  // Social media
  social: {
    facebook: "https://facebook.com/lotlogic",
    twitter: "https://twitter.com/lotlogic",
    instagram: "https://instagram.com/lotlogic",
    linkedin: "https://linkedin.com/company/lotlogic",
  },

  // Business information
  business: {
    companyName: "LotLogic Pty Ltd",
    abn: "12 345 678 901",
    acn: "123 456 789",
    industry: "Real Estate Technology",
    founded: "2024",
  },

  // Legal
  legal: {
    termsOfService: "/terms",
    privacyPolicy: "/privacy",
    cookiePolicy: "/cookies",
    disclaimer: "This information is for general purposes only and should not be considered as professional advice.",
  },

  // Features and capabilities
  features: {
    mapIntegration: true,
    houseDesigns: true,
    quoteSystem: true,
    savedProperties: true,
    zoningLayers: true,
    floorplanOverlay: true,
  },

  // API endpoints (for different environments)
  api: {
    development: "http://localhost:3001/api",
    staging: "https://staging-api.lotlogic.com",
    production: "https://api.lotlogic.com",
  },

  // Third-party integrations
  integrations: {
    mapbox: {
      enabled: true,
      token: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    },
    analytics: {
      googleAnalytics: process.env.NEXT_PUBLIC_GA_ID,
      facebookPixel: process.env.NEXT_PUBLIC_FB_PIXEL,
    },
    payment: {
      stripe: process.env.NEXT_PUBLIC_STRIPE_KEY,
      paypal: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
    },
  },

  // Content customization
  content: {
    // Override specific content for this brand
    overrides: {
      // Example: Override specific text for this brand
      "quote.title": "Get Your Custom Quote",
      "quote.subtitle": "Connect with our trusted builders",
      "app.name": "CustomLotLogic",
    },
  },

  // Theme customization
  theme: {
    // Override colors for this brand
    colors: {
      primary: "#2F5D62", // Can be overridden
      secondary: "#EAEFEF",
      accent: "#1a3d42",
    },
    // Override fonts for this brand
    fonts: {
      primary: "Inter, system-ui, sans-serif",
      secondary: "Georgia, serif",
    },
  },
} as const;

// Helper function to get brand configuration
export function getBrandConfig() {
  return BRAND_CONFIG;
}

// Helper function to get environment-specific API URL
export function getApiUrl(): string {
  const env = process.env.NODE_ENV;
  
  switch (env) {
    case 'development':
      return BRAND_CONFIG.api.development;
    case 'production':
      return BRAND_CONFIG.api.production;
    default:
      return BRAND_CONFIG.api.staging;
  }
}

// Helper function to check if a feature is enabled
export function isFeatureEnabled(feature: keyof typeof BRAND_CONFIG.features): boolean {
  return BRAND_CONFIG.features[feature];
}

// Helper function to get integration config
export function getIntegrationConfig(integration: keyof typeof BRAND_CONFIG.integrations) {
  return BRAND_CONFIG.integrations[integration];
}

// Type for brand configuration
export type BrandConfig = typeof BRAND_CONFIG; 