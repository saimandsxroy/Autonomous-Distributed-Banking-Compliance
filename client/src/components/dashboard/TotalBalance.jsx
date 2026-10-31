import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  Lock,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { fetchBalance } from "../../services/dashboard";
import { fetchUserAccounts } from "../../api/treasuryApi";
import { useNavigate } from "react-router-dom";

export function TotalBalance({ isRevealed, setIsRevealed }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [balanceInfo, setBalanceInfo] = useState({
    accountName: user?.accountName || "Loading...",
    accountBalance: user?.accountBalance || 0,
    accountNumber: user?.accountNumber || "...",
  });
  const [treasuryAccount, setTreasuryAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadBalance = useCallback(async () => {
    setIsLoading(true);
    try {
      if (user?.accountNumber) {
        const data = await fetchBalance(user.accountNumber).catch(() => null);
        if (data?.accountInfo) {
          setBalanceInfo(data.accountInfo);
        }
      }

      const accounts = await fetchUserAccounts().catch(() => []);
      if (accounts && accounts.length > 0) {
        setTreasuryAccount(accounts[0]);
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.accountNumber]);

  useEffect(() => {
    loadBalance();
    const handlePersonaChange = () => {
      loadBalance();
    };
    window.addEventListener("runestone_persona_changed", handlePersonaChange);
    return () =>
      window.removeEventListener(
        "runestone_persona_changed",
        handlePersonaChange
      );
  }, [loadBalance]);

  const handleCopy = () => {
    const num = treasuryAccount?.accountNumber || balanceInfo.accountNumber;
    navigator.clipboard.writeText(num);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isFrozen = treasuryAccount?.status === "FROZEN_AML";
  const posted = treasuryAccount?.postedBalance ?? balanceInfo.accountBalance;
  const available =
    treasuryAccount?.availableBalance ?? balanceInfo.accountBalance;
  const held = treasuryAccount?.heldBalance ?? 0;

  return (
    <Card className="border-t-8 border-t-ochre-800 bg-zinc-900 border-x-4 border-b-4 border-x-zinc-800 border-b-zinc-800 text-white relative overflow-hidden group/card shadow-2xl">
      <div className="absolute top-0 right-0 w-48 h-48 bg-ochre-800 opacity-10 rounded-full -translate-y-16 translate-x-16 blur-3xl transition-opacity duration-1000 group-hover/card:opacity-20 pointer-events-none" />

      <CardHeader className="border-b-4 border-zinc-800 pb-3">
        <CardTitle className="text-zinc-400 text-sm md:text-base flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold uppercase tracking-wider">
              Treasury Ledger Balance
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRevealed(!isRevealed)}
              className="p-1 hover:text-white transition-colors"
              title={isRevealed ? "Hide balance" : "Show balance"}
            >
              {isRevealed ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <button
              onClick={loadBalance}
              className={`p-1 hover:text-white transition-colors ${isLoading ? "animate-spin" : ""}`}
              title="Refresh ledger balances"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Double-Entry Invariant Strip: 3 Balance Buckets */}
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

        {/* Mathematical Invariant Verification Badge */}
        <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-zinc-300">
            <Lock size={14} className="text-ochre-800 shrink-0" />
            <span>
              Invariant:{" "}
              <span className="text-white font-bold">${posted.toFixed(2)}</span>{" "}
              ={" "}
              <span className="text-emerald-400 font-bold">
                ${available.toFixed(2)}
              </span>{" "}
              +{" "}
              <span className="text-amber-400 font-bold">
                ${held.toFixed(2)}
              </span>
            </span>
          </div>

          <button
            onClick={() => navigate("/compliance")}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-ochre-500 hover:text-white rounded border border-zinc-700 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 transition-colors shrink-0"
          >
            <span>Open AML Compliance Command</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Account Info and Copy */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center text-sm font-bold text-zinc-500 uppercase tracking-widest gap-2 pt-2 border-t border-zinc-800">
          <span>{balanceInfo.accountName}</span>
          <button
            onClick={handleCopy}
            className="bg-zinc-950 px-3 py-1 border-2 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300 transition-colors flex items-center gap-2 text-xs"
            title="Copy Account Number"
          >
            <span>
              {treasuryAccount?.accountNumber || balanceInfo.accountNumber}
            </span>
            {copied ? (
              <Check size={14} className="text-green-500" />
            ) : (
              <Copy size={14} />
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

