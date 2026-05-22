import {
  getLotLifecycleLabel,
  normalizeLotLifecycle,
  type LotLifecycleValue,
} from "@/constants/lotLifecycle";
import {
  normalizeLotSalesMode,
  type LotSalesModeValue,
} from "@/constants/lotSalesMode";

const currencyFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

export const formatLotCurrency = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return currencyFormatter.format(value);
};

export const getHouseAndLandTotalPrice = ({
  blockPrice,
  buildPrice,
}: {
  blockPrice?: number | null;
  buildPrice?: number | null;
}) => {
  const hasBlockPrice =
    typeof blockPrice === "number" && Number.isFinite(blockPrice);
  const hasBuildPrice =
    typeof buildPrice === "number" && Number.isFinite(buildPrice);

  return hasBlockPrice && hasBuildPrice ? blockPrice + buildPrice : null;
};

export const getLotStatusText = (
  lifecycleStage: unknown
): { lifecycle: LotLifecycleValue | null; label: string } => {
  const lifecycle = normalizeLotLifecycle(lifecycleStage);
  return {
    lifecycle,
    label: getLotLifecycleLabel(lifecycle),
  };
};

export const getLotPriceText = ({
  lifecycleStage,
  salesMode,
  price,
}: {
  lifecycleStage: unknown;
  salesMode: unknown;
  price?: number | null;
}) => {
  const lifecycle = normalizeLotLifecycle(lifecycleStage);
  if (lifecycle === "sold") {
    return "Sold";
  }
  if (lifecycle === "reserved") {
    return "Reserved";
  }

  const formattedPrice = formatLotCurrency(price);
  if (!formattedPrice) {
    return "Price on request";
  }

  const normalizedSalesMode = normalizeLotSalesMode(salesMode);
  if (normalizedSalesMode === "house_and_land") {
    return `House & Land from ${formattedPrice}`;
  }

  return `For Sale - ${formattedPrice}`;
};

export const getHouseAndLandPriceBreakdown = ({
  lifecycleStage,
  salesMode,
  floorPlanId,
  blockPrice,
  buildPrice,
}: {
  lifecycleStage: unknown;
  salesMode: unknown;
  floorPlanId?: string | number | null;
  blockPrice?: number | null;
  buildPrice?: number | null;
}) => {
  const lifecycle = normalizeLotLifecycle(lifecycleStage);
  const normalizedSalesMode = normalizeLotSalesMode(salesMode);
  const hasConfiguredPackage =
    normalizedSalesMode === "house_and_land" &&
    floorPlanId !== undefined &&
    floorPlanId !== null &&
    String(floorPlanId).trim().length > 0;

  if (!hasConfiguredPackage || lifecycle === "sold" || lifecycle === "reserved") {
    return null;
  }

  const blockPriceText = formatLotCurrency(blockPrice) ?? "Price on request";
  const buildPriceText = formatLotCurrency(buildPrice) ?? "Price on request";
  const totalPriceText = formatLotCurrency(
    getHouseAndLandTotalPrice({ blockPrice, buildPrice })
  );

  return [
    { label: "Block price", value: blockPriceText },
    { label: "Build price", value: buildPriceText },
    {
      label: "House & Land total",
      value: totalPriceText ?? "Price on request",
    },
  ];
};

export const estimateBuildCostRange = (
  areaValue: unknown,
  lotPrice?: number | null
) => {
  const parsedArea =
    typeof areaValue === "number"
      ? areaValue
      : typeof areaValue === "string"
      ? Number.parseFloat(areaValue)
      : Number.NaN;

  if (!Number.isFinite(parsedArea) || parsedArea <= 0) {
    return null;
  }

  const min = parsedArea * 2800;
  const max = parsedArea * 5500;
  const hasLotPrice = typeof lotPrice === "number" && Number.isFinite(lotPrice);
  const totalMin = hasLotPrice ? min + lotPrice : min;
  const totalMax = hasLotPrice ? max + lotPrice : max;

  return {
    min: totalMin,
    max: totalMax,
    buildMin: min,
    buildMax: max,
    text: hasLotPrice
      ? `Estimated total incl. land: ${currencyFormatter.format(
          totalMin
        )} - ${currencyFormatter.format(totalMax)}`
      : `Estimated build cost: ${currencyFormatter.format(min)} - ${currencyFormatter.format(max)}`,
  };
};

export const getDesignCardPriceText = ({
  lotSalesMode,
  lotPrice,
  buildPrice,
  designArea,
}: {
  lotSalesMode: LotSalesModeValue | null;
  lotPrice?: number | null;
  buildPrice?: number | null;
  designArea?: string | number | null;
}) => {
  if (lotSalesMode === "house_and_land") {
    const packagePrice =
      getHouseAndLandTotalPrice({ blockPrice: lotPrice, buildPrice }) ??
      lotPrice;
    const formattedPrice = formatLotCurrency(packagePrice);
    return formattedPrice
      ? `House & Land from ${formattedPrice}`
      : "House & Land price on request";
  }

  return (
    estimateBuildCostRange(designArea, lotPrice)?.text ??
    "Estimated build cost: Price on request"
  );
};

export const getDesignCardPriceLines = ({
  lotSalesMode,
  lotPrice,
  buildPrice,
  designArea,
}: {
  lotSalesMode: LotSalesModeValue | null;
  lotPrice?: number | null;
  buildPrice?: number | null;
  designArea?: string | number | null;
}) => {
  if (lotSalesMode === "house_and_land") {
    return [
      getDesignCardPriceText({
        lotSalesMode,
        lotPrice,
        buildPrice,
        designArea,
      }),
    ];
  }

  const estimate = estimateBuildCostRange(designArea, lotPrice);
  if (!estimate) {
    return ["Estimated build cost: Price on request"];
  }

  const buildLine = `Estimated build cost: ${currencyFormatter.format(
    estimate.buildMin
  )} - ${currencyFormatter.format(estimate.buildMax)}`;
  const hasLotPrice = typeof lotPrice === "number" && Number.isFinite(lotPrice);

  if (!hasLotPrice) {
    return [buildLine];
  }

  return [
    buildLine,
    `Estimated total incl. land: ${currencyFormatter.format(
      estimate.min
    )} - ${currencyFormatter.format(estimate.max)}`,
  ];
};
