export const LOT_SALES_MODE_VALUES = [
  "land_sale",
  "house_and_land",
] as const;

export type LotSalesModeValue = (typeof LOT_SALES_MODE_VALUES)[number];

const LOT_SALES_MODE_LABELS: Record<LotSalesModeValue, string> = {
  land_sale: "Land Sale",
  house_and_land: "House & Land",
};

export const LOT_SALES_MODE_OPTIONS: ReadonlyArray<{
  value: LotSalesModeValue;
  label: string;
}> = [
  {
    value: "land_sale",
    label: "Land Sale",
  },
  {
    value: "house_and_land",
    label: "House & Land",
  },
];

export const normalizeLotSalesMode = (
  value: unknown
): LotSalesModeValue | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return LOT_SALES_MODE_VALUES.includes(normalized as LotSalesModeValue)
    ? (normalized as LotSalesModeValue)
    : null;
};

export const getLotSalesModeLabel = (
  value: LotSalesModeValue | null | undefined
) => {
  if (!value) {
    return "--";
  }
  return LOT_SALES_MODE_LABELS[value] ?? value;
};
