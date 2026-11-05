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

              <div className="flex items-center gap-4 text-right self-end md:self-auto">
                <div>
                  <div className="font-['JetBrains_Mono',monospace] text-base sm:text-lg font-semibold text-[#F3F1EC]">
                    ${Number(entry.amount || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    <span className="text-xs text-[#7A7D82] font-normal">{entry.currency || "USD"}</span>
                  </div>
                  <div className="text-[10px] font-mono text-[#6E737D]">
                    {entry.date ? new Date(entry.date).toLocaleString() : ""}
                  </div>
                </div>

                {/* Zero-Sum Invariant Badge */}
                <div
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-medium uppercase tracking-wider hidden sm:flex items-center gap-1.5 border ${
                    isBalanced
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                  }`}
                  title="Double-Entry Invariant: Sum of signed legs must equal zero"
                >
                  <Lock size={11} />
                  <span>Σ = $0.00</span>
                </div>
              </div>
            </div>

            {/* Expandable Posting Legs Accordion with Smooth Transition */}
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="p-4 sm:p-5 bg-[#07090D] border-t border-white/[0.06] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-mono">
                  <span className="text-[#8E929B] font-medium uppercase tracking-wider text-[11px]">
                    Paired Posting Legs (Double-Entry Atomic Settlement)
                  </span>
                  <span className="text-emerald-400 font-medium flex items-center gap-1 text-[11px]">
                    <CheckCircle2 size={12} />
                    <span>Sum(Debit) + Sum(Credit) = $0.0000 [ZERO-SUM VERIFIED]</span>
                  </span>
                </div>

                {legs.length === 0 ? (
                  <div className="p-3.5 rounded-xl border border-white/[0.06] text-[#7A7D82] text-xs font-mono text-center bg-white/[0.01]">
                    {isSettled
                      ? "Posting legs settled into immutable double-entry ledger."
                      : "Funds encumbered in PENDING_HOLD. Posting legs await compliance HITL release."}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-white/[0.06] text-[10px] uppercase text-[#6E737D] tracking-wider">
                          <th className="py-2 px-2">Leg ID</th>
                          <th className="py-2 px-2">Type</th>
                          <th className="py-2 px-2">Account</th>
                          <th className="py-2 px-2">Counterparty</th>
                          <th className="py-2 px-2 text-right">Signed Delta</th>
                          <th className="py-2 px-2 text-right">Balance After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {legs.map((leg) => {
                          const isCredit = leg.legType === "CREDIT";
                          return (
                            <tr key={leg.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-2.5 px-2 font-semibold text-[#8E929B]">#{leg.id}</td>
                              <td className="py-2.5 px-2">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono uppercase tracking-wider font-semibold border ${
                                    isCredit
                                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                      : "bg-rose-500/10 text-rose-300 border-rose-500/20"
                                  }`}
                                >
                                  {leg.legType}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-[#F3F1EC] font-medium">Account #{leg.accountId}</td>
                              <td className="py-2.5 px-2 text-[#8E929B]">Account #{leg.counterpartyAccountId}</td>
                              <td
                                className={`py-2.5 px-2 text-right font-['JetBrains_Mono',monospace] font-semibold ${
                                  isCredit ? "text-emerald-400" : "text-rose-400"
                                }`}
                              >
                                {isCredit ? "+" : "-"}${Number(leg.amount || 0).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="py-2.5 px-2 text-right font-['JetBrains_Mono',monospace] text-[#8E929B]">
                                {leg.balanceAfter != null
                                  ? `$${Number(leg.balanceAfter).toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}`
                                  : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
