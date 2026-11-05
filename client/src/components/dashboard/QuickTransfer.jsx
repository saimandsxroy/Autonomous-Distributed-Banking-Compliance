import React, { useState } from "react";
import { Send, CheckCircle2, AlertCircle, ArrowRight, Zap, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { transferFunds } from "../../services/dashboard";

const COUNTERPARTY_PRESETS = [
  { label: "Bob Jones", account: "AC-69D1D364271B" },
  { label: "Alice Smith", account: "AC-4BE19A42A8DC" },
  { label: "Charlie Day", account: "AC-2B1F918288D9" },
];

export function QuickTransfer({ isRevealed, activeAccount, onTransferSuccess }) {
  const { user } = useAuth();
  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  const senderAccount = activeAccount?.accountNumber || user?.accountNumber || "AC-4BE19A42A8DC";
  const availableBalance = Number(activeAccount?.availableBalance ?? user?.accountBalance ?? 0);

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!senderAccount) {
      setError("Sender account not identified.");
      return;
    }

    const transferAmount = parseFloat(amount);
    if (!transferAmount || transferAmount <= 0) {
      setError("Please enter a valid transfer amount.");
      return;
    }

    if (transferAmount > availableBalance && availableBalance > 0) {
      setError(`Amount exceeds spendable liquidity ($${availableBalance.toFixed(2)})`);
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      await transferFunds({
        sender: senderAccount,
        receiver: receiver.trim(),
        amount: transferAmount,
      });

      setSuccessMessage(`$${transferAmount.toFixed(2)} dispatched & settled instantly.`);
      setReceiver("");
      setAmount("");

      // Trigger refresh across dashboard
      window.dispatchEvent(new CustomEvent("runestone_transfer_settled"));
      window.dispatchEvent(new CustomEvent("foureyes_transfer_settled"));
      if (onTransferSuccess) onTransferSuccess();

      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Transfer failed. Please verify counterparty account."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAdd = (increment) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + increment).toFixed(2));
  };

  const handleMaxSpendable = () => {
    if (availableBalance > 0) {
      setAmount(availableBalance.toFixed(2));
    }
  };

  return (
    <div className="h-full bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div>
            <h3 className="font-semibold text-lg text-[#F3F1EC] tracking-[-0.02em]">
              Instant Internal Transfer
            </h3>
            <p className="font-mono text-[11px] text-[#7A7D82] mt-0.5">
              Sub-millisecond intra-ledger settlement
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20 flex items-center justify-center">
            <Zap size={16} />
          </div>
        </div>

        {/* Feedback Alerts */}
        {successMessage && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs font-mono text-emerald-300 animate-in fade-in duration-200">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span className="font-medium truncate">{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-xs font-mono text-rose-300 animate-in fade-in duration-200">
            <AlertCircle size={16} className="text-rose-400 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}

        <form onSubmit={handleTransfer} className="space-y-4 mt-5">
          {/* Recipient Account Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[11px] font-mono uppercase text-[#8E929B]">
              <span>Counterparty Account</span>
              <span className="text-[#6B7280]">AC-XXXXXXXXXXXX</span>
            </div>
            <input
              type="text"
              placeholder="e.g. AC-69D1D364271B"
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#07090D] border border-white/[0.08] focus:border-[#38BDF8] rounded-xl text-white placeholder-[#4B5563] font-mono text-sm tracking-wider focus:outline-none transition-colors"
              required
            />

            {/* Quick Counterparty Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {COUNTERPARTY_PRESETS.map((p) => (
                <button
                  key={p.account}
                  type="button"
                  onClick={() => setReceiver(p.account)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                    receiver === p.account
                      ? "bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]/40"
                      : "bg-white/[0.02] text-[#8E929B] border-white/[0.06] hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input & Quick Chips */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[11px] font-mono uppercase text-[#8E929B]">
              <span>Transfer Amount</span>
              <span className="text-emerald-400">
                Avail: ${availableBalance.toFixed(2)}
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A7D82] font-mono font-semibold text-base">
                $
              </span>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0.01"
                step="0.01"
                className={`w-full pl-8 pr-4 py-2.5 bg-[#07090D] border border-white/[0.08] focus:border-[#38BDF8] rounded-xl text-white placeholder-[#4B5563] font-['JetBrains_Mono',monospace] text-lg font-semibold tracking-tight focus:outline-none transition-all ${
                  !isRevealed ? "blur-md select-none" : ""
                }`}
                required
              />
            </div>

            {/* Quick Amount Chips */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[100, 500, 2500].map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => handleQuickAdd(inc)}
                  className="py-1 px-1 text-center rounded bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/20 text-[#8E929B] hover:text-white text-[11px] font-mono font-medium transition-colors"
                >
                  +${inc}
                </button>
              ))}
              <button
                type="button"
                onClick={handleMaxSpendable}
                className="py-1 px-1 text-center rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono font-medium transition-colors"
              >
                Max
              </button>
            </div>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={isLoading || !senderAccount}
            className="w-full mt-2 py-3 px-4 rounded-xl font-medium text-sm tracking-wide bg-gradient-to-r from-[#38BDF8] to-[#0284C7] hover:from-[#60A5FA] hover:to-[#2563EB] text-black font-semibold shadow-[0_0_20px_rgba(56,189,248,0.25)] hover:shadow-[0_0_25px_rgba(56,189,248,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 group/btn"
          >
            {isLoading ? (
              <>
                <RefreshCw size={16} className="animate-spin text-black" />
                <span>Executing Ledger Lock...</span>
              </>
            ) : (
              <>
                <span>Authorize & Settle Transfer</span>
                <Send size={15} className="group-hover/btn:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>

      <div className="pt-4 mt-4 border-t border-white/[0.05] flex items-center justify-between text-[10px] font-mono text-[#6E737D]">
        <span>PESSIMISTIC INNODB MUTEX</span>
        <span>LATENCY &lt; 0.4MS</span>
      </div>
    </div>
  );
}
