import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './index.css'
import { Suspense, lazy, useEffect } from 'react'

import Header from './components/layouts/Header'
import { preloadCriticalComponents } from './utils/preload'

// Lazy load heavy components
const ZoneMap = lazy(() => import('./components/features/map/MapLayer'))

const queryClient = new QueryClient()

function App() {
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
  
  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen w-screen flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 relative">
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