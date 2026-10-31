import React from "react";
import { Lock, ShieldAlert, ShieldCheck, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function DoubleEntryBucketsCard({
  account,
  isRevealed = true,
  onOpenCompliance,
}) {
  const navigate = useNavigate();

  const isFrozen = account?.status === "FROZEN_AML";
  const posted = account?.postedBalance ?? 0;
  const available = account?.availableBalance ?? 0;
  const held = account?.heldBalance ?? 0;

  const handleNavigate = () => {
    if (onOpenCompliance) {
      onOpenCompliance();
    } else {
      navigate("/compliance");
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <span className="text-xs font-mono font-bold uppercase text-zinc-400">
          Account #{account?.id || "—"} ({account?.accountNumber || "..."})
        </span>
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border ${
            isFrozen
              ? "bg-rose-950 text-rose-300 border-rose-600 animate-pulse"
              : "bg-emerald-950 text-emerald-300 border-emerald-600"
          }`}
        >
          {isFrozen ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
          {isFrozen ? "FROZEN_AML PROTOCOL" : "ACCOUNT ACTIVE"}
        </span>
      </div>

      {/* 3 Balance Buckets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bucket 1: Posted Balance */}
        <div className="p-4 bg-zinc-950 border-2 border-zinc-800 rounded-lg">
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
            1. Posted Ledger Total
          </div>
          <div
            className={`text-2xl md:text-3xl font-black mt-1 text-white tracking-tight ${
              !isRevealed ? "blur-md select-none opacity-50" : ""
            }`}
          >
            $
            {posted.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-[10px] font-mono text-zinc-500 mt-1">
            Book Value = Available + Held
          </div>
        </div>

        {/* Bucket 2: Available Balance */}
        <div className="p-4 bg-zinc-950 border-2 border-emerald-900/60 rounded-lg">
          <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
            2. Available (Spendable)
          </div>
          <div
            className={`text-2xl md:text-3xl font-black mt-1 text-emerald-400 tracking-tight ${
              !isRevealed ? "blur-md select-none opacity-50" : ""
            }`}
          >
            $
            {available.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-[10px] font-mono text-emerald-600 mt-1">
            Free of Encumbrances
          </div>
        </div>

        {/* Bucket 3: Held / Escrowed Balance */}
        <div className="p-4 bg-zinc-950 border-2 border-amber-900/60 rounded-lg">
          <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">
            3. Held / Escrowed
          </div>
          <div
            className={`text-2xl md:text-3xl font-black mt-1 text-amber-400 tracking-tight ${
              !isRevealed ? "blur-md select-none opacity-50" : ""
            }`}
          >
            $
            {held.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-[10px] font-mono text-amber-600 mt-1">
            Intercepted AML & Velocity Holds
          </div>
        </div>
      </div>

      {/* Invariant Verification */}
      <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-zinc-300">
          <Lock size={14} className="text-ochre-800 shrink-0" />
          <span>
            Invariant: <span className="text-white font-bold">${posted.toFixed(2)}</span> ={" "}
            <span className="text-emerald-400 font-bold">${available.toFixed(2)}</span> +{" "}
            <span className="text-amber-400 font-bold">${held.toFixed(2)}</span>
          </span>
        </div>

        <button
          onClick={handleNavigate}
          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-ochre-500 hover:text-white rounded border border-zinc-700 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 transition-colors shrink-0"
        >
          <span>Open AML Compliance Command</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

