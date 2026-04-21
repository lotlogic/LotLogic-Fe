import SavedPropertiesSidebar from "@/components/features/map/SavedPropertiesSidebar";
import Header from "@/components/layouts/Header";
import MobileBottomNav from "@/components/layouts/MobileBottomNav";
import MobileSearch from "@/components/ui/MobileSearch";
import { EstateAccessGate } from "@/components/estate/EstateAccessGate";
import { useMobile } from "@/hooks/useMobile";
import {
  lotApi,
  resolvePrototypeEstateId,
} from "@/lib/api/lotApi";
import { setAnalyticsContext, trackEvent } from "@/lib/analytics/mixpanel";
import { getRuntimeConfig } from "@/lib/runtime/runtimeConfig";
import { useMobileNavigationStore } from "@/stores/mobileNavigationStore";
import { preloadCriticalComponents } from "@/utils/preload";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Lazy load heavy components
const ZoneMap = lazy(() => import("@/components/features/map/MapLayer"));

const queryClient = new QueryClient();

type PrototypePageProps = {
  estateId?: string;
  skipEstateAccessGate?: boolean;
};

export const PrototypePage = ({
  estateId,
  skipEstateAccessGate = false,
}: PrototypePageProps) => {
  const isMobile = useMobile();
  const { activeTab, toggleTab, closeAllPanels } = useMobileNavigationStore();
  const [resolvedEstateId, setResolvedEstateId] = useState<
    string | undefined
  >(estateId);
  const [isEstateResolved, setIsEstateResolved] = useState(Boolean(estateId));

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

  useEffect(() => {
    setAnalyticsContext({
      estateId: resolvedEstateId,
    });
  }, [resolvedEstateId]);

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

  useEffect(() => {
    if (estateId) {
      setResolvedEstateId(estateId);
      setIsEstateResolved(true);
      return;
    }

    let isActive = true;
    const resolveEstate = async () => {
      setIsEstateResolved(false);

      const params = new URLSearchParams(window.location.search);
      const estateFromQuery = params.get("estateId")?.trim();
      if (estateFromQuery) {
        if (!isActive) return;
        setResolvedEstateId(estateFromQuery);
        setIsEstateResolved(true);
        return;
      }

      const runtimeEstateId = getRuntimeConfig().prototypeEstateId;
      if (runtimeEstateId) {
        if (!isActive) return;
        setResolvedEstateId(runtimeEstateId);
        setIsEstateResolved(true);
        return;
      }

      const envPrototypeEstateId = import.meta.env.VITE_PROTOTYPE_ESTATE_ID;
      if (envPrototypeEstateId?.trim()) {
        if (!isActive) return;
        setResolvedEstateId(envPrototypeEstateId.trim());
        setIsEstateResolved(true);
        return;
      }

      try {
        const estates = await lotApi.getEstates();
        const prototypeEstateId = resolvePrototypeEstateId(estates);
        if (!isActive) return;
        setResolvedEstateId(prototypeEstateId);
      } catch {
        if (!isActive) return;
        setResolvedEstateId(undefined);
      } finally {
        if (isActive) {
          setIsEstateResolved(true);
        }
      }
    };

    void resolveEstate();

    return () => {
      isActive = false;
    };
  }, [estateId]);

  const pageContent = (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Header - Only show on desktop */}
      {!isMobile && <Header />}

      {/* Main Content */}
      <div className={`flex-1 relative ${isMobile ? "pb-16" : ""}`}>
        {!isEstateResolved && !estateId ? (
          <div className="flex items-center justify-center h-full bg-brand-muted">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary mx-auto mb-4"></div>
              <p className="text-brand-muted">Loading estate...</p>
            </div>
          </div>
        ) : (
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
            <ZoneMap estateId={resolvedEstateId} />
          </Suspense>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
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
  );

  const shouldGateEstate =
    !skipEstateAccessGate && isEstateResolved && Boolean(resolvedEstateId);

  return (
    <QueryClientProvider client={queryClient}>
      {shouldGateEstate ? (
        <EstateAccessGate estateId={resolvedEstateId}>{pageContent}</EstateAccessGate>
      ) : (
        pageContent
      )}
    </QueryClientProvider>
  );
};

export default PrototypePage;
