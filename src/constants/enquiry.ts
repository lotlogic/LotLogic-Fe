export const ENQUIRY_JOURNEY_VALUES = [
  "secure_block",
  "pricing_enquiry",
] as const;

export const ENQUIRY_FINISHES_VALUES = ["low", "medium", "high"] as const;

export type EnquiryJourneyValue = (typeof ENQUIRY_JOURNEY_VALUES)[number];
export type EnquiryFinishesValue = (typeof ENQUIRY_FINISHES_VALUES)[number];

export const ENQUIRY_FINISHES_OPTIONS: ReadonlyArray<{
  value: EnquiryFinishesValue;
  label: string;
}> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];
