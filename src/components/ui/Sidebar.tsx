import { sidebar } from "@/constants/content";
import { useMobile } from "@/hooks/useMobile";
import { Box, Drawer, IconButton } from "@mui/material";
import clsx from "clsx";
import { ChevronLeft, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

const MOBILE_DRAWER_Z_INDEX = 1400;

export const Sidebar = ({
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
}) => {
  const isMobile = useMobile();
  const [drawerHeight, setDrawerHeight] = useState<"50vh" | "100vh">("100vh");
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState<"50vh" | "100vh">("100vh");
  const drawerRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setStartHeight(drawerHeight);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !isDragging) return;
    e.preventDefault();

    const currentY = e.touches[0].clientY;
    const deltaY = startY - currentY;
    const threshold = 80; // pixels to trigger height change

    if (deltaY > threshold && startHeight === "50vh") {
      setDrawerHeight("100vh");
    } else if (deltaY < -threshold && startHeight === "100vh") {
      setDrawerHeight("50vh");
    } else if (deltaY < -threshold && startHeight === "50vh") {
      // From half height, dragging down beyond threshold closes the drawer
      onClose();
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;
    setIsDragging(false);
  };

  // Reset height when opening
  useEffect(() => {
    if (open && isMobile) {
      setDrawerHeight("100vh");
    }
  }, [open, isMobile]);

  // Mobile: Use MUI Drawer
  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        variant="persistent"
        sx={{ zIndex: MOBILE_DRAWER_Z_INDEX }}
        PaperProps={{
          sx: {
            height: drawerHeight,
            borderTopLeftRadius: "16px",
            borderTopRightRadius: "16px",
            transition: "height 0.3s ease-in-out",
            backgroundColor: "var(--color-bg-primary)",
            color: "var(--color-text-primary)",
            // Position above navbar for both heights
            bottom: "4rem", // 4rem = 64px (navbar height)
            // When expanded to 100vh, adjust height to fill remaining space
            ...(drawerHeight === "100vh" && {
              height: "calc(100vh - 4rem)",
            }),
            position: "fixed",
            zIndex: MOBILE_DRAWER_Z_INDEX + 1,
          },
        }}
        ModalProps={{
          keepMounted: true,
        }}
        BackdropProps={{
          sx: {
            backgroundColor: "transparent",
          },
        }}
      >
        <Box
          ref={drawerRef}
          className="h-full flex flex-col"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drawer Handle */}
          <Box
            className="flex justify-center pt-2 pb-1 cursor-pointer"
            onClick={() =>
              setDrawerHeight(drawerHeight === "50vh" ? "100vh" : "50vh")
            }
          >
            <Box className="w-12 h-1 bg-brand-muted rounded-full" />
          </Box>

          {/* Header */}
          <Box className="flex items-start border-b border-brand bg-brand rounded-t-2xl p-4 pb-3">
            {showBackButton && onBack && (
              <IconButton
                onClick={onBack}
                className="p-1 rounded-full hover:bg-brand-muted text-brand-muted hover:text-brand mr-3"
                aria-label={sidebar.back}
              >
                <ChevronLeft className="h-6 w-6" />
              </IconButton>
            )}
            <Box className="flex-grow">{headerContent}</Box>
            <IconButton
              onClick={onClose}
              className="p-2 rounded-full hover:bg-brand-muted text-brand hover:text-brand"
              aria-label={sidebar.close}
            >
              <X className="h-6 w-6" />
            </IconButton>
          </Box>

          {/* Content */}
          <Box className="flex-grow overflow-y-auto min-h-0">{children}</Box>
        </Box>
      </Drawer>
    );
  }

  // Desktop: Use custom sidebar
  return (
    <aside
      className={clsx(
        "fixed top-[80px] left-[20px] max-h-[calc(100vh-100px)] z-50 shadow-2xl rounded-2xl border border-brand bg-white flex flex-col transition-transform duration-300",
        widthClass,
        className
      )}
    >
      <div className="flex items-start p-6 pb-4 border-b border-brand sticky top-0 z-10 bg-white rounded-t-2xl">
        {showBackButton && onBack && (
          <button
            onClick={onBack}
            className="p-1 rounded-full hover:bg-brand-muted text-brand-muted hover:text-brand mr-3"
            aria-label={sidebar.back}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        <div className="flex-grow">{headerContent}</div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-brand-muted text-brand hover:text-brand ml-auto"
          aria-label={sidebar.close}
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      <div className="flex-grow overflow-y-auto min-h-0">{children}</div>
    </aside>
  );
};

export default Sidebar;
