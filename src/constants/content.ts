// Centralized content management for white-labeling
export const APP_CONTENT = {
  // App-wide content
  app: {
    name: "LotLogic",
    tagline: "Build Your Dream Home",
    description: "Find your perfect lot and design your dream home",
  },

  // Brand assets
  brand: {
    logo: "/images/logo.png",
    favicon: "/images/logo.png",
    logoAlt: "LotLogic Logo",
    title: "LOTLOGIC",
  },

  // Header content
  header: {
    title: "LotLogic",
    subtitle: "Build Your Dream Home",
    searchPlaceholder: "Search for lots...",
  },

  // Sidebar content
  sidebar: {
    close: "Close",
    back: "Back",
    loading: "Loading...",
  },

  // Lot sidebar content
  lotSidebar: {
    buildYourSite: "Build Your Site",
    houseDesigns: "House Designs",
    planningRules: "Planning Rules",
    showMeWhatICanBuild: "Show Me What I Can Build Here",
    lotId: "Lot ID",
    area: "Area",
    type: "Type",
    zoning: "Zoning",
    overlays: "Overlays",
    flood: "Flood",
    singleStorey: "Single Storey",
    facedOption: "Faced Option",
  },

  // House design content
  houseDesign: {
    title: "House Designs",
    filter: "Filter",
    reset: "Reset",
    showHouseDesign: "Show House Design",
    enquireNow: "Enquire Now",
    bedrooms: "Bedrooms",
    bathrooms: "Bathrooms",
    cars: "Cars",
    storeys: "Storeys",
    area: "Area",
    ft: "ft",
    selectImage: "Select image",
    thumbnail: "Thumbnail",
  },

  // Quote sidebar content
  quote: {
    title: "Get Your Quote",
    subtitle: "Select builders and get quotes for your dream home",
    yourName: "Your Name",
    emailAddress: "Email Address",
    phoneNumber: "Phone Number",
    selectBuilders: "Select Builders (Multiple Selection)",
    chooseBuilders: "Choose builders to get quotes from",
    additionalComments: "Additional Comments",
    submit: "Submit",
    submitting: "Submitting...",
    thankYou: "Thank You!",
    enquirySubmitted: "Your enquiry has been successfully submitted.",
    lotSecured: "Your lot has been successfully secured and is now reserved for your review.",
    reserveYourLot: "Reserve Your Lot Today",
    secureLotDescription: "Secure Lot {lotId} with a refundable deposit while you compare builder quotes",
    secureThisLot: "Secure this lot",
    mayBeLater: "Keep Exploring",
    deposit: "$1,000",
  },

  // Map content
  map: {
    searchPlaceholder: "Search for lots...",
    layers: "Layers",
    zoningLayers: "Zoning Layers",
    exploringInfo: "Exploring information and property details",
    floodRiskAreas: "Flood Risk Areas",
    floodRiskDescription: "Properties with elevated flood risk requiring special consideration",
    bushfireRisk: "Bushfire Risk",
    bushfireRiskDescription: "Areas prone to bushfire with special building requirements",
    heritage: "Heritage",
    heritageDescription: "Electricity Network",
    heritageSubDescription: "Power grid infrastructure and transmission lines",
    savedProperties: "Your Shortlist",
    savedPropertiesDescription: "List of properties that you've shortlisted.",
    noSavedProperties: "No saved properties",
    noSavedPropertiesDescription: "Start exploring properties and save them to your shortlist.",
    viewDetails: "View Details",
  },

  // Filter content
  filter: {
    title: "Filters",
    reset: "Reset",
    bedroom: "Bedroom",
    bathroom: "Bathroom",
    cars: "Cars",
    storeys: "Storeys",
  },

  // Summary view content
  summary: {
    lotDetails: "Lot Details",
    planningRules: "Planning Rules",
    showDetailedRules: "Show Detailed Rules",
  },

  // Validation messages
  validation: {
    required: "This field is required",
    invalidEmail: "Please enter a valid email address",
    invalidPhone: "Please enter a valid phone number",
    minLength: "Must be at least {min} characters",
    maxLength: "Must be no more than {max} characters",
  },

  // Error messages
  errors: {
    general: "Something went wrong. Please try again.",
    networkError: "Network error. Please check your connection.",
    mapError: "Map loading error. Please refresh the page.",
  },

  // Success messages
  success: {
    formSubmitted: "Form submitted successfully!",
    lotReserved: "Lot reserved successfully!",
  },

  // Loading states
  loading: {
    map: "Loading map...",
    data: "Loading data...",
    submitting: "Submitting...",
  },

  // Brand colors (for easy customization)
  colors: {
    primary: "#2F5D62",
    secondary: "#EAEFEF",
    accent: "#1a3d42",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    text: {
      primary: "#000000",
      secondary: "#6B7280",
      light: "#9CA3AF",
    },
    background: {
      primary: "#FFFFFF",
      secondary: "#F9FAFB",
      accent: "#eaf3f2",
    },
  },

  // Typography
  typography: {
    fontFamily: {
      primary: "Inter, system-ui, sans-serif",
      secondary: "Georgia, serif",
    },
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
    },
    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
  },

  // Spacing
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
  },

  // Shadows
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  },

  // Transitions
  transitions: {
    fast: "150ms ease-in-out",
    normal: "250ms ease-in-out",
    slow: "350ms ease-in-out",
  },
} as const;

// Helper function to get nested content with fallback
export function getContent(path: string, fallback?: string): string {
  const keys = path.split('.');
  let current: unknown = APP_CONTENT;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return fallback || path;
    }
  }
  
  return typeof current === 'string' ? current : fallback || path;
}

// Helper function to format content with variables
export function formatContent(template: string, variables: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key]?.toString() || match;
  });
}

// Type for content paths
export type ContentPath = keyof typeof APP_CONTENT;

// Export individual sections for easier imports
export const { app, brand, header, sidebar, lotSidebar, houseDesign, quote, map, filter, summary, validation, errors, success, loading, colors, typography, spacing, shadows, transitions } = APP_CONTENT; 