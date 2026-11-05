import React from "react";
import { Link } from "react-router-dom";

/**
 * FourEyes Institutional Brand Logo
 * Features the official FourEyes Neon Shield Mark + Precision Typography
 */
export function BrandLogo({
  size = "md",
  showBadge = true,
  to = "/dashboard",
  className = "",
  compact = false,
}) {
  const isSm = size === "sm";
  const isLg = size === "lg";

  const imgDimensions = isSm ? "w-7 h-7" : isLg ? "w-10 h-10" : "w-8 h-8";

  const content = (
    <div className={`flex items-center gap-3 select-none group ${className}`}>
      {/* Official FourEyes Shield Logo Mark */}
      <div className="relative shrink-0 flex items-center justify-center">
        <img
          src="/logo.png"
          alt="FourEyes Mark"
          className={`${imgDimensions} rounded-lg object-contain drop-shadow-[0_0_12px_rgba(56,189,248,0.4)] transition-transform duration-300 group-hover:scale-105`}
        />
      </div>

      {!compact && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span
              className={`font-semibold tracking-[-0.03em] text-[#F3F1EC] group-hover:text-white transition-colors font-['Plus_Jakarta_Sans',sans-serif] ${
                isSm ? "text-base" : isLg ? "text-2xl" : "text-lg"
              }`}
            >
              Four<span className="text-[#38BDF8]">Eyes</span>
            </span>
            {showBadge && (
              <span className="font-mono text-[9px] tracking-[0.16em] uppercase text-[#8CB0DB] bg-white/[0.04] border border-white/10 px-1.5 py-0.5 rounded leading-none">
                CORE
              </span>
            )}
          </div>
          <span className="font-mono text-[9px] tracking-[0.2em] text-[#6E737D] uppercase leading-none mt-0.5">
            AUTONOMOUS BANKING
          </span>
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="inline-block focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
