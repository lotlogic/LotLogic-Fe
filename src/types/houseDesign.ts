import { z } from "zod";
export interface HouseDesignImage {
  facadeId?: string;
  src: string;
  faced: string;
}

export interface SelectedFacadeOption {
  facadeId?: string;
  label: string;
}

export interface HouseDesignItem {
  id: string;
  title: string;
  area: string;
  homeSize?: string | null;
  builderId?: string;
  builderName?: string;
  builder?:
    | {
        id?: string;
        name?: string;
        logoUrl?: string | null;
        brandingBgColor?: string | null;
        brandingTextColor?: string | null;
      }
    | string;
  width?: number;
  depth?: number;
  image: string;
  images: HouseDesignImage[];
  bedrooms: number;
  bathrooms: number;
  cars: number;
  storeys: number;
  isFavorite: boolean;
  floorPlanImage?: string;
}

export interface HouseDesignListProps {
  filter: {
    bedroom: number[];
    bathroom: number[];
    car: number[];
    min_size?: number;
    max_size?: number;
    rumpus?: boolean;
    alfresco?: boolean;
    pergola?: boolean;
  };
  lot: {
    estateId?: string | number;
    lotId: string | number;
    lotDbId?: string | number;
    lotDisplayId?: string | number;
    suburb: string;
    address: string;
    size: string | number;
    zoning: string;
    overlays: string;
    lifecycleStage?: string | null;
    salesMode?: string | null;
    price?: number | null;
  };
  onShowFilter: () => void;
  onShowAllDesigns?: () => void;
  onDesignClick: (design: HouseDesignItem | null) => void;
  onEnquireNow?: (design: HouseDesignItem) => void;
  onViewFloorPlan?: (design: HouseDesignItem) => void;
  onViewFacades?: (design: HouseDesignItem, initialIndex?: number) => void;
  hasActiveFilters?: boolean;
  showingAllDesigns?: boolean;
}

export interface GetYourQuoteSidebarProps {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  selectedHouseDesign: HouseDesignItem | null;
  selectedFacade?: SelectedFacadeOption | null;
  lotDetails: {
    id: string | number;
    estateId?: string | number;
    blockKey?: string | number;
    displayId?: string | number;
    suburb: string;
    address: string;
    size?: number;
    lifecycleStage?: string | null;
    salesMode?: string | null;
    price?: number | null;
  };
}

export interface FilterSectionProps {
  bedroom: number[];
  setBedroom: React.Dispatch<React.SetStateAction<number[]>>;
  bathroom: number[];
  setBathroom: React.Dispatch<React.SetStateAction<number[]>>;
  car: number[];
  setCar: React.Dispatch<React.SetStateAction<number[]>>;
  design: DesignState;
  setDesign: React.Dispatch<React.SetStateAction<DesignState>>;
  min_size: number;
  setMinSize: React.Dispatch<React.SetStateAction<number>>;
  max_size: number;
  setMaxSize: React.Dispatch<React.SetStateAction<number>>;
  onShowHouseDesign: () => void;
  showErrors?: boolean;
  filterErrors?: {
    min_size?: string;
    max_size?: string;
    bedroom?: string;
    bathroom?: string;
    car?: string;
  };
}

export interface HouseSizeInputRowProps {
  min_size: number;
  setMinSize: React.Dispatch<React.SetStateAction<number>>;
  max_size: number;
  setMaxSize: React.Dispatch<React.SetStateAction<number>>;
  showErrors?: boolean;
  filterErrors?: {
    min_size?: string;
    max_size?: string;
    bedroom?: string;
    bathroom?: string;
    car?: string;
  };
}

export interface FilterRowProps {
  icon: React.ReactNode;
  label: string;
  value: number[];
  setValue: (value: number[]) => void;
  initial: string;
  showErrors?: boolean;
  filterErrors?: {
    min_size?: string;
    max_size?: string;
    bedroom?: string;
    bathroom?: string;
    car?: string;
  };
}

export interface DesignState {
  rumpus: boolean;
  alfresco: boolean;
  pergola: boolean;
}

export interface DesignRowProps {
  rumpus: boolean;
  alfresco: boolean;
  pergola: boolean;
  onChange: (key: "rumpus" | "alfresco" | "pergola", value: boolean) => void;
}

export type RangeValue = [number, number];
export type RangeSetter = React.Dispatch<React.SetStateAction<RangeValue>>;

export const quoteFormSchema = z.object({
  yourName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "Name can only contain letters, spaces, hyphens, and apostrophes"
    )
    .transform((name) => name.trim()),

  emailAddress: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .transform((email) => email.toLowerCase().trim()),

  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .refine((phone) => {
      // Clean the phone number
      const cleanPhone = phone.replace(/[\s\-()]/g, "");

      // Australian mobile numbers: 04xx xxx xxx
      const mobileRegex = /^04\d{8}$/;

      // Australian landline numbers
      const landlineRegex = /^0[2-9]\d{8}$/;

      // International format with +61
      const internationalRegex = /^\+61[2-9]\d{8}$/;

      // Check if it's a valid format
      const isValidFormat =
        mobileRegex.test(cleanPhone) ||
        landlineRegex.test(cleanPhone) ||
        internationalRegex.test(cleanPhone);

      // Additional check for minimum length after cleaning
      const isValidLength = cleanPhone.length >= 10 && cleanPhone.length <= 15;

      return isValidFormat && isValidLength;
    }, "Please enter a valid Australian phone number)"),

  selectedBuilders: z
    .array(z.string())
    .default([]),

  additionalComments: z
    .string()
    .max(500, "Additional comments must be less than 500 characters")
    .optional()
    .transform((comments) => comments?.trim() || ""),
});

export type QuoteFormData = z.infer<typeof quoteFormSchema>;

export type FloorPlan = {
  url: string;
  coordinates: [
    [number, number],
    [number, number],
    [number, number],
    [number, number]
  ];
  houseArea?: number;
  houseWidth?: number;
  houseDepth?: number;
};
