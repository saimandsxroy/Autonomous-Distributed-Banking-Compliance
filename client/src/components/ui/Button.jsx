import React from "react";
import { cn } from "@/lib/utils";

export const Button = React.forwardRef(
  ({ className, variant = "primary", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-bold uppercase transition-transform active:translate-y-brutal-sm active:translate-x-brutal-sm active:shadow-none border-4 border-black px-6 py-3";

    const variants = {
      primary:
        "bg-primary text-primary-foreground shadow-brutal hover:bg-primary/90",
      secondary:
        "bg-secondary text-secondary-foreground shadow-brutal hover:bg-secondary/90",
      destructive:
        "bg-destructive text-destructive-foreground shadow-brutal hover:bg-destructive/90",
      outline: "bg-white text-black shadow-brutal hover:bg-gray-100",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

