import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";

export type ButtonProps = ComponentProps<"button"> & {
  label: string;
  variant?: ButtonVariant;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  iconOnly?: boolean;
  loading?: boolean;
};

export const Button = (props: ButtonProps) => {
  const {
    label,
    leftIcon,
    rightIcon,
    iconOnly,
    variant = "primary",
    loading = false,
    disabled = false,
    children,
    className,
    ...rest
  } = props;

  const baseClasses = [
    "relative",
    "inline-flex",
    "items-center",
    "justify-center",
    "gap-2",
    "font-medium",
    "px-4",
    "py-2",
    "border",
    "border-transparent",
    "rounded",
    "transition-colors",
    "duration-200",
    "outline-primary",
    "outline-offset-2",
    "focus-visible:outline-2",
    "disabled:opacity-70",
    "disabled:cursor-not-allowed",
    "data-[loading]:text-transparent!",
  ];

  const buttonClasses: Record<ButtonVariant, string[]> = {
    primary: [
      "text-white",
      "bg-primary",
      "outline-primary",
      "disabled:bg-primary",
      "hover:bg-primary-hover",
      "focus-visible:bg-primary-hover",
    ],
    secondary: [
      "text-brand",
      "bg-brand-muted",
      "outline-[var(--color-border)]",
      "disabled:bg-brand-muted",
      "hover:bg-brand",
      "focus-visible:bg-brand",
    ],
    outline: [
      "bg-primary",
      "bg-brand",
      "border-primary",
      "disabled:bg-brand",
      "hover:text-white",
      "hover:bg-primary",
      "focus-visible:text-white",
      "focus-visible:bg-primary",
    ],
    ghost: [
      "bg-primary",
      "bg-transparent",
      "border-primary",
      "disabled:bg-transparent",
      "hover:text-white",
      "hover:bg-primary",
      "focus-visible:text-white",
      "focus-visible:bg-primary",
    ],
  };

  return (
    <button
      className={cn(...baseClasses, ...buttonClasses[variant], className)}
      disabled={loading || disabled}
      data-loading={loading || undefined}
      {...rest}
    >
      {loading && (
        <span
          className={cn([
            "absolute animate-spin size-5 border-2 border-white rounded-full",
            { "border-gray-800": variant === "secondary" },
            {
              "border-primary": variant === "outline" || variant === "ghost",
            },
            "border-t-transparent",
          ])}
        />
      )}
      {leftIcon}
      {label}
      {rightIcon}
    </button>
  );
};

export default Button;
