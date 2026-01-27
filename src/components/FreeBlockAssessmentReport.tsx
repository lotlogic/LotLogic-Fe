import type { GeoApi } from "@/@types/api";
import { cn } from "@/lib/utils";
import { toTitleCase } from "@/utils/text";
import { Check, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import Button from "./ui/Button";
import Heading from "./ui/Heading";

export const FreeBlockAssessmentReport = () => {
  const [data, setData] = useState<GeoApi>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [isGated, setIsGated] = useState(true);

  const [searchParams] = useSearchParams();

  // fetch API data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const address = searchParams.get("address");
        if (!address) throw new Error("Missing query parameter - address");

        const response = await fetch(
          import.meta.env.VITE_API_URL +
            "/api/geo/act-zone?address=" +
            searchParams.get("address")
        );
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        setData(result);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // create zone text
  const zoneText = [
    data?.zone.zoneCode,
    toTitleCase(data?.zone.properties?.LAND_USE_POLICY_DESC),
  ]
    .filter(Boolean)
    .join(" - ");

  // combine rule matches by pathway
  const rules: Record<
    string,
    { confidence?: string | null; explanation: string }[]
  > = {};
  data?.lotCheckRules.matches.forEach((match) => {
    if (match.pathway && match.explanationResolved) {
      rules[match.pathway] = rules[match.pathway] || [];
      rules[match.pathway].push({
        confidence: match.confidence,
        explanation: match.explanationResolved,
      });
    }
  });
  const ruleMatches = Object.entries(rules);

  // commencement date
  const today = new Date();
  const commencementDate = import.meta.env.VITE_COMMENCEMENT_DATE
    ? new Date(import.meta.env.VITE_COMMENCEMENT_DATE)
    : undefined;

  // handle gated form
  const handleGatedContent = (data: any) => {
    console.log("onSubmit: ", data);

    // handle email queue
    // ...do stuff here

    // show content
    setIsGated(false);
  };

  if (isLoading) return null;

  if (error)
    return (
      <section className="mt-12">
        <Heading tag="h1" size="h1">
          Your block assessment
        </Heading>
        <div className="relative max-w-260  mt-10 mx-auto rounded-md shadow-lg">
          <div className={cn(["bg-white p-10 md:px-16"])}>
            <div className="grid place-items-center min-h-100 text-xl">
              <div className="grid place-items-center min-h-100 text-xl">
                <div className="text-center">
                  <p>
                    Unfortunately there was a error fetching this block
                    assessment.
                  </p>
                  <p className="mt-4 text-base">
                    Error:{" "}
                    {error
                      ?.replace("(did you import the GeoJSON datasets?)", "")
                      .trim()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );

  return (
    <section className="mt-12">
      <Heading tag="h1" size="h1">
        Your block assessment
      </Heading>
      <div className="relative max-w-260  mt-10 mx-auto rounded-md shadow-lg">
        {isGated && <GatedContentForm onSubmit={handleGatedContent} />}

        <div className={cn(["bg-white p-10 md:px-16", { "blur-xs": isGated }])}>
          <Heading tag="h2" size="h2" className="">
            {data?.formattedAddress.replace(", Australia", "")}
          </Heading>

          <div className="text-lg">
            {!!zoneText && <p>Zone: {zoneText}</p>}
            {!!data?.lotCheckRules.blockAreaSqm && (
              <p>Block size: {data?.lotCheckRules.blockAreaSqm} m&sup2;</p>
            )}
          </div>

          <hr className="my-6 border-gray-300" />

          <Heading tag="h3" size="h4" className="font-bold mb-4">
            What the new rules allow on a block this size
          </Heading>
          {commencementDate && today < commencementDate && (
            <p className="text-lg -mt-3 mb-5">
              Based on draft rules. Final rules expected on{" "}
              {commencementDate
                .toLocaleDateString("en-AU", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
                .replace(/\//g, " ")}
            </p>
          )}

          {!isLoading && !error && (
            <>
              {!!ruleMatches.length && (
                <>
                  {/* Listing rules separately */}
                  {/* <ul className="block space-y-4 [&>li]:pl-6 [&_strong]:block [&_strong]:text-lg">
                    {data?.lotCheckRules.matches.map((rule, i) => (
                      <li key={"rule_" + i} className="relative">
                        <div
                          className={cn([
                            "absolute top-2 left-0.5 size-3",
                            "bg-gray-300 rounded-full",
                            { "bg-success": rule.confidence === "High" },
                            { "bg-warning": rule.confidence === "Medium" },
                            { "bg-error": rule.confidence === "Low" },
                          ])}
                        ></div>
                        <strong className="[&:first-letter]:capitalize">
                          {rule.pathway}
                        </strong>
                        <p className="mt-1">{rule.explanationResolved}</p>
                      </li>
                    ))}
                  </ul> */}

                  {/* <hr className="my-6 border-gray-300" /> */}

                  {/* Combining rules together */}
                  <ul className="block space-y-6 [&>li]:pl-6 [&_strong]:block [&_strong]:text-lg">
                    {ruleMatches.map((rule, i) => (
                      <li key={"rule_" + i} className="relative">
                        <div
                          className={cn([
                            "absolute top-2 left-0.5 size-3",
                            "bg-gray-300 rounded-full",
                            {
                              "bg-success": rule[1][0].confidence === "High",
                            },
                            {
                              "bg-warning": rule[1][0].confidence === "Medium",
                            },
                            {
                              "bg-error": rule[1][0].confidence === "Low",
                            },
                          ])}
                        ></div>
                        <strong className="[&:first-letter]:capitalize [&+p]:mt-1">
                          {rule[0]}
                        </strong>
                        {rule[1].map((item, i) => (
                          <p key={"p_" + i} className="mt-2">
                            {item.explanation}
                          </p>
                        ))}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {!ruleMatches.length && (
                <>
                  <div className="grid place-items-center min-h-100 text-xl">
                    <div className="text-center">
                      <p>
                        The Missing Middle changes do not materially apply to
                        this zone.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <hr className="my-6 border-gray-300" />

          <div className="text-gray-400">
            <ul className="block space-y-2 [&>li]:pl-6">
              <li className="relative">
                <div
                  className={cn([
                    "absolute top-1 left-0.5 size-3.5",
                    "flex items-center justify-center",
                    "text-xs text-white",
                    "bg-gray-400 rounded-full",
                  ])}
                >
                  i
                </div>
                No major overlays checked in this version
              </li>
              <li>
                Height, setbacks and detailed design rules not assessed here
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FreeBlockAssessmentReport;

type GatedContentProps = {
  onSubmit: (data: any) => void;
};

const GatedContentForm = (props: GatedContentProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  return (
    <div
      className={cn([
        "absolute top-20 left-1/2 -translate-x-1/2",
        "w-full max-w-130",
        "text-center bg-white",
        "px-10 py-12 border border-gray-300 rounded-md shadow-lg z-1",
      ])}
    >
      <Heading tag="h2" size="h2">
        Your LotCheck report is ready
      </Heading>

      <Heading tag="p" size="h4">
        Enter your email to view your development assessment.
      </Heading>

      <p className="pt-2">
        We'll also send you a copy and notify you if ACT planning rules change
        for your property.
      </p>
      <form
        onSubmit={handleSubmit(props.onSubmit)}
        className="flex flex-col gap-4 w-full max-w-91 mx-auto mt-6"
        noValidate
      >
        <div>
          <label>
            <span className="sr-only">Enter your email address</span>
            <span className="relative">
              <Mail className="absolute top-1/2 left-3 size-6 -translate-y-1/2 text-gray-300" />
              <input
                type="email"
                {...register("email", {
                  required: "Email Address is required",
                })}
                aria-invalid={errors.email ? "true" : "false"}
                placeholder="Enter your email address"
                className={cn(
                  "w-full px-4 py-3 pl-12",
                  "bg-white placeholder-gray-500",
                  "border border-gray-300 rounded-md",
                  "focus-visible:border-transparent"
                )}
              />
            </span>
          </label>
          {errors.email && (
            <p className="text-xs text-error pl-1 mt-1" role="alert">
              {errors.email.message as string}
            </p>
          )}
        </div>
        <div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register("terms", {
                required: "This field is required",
              })}
              aria-invalid={errors.terms ? "true" : "false"}
              className={cn(
                "peer",
                "relative",
                "appearance-none",
                "shrink-0",
                "size-4.5",
                "mt-0.5",
                "border border-gray-300 rounded-sm",
                "focus-visible:border-transparent"
              )}
              required
            />
            <Check
              className={cn([
                "absolute size-4 p-px mt-0.75 ml-px",
                "hidden outline-none",
                "peer-checked:block",
              ])}
            />
            <span className="text-sm text-left">
              I agree to LotCheck's Privacy Policy and to receive occasional
              updates (you can unsubscribe anytime)
            </span>
          </label>
          {errors.terms && (
            <p className="text-xs text-error pl-1 mt-1" role="alert">
              {errors.terms.message as string}
            </p>
          )}
        </div>
        <Button className="mt-4" label="View my report" type="submit" />
      </form>
      <small className="block text-xs mt-6 text-balance">
        We require an email to prevent automated scraping and ensure you receive
        rule updates.
      </small>
    </div>
  );
};
