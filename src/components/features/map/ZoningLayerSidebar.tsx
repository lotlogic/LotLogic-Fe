import { useRef, useEffect } from 'react';
import { X, ChevronLeft } from 'lucide-react'; 
import type { ZoningLayersSidebarProps } from '../../../types/ui';

export function ZoningLayersSidebar({ open, onClose, onOverlayToggle, activeOverlays }: ZoningLayersSidebarProps) {
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

  const handleOverlayToggle = (overlayType: string, enabled: boolean) => {
    // Use lot color highlighting
    onOverlayToggle?.(overlayType, enabled);
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
      

      
      <div className="p-4 overflow-y-auto h-[calc(100%-120px)]"> 

        {/* Flood Risk Areas */}
        <div className="flex items-center justify-between border-b py-3">
          <div className="flex items-center">
            <img src="https://www.researchgate.net/profile/Hazem-Abdo/publication/370239361/figure/fig3/AS:11431281153522635@1682449696735/Flood-risk-map-of-the-study-area.png" alt="Flood Risk Icon" className="h-10 w-10 mr-3 rounded" /> 
            <div>
              <h3 className="font-semibold text-gray-800">Flood Risk Areas</h3>
              <p className="text-xs text-gray-500">Properties with elevated flood risk requiring special consideration</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              value="" 
              className="sr-only peer" 
              checked={activeOverlays?.has('flood') || false}
              onChange={(e) => handleOverlayToggle('flood', e.target.checked)} 
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#2F5D62]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2F5D62]"></div>
          </label>
        </div>

        {/* Bushfire Prone Area (BPA) */}
        <div className="flex items-center justify-between border-b py-3">
          <div className="flex items-center">
            <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS9k4saqy6fhltHczRdnZ2mAsOP_smVXAkz0A&s" alt="Bushfire Prone Area Icon" className="h-10 w-10 mr-3 rounded" /> 
            <div>
              <h3 className="font-semibold text-gray-800">Bushfire</h3>
              <p className="text-xs text-gray-500">Areas prone to bushfire with special building requirements</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              value="" 
              className="sr-only peer" 
              checked={activeOverlays?.has('bushfire') || false}
              onChange={(e) => handleOverlayToggle('bushfire', e.target.checked)} 
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#2F5D62]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2F5D62]"></div>
          </label>
        </div>

        {/* Heritage (HER) */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center">
              <img src="https://www.researchgate.net/profile/Sarbeswar-Praharaj/publication/282685390/figure/fig3/AS:391444360646659@1470339016966/Map-showing-the-Listed-Heritage-structures-in-delineated-area-and-their-Approach-routes.png" alt="Heritage Icon" className="h-10 w-10 mr-3 rounded" /> 
            <div>
              <h3 className="font-semibold text-gray-800">Heritage</h3>
              <p className="text-xs text-gray-500">Heritage areas with special preservation requirements</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              value="" 
              className="sr-only peer" 
              checked={activeOverlays?.has('heritage') || false}
              onChange={(e) => handleOverlayToggle('heritage', e.target.checked)} 
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#2F5D62]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2F5D62]"></div>
          </label>
        </div>

      </div>
    </div>
  );
}