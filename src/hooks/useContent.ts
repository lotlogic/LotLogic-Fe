import { useMemo } from 'react';
import { APP_CONTENT, getContent, formatContent } from '@/constants/content';

export function useContent() {
  const content = useMemo(() => {
    return {
      // Direct access to content sections
      app: APP_CONTENT.app,
      header: APP_CONTENT.header,
      sidebar: APP_CONTENT.sidebar,
      lotSidebar: APP_CONTENT.lotSidebar,
      houseDesign: APP_CONTENT.houseDesign,
      quote: APP_CONTENT.quote,
      map: APP_CONTENT.map,
      filter: APP_CONTENT.filter,
      summary: APP_CONTENT.summary,
      validation: APP_CONTENT.validation,
      errors: APP_CONTENT.errors,
      success: APP_CONTENT.success,
      loading: APP_CONTENT.loading,
      colors: APP_CONTENT.colors,
      typography: APP_CONTENT.typography,
      spacing: APP_CONTENT.spacing,
      shadows: APP_CONTENT.shadows,
      transitions: APP_CONTENT.transitions,

      // Helper functions
      get: getContent,
      format: formatContent,

      // Common content patterns
      getText: (key: string, variables?: Record<string, string | number>) => {
        const text = getContent(key);
        return variables ? formatContent(text, variables) : text;
      },

      // Validation helpers
      getValidation: (type: keyof typeof APP_CONTENT.validation, variables?: Record<string, string | number>) => {
        const message = APP_CONTENT.validation[type];
        return variables ? formatContent(message, variables) : message;
      },

      // Error helpers
      getError: (type: keyof typeof APP_CONTENT.errors) => {
        return APP_CONTENT.errors[type];
      },

      // Success helpers
      getSuccess: (type: keyof typeof APP_CONTENT.success) => {
        return APP_CONTENT.success[type];
      },

      // Loading helpers
      getLoading: (type: keyof typeof APP_CONTENT.loading) => {
        return APP_CONTENT.loading[type];
      },
    };
  }, []);

  return content;
}

// Hook for specific content sections
export function useAppContent() {
  return APP_CONTENT.app;
}

export function useHeaderContent() {
  return APP_CONTENT.header;
}

export function useSidebarContent() {
  return APP_CONTENT.sidebar;
}

export function useLotSidebarContent() {
  return APP_CONTENT.lotSidebar;
}

export function useHouseDesignContent() {
  return APP_CONTENT.houseDesign;
}

export function useQuoteContent() {
  return APP_CONTENT.quote;
}

export function useMapContent() {
  return APP_CONTENT.map;
}

export function useFilterContent() {
  return APP_CONTENT.filter;
}

export function useSummaryContent() {
  return APP_CONTENT.summary;
}

export function useValidationContent() {
  return APP_CONTENT.validation;
}

export function useErrorContent() {
  return APP_CONTENT.errors;
}

export function useSuccessContent() {
  return APP_CONTENT.success;
}

export function useLoadingContent() {
  return APP_CONTENT.loading;
}

export function useThemeContent() {
  return {
    colors: APP_CONTENT.colors,
    typography: APP_CONTENT.typography,
    spacing: APP_CONTENT.spacing,
    shadows: APP_CONTENT.shadows,
    transitions: APP_CONTENT.transitions,
  };
} 