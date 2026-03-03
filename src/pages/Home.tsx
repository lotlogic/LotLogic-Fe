import LandingHeader from "@/components/landing/LandingHeader";
import { brand } from "@/constants/content";
import {
  beforePainPoints,
  benefits,
  dealPoints,
  faqs,
  heroBadge,
  steps,
  whatYouGet,
  withLotcheckBenefits,
} from "@/constants/marketing";
import { submitDemoRequest } from "@/lib/api/lotApi";
import { Check, ChevronDown } from "lucide-react";
import { useState, type FormEvent } from "react";

const scrollToSection = (id: string) => {
  const target = document.getElementById(id);
  if (target) {
    target.scrollIntoView({ behavior: "smooth" });
  }
};

export const HomePage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [submitError, setSubmitError] = useState("");
  const [demoForm, setDemoForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });

  const scrollToDemoForm = () => {
    const target = document.getElementById("demo-form");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    // focus first input after scroll completes
    setTimeout(() => {
      const input = document.getElementById("demo-name") as
        | HTMLInputElement
        | null;
      input?.focus({ preventScroll: true });
    }, 400);
  };

  const handleDemoSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!demoForm.name || !demoForm.email) {
      setSubmitStatus("error");
      setSubmitError("Please add your name and email so we can respond.");
      return;
    }

    try {
      setSubmitError("");
      setSubmitStatus("idle");
      setIsSubmitting(true);
      await submitDemoRequest({
        name: demoForm.name,
        email: demoForm.email,
        phone: demoForm.phone,
        company: demoForm.company,
        message: demoForm.message,
      });
      setSubmitStatus("success");
      setDemoForm({
        name: "",
        email: "",
        phone: "",
        company: "",
        message: "",
      });
    } catch (error) {
      setSubmitStatus("error");
      setSubmitError(
        error instanceof Error
          ? error.message
          : "We couldn't send that just now. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-stone-50 font-body text-[var(--color-ink)]">
      <LandingHeader
        primaryAction={{
          label: "Book a demo",
          onClick: scrollToDemoForm,
          variant: "primary",
        }}
        secondaryAction={{
          label: "See how it works",
          onClick: () => scrollToSection("how-it-works"),
          variant: "secondary",
          hideOnSmall: true,
        }}
      />

      <main className="pb-0 pt-0 !pb-0 !pt-0">
        <section className="relative mt-0 w-full! max-w-none! mx-0 px-0 py-0 my-0! overflow-hidden bg-hero-gradient text-white">
          <div className="bg-radial-overlay absolute inset-0" aria-hidden />
          <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-36 text-center md:px-8">
            <div className="animate-fade-in-up">
              <span className="pill border border-white/20 bg-white/10 text-white">
                {heroBadge}
              </span>
            </div>

            <h1 className="animate-fade-in-up animate-delay-1 mt-8 font-display text-4xl leading-tight sm:text-5xl md:text-6xl lg:text-[64px] lg:leading-[1.15] text-white">
              Buyers who already know
              <br className="hidden md:block" />
              what fits.
            </h1>

            <p className="body-text-lg animate-fade-in-up animate-delay-2 mx-auto mb-10 mt-6 max-w-2xl !text-white/80">
              Better-qualified enquiries. Less wasted time. Sales conversations that
              start with context.
            </p>

            <div className="animate-fade-in-up animate-delay-3 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                className="btn-primary px-8 py-3 text-base"
                onClick={scrollToDemoForm}
              >
                Book a demo
              </button>
              <button
                type="button"
                className="btn-secondary px-8 py-3 text-base"
                onClick={() => scrollToSection("how-it-works")}
              >
                See how it works
              </button>
            </div>
          </div>
        </section>

        <section className="mt-0 bg-gradient-to-b from-white via-white to-stone-50 px-4 py-24 md:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 text-center">
              <h2 className="section-heading mb-4">From confusion to clarity</h2>
              <p className="body-text mx-auto max-w-2xl">
                Traditional estate browsing leaves buyers overwhelmed and sales teams fielding
                enquiries that go nowhere. LotCheck changes that.
              </p>
            </div>

            <div className="grid items-center gap-14 md:grid-cols-2">
              <div className="space-y-6">
                <div className="rounded-sm border border-stone-200 bg-white p-8">
                  <div className="mb-3 text-sm font-medium text-stone-400">BEFORE</div>
                  <ul className="space-y-3 text-sm text-stone-700">
                    {beforePainPoints.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="mt-2 h-2 w-2 rounded-full bg-stone-200" />
                        <span className="body-text text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-sm border-l-4 border-[var(--color-coral)] bg-white p-8 shadow-lg shadow-black/5">
                  <div className="mb-3 text-sm font-medium text-coral">WITH LOTCHECK</div>
                  <ul className="space-y-3">
                    {withLotcheckBenefits.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <Check size={18} className="mt-0.5 text-coral" />
                        <span className="body-text text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="relative animate-float">
                <div className="rounded-sm bg-white p-8 shadow-2xl shadow-black/15">
                  <div className="mb-5 flex aspect-video items-center justify-center rounded-sm bg-gradient-to-br from-stone-100 to-stone-200">
                    <svg
                      width="220"
                      height="140"
                      viewBox="0 0 220 140"
                      className="opacity-60 text-[var(--color-ink)]"
                      role="presentation"
                    >
                      <rect x="10" y="10" width="45" height="45" fill="currentColor" opacity="0.25" />
                      <rect x="65" y="10" width="45" height="45" fill="currentColor" opacity="0.25" />
                      <rect x="120" y="10" width="45" height="45" fill="var(--color-primary)" opacity="0.7" />
                      <rect x="175" y="10" width="35" height="45" fill="var(--color-primary)" opacity="0.7" />
                      <rect x="10" y="65" width="45" height="45" fill="currentColor" opacity="0.25" />
                      <rect x="65" y="65" width="45" height="45" fill="var(--color-primary)" opacity="0.7" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 w-3/4 rounded bg-stone-200" />
                    <div className="h-2 w-1/2 rounded bg-stone-200" />
                    <span className="inline-block rounded-sm bg-coral px-3 py-2 text-xs font-semibold text-white">
                      6 lots match your criteria
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-0 bg-white px-4 py-24 md:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-14 text-center">
              <h2 className="section-heading">What changes for you</h2>
            </div>

            <div className="grid gap-10 md:grid-cols-2">
              {benefits.map((benefit) => (
                <div key={benefit} className="relative pl-11">
                  <span className="absolute left-0 top-1 h-6 w-6 rounded-full bg-[rgba(239,123,108,0.15)]" />
                  <Check size={18} className="absolute left-1.5 top-1.5 text-coral" />
                  <p className="body-text-lg">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="mt-0 bg-stone-50 px-4 py-24 md:px-8"
        >
          <div className="mx-auto max-w-5xl">
            <div className="mb-16 text-center">
              <h2 className="section-heading">How it works</h2>
              <p className="body-text mx-auto mt-4 max-w-2xl">
                Four steps from browsing to qualified enquiry
              </p>
            </div>

            <div className="space-y-6">
              {steps.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-sm border-l-[3px] border-stone-200 bg-white p-8 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[var(--color-coral)] hover:shadow-lg"
                >
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
                        <span className="font-display text-lg font-semibold text-stone-600">
                          {index + 1}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-2 font-display text-xl font-semibold text-[var(--color-ink)]">
                        {step.title}
                      </h3>
                      <p className="body-text">{step.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-0 bg-white px-4 py-24 md:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-14 text-center">
              <span className="pill mb-4">Pilot Program</span>
              <h2 className="section-heading mt-2">Low risk. High upside.</h2>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div className="rounded-sm bg-stone-50 p-10">
                <h3 className="mb-6 font-display text-2xl font-bold text-[var(--color-ink)]">
                  What you get
                </h3>
                <ul className="space-y-4">
                  {whatYouGet.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <Check size={20} className="mt-1 text-coral" />
                      <span className="body-text">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-sm bg-stone-50 p-10">
                <h3 className="mb-6 font-display text-2xl font-bold text-[var(--color-ink)]">
                  The deal
                </h3>
                <ul className="mb-8 space-y-4">
                  {dealPoints.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <Check size={20} className="mt-1 text-coral" />
                      <span className="body-text">{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="btn-primary w-full"
                  onClick={scrollToDemoForm}
                >
                  Request pilot details
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-0 bg-brand-secondary px-4 py-20 text-white md:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="font-display text-5xl font-bold text-coral">1</div>
            <p className="mt-2 font-display text-2xl font-semibold md:text-3xl">
              First deployment complete
            </p>
            <p className="body-text mt-2 !text-stone-300">
              Hamilton Rise · Live with 3 builders · Processing enquiries now
            </p>
            <div className="mt-8 inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white">
              Two pilot places remaining for 2026
            </div>
          </div>
        </section>

        <section className="mt-0 bg-white px-4 py-24 md:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="section-heading mb-12 text-center">Common questions</h2>

            <div className="divide-y divide-stone-200">
              {faqs.map((faq) => (
                <details key={faq.q} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between py-5">
                    <h3 className="font-body text-lg font-medium text-[var(--color-ink)]">
                      {faq.q}
                    </h3>
                    <ChevronDown className="h-5 w-5 text-stone-400 transition duration-300 group-open:rotate-180" />
                  </summary>
                  <div className="pb-5 pt-1">
                    <p className="body-text">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section
          id="book-demo"
          className="relative mt-0 overflow-hidden bg-hero-gradient px-4 py-24 text-center text-white md:px-8"
        >
          <div className="bg-radial-overlay absolute inset-0" aria-hidden />
          <div className="relative z-10 mx-auto max-w-4xl">
            <h2 className="font-display text-4xl font-bold leading-tight sm:text-5xl text-white">
              See LotCheck running on Hamilton Rise
            </h2>
            <p className="body-text-lg mx-auto mb-10 mt-4 max-w-2xl !text-white/80">
              Book a 20-minute demo. No pressure, just a clear walkthrough.
            </p>
            

            <form
              id="demo-form"
              className="mt-12 grid gap-4 text-left sm:grid-cols-2 sm:gap-6"
              onSubmit={handleDemoSubmit}
            >
              <div className="flex flex-col gap-2">
                <label htmlFor="demo-name" className="text-sm font-medium text-white/90">
                  Your name *
                </label>
                <input
                  id="demo-name"
                  name="name"
                  type="text"
                  required
                  value={demoForm.name}
                  onChange={(e) =>
                    setDemoForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="rounded-sm border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/60 outline-none transition focus:border-white/60 focus:ring-2 focus:ring-white/30"
                  placeholder="Alex Smith"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="demo-email" className="text-sm font-medium text-white/90">
                  Work email *
                </label>
                <input
                  id="demo-email"
                  name="email"
                  type="email"
                  required
                  value={demoForm.email}
                  onChange={(e) =>
                    setDemoForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="rounded-sm border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/60 outline-none transition focus:border-white/60 focus:ring-2 focus:ring-white/30"
                  placeholder="your.email@company.com"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="demo-phone" className="text-sm font-medium text-white/90">
                  Phone (optional)
                </label>
                <input
                  id="demo-phone"
                  name="phone"
                  type="tel"
                  value={demoForm.phone}
                  onChange={(e) =>
                    setDemoForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="rounded-sm border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/60 outline-none transition focus:border-white/60 focus:ring-2 focus:ring-white/30"
                  placeholder="+61 400 000 000"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="demo-company" className="text-sm font-medium text-white/90">
                  Organisation
                </label>
                <input
                  id="demo-company"
                  name="company"
                  type="text"
                  value={demoForm.company}
                  onChange={(e) =>
                    setDemoForm((prev) => ({ ...prev, company: e.target.value }))
                  }
                  className="rounded-sm border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/60 outline-none transition focus:border-white/60 focus:ring-2 focus:ring-white/30"
                  placeholder="Hamilton Rise"
                />
              </div>

              <div className="sm:col-span-2 flex flex-col gap-2">
                <label htmlFor="demo-message" className="text-sm font-medium text-white/90">
                  What should we know?
                </label>
                <textarea
                  id="demo-message"
                  name="message"
                  rows={4}
                  value={demoForm.message}
                  onChange={(e) =>
                    setDemoForm((prev) => ({ ...prev, message: e.target.value }))
                  }
                  className="rounded-sm border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/60 outline-none transition focus:border-white/60 focus:ring-2 focus:ring-white/30"
                  placeholder="Estate timeline, builder list, anything else."
                />
              </div>

              <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  className="btn-primary px-8 py-3 text-base disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending..." : "Send request"}
                </button>

                {submitStatus === "success" && (
                  <p className="text-sm text-green-100">
                    Thanks — we'll reply with a calendar link within one business day.
                  </p>
                )}
                {submitStatus === "error" && (
                  <p className="text-sm text-amber-100">
                    {submitError || "Couldn't send. Please email support@lotcheck.com.au"}
                  </p>
                )}
              </div>
            </form>
          </div>
        </section>

        <footer className="bg-brand-secondary px-4 py-12 text-white md:px-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
            <img
              src="/images/logos/lotcheck-logo-peach-white.svg"
              alt={brand.logoAlt}
              className="h-8 w-auto"
            />
            <p className="font-body text-sm text-stone-400">
              © 2026 LotCheck Pty Ltd · ACN 692 936 502
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default HomePage;
