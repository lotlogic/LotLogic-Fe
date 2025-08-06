import { useRef, useEffect } from 'react';
import { X, ChevronLeft } from 'lucide-react'; 
import type { ZoningLayersSidebarProps } from '../../../types/ui';

export function ZoningLayersSidebar({ open, onClose, mapInstance }: ZoningLayersSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [open, onClose]);

  const toggleFloodRiskLayer = (enabled: boolean) => {
    if (mapInstance) {
      if (mapInstance.getLayer('flood-risk-areas')) {
        mapInstance.setLayoutProperty('flood-risk-areas', 'visibility', enabled ? 'visible' : 'none');
      } else if (enabled) {
        console.warn("Flood Risk Areas layer not found. Ensure it's added to the map.");
      }
    }
  };

  const toggleBushfireRiskLayer = (enabled: boolean) => {
    if (mapInstance) {
      if (mapInstance.getLayer('bushfire-risk-areas')) {
        mapInstance.setLayoutProperty('bushfire-risk-areas', 'visibility', enabled ? 'visible' : 'none');
      }
    }
  };

  const toggleHeritageLayer = (enabled: boolean) => {
    if (mapInstance) {
      if (mapInstance.getLayer('heritage-areas')) {
        mapInstance.setLayoutProperty('heritage-areas', 'visibility', enabled ? 'visible' : 'none');
      }
    }
  };

  return (
    <div
      ref={sidebarRef}
      className={`absolute top-0 right-0 h-full w-[350px] bg-white shadow-lg z-30 transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }} 
            className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800">Zoning Layers</h2>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }} 
            className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-gray-600">Exploring information and property details</p>
      </div>
      <div className="p-4 overflow-y-auto h-[calc(100%-60px)]"> 

        {/* Flood Risk Areas */}
        <div className="flex items-center justify-between border-b py-3">
          {/* <div className="flex items-center">
            <img src="data:image/jpeg;base64,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" alt="Flood Risk Icon" className="h-10 w-10 mr-3 rounded" /> 
            <div>
              <h3 className="font-semibold text-gray-800">Flood Risk Areas</h3>
              <p className="text-xs text-gray-500">Properties with elevated flood risk requiring special consideration</p>
            </div>
          </div> */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" value="" className="sr-only peer" onChange={(e) => toggleFloodRiskLayer(e.target.checked)} />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#2F5D62]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2F5D62]"></div>
          </label>
        </div>

        {/* Bushfire Risk */}
        <div className="flex items-center justify-between border-b py-3">
          <div className="flex items-center">
            <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS9k4saqy6fhltHczRdnZ2mAsOP_smVXAkz0A&s" alt="Bushfire Risk Icon" className="h-10 w-10 mr-3 rounded" /> 
            <div>
              <h3 className="font-semibold text-gray-800">Bushfire Risk</h3>
              <p className="text-xs text-gray-500">Areas prone to bushfire with special building requirements</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" value="" className="sr-only peer" onChange={(e) => toggleBushfireRiskLayer(e.target.checked)} />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#2F5D62]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2F5D62]"></div>
          </label>
        </div>

        {/* Heritage */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center">
              <img src="https://www.researchgate.net/profile/Sarbeswar-Praharaj/publication/282685390/figure/fig3/AS:391444360646659@1470339016966/Map-showing-the-Listed-Heritage-structures-in-delineated-area-and-their-Approach-routes.png" alt="Heritage Icon" className="h-10 w-10 mr-3 rounded" /> 
            <div>
              <h3 className="font-semibold text-gray-800">Heritage</h3>
              <p className="text-xs text-gray-500">Electricity Network</p>
              <p className="text-xs text-gray-500">Power grid infrastructure and transmission lines</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" value="" className="sr-only peer" onChange={(e) => toggleHeritageLayer(e.target.checked)} />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#2F5D62]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2F5D62]"></div>
          </label>
        </div>

      </div>
    </div>
  );
}