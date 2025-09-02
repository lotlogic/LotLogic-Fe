import React from 'react';
import { X, ChevronLeft } from "lucide-react";
import clsx from "clsx";
import { sidebar, getColorClass } from "@/constants/content";
import { useMobile } from "@/hooks/useMobile";

export function Sidebar({
  open,
  onClose,
  onBack,
  showBackButton = false,
  headerContent,
  children,
  widthClass = "w-[496px] max-w-full",
  className,
}: {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
  headerContent?: React.ReactNode;
  children: React.ReactNode;
  widthClass?: string;
  className?: string;
}) {
  const isMobile = useMobile();
  
  if (!open) return null;
  
  return (
    <aside
      className={clsx(
        "fixed z-50 bg-white shadow-2xl border border-gray-200 flex flex-col transition-transform duration-300",
        // Mobile: 40% height from bottom, desktop: original positioning
        isMobile 
          ? "bottom-17 left-0 right-0 w-full h-[50vh] rounded-t-2xl" 
          : "top-[80px] left-[20px] max-h-[calc(100vh-100px)] rounded-2xl",
        // Desktop: use provided width, mobile: full width
        isMobile ? "w-full" : widthClass,
        className
      )}
    >
      <div className={clsx(
        "flex items-start border-b border-gray-200 z-10 bg-white",
        // Make header non-sticky on mobile, sticky on desktop
        isMobile 
          ? "p-4 pb-3 rounded-t-2xl" 
          : "p-6 pb-4 rounded-t-2xl sticky top-0"
      )}>
        {showBackButton && onBack && (
          <button
            onClick={onBack}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 mr-3"
            aria-label={sidebar.back}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        <div className="flex-grow">
          {headerContent}
        </div>
        <button
          onClick={onClose}
          className={`p-2 rounded-full hover:bg-gray-100 ${getColorClass('text.primary', 'text')} hover:text-gray-700 ml-auto`}
          aria-label={sidebar.close}
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      <div className="flex-grow overflow-y-auto min-h-0">{children}</div>
    </aside>
  );
}
