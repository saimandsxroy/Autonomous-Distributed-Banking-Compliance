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
