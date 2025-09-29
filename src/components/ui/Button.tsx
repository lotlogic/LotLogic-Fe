// Button.tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils"; // use cn (clsx + tailwind-merge)
import { colors } from "@/constants/content";

const BRAND = {
  base: colors.primary,
  hover: colors.accent,
  disabled: `${colors.primary}B3`,
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  loading = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const isPrimary = variant === "primary";
  const isOutline = variant === "outline";

  let style: React.CSSProperties | undefined = undefined;

  if (isPrimary) {
    style = { backgroundColor: disabled || loading ? BRAND.disabled : BRAND.base, color: "#fff" };
  }

  if (isOutline) {
    style = {
      ...style,
      backgroundColor: "#fff",
      color: BRAND.base,
      borderColor: BRAND.base,
      borderWidth: 1,
      borderStyle: "solid",
    };
  }

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded px-4 py-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
        {
          "text-white": isPrimary,
          // keep outline neutral; let inline styles + your className control colors
          "bg-white": isOutline,
          "bg-gray-100 text-gray-800 hover:bg-gray-200": variant === "secondary",
          "bg-transparent": variant === "ghost",
          "opacity-70 cursor-not-allowed": loading || disabled,
        },
        className
      )}
      style={style}
      disabled={loading || disabled}
      onMouseOver={(e) => {
        if (loading || disabled) return;
        if (isPrimary) {
          e.currentTarget.style.backgroundColor = BRAND.hover;
        }
        if (isOutline) {
          e.currentTarget.style.backgroundColor = BRAND.base;
          e.currentTarget.style.color = "#fff";
          e.currentTarget.style.borderColor = BRAND.base;
        }
      }}
      onMouseOut={(e) => {
        if (loading || disabled) return;
        if (isPrimary) {
          e.currentTarget.style.backgroundColor = BRAND.base;
        }
        if (isOutline) {
          e.currentTarget.style.backgroundColor = "#fff";
          e.currentTarget.style.color = BRAND.base;
          e.currentTarget.style.borderColor = BRAND.base;
        }
      }}
      {...props}
    >
      {loading ? (
        <span className="animate-spin h-5 w-5 border-2 border-t-transparent border-white rounded-full" />
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  );
}
