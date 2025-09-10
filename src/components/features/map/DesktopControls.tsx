import React, { Suspense, lazy } from 'react';

const SearchControl = lazy(() => import("./SearchControl").then(module => ({ default: module.SearchControl })));
const SavedButton = lazy(() => import("./SavedButton").then(module => ({ default: module.SavedButton })));

interface DesktopControlsProps {
  onSearchResult: (coordinates: [number, number]) => void;
  onSavedButtonClick: () => void;
  isSavedSidebarOpen: boolean;
}

export const DesktopControls: React.FC<DesktopControlsProps> = ({
  onSearchResult,
  onSavedButtonClick,
  isSavedSidebarOpen,
}) => {
  return (
    <>
      <div className="absolute top-4 right-5 z-10">
        <Suspense fallback={<div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>}>
          <SearchControl onResultSelect={onSearchResult} />
        </Suspense>
      </div>

      <div className="absolute top-45 right-5 z-10">
        <Suspense fallback={<div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>}>
          <SavedButton onClick={onSavedButtonClick} isActive={isSavedSidebarOpen} />
        </Suspense>
      </div>
    </>
  );
};
