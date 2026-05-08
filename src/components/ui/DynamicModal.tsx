import { Close, NavigateBefore, NavigateNext } from "@mui/icons-material";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import React, { useCallback, useMemo, useRef } from "react";

const APP_MODAL_Z_INDEX = 1700;

// Common Dialog Title Component
const ModalTitle: React.FC<{ title: string; onClose: () => void }> = ({
  title,
  onClose,
}) => (
  <DialogTitle
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: "1px solid var(--color-border)",
      padding: "20px",
      margin: 0,
    }}
  >
    <Typography
      variant="h6"
      component="span"
      sx={{
        fontSize: "18px",
        fontWeight: 600,
        color: "var(--color-text-primary)",
      }}
    >
      {title}
    </Typography>
    <IconButton
      onClick={onClose}
      sx={{
        color: "var(--color-text-secondary)",
        padding: "8px",
        borderRadius: "50%",
        "&:hover": {
          backgroundColor: "var(--color-bg-secondary)",
          color: "var(--color-text-primary)",
        },
      }}
    >
      <Close sx={{ width: "24px", height: "24px" }} />
    </IconButton>
  </DialogTitle>
);

// Navigation Arrow Component
const NavigationArrow: React.FC<{
  direction: "prev" | "next";
  onClick: () => void;
  position: { left?: string; right?: string };
}> = ({ direction, onClick, position }) => (
  <IconButton
    onClick={onClick}
    sx={{
      position: "absolute",
      top: "50%",
      transform: "translateY(-50%)",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      color: "white",
      padding: "8px",
      borderRadius: "50%",
      "&:hover": {
        backgroundColor: "rgba(0, 0, 0, 0.7)",
      },
      ...position,
    }}
  >
    {direction === "prev" ? (
      <NavigateBefore sx={{ width: "24px", height: "24px" }} />
    ) : (
      <NavigateNext sx={{ width: "24px", height: "24px" }} />
    )}
  </IconButton>
);

// Thumbnail Component
const Thumbnail: React.FC<{
  image: { src: string; alt: string };
  index: number;
  isActive: boolean;
  onClick: () => void;
}> = ({ image, isActive, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      width: "64px",
      height: "64px",
      borderRadius: "4px",
      overflow: "hidden",
      cursor: "pointer",
      border: isActive
        ? "2px solid var(--color-primary)"
        : "2px solid transparent",
      flexShrink: 0,
      position: "relative",
      "&:hover": {
        borderColor: "var(--color-primary)",
      },
    }}
  >
    <img
      src={image.src}
      alt={image.alt}
      loading="lazy"
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
  </Box>
);

// Image Carousel Modal
interface ImageCarouselModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  images: Array<{
    src: string;
    alt: string;
    label?: string;
  }>;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  showThumbnails?: boolean;
}

export const ImageCarouselModal: React.FC<ImageCarouselModalProps> = ({
  open,
  onClose,
  title,
  images,
  currentIndex,
  onIndexChange,
  showThumbnails = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handlePrevious = useCallback(() => {
    onIndexChange((currentIndex - 1 + images.length) % images.length);
  }, [currentIndex, images.length, onIndexChange]);

  const handleNext = useCallback(() => {
    onIndexChange((currentIndex + 1) % images.length);
  }, [currentIndex, images.length, onIndexChange]);

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (event.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }

    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;

      if (!start || event.changedTouches.length !== 1 || images.length <= 1) {
        return;
      }

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;
      const horizontalDistance = Math.abs(deltaX);
      const verticalDistance = Math.abs(deltaY);

      if (
        horizontalDistance < 44 ||
        verticalDistance > 48 ||
        verticalDistance > horizontalDistance
      ) {
        return;
      }

      if (deltaX < 0) {
        handleNext();
      } else {
        handlePrevious();
      }
    },
    [handleNext, handlePrevious, images.length]
  );

  const currentImage = images[currentIndex];
  const hasMultipleImages = images.length > 1;

  const dialogPaperProps = useMemo(
    () => ({
      sx: {
        borderRadius: "16px",
        maxHeight: isMobile ? "70vh" : "662px",
        minHeight: isMobile ? "auto" : "662px",
        width: isMobile ? "92vw" : "956px",
        margin: "16px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        overflow: "hidden",
        backgroundColor: "var(--color-bg-primary)",
        color: "var(--color-text-primary)",
      },
    }),
    [isMobile]
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      sx={{ zIndex: APP_MODAL_Z_INDEX }}
      PaperProps={dialogPaperProps}
    >
      <ModalTitle title={title} onClose={onClose} />

      <DialogContent
        sx={{
          padding: "12px",
          flex: 1,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          height: isMobile ? "auto" : "calc(100% - 80px)",
        }}
      >
        {images.length === 0 || !currentImage ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: isMobile ? "50vh" : "630px",
            }}
          >
            <Typography variant="body1" color="text.secondary">
              No images available.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              gap: "12px",
            }}
          >
            {/* Main Image Container */}
            <Box
              sx={{
                position: "relative",
                width: "100%",
                height: isMobile ? "50vh" : "450px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={currentImage.src}
                alt={currentImage.alt}
                loading="eager"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  borderRadius: "8px",
                }}
              />

              {/* Image Label Overlay */}
              {currentImage.label && (
                <Box
                  sx={{
                    position: "absolute",
                    top: "16px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: "var(--color-bg-primary)",
                    backdropFilter: "blur(10px)",
                    color: "var(--color-text-primary)",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                    border: "1px solid var(--color-border)",
                    maxWidth: "calc(100% - 32px)",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      fontSize: "14px",
                      letterSpacing: "0.025em",
                    }}
                  >
                    {currentImage.label}
                  </Typography>
                </Box>
              )}

              {/* Navigation Arrows */}
              {hasMultipleImages && (
                <>
                  <NavigationArrow
                    direction="prev"
                    onClick={handlePrevious}
                    position={{ left: "8px" }}
                  />
                  <NavigationArrow
                    direction="next"
                    onClick={handleNext}
                    position={{ right: "8px" }}
                  />
                </>
              )}
            </Box>

            {/* Thumbnails */}
            {(showThumbnails || hasMultipleImages) && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "8px",
                  flexShrink: 0,
                  overflowX: "auto",
                  paddingBottom: "4px",
                }}
              >
                {images.map((image, index) => (
                  <Thumbnail
                    key={index}
                    image={image}
                    index={index}
                    isActive={index === currentIndex}
                    onClick={() => onIndexChange(index)}
                  />
                ))}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Single Image Modal
interface SingleImageModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  imageSrc: string;
  imageAlt: string;
}

export const SingleImageModal: React.FC<SingleImageModalProps> = ({
  open,
  onClose,
  title,
  imageSrc,
  imageAlt,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const dialogPaperProps = useMemo(
    () => ({
      sx: {
        borderRadius: "16px",
        maxHeight: isMobile ? "70vh" : "662px",
        minHeight: isMobile ? "auto" : "662px",
        width: isMobile ? "92vw" : "956px",
        margin: "16px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        overflow: "hidden",
        backgroundColor: "var(--color-bg-primary)",
        color: "var(--color-text-primary)",
      },
    }),
    [isMobile]
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      sx={{ zIndex: APP_MODAL_Z_INDEX }}
      PaperProps={dialogPaperProps}
    >
      <ModalTitle title={title} onClose={onClose} />

      <DialogContent
        sx={{
          padding: "12px",
          flex: 1,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          height: isMobile ? "auto" : "calc(100% - 80px)",
        }}
      >
        {imageSrc ? (
          <Box
            sx={{
              position: "relative",
              width: "100%",
              height: isMobile ? "50vh" : "450px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <img
              src={imageSrc}
              alt={imageAlt}
              loading="eager"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                width: "auto",
                height: "auto",
                objectFit: "contain",
                borderRadius: "8px",
              }}
            />
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: isMobile ? "50vh" : "450px",
            }}
          >
            <Typography variant="body1" color="text.secondary">
              Floor plan not available for this design.
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Text Content Modal
interface TextModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
}

export const TextModal: React.FC<TextModalProps> = ({
  open,
  onClose,
  title,
  content,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const dialogPaperProps = useMemo(
    () => ({
      sx: {
        borderRadius: "16px",
        maxHeight: isMobile ? "70vh" : "80vh",
        width: isMobile ? "92vw" : "720px",
        margin: "16px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        overflow: "hidden",
        backgroundColor: "var(--color-bg-primary)",
        color: "var(--color-text-primary)",
      },
    }),
    [isMobile]
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{ zIndex: APP_MODAL_Z_INDEX }}
      PaperProps={dialogPaperProps}
    >
      <ModalTitle title={title} onClose={onClose} />

      <DialogContent
        sx={{
          padding: "20px",
          overflow: "auto",
        }}
      >
        {content}
      </DialogContent>
    </Dialog>
  );
};
