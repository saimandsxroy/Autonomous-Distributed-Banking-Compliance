import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  XCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ArrowLeftRight,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  fetchRecentTransactions,
  parseTransactionDate,
  transferFunds,
} from "../../services/dashboard";

export function RecentTransactions({ isRevealed, activeAccount }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const targetAccountNumber = activeAccount?.accountNumber || user?.accountNumber;

  const loadTransactions = useCallback(async () => {
    if (!targetAccountNumber) return;
    setIsLoading(true);
    try {
      const data = await fetchRecentTransactions(targetAccountNumber);
      setTransactions(Array.isArray(data) ? data.slice(0, 7) : []);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [targetAccountNumber]);

  useEffect(() => {
    loadTransactions();

    const handleRefresh = () => loadTransactions();
    window.addEventListener("runestone_transfer_settled", handleRefresh);
    window.addEventListener("foureyes_transfer_settled", handleRefresh);
    window.addEventListener("runestone_persona_changed", handleRefresh);
    window.addEventListener("foureyes_persona_changed", handleRefresh);

    return () => {
      window.removeEventListener("runestone_transfer_settled", handleRefresh);
      window.removeEventListener("foureyes_transfer_settled", handleRefresh);
      window.removeEventListener("runestone_persona_changed", handleRefresh);
      window.removeEventListener("foureyes_persona_changed", handleRefresh);
    };
  }, [loadTransactions]);

  const handleRunSampleFlow = async () => {
    if (!targetAccountNumber) return;
    setIsSeeding(true);
    try {
      const targetCounterparty =
        targetAccountNumber === "AC-4BE19A42A8DC"
          ? "AC-69D1D364271B"
          : "AC-4BE19A42A8DC";

      await transferFunds({
        sender: targetAccountNumber,
        receiver: targetCounterparty,
        amount: 250.0,
      });

      window.dispatchEvent(new CustomEvent("foureyes_transfer_settled"));
      await loadTransactions();
    } catch (err) {
      console.error("Sample flow execution failed:", err);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="h-full bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-semibold text-lg text-[#F3F1EC] tracking-[-0.02em]">
                Live Double-Entry Feed
              </h3>
              <p className="font-mono text-[11px] text-[#7A7D82] mt-0.5">
                Real-time debit / credit journal stream
              </p>
            </div>
            {transactions.length > 0 && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-[#8CB0DB] border border-white/10 uppercase">
                {transactions.length} entries
              </span>
            )}
          </div>

          <button
            onClick={loadTransactions}
            className={`p-2 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.06] text-[#8E929B] hover:text-white transition-all ${
              isLoading ? "animate-spin text-[#38BDF8]" : ""
            }`}
            title="Refresh transaction stream"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Content Stream */}
        <div className="pt-2 min-h-[260px]">
          {isLoading && transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-56 text-[#7A7D82] font-mono text-xs gap-3">
              <RefreshCw size={24} className="animate-spin text-[#38BDF8]" />
              <span>Fetching cryptographic journal entries...</span>
            </div>
          ) : transactions.length === 0 ? (
            /* Executive Empty State */
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20 flex items-center justify-center mb-3">
                <ArrowLeftRight size={22} />
              </div>
              <h4 className="text-sm font-semibold text-[#F3F1EC]">
                No Journal Entries on this Account Yet
              </h4>
              <p className="text-xs text-[#7A7D82] font-mono max-w-sm mt-1 mb-5">
                Execute an instant internal transfer or run a sample treasury flow to populate balanced double-entry legs.
              </p>
              <button
                type="button"
                onClick={handleRunSampleFlow}
                disabled={isSeeding}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 hover:border-[#38BDF8]/40 text-xs font-mono font-medium text-[#F3F1EC] transition-all flex items-center gap-2 group"
              >
                {isSeeding ? (
                  <RefreshCw size={14} className="animate-spin text-[#38BDF8]" />
                ) : (
                  <Sparkles size={14} className="text-[#38BDF8] group-hover:scale-110 transition-transform" />
                )}
                <span>Run Sample Treasury Flow ($250)</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {transactions.map((tx) => (
                <TransactionRow
                  key={tx.transactionId || tx.id || Math.random()}
                  transaction={tx}
                  isRevealed={isRevealed}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 mt-4 border-t border-white/[0.05] flex items-center justify-between text-[10px] font-mono text-[#6E737D]">
        <span>IMMUTABLE JOURNAL REPLICATION</span>
        <span className="text-emerald-400">● 100% BALANCED</span>
      </div>
    </div>
  );
}

function TransactionRow({ transaction, isRevealed }) {
  const isPositive = transaction.transactionType === "CREDIT";
  const amountPrefix = isPositive ? "+" : "-";
  const parsedDate = parseTransactionDate(transaction.timeOfCreation);

  const getStatusBadge = () => {
    switch (transaction.status) {
      case "SUCCESS":
      case "SETTLED":
        return (
          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-emerald-400" />
            SETTLED
          </span>
        );
      case "PENDING":
      case "PENDING_CHECKER":
        return (
          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
            PENDING
          </span>
        );
      case "AML_FLAGGED":
      case "FAILED":
        return (
          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-rose-400" />
            FLAGGED
          </span>
        );
      default:
        return (
          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-[#8E929B] border border-white/10 uppercase">
            {transaction.status || "POSTED"}
          </span>
        );
    }
  };

  const titleText =
    transaction.transactionType === "TRANSFER" && transaction.counterpartyName
      ? `Wire to ${transaction.counterpartyName}`
      : transaction.transactionType === "CREDIT" && transaction.counterpartyName
        ? `Inbound from ${transaction.counterpartyName}`
        : transaction.transactionType === "TRANSFER"
          ? "Outbound Transfer"
          : transaction.transactionType === "CREDIT"
            ? "Inbound Credit Settlement"
            : transaction.transactionType || "Ledger Entry";

  return (
    <div className="py-3.5 flex items-center justify-between group/row hover:bg-white/[0.015] px-2 rounded-xl transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
            isPositive
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-white/[0.03] text-[#8CB0DB] border-white/[0.08]"
          }`}
        >
          {isPositive ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h5 className="font-medium text-xs sm:text-sm text-[#F3F1EC] group-hover/row:text-white truncate">
              {titleText}
            </h5>
            {getStatusBadge()}
          </div>

          <div className="flex items-center gap-2 text-[10.5px] font-mono text-[#7A7D82] mt-0.5">
            <span>{parsedDate.toLocaleDateString()}</span>
            <span>•</span>
            <span className="truncate max-w-[120px] text-[#6E737D]">
              {transaction.transactionId || "TX-POSTED"}
            </span>
          </div>
        </div>
      </div>

      <div className="text-right shrink-0 pl-3">
        <div
          className={`font-['JetBrains_Mono',monospace] text-sm sm:text-base font-semibold tracking-tight ${
            isPositive ? "text-emerald-400" : "text-[#F3F1EC]"
          } transition-all duration-300 ${!isRevealed ? "blur-md select-none opacity-40" : ""}`}
        >
          {amountPrefix}${Number(transaction.amount || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
        <div className="font-mono text-[9.5px] text-[#6E737D] mt-0.5">
          {isPositive ? "CR LEG" : "DR LEG"}
        </div>
      </div>
    </div>
  );
}
