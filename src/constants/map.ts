// Map-related constants for better maintainability
export const MAP_CONSTANTS = {
  ZOOM_LEVELS: {
    SEARCH_RESULT: 15,
    INITIAL: 16,
    LOT_DETAIL: 16,
  },
  ANIMATION_DURATION: 1000,
  COORDINATE_INDICES: {
    FIRST: 0,
    SECOND: 1,
    THIRD: 2,
    FOURTH: 3,
  },
  MIN_COORDINATES_FOR_POLYGON: 4,
  DEFAULT_FSR_BUILDABLE_AREA: 300,
  DEFAULT_SETBACK_VALUES: {
    front: 4,
    side: 3,
    rear: 3,
  },
} as const;

export const MAP_EVENTS = {
  SEARCH_RESULT_SELECTED: 'search-result-selected',
  RECENTER_MAP: 'recenter-map',
} as const;
