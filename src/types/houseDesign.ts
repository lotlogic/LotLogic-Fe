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
}
