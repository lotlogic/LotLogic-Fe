import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import { TextModal } from "@/components/ui/DynamicModal";
import Input from "@/components/ui/Input";
import PrivacyPolicyContent from "@/components/ui/PrivacyPolicyContent";
import Sidebar from "@/components/ui/Sidebar";
import showToast from "@/components/ui/Toast";
import {
  ENQUIRY_FINISHES_OPTIONS,
  type EnquiryFinishesValue,
  type EnquiryJourneyValue,
} from "@/constants/enquiry";
import {
  trackEnquirySubmitted,
  trackQuoteFormInteraction,
} from "@/lib/analytics/mixpanel";
import { getImageUrl, submitEnquiry } from "@/lib/api/lotApi";
import { useUIStore } from "@/stores/uiStore";
import type {
  GetYourQuoteSidebarProps,
  HouseDesignItem,
  QuoteFormData,
} from "@/types/houseDesign";
import { quoteFormSchema } from "@/types/houseDesign";
import { normalizeFloorPlanTitle } from "@/utils/text";
import React, { useMemo, useRef, useState } from "react";

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
};

const formatSelectedLotSummary = ({
  displayId,
  suburb,
  address,
}: {
  displayId: string;
  suburb: unknown;
  address: unknown;
}) => {
  const normalizedSuburb = normalizeText(suburb);
  if (normalizedSuburb) {
    return `Lot ${displayId}, ${normalizedSuburb}`;
  }

  const normalizedAddress = normalizeText(address);
  if (!normalizedAddress) {
    return `Lot ${displayId}`;
  }

  return /^lot\b/i.test(normalizedAddress)
    ? normalizedAddress
    : `Lot ${displayId}, ${normalizedAddress}`;
};

const resolveBuilderForDesign = (selectedHouseDesign: HouseDesignItem | null) => {
  if (!selectedHouseDesign) {
    return {
      builderIds: [] as string[],
      builderLabel: undefined as string | undefined,
    };
  }

  let builderId = normalizeText(selectedHouseDesign.builderId);
  let builderName = normalizeText(selectedHouseDesign.builderName);
  const rawBuilder = (selectedHouseDesign as unknown as Record<string, unknown>)
    .builder;

  if (typeof rawBuilder === "string") {
    builderId = builderId || normalizeText(rawBuilder);
    builderName = builderName || normalizeText(rawBuilder);
  } else if (rawBuilder && typeof rawBuilder === "object") {
    const builderObj = rawBuilder as Record<string, unknown>;
    builderId = builderId || normalizeText(builderObj.id);
    builderName = builderName || normalizeText(builderObj.name);
  }

  return {
    builderIds: builderId ? [builderId] : [],
    builderLabel: builderName || builderId || undefined,
  };
};

const JOURNEY_OPTIONS: Array<{
  value: EnquiryJourneyValue;
  title: string;
  description: string;
}> = [
  {
    value: "secure_block",
    title: "I want to secure this block",
    description: "Send this straight to the estate sales agent.",
  },
  {
    value: "pricing_enquiry",
    title: "I want pricing first",
    description: "Send a qualified pricing request to the builder.",
  },
];

export const GetYourQuoteSidebar = ({
  open,
  onClose,
  onBack,
  onExploreAvailableBlocks,
  selectedHouseDesign,
  selectedFacade,
  initialJourneyType = null,
  lotDetails,
}: GetYourQuoteSidebarProps) => {
  const [showThankYou, setShowThankYou] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [journeyType, setJourneyType] = useState<EnquiryJourneyValue | null>(
    null
  );
  const [finishesLevel, setFinishesLevel] =
    useState<EnquiryFinishesValue | null>(null);
  const [showFinishesTooltip, setShowFinishesTooltip] = useState(false);
  const finishesTooltipRef = useRef<HTMLDivElement | null>(null);
  const [errors, setErrors] = useState<
    Partial<Record<keyof QuoteFormData | "journeyType" | "finishesLevel", string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setHideRotationControls } = useUIStore();

  const inferredBuilder = useMemo(
    () => resolveBuilderForDesign(selectedHouseDesign),
    [selectedHouseDesign]
  );

  const selectedFacadeLabel =
    selectedFacade?.label || selectedHouseDesign?.images?.[0]?.faced || "N/A";
  const selectedFacadeId =
    selectedFacade?.facadeId || selectedHouseDesign?.images?.[0]?.facadeId || "";
  const lotDisplayId =
    lotDetails.displayId !== undefined && lotDetails.displayId !== null
      ? String(lotDetails.displayId)
      : String(lotDetails.id);
  const selectedLotSummary = formatSelectedLotSummary({
    displayId: lotDisplayId,
    suburb: lotDetails.suburb,
    address: lotDetails.address,
  });
  const analyticsLotId =
    lotDetails.blockKey !== undefined && lotDetails.blockKey !== null
      ? String(lotDetails.blockKey)
      : lotDisplayId;

  const [formData, setFormData] = useState<QuoteFormData>({
    yourName: "",
    emailAddress: "",
    phoneNumber: "",
    selectedBuilders: [],
    additionalComments: "",
  });

  React.useEffect(() => {
    setHideRotationControls(showThankYou);
    return () => setHideRotationControls(false);
  }, [setHideRotationControls, showThankYou]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setFormData({
      yourName: "",
      emailAddress: "",
      phoneNumber: "",
      selectedBuilders: [],
      additionalComments: "",
    });
    setErrors({});
    setShowThankYou(false);
    setAgreeToTerms(false);
    setJourneyType(initialJourneyType);
    setFinishesLevel(null);
    setShowFinishesTooltip(false);
  }, [initialJourneyType, open]);

  React.useEffect(() => {
    if (!showFinishesTooltip) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        finishesTooltipRef.current?.contains(target)
      ) {
        return;
      }
      setShowFinishesTooltip(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [showFinishesTooltip]);

  if (!open) return null;

  const builderDescription =
    inferredBuilder.builderLabel ||
    "No builder is linked to this design yet. Pricing requests will need a linked builder.";

  const isPricingJourney = journeyType === "pricing_enquiry";
  const submitLabel =
    journeyType === "secure_block"
      ? "Secure this lot"
      : "Request detailed quote";
  const selectedDesignImageSrc = selectedHouseDesign?.floorPlanImage
    ? getImageUrl(selectedHouseDesign.floorPlanImage)
    : selectedHouseDesign?.image
    ? getImageUrl(selectedHouseDesign.image)
    : null;
  const selectedFloorPlanName =
    normalizeText(selectedHouseDesign?.title) !== undefined
      ? normalizeFloorPlanTitle(selectedHouseDesign?.title || "")
      : "your selected floor plan";
  const selectedBuilderName = inferredBuilder.builderLabel || "the builder";

  const handleKeepExploringDesigns = () => {
    if (onBack) {
      onBack();
      return;
    }
    onClose();
  };

  const handleExploreAvailableBlocks = () => {
    if (onExploreAvailableBlocks) {
      onExploreAvailableBlocks();
      return;
    }
    onClose();
  };

  const handleInputChange = (field: keyof QuoteFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    trackQuoteFormInteraction("Field Updated", {
      field,
      hasValue: !!value.trim(),
      estateId: lotDetails.estateId,
      lotId: analyticsLotId,
      lotDbId: lotDetails.id,
      houseDesignId: selectedHouseDesign?.id,
      houseDesignName: selectedHouseDesign?.title,
      builderName: inferredBuilder.builderLabel,
      builderIds: inferredBuilder.builderIds,
      builderId: inferredBuilder.builderIds[0],
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      quoteFormSchema.parse(formData);

      if (!journeyType) {
        setErrors((prev) => ({
          ...prev,
          journeyType: "Select what you would like to do.",
        }));
        setIsSubmitting(false);
        return;
      }

      if (journeyType === "pricing_enquiry") {
        if (!finishesLevel) {
          setErrors((prev) => ({
            ...prev,
            finishesLevel: "Select a level of finishes.",
          }));
          setIsSubmitting(false);
          return;
        }
        if (inferredBuilder.builderIds.length === 0) {
          setErrors((prev) => ({
            ...prev,
            additionalComments:
              "This design is not linked to a builder yet, so pricing requests cannot be sent.",
          }));
          setIsSubmitting(false);
          return;
        }
      }

      const builderIds =
        journeyType === "pricing_enquiry" ? inferredBuilder.builderIds : [];

      await submitEnquiry({
        name: formData.yourName,
        email: formData.emailAddress,
        number: formData.phoneNumber,
        builders: builderIds,
        comments: formData.additionalComments || "",
        lot_id: lotDetails.id.toString(),
        house_design_id: selectedHouseDesign?.id || "",
        facade_id: selectedFacadeId,
        journey_type: journeyType,
        finishes_level: finishesLevel || undefined,
      });

      trackEnquirySubmitted({
        estateId: lotDetails.estateId,
        lotId: analyticsLotId,
        lotDbId: lotDetails.id,
        houseDesignId: selectedHouseDesign?.id || "",
        houseDesignName: selectedHouseDesign?.title,
        builderName: inferredBuilder.builderLabel,
        facadeId: selectedFacadeId || null,
        builder: builderIds,
        builderIds,
        builderId: builderIds[0],
        journeyType,
      });

      setShowThankYou(true);
      setErrors({});
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "name" in error &&
        error.name === "ZodError"
      ) {
        const fieldErrors: Partial<Record<keyof QuoteFormData, string>> = {};
        const errorMessage = (error as Record<string, unknown>)
          .message as string;
        const parsedErrors = JSON.parse(errorMessage);
        if (Array.isArray(parsedErrors)) {
          parsedErrors.forEach((item: unknown) => {
            if (
              item &&
              typeof item === "object" &&
              "path" in item &&
              Array.isArray(item.path)
            ) {
              const field = item.path[0] as keyof QuoteFormData;
              if ("message" in item && typeof item.message === "string") {
                fieldErrors[field] = item.message;
              }
            }
          });
        }
        setErrors(fieldErrors);
      } else {
        showToast({
          message: "Failed to submit enquiry. Please try again.",
          type: "error",
          options: { autoClose: 5000 },
        });
        setErrors((prev) => ({
          ...prev,
          additionalComments: "Failed to submit enquiry. Please try again.",
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const headerContent = (
    <h2 className="text-2xl font-medium text-brand">
      {showThankYou ? "Sent!" : "What would you like to do?"}
    </h2>
  );

  return (
    <>
      <Sidebar
        open={open}
        onClose={onClose}
        onBack={onBack || onClose}
        showBackButton={true}
        headerContent={headerContent}
      >
        {showThankYou ? (
          <div className="p-6">
            <div className="rounded-2xl border border-brand bg-brand-accent p-5">
              <div className="w-9 h-9 bg-brand-primary rounded-full flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h4 className="mt-4 text-2xl font-bold text-brand">Sent!</h4>
              {selectedHouseDesign ? (
                <p className="mt-3 text-brand-muted">
                  Your selection of the {selectedFloorPlanName} for Lot{" "}
                  {lotDisplayId} has been shared with the team at{" "}
                  {selectedBuilderName}, with your enquiry also shared with the
                  estate sales team. The builder will be in touch soon.
                </p>
              ) : (
                <p className="mt-3 text-brand-muted">
                  Your enquiry for Lot {lotDisplayId} has been shared with the
                  estate sales team. They will be in touch soon.
                </p>
              )}
              <p className="mt-3 text-brand-muted">
                In the meantime, continue exploring home designs or discover
                other opportunities across the estate.
              </p>
              <div className="mt-5 grid gap-3">
                <Button
                  label="Keep exploring designs"
                  className="w-full rounded-lg bg-brand-primary py-3 text-white hover:bg-[var(--color-primary-hover)]"
                  onClick={handleKeepExploringDesigns}
                />
                <Button
                  label="Explore available blocks"
                  variant="ghost"
                  className="w-full rounded-lg border-brand-primary bg-white py-3 text-brand hover:bg-brand-accent hover:text-brand"
                  onClick={handleExploreAvailableBlocks}
                />
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-5 p-6">
              <div className="rounded-2xl border border-brand bg-brand-accent p-4 flex gap-4 items-center">
                {selectedDesignImageSrc && (
                  <img
                    src={selectedDesignImageSrc}
                    alt="Selected design"
                    width={56}
                    height={56}
                    className="rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <div className="font-bold text-brand">
                    {selectedHouseDesign?.title || "Selected lot"}
                  </div>
                  <div className="text-sm text-brand-muted">{selectedLotSummary}</div>
                  <div className="text-sm text-brand-muted">
                    {selectedFacadeLabel !== "N/A"
                      ? `Facade: ${selectedFacadeLabel}`
                      : "Facade not selected"}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-brand mb-2">
                  What would you like to do?
                </div>
                <div className="grid gap-3">
                  {JOURNEY_OPTIONS.map((option) => {
                    const isActive = journeyType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`rounded-xl border p-4 text-left transition ${
                          isActive
                            ? "border-brand-primary bg-brand-accent"
                            : "border-brand bg-white hover:border-primary"
                        }`}
                        onClick={() => {
                          setJourneyType(option.value);
                          setErrors((prev) => ({
                            ...prev,
                            journeyType: "",
                          }));
                          if (option.value !== "pricing_enquiry") {
                            setFinishesLevel(null);
                            setErrors((prev) => ({
                              ...prev,
                              finishesLevel: "",
                            }));
                          }
                        }}
                      >
                        <div className="font-semibold text-brand">
                          {option.title}
                        </div>
                        <div className="mt-1 text-sm text-brand-muted">
                          {option.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {errors.journeyType && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.journeyType}
                  </p>
                )}
              </div>

              {journeyType && (
                <>
                  {isPricingJourney && (
                    <>
                      <div>
                        <div
                          ref={finishesTooltipRef}
                          className="relative mb-2 inline-flex items-center gap-2"
                          onMouseEnter={() => setShowFinishesTooltip(true)}
                          onMouseLeave={() => setShowFinishesTooltip(false)}
                          onFocusCapture={() => setShowFinishesTooltip(true)}
                          onBlurCapture={(event) => {
                            if (
                              event.currentTarget.contains(
                                event.relatedTarget
                              )
                            ) {
                              return;
                            }
                            setShowFinishesTooltip(false);
                          }}
                        >
                          <span className="block text-sm font-medium text-brand">
                            Level of finishes
                          </span>
                          <button
                            type="button"
                            className="inline-flex size-5 items-center justify-center rounded-full border border-brand text-xs font-semibold text-brand transition hover:border-brand-primary hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                            aria-label="Show finish level information"
                            aria-describedby="finishes-level-tooltip"
                            aria-expanded={showFinishesTooltip}
                            onClick={(event) => {
                              event.stopPropagation();
                              setShowFinishesTooltip((previous) => !previous);
                            }}
                          >
                            ?
                          </button>
                          {showFinishesTooltip && (
                            <div
                              id="finishes-level-tooltip"
                              role="tooltip"
                              className="absolute left-0 top-full z-50 mt-2 max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-brand bg-white p-4 text-xs leading-relaxed text-brand shadow-xl"
                            >
                              <p>
                                Finishes describe the materials used across
                                floors, walls, ceilings, cabinetry, and
                                fixtures. They shape appearance, durability, and
                                overall feel.
                              </p>
                              <p className="mt-3">
                                Builders use these levels to prepare accurate
                                quotes:
                              </p>
                              <p className="mt-3">
                                <span className="font-semibold">Low:</span>{" "}
                                Builder&apos;s range selections throughout.
                                Standard fixtures, fittings and appliances.
                                Functional and practical - common in investment
                                properties or first homes.
                              </p>
                              <p className="mt-3">
                                <span className="font-semibold">Medium:</span>{" "}
                                Mid-range fixtures and finishes. Upgraded
                                tapware, stone benchtops, quality floor
                                coverings, standard inclusions above
                                builder&apos;s range. Most common for
                                owner-occupiers.
                              </p>
                              <p className="mt-3">
                                <span className="font-semibold">High:</span>{" "}
                                Premium selections. Engineered stone, high-end
                                appliances, full-height tiling, quality window
                                treatments, upgraded joinery and hardware
                                throughout.
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {ENQUIRY_FINISHES_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              className={`rounded-lg border px-3 py-3 text-sm font-medium transition ${
                                finishesLevel === option.value
                                  ? "border-brand-primary bg-brand-accent text-brand"
                                  : "border-brand bg-white text-brand hover:border-primary"
                              }`}
                              onClick={() => {
                                setFinishesLevel(option.value);
                                setErrors((prev) => ({
                                  ...prev,
                                  finishesLevel: "",
                                }));
                              }}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                        {errors.finishesLevel && (
                          <p className="mt-2 text-sm text-red-600">
                            {errors.finishesLevel}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-brand mb-1">
                          Builder
                        </label>
                        <div className="rounded-lg border border-brand bg-brand-accent px-3 py-3 text-sm text-brand">
                          {builderDescription}
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label
                      htmlFor="yourName"
                      className="block text-sm font-medium text-brand mb-1"
                    >
                      Your Name{" "}
                      <span className="text-brand-primary" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <Input
                      id="yourName"
                      aria-required="true"
                      value={formData.yourName}
                      onChange={(event) =>
                        handleInputChange("yourName", event.target.value)
                      }
                      className={`block w-full h-12 p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent ${
                        errors.yourName ? "border-red-500" : "border-brand"
                      }`}
                      placeholder="Your name"
                    />
                    {errors.yourName && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.yourName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="emailAddress"
                      className="block text-sm font-medium text-brand mb-1"
                    >
                      Email Address{" "}
                      <span className="text-brand-primary" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <Input
                      type="email"
                      id="emailAddress"
                      aria-required="true"
                      value={formData.emailAddress}
                      onChange={(event) =>
                        handleInputChange("emailAddress", event.target.value)
                      }
                      className={`block w-full h-12 p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent ${
                        errors.emailAddress ? "border-red-500" : "border-brand"
                      }`}
                      placeholder="your.email@company.com"
                    />
                    {errors.emailAddress && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.emailAddress}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="phoneNumber"
                      className="block text-sm font-medium text-brand mb-1"
                    >
                      Phone Number{" "}
                      <span className="text-brand-primary" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <Input
                      type="tel"
                      id="phoneNumber"
                      aria-required="true"
                      value={formData.phoneNumber}
                      onChange={(event) =>
                        handleInputChange("phoneNumber", event.target.value)
                      }
                      className={`block w-full h-12 p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent ${
                        errors.phoneNumber ? "border-red-500" : "border-brand"
                      }`}
                      placeholder="0412 *** ***"
                    />
                    {errors.phoneNumber && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.phoneNumber}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="additionalComments"
                      className="block text-sm font-medium text-brand mb-1"
                    >
                      Additional Comments
                    </label>
                    <textarea
                      id="additionalComments"
                      rows={3}
                      value={formData.additionalComments}
                      onChange={(event) =>
                        handleInputChange(
                          "additionalComments",
                          event.target.value
                        )
                      }
                      className={`block w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent ${
                        errors.additionalComments
                          ? "border-red-500"
                          : "border-brand"
                      }`}
                      placeholder="Any specific requirements or questions?"
                    />
                    {errors.additionalComments && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.additionalComments}
                      </p>
                    )}
                  </div>

                  {isPricingJourney && (
                    <p className="text-sm text-brand-muted">
                      Build cost estimates are indicative only. Final pricing is
                      subject to detailed assessment by your chosen builder.
                    </p>
                  )}

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="agreeToTerms"
                      checked={agreeToTerms}
                      onCheckedChange={() => setAgreeToTerms(!agreeToTerms)}
                    />
                    <label htmlFor="agreeToTerms" className="text-sm text-brand">
                      I agree to the{" "}
                      <a
                        href="#"
                        className="text-brand-primary underline hover:text-[var(--color-primary-hover)] transition-colors"
                        onClick={(event) => {
                          event.preventDefault();
                          setShowTerms(true);
                        }}
                      >
                        Terms & Conditions
                      </a>
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className="sticky bottom-0 bg-brand border-t border-brand p-6">
              <Button
                label={isSubmitting ? "Submitting..." : submitLabel}
                type="submit"
                className="w-full text-lg py-3 rounded-lg bg-brand-primary text-white disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || !agreeToTerms || !journeyType}
              />
            </div>
          </form>
        )}
      </Sidebar>

      <TextModal
        open={showTerms}
        onClose={() => setShowTerms(false)}
        title="Terms & Conditions"
        content={<PrivacyPolicyContent />}
      />
    </>
  );
};

export default GetYourQuoteSidebar;
