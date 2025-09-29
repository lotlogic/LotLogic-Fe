// API service for lot-related operations
import axios from 'axios';

export interface DatabaseLot {
  id: string;
  blockKey: string;
  blockNumber: number | null;
  sectionNumber: number | null;
  areaSqm: number;
  zoning: string;
  address: string | null;
  district: string | null;
  division: string | null;
  lifecycleStage: string | null;
  estateId: string | null;
  overlays: string[];
  geojson: {
    type: 'Feature';
    geometry: GeoJSON.Polygon;
    properties: Array<Record<string, number>>;
    width: number,
    depth: number
  };
  createdAt: string;
  updatedAt: string;
  geometry: GeoJSON.Polygon; // This will be extracted from geojson
  frontageCoordinate?: string | null; // Frontage coordinate as GeoJSON LineString
  zoningSetbacks?: {
    frontSetback: number;
    rearSetback: number;
    sideSetback: number;
  } | null;
}

export interface LotCalculationResponse {
  lotId: string;
  zoning: string;
  matches: Array<{
    houseDesignId: string;
    floorplanUrl: string;
    spacing: {
      front: number;
      rear: number;
      side: number;
    };
    maxCoverageArea: number;
    houseArea: number;
    lotDimensions: {
      width: number;
      depth: number;
    };
  }>;
}

export interface HouseDesignFilterRequest {
  bedroom: number[];
  bathroom: number[];
  car: number[];
  min_size?: number;
  max_size?: number;
  rumpus?: boolean;
  alfresco?: boolean;
  pergola?: boolean;
}

export interface HouseDesignItemResponse {
  id: string;
  title: string;
  area: number;
  minLotWidth: number;
  minLotDepth: number;
  image: string;
  images: Array<{
    src: string;
    faced: string;
  }>;
  bedrooms: number;
  bathrooms: number;
  cars: number;
  isFavorite: boolean;
  floorPlanImage: string | null;
}

export interface HouseDesignFilterResponse {
  houseDesigns: HouseDesignItemResponse[],
  zoning: {
    fsr: number,
    frontSetback: number,
    rearSetback: number,
    sideSetback: number
  }
}

export interface Builder {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

// Get the API base URL based on environment
const getApiBaseUrl = () => {
  // Check for environment variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // If running in Docker, use the service name
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3000/api';
  }
  
  // For Docker container communication
  return 'http://backend:3000/api';
};

// Utility function to get the correct image URL
// export const getImageUrl = (imagePath: string | null | undefined): string => {
//   if (!imagePath) return '';
  
//   // If it's already a full URL, return as is
//   if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
//     return imagePath;
//   }
  
//   // If it's a relative path starting with /, prepend the API base URL
//   if (imagePath.startsWith('/')) {
//     return `${getApiBaseUrl()}${imagePath}`;
//   }
  
//   // Otherwise, assume it's a relative path and prepend the API base URL with /
//   return `${getApiBaseUrl()}/${imagePath}`;
// };


// Add this function to handle CORS proxy for images
export const getImageUrlWithCorsProxy = (imagePath: string | null | undefined): string => {
  if (!imagePath) return '';
  
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    const proxyUrl = 'https://corsproxy.io/'; 
    return `${proxyUrl}?${encodeURIComponent(imagePath)}`;
  }
  
  return imagePath;
};

// Function for non-CORS issues
export const getImageUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath) return '';
  // If it's already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  return imagePath;
};

// Enquiry API
export interface EnquiryRequest {
  name: string;
  email: string;
  number: string;
  builders: string[];
  comments: string;
  lot_id: number;
  house_design_id: string;
  facade_id: string;
  // Optional flags/metadata
  hot_lead?: boolean;
}

export const submitEnquiry = async (enquiryData: EnquiryRequest): Promise<{ message: string }> => {
  try {
    const response = await axios.post(`${getApiBaseUrl()}/enquiry`, enquiryData);
    return response.data;
  } catch (error) {
    throw new Error(`Enquiry submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getCurrentBrand = async () => {
  try {
    const response = await axios.get(`${getApiBaseUrl()}/brand`);
    return response.data;
  } catch (error) {
    return {};
  }
};

export const lotApi = {
  // Fetch all lots from database
  async getAllLots(): Promise<DatabaseLot[]> {
    try {
      const response = await axios.get(`${getApiBaseUrl()}/lot`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Fetch a single lot by ID
  async getLotById(lotId: string): Promise<DatabaseLot> {
    try {
      const response = await axios.get(`${getApiBaseUrl()}/lot/${lotId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Calculate house designs for a specific lot
  async calculateDesignsOnLot(lotId: string): Promise<LotCalculationResponse> {
    try {
      const response = await axios.get(`${getApiBaseUrl()}/design-on-lot/calculate?lotId=${lotId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching lot calculations:', error);
      throw error;
    }
  },

  // Get lot dimensions from the calculation response
  async getLotDimensions(lotId: string): Promise<{ width: number; depth: number } | null> {
    try {
      const response = await this.calculateDesignsOnLot(lotId);
      
      // Return dimensions from the first match if available
      if (response.matches && response.matches.length > 0) {
        return response.matches[0].lotDimensions;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  },

  // Filter house designs for a specific lot with user preferences
    async filterHouseDesigns(lotId: string, filters: HouseDesignFilterRequest): Promise<HouseDesignFilterResponse> {
    try {
      // Convert filters to URL parameters for GET request
      const params = new URLSearchParams();
      
      // Only add array parameters if they have values
      if (filters.bedroom && filters.bedroom.length > 0) {
        params.append('bedroom', JSON.stringify(filters.bedroom));
      }
      if (filters.bathroom && filters.bathroom.length > 0) {
        params.append('bathroom', JSON.stringify(filters.bathroom));
      }
      if (filters.car && filters.car.length > 0) {
        params.append('car', JSON.stringify(filters.car));
      }
      
      // Only add optional filters if they are provided
      if (filters.min_size !== undefined) {
        params.append('min_size', filters.min_size.toString());
      }
      if (filters.max_size !== undefined) {
        params.append('max_size', filters.max_size.toString());
      }
      if (filters.rumpus !== undefined) {
        params.append('rumpus', filters.rumpus.toString());
      }
      if (filters.alfresco !== undefined) {
        params.append('alfresco', filters.alfresco.toString());
      }
      if (filters.pergola !== undefined) {
        params.append('pergola', filters.pergola.toString());
      }

      const response = await axios.get(`${getApiBaseUrl()}/house-design/${lotId}?${params.toString()}`);
      
      // Handle 204 No Content as a successful response with no results
      if (response.status === 204) {
        return {
          houseDesigns: [],
          zoning: { fsr: 300, frontSetback: 3, rearSetback: 3, sideSetback: 3 }
        };
      }
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Fetch all builders from the backend
  async getBuilders(): Promise<Builder[]> {
    try {
      const response = await axios.get(`${getApiBaseUrl()}/builders`);
      return response.data;
    } catch (error) {
   
      throw error;
    }
  }
}; 