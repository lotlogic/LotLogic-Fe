import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import { TextModal } from "@/components/ui/DynamicModal";
import Input from "@/components/ui/Input";
import PrivacyPolicyContent from "@/components/ui/PrivacyPolicyContent";
import Sidebar from "@/components/ui/Sidebar";
import showToast from "@/components/ui/Toast";
import { formatContent, quote } from "@/constants/content";
import {
  trackEnquirySubmitted,
  trackQuoteFormInteraction,
} from "@/lib/analytics/mixpanel";
import { getImageUrl, submitEnquiry } from "@/lib/api/lotApi";
import { useUIStore } from "@/stores/uiStore";
import type {
  HouseDesignItem,
  GetYourQuoteSidebarProps,
  QuoteFormData,
} from "@/types/houseDesign";
import { quoteFormSchema } from "@/types/houseDesign";
import React, { useState } from "react";

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
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
  const designRecord = selectedHouseDesign as unknown as Record<string, unknown>;
  const rawBuilder = designRecord.builder;

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

export const GetYourQuoteSidebar = ({
  open,
  onClose,
  onBack,
  selectedHouseDesign,
  lotDetails,
}: GetYourQuoteSidebarProps) => {
  const [showThankYou, setShowThankYou] = useState(false);
  const [lotSecured, setLotSecured] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const { setHideRotationControls } = useUIStore();

  // Hide rotation controls when thank-you or lot-secured screens are visible
  React.useEffect(() => {
    setHideRotationControls(showThankYou || lotSecured);
    return () => setHideRotationControls(false);
  }, [showThankYou, lotSecured, setHideRotationControls]);
  const [showTerms, setShowTerms] = useState(false);
  const inferredBuilder = resolveBuilderForDesign(selectedHouseDesign);
  const builderDescription =
    inferredBuilder.builderLabel ||
    "Quote requests are sent to the builder linked to this house design.";

  // Form state
  const [formData, setFormData] = useState<QuoteFormData>({
    yourName: "",
    emailAddress: "",
    phoneNumber: "",
    selectedBuilders: [],
    additionalComments: "",
  });

  // Validation errors
  const [errors, setErrors] = useState<
    Partial<Record<keyof QuoteFormData, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when sidebar opens
  React.useEffect(() => {
    if (open) {
      setFormData({
        yourName: "",
        emailAddress: "",
        phoneNumber: "",
        selectedBuilders: [],
        additionalComments: "",
      });
      setErrors({});
      setShowThankYou(false);
      setLotSecured(false);
    }
  }, [open]);

  if (!open) return null;

  const facedOption = selectedHouseDesign?.images[0]?.faced || "N/A";

  // Simple cost estimate based on area and a per-sqft range
  const parseAreaSqFt = (areaStr?: string): number | null => {
    if (!areaStr) return null;
    const digits = areaStr.toString().replace(/[^0-9.]/g, "");
    const value = parseFloat(digits);
    return Number.isFinite(value) ? value : null;
  };

  const areaSqMeter = parseAreaSqFt(selectedHouseDesign?.area);
  const COST_MIN_PER_SQFT = 2800;
  const COST_MAX_PER_SQFT = 5500;
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(n);

  // Handle form field changes
  const handleInputChange = (field: keyof QuoteFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    // Track form field interaction
    trackQuoteFormInteraction("Field Updated", {
      field,
      hasValue: !!value.trim(),
      lotId: lotDetails.id,
      houseDesignId: selectedHouseDesign?.id,
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate form data
      quoteFormSchema.parse(formData);
      const builderIds = inferredBuilder.builderIds;

      // Prepare enquiry data for API
      const enquiryData = {
        name: formData.yourName,
        email: formData.emailAddress,
        number: formData.phoneNumber,
        builders: builderIds,
        comments: formData.additionalComments || "",
        lot_id: lotDetails.id.toString(),
        house_design_id: selectedHouseDesign?.id || "",
        facade_id: "",
      };

      // Submit enquiry to API
      await submitEnquiry(enquiryData);

      // Track successful enquiry submission
      trackEnquirySubmitted({
        lotId: lotDetails.id,
        houseDesignId: selectedHouseDesign?.id || "",
        facadeId: null,
        builder: builderIds,
      });

      setShowThankYou(true);
      setErrors({});
    } catch (error: unknown) {
      // Handle Zod validation errors
      if (
        error &&
        typeof error === "object" &&
        "name" in error &&
        error.name === "ZodError"
      ) {
        const fieldErrors: Partial<Record<keyof QuoteFormData, string>> = {};
        const errorMessage = (error as Record<string, unknown>)
          .message as string;
        const errors = JSON.parse(errorMessage);
        if (errors.length) {
          errors.forEach((err: unknown) => {
            if (
              err &&
              typeof err === "object" &&
              "path" in err &&
              Array.isArray(err.path)
            ) {
              const field = err.path[0] as keyof QuoteFormData;
              if ("message" in err && typeof err.message === "string") {
                fieldErrors[field] = err.message;
              }
            }
          });
        }

        setErrors(fieldErrors);
      } else {
        console.error("Form submission error:", error);
        showToast({
          message: "Failed to submit enquiry. Please try again.",
          type: "error",
          options: { autoClose: 5000 },
        });
        // Show user-friendly error message
        setErrors({
          additionalComments: "Failed to submit enquiry. Please try again.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const headerContent = (
    <>
      {showThankYou || lotSecured ? (
        // Show lot info in header for thank you screens
        <>
          <h2
            className="text-2xl font-medium text-brand"
          >
            {lotSecured ? "" : ""}
          </h2>
          {selectedHouseDesign && (
            <div>
              <div className="p-1 flex gap-4 items-center">
                <img
                  src={
                    selectedHouseDesign.floorPlanImage
                      ? getImageUrl(selectedHouseDesign.floorPlanImage)
                      : selectedHouseDesign.image
                  }
                  alt="Floor Plan"
                  width={56}
                  height={56}
                  className="rounded-lg object-cover"
                />
                <div className="flex-1">
                  <div className="font-bold text-lg">
                    {selectedHouseDesign.title}
                  </div>
                  <div className="text-brand-muted text-sm">
                    Lot {lotDetails.id}, {lotDetails.suburb} ({lotDetails.size}
                    m²)
                  </div>
                  <div className="text-brand-muted text-sm">
                    Floor Plan: {selectedHouseDesign.title}
                  </div>
                  <div className="text-brand-muted text-sm">
                    Faced: {facedOption}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <h2
            className="text-2xl font-medium text-brand"
          >
            {quote.title}
          </h2>
          <div className="text-brand-muted mt-1 text-base font-normal">
            {quote.subtitle}
          </div>
        </>
      )}
    </>
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
        {lotSecured ? (
          <div className="p-6 space-y-6">
            <div className="text-center space-y-4">
              <div
                className="w-16 h-16 bg-brand-primary rounded-full flex items-center justify-center mx-auto"
              >
                <svg
                  className="w-8 h-8 text-white"
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
              <h3 className="text-2xl font-semibold text-brand">
                {quote.thankYou}
              </h3>
              <p className="text-brand-muted">{quote.lotSecured}</p>
            </div>
          </div>
        ) : showThankYou ? (
          <div className="p-6 space-y-6">
            <div className="text-center space-y-3">
              <div
                className="w-9 h-9 bg-brand-primary rounded-full flex items-center justify-center mx-auto"
              >
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
              <h4 className="text-2xl font-bold text-brand">
                {quote.thankYou}
              </h4>
              <p className="text-brand-muted">{quote.enquirySubmitted}</p>
            </div>

            {/* Reserve Your Lot Section */}
            <div
              className="border border-brand bg-brand-accent rounded-lg p-6 space-y-4 text-center"
            >
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-lg font-semibold text-brand">
                  {quote.reserveYourLot}
                </h1>
              </div>
              <p className="text-brand-muted text-sm">
                {formatContent(quote.secureLotDescription, {
                  lotId: lotDetails.id,
                })}
              </p>
              <div className="text-3xl font-bold text-brand-primary">
                {quote.deposit}
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <Button
                  label={quote.secureThisLot}
                  onClick={async () => {
                    // Mark lot as secured in UI
                    setLotSecured(true);

                    // Resend enquiry as HOT LEAD to builders
                    try {
                      const enquiryData = {
                        name: formData.yourName,
                        email: formData.emailAddress,
                        number: formData.phoneNumber,
                        builders: inferredBuilder.builderIds,
                        comments: `[HOT LEAD] User secured this lot. ${
                          formData.additionalComments || ""
                        }`.trim(),
                        lot_id: lotDetails.id.toString(),
                        house_design_id: selectedHouseDesign?.id || "",
                        facade_id: "",
                        hot_lead: true,
                      };
                      await submitEnquiry(enquiryData);
                    } catch (err) {
                      // Silently fail to avoid blocking UI; optionally we could surface a toast
                    }
                  }}
                  className="bg-brand-primary text-white py-3 px-6 rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
                />
                <Button
                  label={quote.mayBeLater}
                  variant="outline"
                  onClick={onClose}
                  className="border border-brand bg-brand text-brand py-3 px-6 rounded-lg font-medium hover:bg-brand-muted transition-colors"
                />
              </div>
            </div>
          </div>
        ) : (
          // Initial form screen
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 p-6">
              {areaSqMeter && (
                <div className="rounded-2xl p-5 bg-brand-accent">
                  <div className="text-brand font-semibold text-lg">
                    Estimated Building Cost
                  </div>
                  <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-brand-primary">
                    {`${formatCurrency(
                      areaSqMeter * COST_MIN_PER_SQFT
                    )} – ${formatCurrency(areaSqMeter * COST_MAX_PER_SQFT)}`}
                  </div>
                </div>
              )}
              <div>
                <label
                  htmlFor="yourName"
                  className="block text-sm font-medium text-brand mb-1"
                >
                  {quote.yourName}
                </label>
                <Input
                  type="text"
                  id="yourName"
                  value={formData.yourName}
                  onChange={(e) =>
                    handleInputChange("yourName", e.target.value)
                  }
                  className={`block w-full h-12 p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent ${
                    errors.yourName ? "border-red-500" : "border-brand"
                  }`}
                  placeholder="Your name"
                />
                {errors.yourName && (
                  <p className="mt-1 text-sm text-red-600">{errors.yourName}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="emailAddress"
                  className="block text-sm font-medium text-brand mb-1"
                >
                  {quote.emailAddress}
                </label>
                <Input
                  type="email"
                  id="emailAddress"
                  value={formData.emailAddress}
                  onChange={(e) =>
                    handleInputChange("emailAddress", e.target.value)
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
                  {quote.phoneNumber}
                </label>
                <Input
                  type="tel"
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    handleInputChange("phoneNumber", e.target.value)
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
                <label className="block text-sm font-medium text-brand mb-1">
                  Builder
                </label>
                <div className="rounded-lg border border-brand bg-brand-accent px-3 py-3 text-sm text-brand">
                  {builderDescription}
                </div>
              </div>
              <div>
                <label
                  htmlFor="additionalComments"
                  className="block text-sm font-medium text-brand mb-1"
                >
                  {quote.additionalComments}
                </label>
                <textarea
                  id="additionalComments"
                  rows={3}
                  value={formData.additionalComments}
                  onChange={(e) =>
                    handleInputChange("additionalComments", e.target.value)
                  }
                  className={`block w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent ${
                    errors.additionalComments ? "border-red-500" : "border-brand"
                  }`}
                  placeholder="Any specific requirements or questions?"
                ></textarea>
                {errors.additionalComments && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.additionalComments}
                  </p>
                )}
              </div>

              {selectedHouseDesign && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-brand mb-2">
                    Your Selection
                  </h3>
                  <div className="border-t border-brand pt-2">
                    <div
                      className="rounded-2xl border border-brand bg-brand-accent p-4 flex gap-4 items-center"
                    >
                      <img
                        src={
                          getImageUrl(selectedHouseDesign.floorPlanImage) ||
                          selectedHouseDesign.image
                        }
                        alt="Floor Plan"
                        width={56}
                        height={56}
                        className="rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <div className="text-brand text-sm">
                          Lot {lotDetails.id}, {lotDetails.suburb}
                        </div>
                        <div className="text-brand text-sm">
                          Floor Plan: {selectedHouseDesign.title} (
                          {selectedHouseDesign.area} m²)
                        </div>
                        <div className="text-brand text-sm">
                          Faced: {facedOption}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Terms & Conditions Checkbox */}
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
                    onClick={(e) => {
                      e.preventDefault();
                      setShowTerms(true);
                    }}
                  >
                    Terms & Conditions
                  </a>
                </label>
              </div>
            </div>
            {/* Submit Button */}
            <div className="sticky bottom-0 bg-brand border-t border-brand p-6">
              <Button
                label={isSubmitting ? quote.submitting : "Enquire Now"}
                type="submit"
                className="w-full text-lg py-3 rounded-lg bg-brand-primary text-white disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || !agreeToTerms}
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
