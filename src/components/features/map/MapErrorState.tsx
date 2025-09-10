import React from 'react';

interface MapErrorStateProps {
  error: Error | null;
}

export const MapErrorState: React.FC<MapErrorStateProps> = ({ error }) => {
  if (!error) return null;

  return (
    <div className="absolute top-4 left-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-20">
      Error loading lots: {error.message}
    </div>
  );
};
