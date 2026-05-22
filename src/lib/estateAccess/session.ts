const getEstateAccessSessionKey = (estateId: string) =>
  `lotlogic-estate-access:${estateId}`;

export const hasEstateAccessInSession = (estateId: string) => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(getEstateAccessSessionKey(estateId)) === "1";
};

export const setEstateAccessInSession = (estateId: string) => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(getEstateAccessSessionKey(estateId), "1");
};
