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
import { fetchUserAccounts, PERSONAS, getActivePersona } from "../../api/treasuryApi";
import { useNavigate } from "react-router-dom";

export function TotalBalance({ isRevealed, setIsRevealed }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const activePersona = getActivePersona();
  const fallbackName =
    user?.accountName ||
    PERSONAS[activePersona]?.displayName ||
    user?.userName ||
    "Institutional Treasury Vault";

  const [balanceInfo, setBalanceInfo] = useState({
    accountName: fallbackName,
    accountBalance: user?.accountBalance || 0,
    accountNumber: user?.accountNumber || "...",
  });
  const [treasuryAccount, setTreasuryAccount] = useState(null);
  const [allUserAccounts, setAllUserAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadBalance = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentPersona = getActivePersona();
      const currentOwner =
        user?.accountName ||
        PERSONAS[currentPersona]?.displayName ||
        user?.userName ||
        "Institutional Treasury Vault";

      if (user?.accountNumber) {
        const data = await fetchBalance(user.accountNumber).catch(() => null);
        if (data?.accountInfo) {
          setBalanceInfo((prev) => ({
            ...prev,
            accountName: data.accountInfo.accountName || currentOwner,
            accountBalance: data.accountInfo.accountBalance ?? prev.accountBalance,
            accountNumber: data.accountInfo.accountNumber || prev.accountNumber,
          }));
        }
      }

      const accounts = await fetchUserAccounts().catch(() => []);
      setAllUserAccounts(accounts || []);
      if (accounts && accounts.length > 0) {
        const selected = accounts[0];
        setTreasuryAccount((prev) => {
          if (prev) {
            const found = accounts.find((a) => a.id === prev.id);
            if (found) return found;
          }
          return selected;
        });
        setBalanceInfo((prev) => ({
          ...prev,
          accountName: currentOwner,
          accountNumber: selected.accountNumber,
        }));
      } else {
        setBalanceInfo((prev) => ({
          ...prev,
          accountName: currentOwner,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.accountNumber, user?.accountName, user?.userName]);

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
    <Card className="border border-white/10 bg-[#0C1017]/90 text-white relative overflow-hidden group/card shadow-2xl backdrop-blur-xl">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#38BDF8]/60 to-transparent" />

      <CardHeader className="border-b border-white/[0.08] pb-3">
        <CardTitle className="text-[#8E929B] text-sm md:text-base flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white tracking-[-0.02em]">
              Treasury Ledger Balance
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5 border ${
                isFrozen
                  ? "bg-rose-500/15 text-rose-300 border-rose-500/40 animate-pulse"
                  : "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
              }`}
            >
              {isFrozen ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
              {isFrozen ? "FROZEN_AML PROTOCOL" : "ACCOUNT ACTIVE"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {allUserAccounts.length > 1 && (
              <select
                value={treasuryAccount?.id}
                onChange={(e) => {
                  const chosen = allUserAccounts.find(
                    (a) => a.id === Number(e.target.value)
                  );
                  if (chosen) setTreasuryAccount(chosen);
                }}
                className="px-2 py-0.5 bg-[#06080C] border border-white/10 text-xs text-white font-mono rounded-lg focus:outline-none"
              >
                {allUserAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    Acc #{a.id} ({a.accountNumber})
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => setIsRevealed(!isRevealed)}
              className="p-1 hover:text-white transition-colors text-[#8E929B]"
              title={isRevealed ? "Hide balance" : "Show balance"}
            >
              {isRevealed ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <button
              onClick={loadBalance}
              className={`p-1 hover:text-white transition-colors text-[#8E929B] ${isLoading ? "animate-spin text-[#38BDF8]" : ""}`}
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
          <div className="p-4 bg-[#06080C]/80 border border-white/[0.08] hover:border-white/[0.16] rounded-xl transition-all">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#8E929B] font-semibold">
              1. Posted Ledger Total
            </div>
            <div
              className={`text-2xl md:text-3xl font-semibold font-['JetBrains_Mono',monospace] mt-1 text-[#F3F1EC] tracking-[-0.02em] ${
                !isRevealed ? "blur-md select-none opacity-50" : ""
              }`}
            >
              $
              {posted.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="text-[10px] font-mono text-[#6E737D] mt-1">
              Book Value = Available + Held
            </div>
          </div>

          {/* Bucket 2: Available Balance */}
          <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl transition-all">
            <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
              2. Available (Spendable)
            </div>
            <div
              className={`text-2xl md:text-3xl font-semibold font-['JetBrains_Mono',monospace] mt-1 text-emerald-400 tracking-[-0.02em] ${
                !isRevealed ? "blur-md select-none opacity-50" : ""
              }`}
            >
              $
              {available.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="text-[10px] font-mono text-emerald-500/70 mt-1">
              Free of Encumbrances
            </div>
          </div>

          {/* Bucket 3: Held / Escrowed Balance */}
          <div className="p-4 bg-amber-950/20 border border-amber-500/30 hover:border-amber-500/50 rounded-xl transition-all">
            <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold">
              3. Held / Escrowed
            </div>
            <div
              className={`text-2xl md:text-3xl font-semibold font-['JetBrains_Mono',monospace] mt-1 text-amber-400 tracking-[-0.02em] ${
                !isRevealed ? "blur-md select-none opacity-50" : ""
              }`}
            >
              $
              {held.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="text-[10px] font-mono text-amber-500/70 mt-1">
              Intercepted AML & Velocity Holds
            </div>
          </div>
        </div>

        {/* Mathematical Invariant Verification Badge */}
        <div className="p-3 bg-[#06080C]/80 border border-white/[0.06] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-[#9CA3AF]">
            <Lock size={14} className="text-[#38BDF8] shrink-0" />
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
            className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-[#38BDF8] hover:text-white rounded-xl border border-[#38BDF8]/20 font-mono font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5 transition-colors shrink-0"
          >
            <span>Open AML Compliance Command</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Account Info and Copy */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center text-xs font-mono text-[#8E929B] uppercase tracking-wider gap-2 pt-3 border-t border-white/[0.06]">
          <span className="text-white font-semibold">{balanceInfo.accountName}</span>
          <button
            onClick={handleCopy}
            className="bg-[#06080C] px-3 py-1.5 border border-white/10 hover:border-white/20 rounded-xl hover:text-white transition-colors flex items-center gap-2 text-xs text-[#9CA3AF]"
            title="Copy Account Number"
          >
            <span>
              {treasuryAccount?.accountNumber || balanceInfo.accountNumber}
            </span>
            {copied ? (
              <Check size={14} className="text-emerald-400" />
            ) : (
              <Copy size={14} />
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

