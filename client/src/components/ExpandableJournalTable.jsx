import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  ShieldAlert,
  Lock,
  ArrowRight,
} from "lucide-react";

export function ExpandableJournalTable({ entries = [] }) {
  const [expanded, setExpanded] = useState(() => {
    if (entries.length > 0) {
      return { [entries[0].id]: true };
    }
    return {};
  });

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!entries || entries.length === 0) {
    return (
      <div className="py-16 text-center text-[#7A7D82] bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl">
        <p className="font-mono text-xs uppercase tracking-wider">
          No double-entry journal entries recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 font-['Plus_Jakarta_Sans',sans-serif]">
      {entries.map((entry) => {
        const isExpanded = !!expanded[entry.id];
        const isSettled = entry.status === "SETTLED";
        const legs = entry.postingLegs || [];

        const sumSigned = legs.reduce(
          (acc, l) =>
            acc + (l.signedAmount ?? (l.legType === "CREDIT" ? l.amount : -l.amount)),
          0
        );
        const isBalanced = Math.abs(sumSigned) < 0.0001;

        return (
          <div
            key={entry.id}
            className="bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-2xl overflow-hidden transition-all duration-200"
          >
            {/* Header Row */}
            <div
              onClick={() => toggleExpand(entry.id)}
              className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] select-none transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-1 rounded-lg bg-white/[0.04] text-[#8E929B] group-hover:text-white transition-colors">
                  {isExpanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                </div>

                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    isSettled
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}
                >
                  {isSettled ? <CheckCircle2 size={18} /> : <ShieldAlert size={18} />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm sm:text-base text-[#F3F1EC] tracking-tight">
                      {entry.title || `Journal Entry #${entry.id}`}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded text-[9.5px] font-mono uppercase tracking-wider font-medium border ${
                        isSettled
                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {entry.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#7A7D82] mt-1">
                    <span>Journal #{entry.id}</span>
                    <span>•</span>
                    <span>
                      Acc #{entry.sourceAccountId} → Acc #{entry.destinationAccountId}
                    </span>
                    <span>•</span>
                    <span className="truncate max-w-[140px] md:max-w-none text-[#6E737D]" title={entry.idempotencyKey}>
                      Key: {entry.idempotencyKey}
                    </span>
                  </div>
                </div>
              </div>
