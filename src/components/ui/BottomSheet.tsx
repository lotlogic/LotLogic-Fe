import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxHeight?: string;
  showDragHandle?: boolean;
  className?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = '80vh',
  showDragHandle = true,
  className = ''
}: BottomSheetProps) {
  const { isMobile } = useResponsive();
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Handle touch events for drag-to-close
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !isDragging) return;
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!isMobile || !isDragging) return;
    
    const deltaY = currentY - startY;
    const threshold = 100; // pixels to drag down to close
    
    if (deltaY > threshold) {
      onClose();
    }
    
    setIsDragging(false);
  };

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isMobile]);

  if (!isOpen) return null;

  const dragDelta = isDragging ? currentY - startY : 0;
  const transform = `translateY(${Math.max(0, dragDelta)}px)`;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
        onClick={handleBackdropClick}
      />
      
      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`
          fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl
          transition-transform duration-300 ease-out
          ${isMobile ? 'h-full' : 'max-h-[80vh]'}
          ${className}
        `}
        style={{
          transform,
          maxHeight: isMobile ? '100%' : maxHeight,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        {showDragHandle && (
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-gray-300 rounded-full" />
          </div>
        )}
        
        {/* Header */}
        {(title || subtitle) && (
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {title && (
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-sm text-gray-600">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="ml-4 p-2 rounded-full hover:bg-gray-100 transition-colors touch-target"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}
