import { create } from "zustand";

interface SavedHouseData {
  id: string;
  estateId?: string | number;
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
    builderId?: string;
    builderName?: string;
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
  hydrateFromCookie: () => void;
  isDesignSaved: (
    lotId: string | number,
    houseId: string,
    estateId?: string | number
  ) => boolean;
  addToSaved: (property: SavedHouseData) => void;
  removeFromSaved: (
    lotId: string | number,
    houseId: string,
    estateId?: string | number
  ) => void;
  toggleSaved: (property: SavedHouseData) => void;
  clearAll: () => void;
}

type SavedCookieDesign = {
  id: string;
  title: string;
  image: string;
  builderId?: string;
  builderName?: string;
  floorPlanImage?: string;
  area?: string;
  bedrooms: number;
  bathrooms: number;
  cars: number;
  storeys: number;
};

type SavedCookieLotEntry = {
  estateId: string;
  lotId: string;
  suburb?: string;
  address?: string;
  size?: string | number;
  zoning?: string;
  overlays?: string;
  floorplanIds: string[];
  floorplans: SavedCookieDesign[];
};

type SavedCookiePayload = {
  version: 1;
  lots: Record<string, SavedCookieLotEntry>;
};

const SHORTLIST_COOKIE_NAME = "lotlogic_shortlist";
const COOKIE_TTL_DAYS = 365;
const DEFAULT_ESTATE_KEY = "default";

const parseEstateId = (estateId?: string | number) => {
  if (estateId === undefined || estateId === null) {
    return undefined;
  }
  const value = String(estateId).trim();
  if (!value || value === DEFAULT_ESTATE_KEY) {
    return undefined;
  }
  return value;
};

const normalizeEstateKey = (estateId?: string | number) => {
  return parseEstateId(estateId) || DEFAULT_ESTATE_KEY;
};

const buildEstateLotKey = (
  lotId: string | number,
  estateId?: string | number
) => `${normalizeEstateKey(estateId)}::${String(lotId)}`;

const getCookieValue = (name: string) => {
  if (typeof document === "undefined") {
    return undefined;
  }

  const token = `${name}=`;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(token));

  if (!cookie) {
    return undefined;
  }

  return decodeURIComponent(cookie.slice(token.length));
};

const writeCookie = (name: string, value: string) => {
  if (typeof document === "undefined") {
    return;
  }

  const expires = new Date(
    Date.now() + COOKIE_TTL_DAYS * 24 * 60 * 60 * 1000
  ).toUTCString();
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const sameSite = window.location.protocol === "https:" ? "None" : "Lax";

  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; expires=${expires}; path=/; SameSite=${sameSite}${secure}`;
};

const clearCookie = (name: string) => {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

const sanitizeSavedProperty = (property: SavedHouseData): SavedHouseData => ({
  id: String(property.id || property.lotId),
  estateId: parseEstateId(property.estateId),
  lotId: String(property.lotId),
  suburb: property.suburb,
  address: property.address,
  size: property.size,
  zoning: property.zoning,
  overlays: property.overlays,
  houseDesign: {
    id: String(property.houseDesign.id),
    title: property.houseDesign.title,
    image: property.houseDesign.image,
    builderId: property.houseDesign.builderId,
    builderName: property.houseDesign.builderName,
    images: property.houseDesign.images,
    floorPlanImage: property.houseDesign.floorPlanImage,
    area: property.houseDesign.area,
    bedrooms: property.houseDesign.bedrooms,
    bathrooms: property.houseDesign.bathrooms,
    cars: property.houseDesign.cars,
    storeys: property.houseDesign.storeys,
    isFavorite: true,
  },
});

const toCookiePayload = (savedProperties: SavedHouseData[]): SavedCookiePayload => {
  const lots: Record<string, SavedCookieLotEntry> = {};

  savedProperties.forEach((property) => {
    const normalized = sanitizeSavedProperty(property);
    const key = buildEstateLotKey(normalized.lotId, normalized.estateId);

    if (!lots[key]) {
      lots[key] = {
        estateId: parseEstateId(normalized.estateId) || "",
        lotId: String(normalized.lotId),
        suburb: normalized.suburb,
        address: normalized.address,
        size: normalized.size,
        zoning: normalized.zoning,
        overlays: normalized.overlays,
        floorplanIds: [],
        floorplans: [],
      };
    }

    const exists = lots[key].floorplans.some(
      (design) => design.id === normalized.houseDesign.id
    );
    if (exists) {
      return;
    }

    lots[key].floorplanIds.push(normalized.houseDesign.id);
    lots[key].floorplans.push({
      id: normalized.houseDesign.id,
      title: normalized.houseDesign.title,
      image: normalized.houseDesign.image,
      builderId: normalized.houseDesign.builderId,
      builderName: normalized.houseDesign.builderName,
      floorPlanImage: normalized.houseDesign.floorPlanImage,
      area: normalized.houseDesign.area,
      bedrooms: normalized.houseDesign.bedrooms,
      bathrooms: normalized.houseDesign.bathrooms,
      cars: normalized.houseDesign.cars,
      storeys: normalized.houseDesign.storeys,
    });
  });

  return {
    version: 1,
    lots,
  };
};

const fromCookiePayload = (payload: SavedCookiePayload): SavedHouseData[] => {
  const savedProperties: SavedHouseData[] = [];

  Object.values(payload.lots).forEach((lotEntry) => {
    const floorplans =
      lotEntry.floorplans && lotEntry.floorplans.length > 0
        ? lotEntry.floorplans
        : (lotEntry.floorplanIds || []).map((id) => ({
            id,
            title: "Saved floor plan",
            image: "",
            builderId: "",
            builderName: "",
            floorPlanImage: "",
            bedrooms: 0,
            bathrooms: 0,
            cars: 0,
            storeys: 0,
          }));

    floorplans.forEach((design) => {
      savedProperties.push({
        id: String(lotEntry.lotId),
        estateId: parseEstateId(lotEntry.estateId),
        lotId: lotEntry.lotId,
        suburb: lotEntry.suburb,
        address: lotEntry.address,
        size: lotEntry.size,
        zoning: lotEntry.zoning,
        overlays: lotEntry.overlays,
        houseDesign: {
          ...design,
          isFavorite: true,
        },
      });
    });
  });

  return savedProperties;
};

const readSavedPropertiesFromCookie = (): SavedHouseData[] => {
  const raw = getCookieValue(SHORTLIST_COOKIE_NAME);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as SavedCookiePayload;
    if (parsed?.version !== 1 || !parsed.lots || typeof parsed.lots !== "object") {
      return [];
    }

    return fromCookiePayload(parsed);
  } catch {
    return [];
  }
};

const writeSavedPropertiesToCookie = (savedProperties: SavedHouseData[]) => {
  if (savedProperties.length === 0) {
    clearCookie(SHORTLIST_COOKIE_NAME);
    return;
  }

  const payload = toCookiePayload(savedProperties);
  writeCookie(SHORTLIST_COOKIE_NAME, JSON.stringify(payload));
};

export const useSavedPropertiesStore = create<SavedPropertiesState>()((set, get) => ({
  savedProperties: readSavedPropertiesFromCookie(),

  hydrateFromCookie: () => {
    set({ savedProperties: readSavedPropertiesFromCookie() });
  },

  isDesignSaved: (
    lotId: string | number,
    houseId: string,
    estateId?: string | number
  ) => {
    const { savedProperties } = get();
    const key = buildEstateLotKey(lotId, estateId);

    return savedProperties.some(
      (data) =>
        buildEstateLotKey(data.lotId, data.estateId) === key &&
        data.houseDesign.id === houseId
    );
  },

  addToSaved: (property: SavedHouseData) => {
    const { savedProperties } = get();
    const normalized = sanitizeSavedProperty(property);
    const key = buildEstateLotKey(normalized.lotId, normalized.estateId);
    const exists = savedProperties.some(
      (data) =>
        buildEstateLotKey(data.lotId, data.estateId) === key &&
        data.houseDesign.id === normalized.houseDesign.id
    );

    if (exists) {
      return;
    }

    const nextSavedProperties = [...savedProperties, normalized];
    set({ savedProperties: nextSavedProperties });
    writeSavedPropertiesToCookie(nextSavedProperties);
  },

  removeFromSaved: (
    lotId: string | number,
    houseId: string,
    estateId?: string | number
  ) => {
    const { savedProperties } = get();
    const key = buildEstateLotKey(lotId, estateId);

    const nextSavedProperties = savedProperties.filter(
      (data) =>
        !(
          buildEstateLotKey(data.lotId, data.estateId) === key &&
          data.houseDesign.id === houseId
        )
    );

    set({ savedProperties: nextSavedProperties });
    writeSavedPropertiesToCookie(nextSavedProperties);
  },

  toggleSaved: (property: SavedHouseData) => {
    const normalized = sanitizeSavedProperty(property);
    const { isDesignSaved, addToSaved, removeFromSaved } = get();
    const isSaved = isDesignSaved(
      normalized.lotId,
      normalized.houseDesign.id,
      normalized.estateId
    );

    if (isSaved) {
      removeFromSaved(
        normalized.lotId,
        normalized.houseDesign.id,
        normalized.estateId
      );
      return;
    }

    addToSaved(normalized);
  },

  clearAll: () => {
    set({ savedProperties: [] });
    clearCookie(SHORTLIST_COOKIE_NAME);
  },
}));
