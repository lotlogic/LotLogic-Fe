// API service for lot-related operations
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

export const lotApi = {
  // Calculate house designs for a specific lot
  async calculateDesignsOnLot(_lotId: string): Promise<LotCalculationResponse> {
    try {
      const response = await fetch(`http://localhost:3000/design-on-lot/calculate?lotId=075a1931-6159-4622-88a2-be3a5a518486`, {
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
  }
}; 