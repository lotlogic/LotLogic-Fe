import { sidebar } from "@/constants/content";
import { useMobile } from "@/hooks/useMobile";
import { Box, Drawer, IconButton } from "@mui/material";
import clsx from "clsx";
import { ChevronLeft, Maximize2, Minimize2, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

const MOBILE_DRAWER_Z_INDEX = 1400;
const MOBILE_COLLAPSED_HEIGHT = "92px";

export const Sidebar = ({
  open,
  onClose,
  onBack,
  showBackButton = false,
  headerContent,
  children,
  widthClass = "w-[496px] max-w-full",
  className,
  minimizable = false,
  minimizedLabel,
}: {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
  headerContent?: React.ReactNode;
  children: React.ReactNode;
  widthClass?: string;
  className?: string;
  minimizable?: boolean;
  minimizedLabel?: React.ReactNode;
}) => {
  const isMobile = useMobile();
  const [drawerHeight, setDrawerHeight] = useState<
    "collapsed" | "50vh" | "100vh"
  >("100vh");
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState<
    "collapsed" | "50vh" | "100vh"
  >("100vh");
  const [desktopMinimized, setDesktopMinimized] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const isMinimized = minimizable && (isMobile ? drawerHeight === "collapsed" : desktopMinimized);

  if (!open) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setStartHeight(drawerHeight);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !isDragging) return;

    const currentY = e.touches[0].clientY;
    const deltaY = startY - currentY;
    const threshold = 80; // pixels to trigger height change

    if (deltaY > threshold && startHeight === "collapsed") {
      setDrawerHeight("50vh");
    } else if (deltaY > threshold && startHeight === "50vh") {
      setDrawerHeight("100vh");
    } else if (deltaY < -threshold && startHeight === "100vh") {
      setDrawerHeight("50vh");
    } else if (deltaY < -threshold && startHeight === "collapsed") {
      onClose();
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
    if (open && !isMobile) {
      setDesktopMinimized(false);
    }
  }, [open, isMobile]);

  const handleToggleMinimize = () => {
    if (!minimizable) {
      return;
    }

    if (isMobile) {
      setDrawerHeight((current) =>
        current === "collapsed" ? "50vh" : "collapsed"
      );
      return;
    }

    setDesktopMinimized((current) => !current);
  };

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
            height:
              drawerHeight === "collapsed"
                ? MOBILE_COLLAPSED_HEIGHT
                : drawerHeight,
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
        >
          <Box
            sx={{ touchAction: "none" }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Drawer Handle */}
            <Box
              className="flex justify-center pt-2 pb-1 cursor-pointer"
              onClick={() =>
                setDrawerHeight((current) => {
                  if (current === "collapsed") {
                    return "50vh";
                  }
                  return current === "50vh" ? "100vh" : "50vh";
                })
              }
            >
              <Box className="w-12 h-1 bg-brand-muted rounded-full" />
            </Box>

            {/* Header */}
            <Box
              className={clsx(
                "flex border-b border-brand bg-brand rounded-t-2xl",
                isMinimized ? "items-center p-3" : "items-start p-4 pb-3"
              )}
            >
              {showBackButton && onBack && (
                <IconButton
                  onClick={onBack}
                  className="p-1 rounded-full hover:bg-brand-muted text-brand-muted hover:text-brand mr-3"
                  aria-label={sidebar.back}
                >
                  <ChevronLeft className="h-6 w-6" />
                </IconButton>
              )}
              <Box className="flex-grow min-w-0">
                {isMinimized ? (
                  <div className="truncate text-sm font-semibold text-brand">
                    {minimizedLabel ?? "Panel"}
                  </div>
                ) : (
                  headerContent
                )}
              </Box>
              {minimizable && (
                <IconButton
                  onClick={handleToggleMinimize}
                  className="p-2 rounded-full hover:bg-brand-muted text-brand hover:text-brand"
                  aria-label={isMinimized ? "Expand sidebar" : "Minimize sidebar"}
                >
                  {isMinimized ? (
                    <Maximize2 className="h-5 w-5" />
                  ) : (
                    <Minimize2 className="h-5 w-5" />
                  )}
                </IconButton>
              )}
              <IconButton
                onClick={onClose}
                className="p-2 rounded-full hover:bg-brand-muted text-brand hover:text-brand"
                aria-label={sidebar.close}
              >
                <X className="h-6 w-6" />
              </IconButton>
            </Box>
          </Box>

          {/* Content */}
          {!isMinimized && (
            <Box className="flex-grow overflow-y-auto min-h-0">{children}</Box>
          )}
        </Box>
      </Drawer>
    );
  }

  // Desktop: Use custom sidebar
  return (
    <aside
      className={clsx(
        "fixed top-[80px] left-[20px] max-h-[calc(100vh-100px)] z-50 shadow-2xl rounded-2xl border border-brand bg-white flex flex-col transition-all duration-300",
        isMinimized ? "w-[220px] max-w-[calc(100vw-40px)]" : widthClass,
        className
      )}
    >
      <div
        className={clsx(
          "border-b border-brand sticky top-0 z-10 bg-white rounded-t-2xl flex",
          isMinimized ? "items-center p-3 gap-1" : "items-start p-6 pb-4"
        )}
      >
        {!isMinimized && showBackButton && onBack && (
          <button
            onClick={onBack}
            className="p-1 rounded-full hover:bg-brand-muted text-brand-muted hover:text-brand mr-3"
            aria-label={sidebar.back}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        <div className="flex-grow min-w-0">
          {isMinimized ? (
            <div className="truncate text-sm font-semibold text-brand">
              {minimizedLabel ?? "Panel"}
            </div>
          ) : (
            headerContent
          )}
        </div>
        {minimizable && (
          <button
            onClick={handleToggleMinimize}
            className={clsx(
              "p-2 rounded-full hover:bg-brand-muted text-brand hover:text-brand",
              isMinimized ? "" : "ml-auto"
            )}
            aria-label={isMinimized ? "Expand sidebar" : "Minimize sidebar"}
          >
            {isMinimized ? (
              <Maximize2 className="h-5 w-5" />
            ) : (
              <Minimize2 className="h-5 w-5" />
            )}
          </button>
        )}
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-brand-muted text-brand hover:text-brand"
          aria-label={sidebar.close}
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      {!isMinimized && (
        <div className="flex-grow overflow-y-auto min-h-0">{children}</div>
      )}
    </aside>
  );
};

export default Sidebar;
