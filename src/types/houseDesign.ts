import { z } from "zod";

export interface HouseDesignItem {
  id: string;
  title: string;
  area: string;
  image: string;
  images: { src: string; faced: string; }[];
  bedrooms: number;
  bathrooms: number;
  cars: number;
  storeys: number;
  isFavorite: boolean;
  floorPlanImage?: string;
  overlayOnly?: boolean;
}

export interface HouseDesignListProps {
  filter: {
    bedroom: number[];
    bathroom: number[];
    car: number[];
  };
  onShowFilter: () => void;
  onDesignClick: (design: HouseDesignItem | null) => void;
  onEnquireNow?: (design: HouseDesignItem) => void;
}

export interface GetYourQuoteSidebarProps {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  selectedHouseDesign: HouseDesignItem | null;
  lotDetails: {
    id: string | number; 
    suburb: string;
    address: string;
    size?: number;
  };
}

export interface FilterSectionProps {
  bedroom: number[];
  setBedroom: React.Dispatch<React.SetStateAction<number[]>>;
  bathroom: number[];
  setBathroom: React.Dispatch<React.SetStateAction<number[]>>;
  car: number[];
  setCar: React.Dispatch<React.SetStateAction<number[]>>;
  onShowHouseDesign: () => void;
}

export interface FilterRowProps {
  icon: React.ReactNode;
  label: string;
  value: number[];
  setValue: (value: number[]) => void;
  initial: string;
}

export type RangeValue = [number, number];
export type RangeSetter = React.Dispatch<React.SetStateAction<RangeValue>>;

// Zod validation schema for quote form
export const quoteFormSchema = z.object({
  yourName: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces"),
  emailAddress: z.string()
    .email("Please enter a valid email address")
    .min(1, "Email is required"),
  phoneNumber: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be less than 15 digits")
    .regex(/^[\+]?[0-9\s\-\(\)]+$/, "Please enter a valid phone number"),
  selectedBuilders: z.array(z.string())
    .min(1, "Please select at least one builder"),
  additionalComments: z.string()
    .max(500, "Additional comments must be less than 500 characters")
    .optional(),
});

export type QuoteFormData = z.infer<typeof quoteFormSchema>;
