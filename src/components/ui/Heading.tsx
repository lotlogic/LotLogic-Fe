import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type HeadingSize = "h0" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export type HeadingTag = Exclude<HeadingSize, "h0"> | "p" | "span" | "div";

export type TypeHeading = ComponentProps<"h1" | "p" | "span" | "div"> & {
  size?: HeadingSize;
  tag?: HeadingTag;
  text?: string;
  className?: string;
  children?: React.ReactNode;
};

export const Heading = ({
  tag = "p",
  size = "h2",
  text,
  className,
  children,
}: TypeHeading) => {
  const getHeadingClass = (size: string) => {
    const sizeClasses: Record<string, string> = {
      h1: "text-4xl font-bold mb-4 text-balanced",
      h2: "text-3xl font-bold mb-4",
      h3: "text-2xl font-bold mb-4",
      h4: "text-xl font-normal mb-2",
      h5: "text-lg font-semibold mb-2",
      h6: "text-md font-semibold mb-2",
    };
    return sizeClasses[size] || "text-md font-normal";
  };

  const classes = cn([
    getHeadingClass(size),
    "last:mb-0 text-balance",
    className,
  ]);

  const content = children ? children : text;

  if (tag === "h1") return <h1 className={classes}>{content}</h1>;
  if (tag === "h2") return <h2 className={classes}>{content}</h2>;
  if (tag === "h3") return <h3 className={classes}>{content}</h3>;
  if (tag === "h4") return <h4 className={classes}>{content}</h4>;
  if (tag === "h5") return <h5 className={classes}>{content}</h5>;
  if (tag === "h6") return <h6 className={classes}>{content}</h6>;
  if (tag === "div") return <div className={classes}>{content}</div>;
  if (tag === "span") return <span className={classes}>{content}</span>;
  return <p className={classes}>{content}</p>;
};

export default Heading;
