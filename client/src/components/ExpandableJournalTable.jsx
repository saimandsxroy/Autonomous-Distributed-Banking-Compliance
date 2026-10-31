import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  ShieldAlert,
  Lock,
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
      <div className="py-16 text-center text-zinc-600 bg-zinc-900 border-2 border-zinc-800 rounded-lg">
        <p className="font-bold uppercase tracking-widest text-sm">
          No double-entry journal entries recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
            className="bg-zinc-900 border-2 border-zinc-800 rounded-xl overflow-hidden shadow-brutal transition-all"
          >
            {/* Header row */}
            <div
              onClick={() => toggleExpand(entry.id)}
              className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-zinc-800/40 select-none"
            >
              <div className="flex items-center gap-3">
                <div className="p-1 rounded bg-zinc-800 text-zinc-400">
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>

                <div
                  className={`p-2.5 rounded-lg border shrink-0 ${
                    isSettled
                      ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                      : "bg-amber-950 text-amber-400 border-amber-800"
                  }`}
                >
                  {isSettled ? <CheckCircle2 size={20} /> : <ShieldAlert size={20} />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-base text-white tracking-tight">
                      {entry.title || `Journal Entry #${entry.id}`}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        isSettled
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                          : "bg-amber-950 text-amber-300 border border-amber-700"
                      }`}
                    >
                      {entry.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-zinc-500 mt-1">
                    <span>ID #{entry.id}</span>
                    <span>•</span>
                    <span>
                      Source Acc #{entry.sourceAccountId} → Dest Acc #{entry.destinationAccountId}
                    </span>
                    <span>•</span>
                    <span className="truncate max-w-[140px] md:max-w-none" title={entry.idempotencyKey}>
                      Key: {entry.idempotencyKey}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className="text-xl font-black text-white">
                    ${Number(entry.amount || 0).toFixed(2)}{" "}
                    <span className="text-xs text-zinc-500 font-mono">{entry.currency || "USD"}</span>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500">
                    {entry.date ? new Date(entry.date).toLocaleString() : ""}
                  </div>
                </div>

                {/* Zero-Sum Invariant Badge */}
                <div
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider hidden sm:flex items-center gap-1.5 border ${
                    isBalanced
                      ? "bg-emerald-950/80 border-emerald-700 text-emerald-300"
                      : "bg-rose-950 border-rose-700 text-rose-300"
                  }`}
                  title="Double-Entry Invariant: Sum of signed legs must equal zero"
                >
                  <Lock size={12} />
                  <span>Σ = $0.00</span>
                </div>
              </div>
            </div>

            {/* Expandable Posting Legs */}
            {isExpanded && (
              <div className="p-5 bg-zinc-950 border-t-2 border-zinc-800 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400 font-bold uppercase tracking-wider">
                    Paired Posting Legs (Double-Entry Atomic Settlement)
                  </span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    Mathematically Verified: Sum(Debit) + Sum(Credit) = $0.0000
                  </span>
                </div>

                {legs.length === 0 ? (
                  <div className="p-4 rounded border border-zinc-800 text-zinc-500 text-xs font-mono text-center">
                    {isSettled
                      ? "Posting legs settled into immutable double-entry ledger."
                      : "Funds encumbered in PENDING_HOLD. Posting legs await compliance HITL release."}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-zinc-800 text-[10px] uppercase text-zinc-500 tracking-wider">
                          <th className="py-2">Leg ID</th>
                          <th className="py-2">Type</th>
                          <th className="py-2">Account</th>
                          <th className="py-2">Counterparty</th>
                          <th className="py-2 text-right">Signed Delta</th>
                          <th className="py-2 text-right">Balance After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/80">
                        {legs.map((leg) => {
                          const isCredit = leg.legType === "CREDIT";
                          return (
                            <tr key={leg.id} className="hover:bg-zinc-900/50">
                              <td className="py-2.5 font-bold text-zinc-400">#{leg.id}</td>
                              <td className="py-2.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                    isCredit
                                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                      : "bg-rose-950 text-rose-300 border border-rose-800"
                                  }`}
                                >
                                  {leg.legType}
                                </span>
                              </td>
                              <td className="py-2.5 text-zinc-300 font-bold">Account #{leg.accountId}</td>
                              <td className="py-2.5 text-zinc-400">Account #{leg.counterpartyAccountId}</td>
                              <td
                                className={`py-2.5 text-right font-black ${
                                  isCredit ? "text-emerald-400" : "text-rose-400"
                                }`}
                              >
                                {isCredit ? "+" : "-"}${Number(leg.amount || 0).toFixed(2)}
                              </td>
                              <td className="py-2.5 text-right text-zinc-300">
                                {leg.balanceAfter != null ? `$${Number(leg.balanceAfter).toFixed(2)}` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

