// API service for lot-related operations

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
  geojson: {
    type: 'Feature';
    geometry: GeoJSON.Polygon;
    properties: Array<Record<string, number>>;
  };
  createdAt: string;
  updatedAt: string;
  geometry: GeoJSON.Polygon; // This will be extracted from geojson
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
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // If running in Docker, use the service name
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3000';
  }
  
  // For Docker container communication
  return 'http://backend:3000';
};

// Utility function to get the correct image URL
export const getImageUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath) return '';
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If it's a relative path starting with /, prepend the API base URL
  if (imagePath.startsWith('/')) {
    return `${getApiBaseUrl()}${imagePath}`;
  }
  
  // Otherwise, assume it's a relative path and prepend the API base URL with /
  return `${getApiBaseUrl()}/${imagePath}`;
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
}

export const submitEnquiry = async (enquiryData: EnquiryRequest): Promise<{ message: string }> => {
  const response = await fetch(`${getApiBaseUrl()}/enquiry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(enquiryData),
  });

  if (!response.ok) {
    throw new Error(`Enquiry submission failed: ${response.statusText}`);
  }

  return response.json();
};

export const lotApi = {
  // Fetch all lots from database
  async getAllLots(): Promise<DatabaseLot[]> {
    try {
      const response = await fetch(`${getApiBaseUrl()}/lot`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching lots:', error);
      throw error;
    }
  },

  // Fetch a single lot by ID
  async getLotById(lotId: string): Promise<DatabaseLot> {
    try {
      const response = await fetch(`${getApiBaseUrl()}/lot/${lotId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching lot by ID:', error);
      throw error;
    }
  },

  // Calculate house designs for a specific lot
  async calculateDesignsOnLot(lotId: string): Promise<LotCalculationResponse> {
    try {
      const response = await fetch(`${getApiBaseUrl()}/design-on-lot/calculate?lotId=${lotId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
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
      console.error('Error fetching lot dimensions:', error);
      return null;
    }
  },

  // Filter house designs for a specific lot with user preferences
    async filterHouseDesigns(lotId: string, filters: HouseDesignFilterRequest): Promise<HouseDesignFilterResponse> {
    try {
      // Convert filters to URL parameters for GET request
      const params = new URLSearchParams();
      params.append('bedroom', JSON.stringify(filters.bedroom));
      params.append('bathroom', JSON.stringify(filters.bathroom));
      params.append('car', JSON.stringify(filters.car));
      
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

      const response = await fetch(`${getApiBaseUrl()}/house-design/${lotId}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Handle 204 No Content as a successful response with no results
      if (response.status === 204) {
        return {
          houseDesigns: [],
          zoning: { fsr: 300, frontSetback: 3, rearSetback: 3, sideSetback: 3 }
        };
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error filtering house designs:', error);
      throw error;
    }
  },

  // Fetch all builders from the backend
  async getBuilders(): Promise<Builder[]> {
    try {
      const response = await fetch(`${getApiBaseUrl()}/builders`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching builders:', error);
      throw error;
    }
  }
}; 