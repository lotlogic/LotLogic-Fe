import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SavedHouseData {
  id: string;
  lotId: string | number;
  suburb?: string;
  address?: string;
  size?: string | number;
  zoning?: string;
  overlays?: string;
  houseDesign: {
    id: string;
    title: string;
    image: string;
    images?: { src: string; faced: string }[];
    floorPlanImage?: string;
    area?: string;
    bedrooms: number;
    bathrooms: number;
    cars: number;
    storeys: number;
    isFavorite: boolean;
  };
}

interface SavedPropertiesState {
  savedProperties: SavedHouseData[];
  isDesignSaved: (lotId: string | number, houseId: string) => boolean;
  addToSaved: (property: SavedHouseData) => void;
  removeFromSaved: (lotId: string | number, houseId: string) => void;
  toggleSaved: (property: SavedHouseData) => void;
  clearAll: () => void;
}

export const useSavedPropertiesStore = create<SavedPropertiesState>()(
  persist(
    (set, get) => ({
      savedProperties: [],
      
      isDesignSaved: (lotId: string | number, houseId: string) => {
        const { savedProperties } = get();
        return savedProperties.some(
          (data) => data.lotId === lotId && data.houseDesign.id === houseId
        );
      },
      
      addToSaved: (property: SavedHouseData) => {
        const { savedProperties } = get();
        const existingIndex = savedProperties.findIndex(
          (data) => data.lotId === property.lotId && data.houseDesign.id === property.houseDesign.id
        );
        
        if (existingIndex === -1) {
          set({ savedProperties: [...savedProperties, property] });
        }
      },
      
      removeFromSaved: (lotId: string | number, houseId: string) => {
        const { savedProperties } = get();
        const newSavedProperties = savedProperties.filter(
          (data) => !(data.lotId === lotId && data.houseDesign.id === houseId)
        );
        set({ savedProperties: newSavedProperties });
      },
      
      toggleSaved: (property: SavedHouseData) => {
        const { isDesignSaved, addToSaved, removeFromSaved } = get();
        const isSaved = isDesignSaved(property.lotId, property.houseDesign.id);
        
        if (isSaved) {
          removeFromSaved(property.lotId, property.houseDesign.id);
        } else {
          addToSaved(property);
        }
      },
      
      clearAll: () => {
        set({ savedProperties: [] });
      },
    }),
    {
      name: 'userFavorite', // localStorage key
    }
  )
);
