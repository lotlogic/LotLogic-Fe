import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './index.css'


import Header from './components/layouts/Header'
import ZoneMap from './components/features/map/MapLayer'

const queryClient = new QueryClient()

function App() {
  
  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen w-screen flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 relative">
          <ZoneMap />
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