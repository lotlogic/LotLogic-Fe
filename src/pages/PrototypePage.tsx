import SavedPropertiesSidebar from "@/components/features/map/SavedPropertiesSidebar";
import Header from "@/components/layouts/Header";
import MobileBottomNav from "@/components/layouts/MobileBottomNav";
import MobileSearch from "@/components/ui/MobileSearch";
import { useMobile } from "@/hooks/useMobile";
import { trackEvent } from "@/lib/analytics/mixpanel";
import { useMobileNavigationStore } from "@/stores/mobileNavigationStore";
import { preloadCriticalComponents } from "@/utils/preload";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Lazy load heavy components
const ZoneMap = lazy(() => import("@/components/features/map/MapLayer"));

const queryClient = new QueryClient();

export const PrototypePage = () => {
  const isMobile = useMobile();
  const { activeTab, toggleTab, closeAllPanels } = useMobileNavigationStore();

  // Compute visibility states from activeTab
  const isSearchVisible = activeTab === "search";
  const isSavedVisible = activeTab === "saved";

  // Initialize Mixpanel analytics
  useEffect(() => {
    // Track app load
    trackEvent("App Loaded", {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      platform: "web",
      version: "1.0.0",
    });
  }, []);

  // Preload critical components after initial render
  useEffect(() => {
    const { preloadSidebar, preloadSearch } = preloadCriticalComponents();

    // Preload sidebar and search components after a short delay
    const timer = setTimeout(() => {
      preloadSidebar();
      preloadSearch();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Events
  const handleTabChange = (tab: "search" | "saved" | "recenter") => {
    // Track tab change
    trackEvent("Mobile Tab Changed", {
      tab: tab,
      timestamp: new Date().toISOString(),
    });

    // Use the consolidated toggle function
    toggleTab(tab);
  };

  const handleSearch = (_query: string) => {
    closeAllPanels();
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen w-screen flex flex-col overflow-hidden">
        {/* Header - Only show on desktop */}
        {!isMobile && <Header />}

        {/* Main Content */}
        <div className={`flex-1 relative ${isMobile ? "pb-16" : ""}`}>
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full bg-brand-muted">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary mx-auto mb-4"></div>
                  <p className="text-brand-muted">Loading map...</p>
                </div>
              </div>
            }
          >
            <ZoneMap />
          </Suspense>
        </div>

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <MobileBottomNav
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        )}

        {/* Mobile Search - Only show when search tab is active */}
        {isMobile && (
          <MobileSearch
            isOpen={isSearchVisible}
            onClose={closeAllPanels}
            onSearch={handleSearch}
          />
        )}

        {/* Mobile Saved Properties - Only show when saved tab is active */}
        {isMobile && (
          <SavedPropertiesSidebar
            open={isSavedVisible}
            onClose={closeAllPanels}
            onViewDetails={(_property) => {
              closeAllPanels();
            }}
          />
        )}

        <ToastContainer
          position={isMobile ? "top-center" : "bottom-right"}
          autoClose={3000}
          hideProgressBar={true}
          newestOnTop={true}
          closeOnClick={true}
          rtl={false}
          pauseOnFocusLoss={false}
          draggable={true}
          pauseOnHover={false}
          limit={3}
          theme="light"
          style={{ zIndex: 9999 }}
        />
      </div>
    </QueryClientProvider>
  );
};

export default PrototypePage;
