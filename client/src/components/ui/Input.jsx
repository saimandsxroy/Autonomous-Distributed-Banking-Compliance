import React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full border border-white/10 bg-[#06080C] px-3.5 py-2 text-xs font-mono text-white rounded-xl placeholder:text-[#6E737D] focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8] focus:outline-none transition-all disabled:cursor-not-allowed disabled:opacity-50 scheme-dark",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";
