import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { brand } from "@/constants/content";

type PortalShellProps = {
  children: ReactNode;
  logoHref?: string;
};

export const PortalShell = ({
  children,
  logoHref = "/dashboard",
}: PortalShellProps) => {
  return (
    <div className="min-h-screen bg-stone-50 text-[var(--color-ink)]">
      <div className="border-b border-stone-700 bg-brand-secondary px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-6xl items-center">
          <Link to={logoHref} className="inline-flex items-center" aria-label={brand.title}>
            <img
              src="/images/logos/lotcheck-logo-peach-white.svg"
              alt={brand.logoAlt}
              className="h-7 w-auto md:h-8"
            />
          </Link>
        </div>
      </div>

      <div>{children}</div>

      <footer className="mt-10 bg-brand-secondary px-4 py-10 text-white md:px-8">
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
    </div>
  );
};

export default PortalShell;
