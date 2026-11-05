import React from "react";
import { Lock, ShieldAlert, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function DoubleEntryBucketsCard({
  account,
  isRevealed = true,
  onOpenCompliance,
}) {
  const navigate = useNavigate();

  const isFrozen = account?.status === "FROZEN_AML";
  const posted = Number(account?.postedBalance ?? 0);
  const available = Number(account?.availableBalance ?? 0);
  const held = Number(account?.heldBalance ?? 0);

  // Compute percentages for the visual liquidity bar
  const total = posted > 0 ? posted : (available + held) > 0 ? (available + held) : 1;
  const availablePct = Math.min(100, Math.max(0, (available / total) * 100));
  const heldPct = Math.min(100, Math.max(0, (held / total) * 100));

  const handleNavigate = () => {
    if (onOpenCompliance) {
      onOpenCompliance();
    } else {
      navigate("/compliance");
    }
  };

  const formatCurrency = (val) => {
    return val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="space-y-4">
      {/* 3-Bucket Glass Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bucket 1: Posted Book Value */}
        <div className="p-5 bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.16] rounded-2xl transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-[#8CB0DB] font-semibold">
              1. Posted Book Value
            </span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-[#8E929B] border border-white/10 uppercase">
              Gross Equity
            </span>
          </div>

          <div className="mt-3">
            <div
              className={`font-['JetBrains_Mono',monospace] text-2xl lg:text-3xl font-semibold tracking-tight text-[#F3F1EC] transition-all duration-300 ${
                !isRevealed ? "blur-md select-none opacity-40" : ""
              }`}
            >
              <span className="text-[#8E929B] text-lg font-normal mr-1">$</span>
              {formatCurrency(posted)}
            </div>
            <div className="text-[11px] text-[#7A7D82] font-mono mt-1">
              Book Total = Available + Held
            </div>
          </div>

          {/* Hairline Bottom Glow */}
          <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-[#38BDF8]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Bucket 2: Available Liquidity */}
        <div className="p-5 bg-[#0C1017]/90 backdrop-blur-xl border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-emerald-400 font-semibold">
              2. Available (Spendable)
            </span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 uppercase flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-400" />
              Unencumbered
            </span>
          </div>

          <div className="mt-3">
            <div
              className={`font-['JetBrains_Mono',monospace] text-2xl lg:text-3xl font-semibold tracking-tight text-emerald-400 transition-all duration-300 ${
                !isRevealed ? "blur-md select-none opacity-40" : ""
              }`}
            >
              <span className="text-emerald-500/60 text-lg font-normal mr-1">$</span>
              {formatCurrency(available)}
            </div>
            <div className="text-[11px] text-emerald-500/70 font-mono mt-1">
              Free Working Capital • Line Speed
            </div>
          </div>

          <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Bucket 3: Held in Escrow */}
        <div className="p-5 bg-[#0C1017]/90 backdrop-blur-xl border border-amber-500/20 hover:border-amber-500/40 rounded-2xl transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-amber-400 font-semibold">
              3. Held in Escrow
            </span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase flex items-center gap-1">
              {held > 0 ? (
                <>
                  <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                  Active Holds
                </>
              ) : (
                "Zero Encumbered"
              )}
            </span>
          </div>

          <div className="mt-3">
            <div
              className={`font-['JetBrains_Mono',monospace] text-2xl lg:text-3xl font-semibold tracking-tight text-amber-400 transition-all duration-300 ${
                !isRevealed ? "blur-md select-none opacity-40" : ""
              }`}
            >
              <span className="text-amber-500/60 text-lg font-normal mr-1">$</span>
              {formatCurrency(held)}
            </div>
            <div className="text-[11px] text-amber-500/70 font-mono mt-1">
              Dual-Control HITL & AML Cycle Traps
            </div>
          </div>

          <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Visual Liquidity Allocation Bar & Invariant Strip */}
      <div className="p-4 bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl space-y-3">
        {/* Segmented Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-mono text-[#8E929B]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Available Capital: <span className="text-emerald-400 font-bold">{availablePct.toFixed(1)}%</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Held in Escrow: <span className="text-amber-400 font-bold">{heldPct.toFixed(1)}%</span>
            </span>
          </div>

          <div className="w-full h-2.5 bg-white/[0.04] rounded-full overflow-hidden flex p-0.5 border border-white/[0.06]">
            <div
              style={{ width: `${availablePct}%` }}
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-l-full transition-all duration-500"
              title={`Available: ${availablePct.toFixed(1)}%`}
            />
            <div
              style={{ width: `${heldPct}%` }}
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-r-full transition-all duration-500"
              title={`Held: ${heldPct.toFixed(1)}%`}
            />
          </div>
        </div>

        {/* Mathematical Invariant Equation & Quick Link */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/[0.05] text-xs font-mono">
          <div className="flex items-center gap-2 text-[#8E929B] overflow-x-auto">
            <Lock size={13} className="text-[#38BDF8] shrink-0" />
            <span className="whitespace-nowrap">
              INVARIANT:{" "}
              <span className="text-[#F3F1EC] font-semibold">${formatCurrency(posted)}</span>
              {" = "}
              <span className="text-emerald-400 font-semibold">${formatCurrency(available)}</span>
              {" + "}
              <span className="text-amber-400 font-semibold">${formatCurrency(held)}</span>
            </span>
            <span className="text-emerald-400/90 text-[11px] ml-1">
              [● ZERO-SUM VERIFIED]
            </span>
          </div>

          <button
            onClick={handleNavigate}
            className="px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-[#8CB0DB] hover:text-white border border-white/10 text-[11px] font-mono font-medium flex items-center gap-1.5 transition-all duration-200 shrink-0 self-start sm:self-auto"
          >
            <span>Open AML Compliance Desk</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
