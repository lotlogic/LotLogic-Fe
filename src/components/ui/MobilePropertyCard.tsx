import { Bookmark, Home, Eye } from 'lucide-react';

interface MobilePropertyCardProps {
  lotId: string;
  address: string;
  suburb: string;
  lotSize: string;
  zoning: string;
  overlays?: string[];
  floorPlanImage?: string;
  designName?: string;
  designType?: string;
  bedrooms?: number;
  bathrooms?: number;
  carSpaces?: number;
  isSaved?: boolean;
  onSave?: () => void;
  onViewDetails?: () => void;
  onViewFloorPlan?: () => void;
  onViewFacades?: () => void;
  className?: string;
}

export function MobilePropertyCard({
  lotId,
  address,
  suburb,
  lotSize,
  zoning,
  overlays = [],
  floorPlanImage,
  designName,
  designType,
  bedrooms,
  bathrooms,
  carSpaces,
  isSaved = false,
  onSave,
  onViewDetails,
  onViewFloorPlan,
  onViewFacades,
  className = ''
}: MobilePropertyCardProps) {
  return (
    <div className={`
      bg-white rounded-lg border border-gray-200 p-4 mb-3
      ${className}
    `}>
      {/* Property Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm">
            Lot ID: {lotId}, {suburb}
          </h3>
          <p className="text-gray-600 text-xs mt-1">{address}</p>
        </div>
        {onSave && (
          <button
            onClick={onSave}
            className={`p-1 rounded-full transition-colors ${
              isSaved 
                ? 'text-gray-900' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
            aria-label={isSaved ? 'Remove from saved' : 'Save property'}
          >
            <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>

      {/* Property Details */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1 text-gray-600">
          <Home className="h-3 w-3" />
          <span className="text-xs font-medium">{lotSize}</span>
        </div>
        
        {/* Zoning Tag */}
        <span className="px-2 py-1 bg-pink-100 text-pink-800 text-xs font-medium rounded-full">
          {zoning}
        </span>
        
        {/* Overlay Tags */}
        {overlays.map((overlay, index) => (
          <span 
            key={index}
            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
          >
            {overlay}
          </span>
        ))}
      </div>

      {/* House Design Section */}
      {designName && (
        <div className="border-t border-gray-100 pt-3">
          <div className="flex gap-3">
            {/* Floor Plan Thumbnail */}
            {floorPlanImage && (
              <div className="flex-shrink-0">
                <img
                  src={floorPlanImage}
                  alt="Floor plan"
                  className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                />
              </div>
            )}
            
            {/* Design Details */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 text-sm truncate">
                {designName}
              </h4>
              <p className="text-gray-600 text-xs mt-1">{designType}</p>
              
              {/* Design Features */}
              <div className="flex items-center gap-3 mt-2">
                {bedrooms && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <span className="text-xs">🛏️</span>
                    <span className="text-xs">{bedrooms}</span>
                  </div>
                )}
                {bathrooms && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <span className="text-xs">🚿</span>
                    <span className="text-xs">{bathrooms}</span>
                  </div>
                )}
                {carSpaces && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <span className="text-xs">🚗</span>
                    <span className="text-xs">{carSpaces}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 mt-3">
            {onViewFloorPlan && (
              <button
                onClick={onViewFloorPlan}
                className="flex-1 bg-gray-100 text-gray-700 text-xs font-medium py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors"
              >
                View Floor Plan
              </button>
            )}
            {onViewFacades && (
              <button
                onClick={onViewFacades}
                className="flex-1 bg-gray-100 text-gray-700 text-xs font-medium py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors"
              >
                View Facades
              </button>
            )}
          </div>
          
          {/* Enquire Button */}
          <button
            onClick={onViewDetails}
            className="w-full mt-2 bg-gray-800 text-white text-xs font-medium py-2 px-3 rounded-lg hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
          >
            <Eye className="h-3 w-3" />
            Get Cost Estimates
          </button>
        </div>
      )}

      {/* View Details Button (if no design) */}
      {!designName && onViewDetails && (
        <button
          onClick={onViewDetails}
          className="w-full mt-3 bg-gray-800 text-white text-xs font-medium py-2 px-3 rounded-lg hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
        >
          <Eye className="h-3 w-3" />
          View Details
        </button>
      )}
    </div>
  );
}
