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
