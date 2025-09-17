import React, { useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Close, NavigateBefore, NavigateNext } from '@mui/icons-material';

// Common Dialog Title Component
const ModalTitle: React.FC<{ title: string; onClose: () => void }> = ({ title, onClose }) => (
  <DialogTitle
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid #e5e7eb',
      padding: '20px',
      margin: 0
    }}
  >
    <Typography 
      variant="h6" 
      component="h2"
      sx={{
        fontSize: '18px',
        fontWeight: 600,
        color: '#111827'
      }}
    >
      {title}
    </Typography>
    <IconButton
      onClick={onClose}
      sx={{
        color: '#6b7280',
        padding: '8px',
        borderRadius: '50%',
        '&:hover': {
          backgroundColor: '#f3f4f6',
          color: '#374151'
        }
      }}
    >
      <Close sx={{ width: '24px', height: '24px' }} />
    </IconButton>
  </DialogTitle>
);

// Navigation Arrow Component
const NavigationArrow: React.FC<{
  direction: 'prev' | 'next';
  onClick: () => void;
  position: { left?: string; right?: string };
}> = ({ direction, onClick, position }) => (
  <IconButton
    onClick={onClick}
    sx={{
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      color: 'white',
      padding: '8px',
      borderRadius: '50%',
      '&:hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.7)'
      },
      ...position
    }}
  >
    {direction === 'prev' ? (
      <NavigateBefore sx={{ width: '24px', height: '24px' }} />
    ) : (
      <NavigateNext sx={{ width: '24px', height: '24px' }} />
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
      width: '64px',
      height: '64px',
      borderRadius: '4px',
      overflow: 'hidden',
      cursor: 'pointer',
      border: isActive ? '2px solid #1976d2' : '2px solid transparent',
      flexShrink: 0,
      position: 'relative',
      '&:hover': {
        borderColor: '#1976d2'
      }
    }}
  >
    <img
      src={image.src}
      alt={image.alt}
      loading="lazy"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover'
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
  showThumbnails = true
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handlePrevious = useCallback(() => {
    onIndexChange((currentIndex - 1 + images.length) % images.length);
  }, [currentIndex, images.length, onIndexChange]);

  const handleNext = useCallback(() => {
    onIndexChange((currentIndex + 1) % images.length);
  }, [currentIndex, images.length, onIndexChange]);

  const currentImage = images[currentIndex];
  const hasMultipleImages = images.length > 1;

  const dialogPaperProps = useMemo(() => ({
    sx: {
      borderRadius: '16px',
      maxHeight: isMobile ? '70vh' : '662px',
      minHeight: isMobile ? 'auto' : '662px',
      width: isMobile ? '92vw' : '956px',
      margin: '16px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      overflow: 'hidden'
    }
  }), [isMobile]);

  if (!currentImage) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={dialogPaperProps}
    >
      <ModalTitle title={title} onClose={onClose} />

      <DialogContent 
        sx={{ 
          padding: '12px',
          flex: 1,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto'
        }}
      >
        {/* Main Image Container */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: isMobile ? '50vh' : '430px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img
            src={currentImage.src}
            alt={currentImage.alt}
            loading="eager"
            style={{
              width: '100%',
              height: '100%',
              objectFit: isMobile ? 'contain' : 'cover',
              borderRadius: '8px'
            }}
          />
          
          {/* Image Label Overlay */}
          {currentImage.label && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                color: 'white',
                padding: '6px',
                borderRadius: '8px 8px 0 0',
                textAlign: 'center'
              }}
            >
              <Typography variant="body2">
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
                position={{ left: '8px' }}
              />
              <NavigationArrow
                direction="next"
                onClick={handleNext}
                position={{ right: '8px' }}
              />
            </>
          )}
        </Box>

        {/* Thumbnails */}
        {(showThumbnails || hasMultipleImages) && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '6px'
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
  imageAlt
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const dialogPaperProps = useMemo(() => ({
    sx: {
      borderRadius: '16px',
      maxHeight: isMobile ? '70vh' : '662px',
      minHeight: isMobile ? 'auto' : '662px',
      width: isMobile ? '92vw' : '956px',
      margin: '16px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      overflow: 'hidden'
    }
  }), [isMobile]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={dialogPaperProps}
    >
      <ModalTitle title={title} onClose={onClose} />

      <DialogContent 
        sx={{ 
          padding: '12px',
          flex: 1,
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
        }}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={imageAlt}
            loading="eager"
            style={{
              maxWidth: '100%',
              maxHeight: isMobile ? '55vh' : 'calc(100vh - 220px)',
              objectFit: 'contain'
            }}
          />
        ) : (
          <Typography variant="body1" color="text.secondary">
            Floor plan not available for this design.
          </Typography>
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
  content
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const dialogPaperProps = useMemo(() => ({
    sx: {
      borderRadius: '16px',
      maxHeight: isMobile ? '70vh' : '80vh',
      width: isMobile ? '92vw' : '720px',
      margin: '16px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      overflow: 'hidden'
    }
  }), [isMobile]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={dialogPaperProps}
    >
      <ModalTitle title={title} onClose={onClose} />

      <DialogContent
        sx={{
          padding: '20px',
          overflow: 'auto'
        }}
      >
        {content}
      </DialogContent>
    </Dialog>
  );
};