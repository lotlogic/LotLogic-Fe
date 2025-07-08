import { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

const PRIMARY_COLOR = "#2F5D62";
const PRIMARY_COLOR_HOVER = "#24484c";
const PRIMARY_COLOR_DISABLED = "#2F5D62B3"; // 70% opacity

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
  let style: React.CSSProperties | undefined = undefined;
  if (isPrimary) {
    style = {
      backgroundColor: disabled || loading ? PRIMARY_COLOR_DISABLED : PRIMARY_COLOR,
    };
  }
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded px-4 py-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
        {
          "text-white": isPrimary,
          "bg-white text-primary-btn border border-primary-btn hover:bg-primary-btn/10": variant === "outline",
          "bg-gray-100 text-gray-800 hover:bg-gray-200": variant === "secondary",
          "bg-transparent text-primary-btn hover:bg-primary-btn/10": variant === "ghost",
          "opacity-70 cursor-not-allowed": loading || disabled,
        },
        className
      )}
      style={style}
      disabled={loading || disabled}
      onMouseOver={e => {
        if (isPrimary && !(loading || disabled)) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY_COLOR_HOVER;
        }
      }}
      onMouseOut={e => {
        if (isPrimary && !(loading || disabled)) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY_COLOR;
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
