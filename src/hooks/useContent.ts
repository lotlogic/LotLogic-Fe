import { useMemo } from "react";
import { APP_CONTENT, formatContent, getContent } from "../constants/content";

export const useContent = () => {
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
      brand: APP_CONTENT.brand,

      // Helper functions
      get: getContent,
      format: formatContent,

      // Common content patterns
      getText: (key: string, variables?: Record<string, string | number>) => {
        const text = getContent(key);
        return variables ? formatContent(text, variables) : text;
      },

      // Validation helpers
      getValidation: (
        type: keyof typeof APP_CONTENT.validation,
        variables?: Record<string, string | number>
      ) => {
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
};

// Hook for specific content sections
export const useAppContent = () => APP_CONTENT.app;

export const useHeaderContent = () => APP_CONTENT.header;

export const useSidebarContent = () => APP_CONTENT.sidebar;

export const useLotSidebarContent = () => APP_CONTENT.lotSidebar;

export const useHouseDesignContent = () => APP_CONTENT.houseDesign;

export const useQuoteContent = () => APP_CONTENT.quote;

export const useMapContent = () => APP_CONTENT.map;

export const useFilterContent = () => APP_CONTENT.filter;

export const useSummaryContent = () => APP_CONTENT.summary;

export const useValidationContent = () => APP_CONTENT.validation;

export const useErrorContent = () => APP_CONTENT.errors;

export const useSuccessContent = () => APP_CONTENT.success;

export const useLoadingContent = () => APP_CONTENT.loading;

export const useThemeContent = () => ({
  colors: APP_CONTENT.colors,
  typography: APP_CONTENT.typography,
  spacing: APP_CONTENT.spacing,
  shadows: APP_CONTENT.shadows,
  transitions: APP_CONTENT.transitions,
});
