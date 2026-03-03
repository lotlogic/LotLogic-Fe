import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { brand } from "@/constants/content";

export type LandingHeaderAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary";
  hideOnSmall?: boolean;
};

export type LandingHeaderProps = {
  logoHref?: string;
  primaryAction?: LandingHeaderAction;
  secondaryAction?: LandingHeaderAction;
  useScrollState?: boolean;
  alwaysLight?: boolean;
};

const renderAction = (
  action: LandingHeaderAction,
  isScrolled: boolean
) => {
  const baseClasses =
    action.variant === "primary"
      ? "btn-primary"
      : `rounded-sm border px-4 py-2 text-sm font-medium transition duration-300 hover:-translate-y-0.5 hover:shadow-sm ${
          isScrolled
            ? "border-black/10 text-[var(--color-ink)] hover:border-black/20"
            : "border-white/40 text-white hover:border-white/70"
        }`;

  const visibility = action.hideOnSmall ? "hidden sm:inline-flex" : "inline-flex";
  const className = `${baseClasses} ${visibility}`;

  if (action.href) {
    return (
      <Link key={action.label} to={action.href} className={className}>
        {action.label}
      </Link>
    );
  }

  return (
    <button
      key={action.label}
      type="button"
      className={className}
      onClick={action.onClick}
    >
      {action.label}
    </button>
  );
};

export const LandingHeader = ({
  logoHref = "/",
  primaryAction,
  secondaryAction,
  useScrollState = true,
  alwaysLight = false,
}: LandingHeaderProps) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!useScrollState) {
      setScrolled(false);
      return;
    }

    const handleScroll = () => setScrolled(window.scrollY > 50);
    handleScroll();

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [useScrollState]);

  const isScrolled = useScrollState && scrolled;
  const isLight = alwaysLight || !isScrolled;
  const logoSrc = isLight
    ? "/images/logos/lotcheck-logo-white.svg"
    : brand.logo;

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "border-b border-black/5 bg-white/95 backdrop-blur shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
        <Link
          to={logoHref}
          className="inline-flex items-center"
          aria-label={brand.title}
        >
          <img
            src={logoSrc}
            alt={brand.logoAlt}
            className="h-7 w-auto md:h-8"
          />
        </Link>

        <div className="flex items-center gap-3">
          {secondaryAction && renderAction(secondaryAction, isScrolled)}
          {primaryAction && renderAction(primaryAction, isScrolled)}
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;
