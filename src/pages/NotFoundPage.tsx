import LandingHeader from "@/components/landing/LandingHeader";
import { Link } from "react-router-dom";

export const NotFoundPage = () => {
  return (
    <div className="bg-stone-50 font-body text-[var(--color-ink)]">
      <LandingHeader
        logoText="lotcheck."
        primaryAction={{
          label: "Back to homepage",
          href: "/",
          variant: "primary",
        }}
        useScrollState={false}
        alwaysLight
      />

      <section className="relative mt-0 min-h-screen w-full max-w-none overflow-hidden bg-hero-gradient px-4 pb-24 pt-36 text-white md:px-8">
        <div className="bg-radial-overlay absolute inset-0" aria-hidden />
        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
          <span className="pill border border-white/20 bg-white/10 text-white">
            Page not found
          </span>
          <h1 className="mt-8 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            We lost this lot in the survey.
          </h1>
          <p className="body-text-lg mx-auto mt-4 max-w-2xl !text-white/80">
            The page you&apos;re looking for isn&apos;t here. Head back to the
            homepage to see LotCheck in action.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/" className="btn-primary px-8 py-3 text-base">
              Back to homepage
            </Link>
            <Link to="/prototype" className="btn-secondary px-8 py-3 text-base">
              View the prototype
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default NotFoundPage;
