import type { HouseDesignItem } from "../types/houseDesign";

export const initialHouseData: HouseDesignItem[] = [
  {
    id: "design1",
    title: "Macnamara Modern 4-Bedroom",
    area: "2,096.00",
    image:
      "https://loglogic-assets.s3.ap-southeast-2.amazonaws.com/images/brick.jpg",
    images: [
      {
        src: "https://loglogic-assets.s3.ap-southeast-2.amazonaws.com/images/brick.jpg",
        faced: "Brick",
      },
      {
        src: "https://loglogic-assets.s3.ap-southeast-2.amazonaws.com/images/timmerland.jpg",
        faced: "Render",
      },
      {
        src: "https://loglogic-assets.s3.ap-southeast-2.amazonaws.com/images/weatherboard.jpg",
        faced: "Weatherboard",
      },
    ],
    bedrooms: 4,
    bathrooms: 2,
    cars: 2,
    storeys: 1,
    isFavorite: false,
    floorPlanImage: "/images/floorplan.jpg",
  },
  {
    id: "design2",
    title: "Belconnen Family Home",
    area: "1,800.00",
    image:
      "https://loglogic-assets.s3.ap-southeast-2.amazonaws.com/images/timmerland.jpg",
    images: [
      {
        src: "https://loglogic-assets.s3.ap-southeast-2.amazonaws.com/images/timmerland.jpg",
        faced: "Timber",
      },
      {
        src: "https://loglogic-assets.s3.ap-southeast-2.amazonaws.com/images/brick.jpg",
        faced: "Brick",
      },
    ],
    bedrooms: 4,
    bathrooms: 2,
    cars: 2,
    storeys: 1,
    isFavorite: false,
    floorPlanImage: "/images/floorplan.jpg",
  },
  {
    id: "design3",
    title: "ACT Contemporary 3-Bedroom",
    area: "1,650.00",
    image:
      "https://loglogic-assets.s3.ap-southeast-2.amazonaws.com/images/weatherboard.jpg",
    images: [
      {
        src: "https://loglogic-assets.s3.ap-southeast-2.amazonaws.com/images/weatherboard.jpg",
        faced: "Weatherboard",
      },
      {
        src: "https://loglogic-assets.s3.ap-southeast-2.amazonaws.com/images/brick.jpg",
        faced: "Brick",
      },
    ],
    bedrooms: 3,
    bathrooms: 2,
    cars: 1,
    storeys: 1,
    isFavorite: false,
    floorPlanImage: "/images/floorplan.jpg",
  },
];

export const builderOptions = [
  { id: "metricon", label: "Metricon Homes", logoText: "M" },
  { id: "simonds", label: "Simonds Homes", logoText: "S" },
  { id: "porter-davis", label: "Porter Davis Homes", logoText: "P" },
  { id: "burbank", label: "Burbank Homes", logoText: "B" },
  { id: "henley", label: "Henley Homes", logoText: "H" },
  { id: "clarendon", label: "Clarendon Homes", logoText: "C" },
  { id: "g-j-gardner", label: "G.J. Gardner Homes", logoText: "G" },
  { id: "boutique", label: "Boutique Homes", logoText: "B" },
];

export const FILTER_CONFIGS = [
  { icon: "BedDouble", label: "Bedroom", key: "bedroom" },
  { icon: "Bath", label: "Bathroom", key: "bathroom" },
  { icon: "Car", label: "Cars", key: "car" },
] as const;

export const INITIAL_FILTER_RANGES = {
  bedroom: [3, 4] as [number, number],
  bathroom: [1, 2, 3] as [number, number, number],
  car: [1, 2, 3] as [number, number, number],
  building: [] as [],
};
