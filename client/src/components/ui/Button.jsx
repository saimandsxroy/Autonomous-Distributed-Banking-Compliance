import React from "react";
import { cn } from "@/lib/utils";

export const Button = React.forwardRef(
  ({ className, variant = "primary", size = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-mono font-medium uppercase tracking-wider text-xs rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none";

    const sizes = {
      default: "px-5 py-2.5 min-h-[42px]",
      sm: "px-3.5 py-1.5 min-h-[34px] text-[11px]",
      lg: "px-6 py-3.5 min-h-[48px] text-sm",
      icon: "w-10 h-10 p-0",
    };

    const variants = {
      primary:
        "bg-gradient-to-r from-[#38BDF8] to-[#0284C7] hover:from-[#60A5FA] hover:to-[#2563EB] text-[#06080C] font-semibold shadow-[0_0_20px_rgba(56,189,248,0.25)] hover:shadow-[0_0_25px_rgba(56,189,248,0.4)]",
      secondary:
        "bg-white/[0.04] hover:bg-white/[0.08] text-[#F3F1EC] border border-white/10 hover:border-white/20",
      destructive:
        "bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]",
      outline:
        "bg-transparent text-[#9CA3AF] hover:text-white border border-white/10 hover:border-white/25 hover:bg-white/[0.04]",
      ghost:
        "bg-transparent text-[#9CA3AF] hover:text-white hover:bg-white/[0.05]",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, sizes[size] || sizes.default, variants[variant] || variants.primary, className)}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
