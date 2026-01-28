import { brand, colors } from "@/constants/content";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export const Header = () => {
  return (
    <>
      <header className="fixed w-full top-0 bg-white z-10 shadow">
        <a
          href="#main-content"
          className={cn(
            "sr-only",
            "focus:not-sr-only",
            "focus:absolute top-2 left-2",
            "bg-mow-navy",
            "text-white",
            "px-4! py-2!",
            "rounded-md",
            "z-50"
          )}
        >
          Skip to main content
        </a>
        <div className="max-w-360 px-4 md:px-8 mx-auto">
          <div className="flex justify-between items-center h-15">
            <Link
              to="/"
              className="flex items-center rounded-md hover:opacity-80 transition-opacity"
              aria-label="Meals on Wheels NSW - Go to homepage"
            >
              <img
                src={brand.logo}
                alt={brand.logoAlt}
                width={40}
                height={40}
              />
              <span
                className="ml-3 text-2xl font-bold tracking-tight"
                style={{ color: colors.primary }}
              >
                {brand.title}
              </span>
            </Link>
            <div className="flex items-center gap-4"></div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
