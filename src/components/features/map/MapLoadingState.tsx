import React from 'react';

interface MapLoadingStateProps {
  isLoading: boolean;
  isLoadingLots: boolean;
}

export const MapLoadingState: React.FC<MapLoadingStateProps> = ({ isLoading, isLoadingLots }) => {
  if (!isLoading && !isLoadingLots) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
};
