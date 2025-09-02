import { useEffect, Suspense, lazy, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './index.css'

import Header from '@/components/layouts/Header'
import MobileBottomNav from '@/components/layouts/MobileBottomNav'
import MobileSearch from '@/components/ui/MobileSearch'
import { ZoningLayersSidebar } from '@/components/features/map/ZoningLayerSidebar'
import { SavedPropertiesSidebar } from '@/components/features/map/SavedPropertiesSidebar'
import { useMobile } from '@/hooks/useMobile'
import { preloadCriticalComponents } from '@/utils/preload'
import { trackEvent } from '@/lib/analytics/segment'

// Lazy load heavy components
const ZoneMap = lazy(() => import('@/components/features/map/MapLayer'))

const queryClient = new QueryClient()

function App() {
  const isMobile = useMobile();
  const [activeTab, setActiveTab] = useState<'search' | 'saved' | 'layers' | 'recenter' | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [activeOverlays, setActiveOverlays] = useState<Set<string>>(new Set());

  // Initialize Segment analytics
  useEffect(() => {
    // Track app load
    trackEvent('App Loaded', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
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

  // Listen for overlay state updates
  useEffect(() => {
    const handleOverlayStateResponse = (event: CustomEvent) => {
      const { activeOverlays: newActiveOverlays } = event.detail;
      setActiveOverlays(new Set(newActiveOverlays));
    };

    window.addEventListener('overlay-state-response', handleOverlayStateResponse as EventListener);

    return () => {
      window.removeEventListener('overlay-state-response', handleOverlayStateResponse as EventListener);
    };
  }, []);

  // Request overlay state when layers tab is opened
  useEffect(() => {
    if (showLayers) {
      window.dispatchEvent(new CustomEvent('get-overlay-state'));
    }
  }, [showLayers]);

  const handleTabChange = (tab: 'search' | 'saved' | 'layers' | 'recenter') => {
    // If clicking the same tab that's already active, dehighlight it
    if (activeTab === tab) {
      setActiveTab(null);
      setShowSearch(false);
      setShowLayers(false);
      setShowSaved(false);
      return;
    }
    
    // Otherwise, select the new tab
    setActiveTab(tab);
    
    // Handle tab-specific actions
    if (tab === 'search') {
      setShowSearch(true);
      setShowLayers(false);
      setShowSaved(false);
    } else if (tab === 'saved') {
      setShowSaved(true);
      setShowSearch(false);
      setShowLayers(false);
    } else if (tab === 'layers') {
      setShowLayers(true);
      setShowSearch(false);
      setShowSaved(false);
    } else if (tab === 'recenter') {
      // Dispatch recenter event for map
      window.dispatchEvent(new CustomEvent('recenter-map'));
      setShowSearch(false);
      setShowLayers(false);
      setShowSaved(false);
    } else {
      // Close all panels when switching to other tabs
      setShowSearch(false);
      setShowLayers(false);
      setShowSaved(false);
    }
    // Add other tab handlers as needed
  };

  const handleSearch = (query: string) => {
    console.log('Search query:', query);
    setShowSearch(false);
    // Implement search functionality here
  };


  
  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen w-screen flex flex-col overflow-hidden">
        {/* Header - Only show on desktop */}
        {!isMobile && <Header />}

        {/* Main Content */}
        <div className={`flex-1 relative ${isMobile ? 'pb-16' : ''}`}>
          <Suspense fallback={
            <div className="flex items-center justify-center h-full bg-gray-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading map...</p>
              </div>
            </div>
          }>
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
            isOpen={showSearch}
            onClose={() => setShowSearch(false)}
            onSearch={handleSearch}
          />
        )}

        {/* Mobile Layers - Only show when layers tab is active */}
        {isMobile && (
          <ZoningLayersSidebar
            open={showLayers}
            onClose={() => setShowLayers(false)}
            onOverlayToggle={(overlayType, enabled) => {
              // Dispatch overlay toggle event for map
              window.dispatchEvent(new CustomEvent('overlay-toggle', {
                detail: { overlayType, enabled }
              }));
              // Update local state immediately for UI responsiveness
              setActiveOverlays(prev => {
                const newSet = new Set(prev);
                if (enabled) {
                  newSet.add(overlayType);
                } else {
                  newSet.delete(overlayType);
                }
                return newSet;
              });
            }}
            activeOverlays={activeOverlays}
          />
        )}

        {/* Mobile Saved Properties - Only show when saved tab is active */}
        {isMobile && (
          <SavedPropertiesSidebar
            open={showSaved}
            onClose={() => setShowSaved(false)}
            onViewDetails={(property) => {
              console.log('Viewing property details:', property);
              // TODO: Implement property details view
              setShowSaved(false);
            }}
          />
        )}

        <ToastContainer
          position="bottom-right"
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
  )
}

export default App 