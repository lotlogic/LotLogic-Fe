// Preload utility for critical components
export const preloadCriticalComponents = () => {
  // Preload the main map component when the app starts
  const preloadMap = () => import("../components/features/map/MapLayer");

  // Preload sidebar components when user hovers over a lot
  const preloadSidebar = () => import("../components/features/lots/LotSidebar");

  // Preload search components when user focuses on search
  const preloadSearch = () =>
    import("../components/features/map/SearchControl");

  return {
    preloadMap,
    preloadSidebar,
    preloadSearch,
  };
};

// Preload components on user interaction
export const preloadOnInteraction = () => {
  // Preload sidebar when user hovers over a lot
  const handleLotHover = () => {
    import("../components/features/lots/LotSidebar");
  };

  // Preload search when user focuses on search area
  const handleSearchFocus = () => {
    import("../components/features/map/SearchControl");
  };

  return {
    handleLotHover,
    handleSearchFocus,
  };
};
